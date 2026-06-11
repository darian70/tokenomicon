import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { submitGameSession } from '@/lib/server/games'
import { db } from '@/lib/server/db'
import { eventBus } from '@/lib/server/event-bus'
import { updateProgression } from '@/lib/server/progression'
import { fireWebhook } from '@/lib/server/webhooks'
import {
  enrichPromptGolfSubmission,
  enrichBugExorcistSubmission,
} from '@/lib/server/live-challenges'

const schema = z.object({
  sessionId: z.string().min(1),
  submission: z.record(z.string(), z.unknown()),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())

    // Peek at the session's game type so we can run the right enricher.
    // This is a cheap read — just the game column — before the main transaction.
    const peek = await db.gameSession.findFirst({
      where: { id: body.sessionId, userId: user.id },
      select: { game: true, challenge: true },
    })

    let submission = body.submission

    // Games that need real AI calls at submit time.
    // Results are embedded into the submission so the scorers in games.ts can
    // pick them up without a DB write. The enriched fields are persisted in
    // GameAttempt.submission (JSON) for later audit.
    if (peek?.game === 'prompt_golf') {
      const { enrichedSubmission } = await enrichPromptGolfSubmission(
        peek.challenge as Record<string, unknown>,
        submission,
      ).catch(() => ({ enrichedChallenge: peek.challenge as Record<string, unknown>, enrichedSubmission: submission }))
      submission = enrichedSubmission
    } else if (peek?.game === 'bug_exorcist') {
      const { enrichedSubmission } = await enrichBugExorcistSubmission(
        peek.challenge as Record<string, unknown>,
        submission,
      ).catch(() => ({ enrichedChallenge: peek.challenge as Record<string, unknown>, enrichedSubmission: submission }))
      submission = enrichedSubmission
    }

    const result = await submitGameSession({
      userId: user.id,
      sessionId: body.sessionId,
      submission,
    })
    const progression = await updateProgression({
      userId: user.id,
      game: result.session.game,
      score: result.attempt.score,
      rewardAmount: result.attempt.rewardAmount,
    })

    eventBus.emit({
      type: 'game_result',
      displayName: user.email?.split('@')[0] ?? 'anon',
      game: result.session.game,
      score: result.attempt.score,
      reward: result.attempt.rewardAmount,
      timestamp: new Date().toISOString(),
    })

    fireWebhook(user.id, {
      event: 'game.result',
      game: result.session.game,
      score: result.attempt.score,
      reward: result.attempt.rewardAmount,
      sessionId: body.sessionId,
    })

    return NextResponse.json({
      game: result.session.game,
      score: result.attempt.score,
      rewardAmount: result.attempt.rewardAmount,
      challenge: result.resolvedChallenge ?? result.session.challenge,
      flavorMessage: result.flavorMessage,
      fairness: {
        serverSeed: result.serverSeed,
        serverSeedHash: result.serverSeedHash,
        clientSeed: result.clientSeed,
      },
      progression: progression ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
