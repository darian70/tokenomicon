'use client'

import { useMemo } from 'react'
import type { ArenaGameId } from '@/lib/types'
import { useActivePlayers } from '@/lib/use-active-players'

/**
 * "X playing now" badge. Reads real in-memory counts from /api/games/active-players;
 * falls back to a stable deterministic baseline so the lobby never shows zero
 * on cold starts.
 */
export default function HotGameBadge({ gameId, baseline = 4 }: { gameId: ArenaGameId; baseline?: number }) {
  const real = useActivePlayers(gameId)

  const fallback = useMemo(() => {
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000))
    let h = 0
    const str = `${gameId}-${bucket}`
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
    return baseline + Math.abs(h % 9)
  }, [gameId, baseline])

  // Show real count when ≥ baseline floor, else fallback (prevents "1 playing" awkwardness).
  const count = real !== null && real >= 3 ? real : fallback
  const isLive = real !== null && real >= 3

  if (count < 3) return null
  const hot = count >= 8

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tabular-nums"
      style={{
        color: hot ? '#fb923c' : '#a8b8cc',
        backgroundColor: hot ? 'rgba(251,146,60,0.1)' : 'rgba(168,184,204,0.08)',
        border: `1px solid ${hot ? 'rgba(251,146,60,0.3)' : 'rgba(168,184,204,0.15)'}`,
      }}
      title={isLive ? `${count} players in the last 15 minutes` : `~${count} players recently`}
    >
      <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: hot ? '#fb923c' : '#a8b8cc' }} />
      {hot && <span className="-ml-0.5">🔥</span>}
      {count} playing
    </span>
  )
}
