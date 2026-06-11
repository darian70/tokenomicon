// Cron-invoked endpoint that pre-warms the oracle pool for every registered
// game. Wire this to a Vercel Cron schedule (suggested: every 5 minutes for
// fast-cache games like Rate Roulette, every hour for slow-cache games).
//
// Auth: requires CRON_SECRET (Vercel Cron sends this as the Authorization
// header). For local manual invocation: `curl -H "authorization: Bearer
// $CRON_SECRET" http://localhost:3000/api/games/oracle/refill`
//
// Wire in vercel.json:
//   { "crons": [{ "path": "/api/games/oracle/refill", "schedule": "*/5 * * * *" }] }

import { NextResponse } from 'next/server'
import { GameType } from '@prisma/client'
import { refillPool, getOracle } from '@/lib/server/games/oracle'
import '@/lib/server/games/register-oracles' // side-effect import to populate registry
import { env } from '@/lib/server/env'

// All games that may have an oracle registered. Refill is a no-op for any
// game without a registered oracle.
const GAMES: GameType[] = [
  GameType.rate_limit_roulette,
  GameType.token_prophet,
  GameType.benchmark_brawl,
  GameType.bug_exorcist,
  GameType.context_chicken,
  GameType.spot_deepfake,
  GameType.prompt_golf,
]

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const expected = env.CRON_SECRET
  if (expected) {
    const got = req.headers.get('authorization') ?? ''
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results: Record<string, { added: number; costUsd: number; skipped?: boolean }> = {}
  let totalAdded = 0
  let totalCost = 0

  for (const game of GAMES) {
    if (!getOracle(game)) {
      results[game] = { added: 0, costUsd: 0, skipped: true }
      continue
    }
    try {
      const { added, cost } = await refillPool(game)
      results[game] = { added, costUsd: Number(cost.toFixed(6)) }
      totalAdded += added
      totalCost += cost
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results[game] = { added: 0, costUsd: 0, skipped: true }
      console.error(`[oracle.refill] ${game} failed:`, msg)
    }
  }

  return NextResponse.json({
    ok: true,
    totalAdded,
    totalCostUsd: Number(totalCost.toFixed(6)),
    games: results,
  })
}
