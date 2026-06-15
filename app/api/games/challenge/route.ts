import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { createGameSession, persistEnrichedChallenge, sanitizeChallengeForClient } from '@/lib/server/games'
import { checkResponsibleGaming } from '@/lib/server/responsible-gaming'
import {
  enrichTokenProphetChallenge,
  enrichRateLimitRouletteChallenge,
  enrichBenchmarkBrawlChallenge,
} from '@/lib/server/live-challenges'
import { recordPlayer } from '@/lib/server/player-counts'
import { dealRound, getOracle } from '@/lib/server/games/oracle'
import '@/lib/server/games/register-oracles' // side-effect import to populate oracle registry
import crypto from 'node:crypto'
import { toApiResponse } from '@/lib/server/api-error'

const schema = z.object({
  game: z.enum(['token_prophet', 'prompt_golf', 'bug_exorcist', 'context_chicken', 'rate_limit_roulette', 'benchmark_brawl', 'spot_deepfake', 'prompt_crash', 'token_mines']),
  tier: z.enum(['sandbox', 'production', 'blackbox']).default('sandbox'),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())

    const rgCheck = await checkResponsibleGaming(user.id)
    if (!rgCheck.allowed) {
      return NextResponse.json(
        { error: rgCheck.reason, cooldownEndsAt: rgCheck.cooldownEndsAt?.toISOString() ?? null },
        { status: 429 }
      )
    }

    const session = await createGameSession(user.id, body.game, body.tier)
    recordPlayer(body.game, user.id)

    let challenge = session.challenge as Record<string, unknown>
    let enriched = false

    // Oracle path (preferred when registered): replaces the static generator
    // output with a cached/pooled live-inference round. Falls back to the
    // legacy enrichers below for any game without an oracle yet.
    const oracle = getOracle(body.game)
    if (oracle) {
      try {
        const dealt = await dealRound<Record<string, unknown>, Record<string, unknown>>(
          body.game,
          body.tier,
          {
            // Reuse the session's fairness seed so the round is auditable
            // against the existing serverSeedHash / clientSeed / nonce.
            serverSeed: session.serverSeed ?? crypto.randomBytes(32).toString('hex'),
            clientSeed: session.clientSeed ?? crypto.randomBytes(16).toString('hex'),
            nonce: Number(session.nonce ?? 0),
          },
        )
        // Merge the oracle's challenge + ground-truth fields into the session
        // challenge. sanitizeChallengeForClient strips answer fields before
        // the response leaves the server.
        challenge = {
          ...challenge,
          ...dealt.challenge,
          ...dealt.groundTruth,
          oracleSource: dealt.source,
          oracleCacheKey: dealt.cacheKey,
        }
        enriched = true
      } catch {
        // Oracle failure must not block the round — fall through to legacy
        // enrichment / static challenge so the player isn't stranded.
      }
    }

    if (!enriched) {
      if (body.game === 'token_prophet') {
        challenge = await enrichTokenProphetChallenge(challenge)
        enriched = true
      } else if (body.game === 'rate_limit_roulette') {
        challenge = await enrichRateLimitRouletteChallenge(challenge)
        enriched = true
      } else if (body.game === 'benchmark_brawl') {
        challenge = await enrichBenchmarkBrawlChallenge(challenge)
        enriched = true
      }
      // spot_deepfake is a text Turing test rendered from `snippets`; it needs no
      // live enrichment. (The image-generation path was unused dead cost.)
    }

    // Persist the enriched challenge so scoring + reveal use exactly what the
    // player saw (live race result, judge pick, generated images), then strip
    // all answer/reveal fields before the challenge ever reaches the browser.
    if (enriched) {
      await persistEnrichedChallenge(session.id, challenge)
    }
    const clientChallenge = sanitizeChallengeForClient(session.game, challenge)

    return NextResponse.json({
      sessionId: session.id,
      game: session.game,
      challenge: clientChallenge,
      entryCost: session.entryCost,
      tier: session.difficulty,
      serverSeedHash: session.serverSeedHash,
      expiresAt: session.expiresAt?.toISOString() ?? null,
    })
  } catch (error) {
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
