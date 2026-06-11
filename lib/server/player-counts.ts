/**
 * In-memory sliding-window tracker for "X playing now" badge.
 *
 * Tracks (gameId, userId) → last challenge timestamp. Counts each user once
 * per game per WINDOW_MS. Best-effort only — resets on cold starts. For
 * production with multiple instances, swap to Redis ZSET keyed on gameId.
 */

import type { ArenaGameId } from '@/lib/types'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const PRUNE_INTERVAL = 60 * 1000 // prune at most once per minute

type GameMap = Map<string, number> // userId → last seen ms
const counts: Map<ArenaGameId, GameMap> = new Map()
let lastPrune = 0

function prune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL) return
  lastPrune = now
  const cutoff = now - WINDOW_MS
  for (const [game, m] of counts) {
    for (const [user, ts] of m) {
      if (ts < cutoff) m.delete(user)
    }
    if (m.size === 0) counts.delete(game)
  }
}

export function recordPlayer(gameId: ArenaGameId, userId: string) {
  const now = Date.now()
  let m = counts.get(gameId)
  if (!m) {
    m = new Map()
    counts.set(gameId, m)
  }
  m.set(userId, now)
  prune(now)
}

export function getActivePlayerCounts(): Record<string, number> {
  const now = Date.now()
  prune(now)
  const cutoff = now - WINDOW_MS
  const out: Record<string, number> = {}
  for (const [game, m] of counts) {
    let n = 0
    for (const ts of m.values()) if (ts >= cutoff) n++
    if (n > 0) out[game] = n
  }
  return out
}

export function getActivePlayers(gameId: ArenaGameId): number {
  return getActivePlayerCounts()[gameId] ?? 0
}
