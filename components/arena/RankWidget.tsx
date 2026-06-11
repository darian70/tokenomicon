'use client'

import { useArenaStore } from '@/lib/store'

const RANK_NAMES = [
  '', 'Initiate', 'Apprentice', 'Journeyman', 'Hacker',
  'Architect', 'Operator', 'Specialist', 'Virtuoso', 'Legend', 'Champion',
]

const RANK_COLORS = [
  '', 'text-dim', 'text-dim', 'text-text', 'text-accent',
  'text-success', 'text-success', 'text-premium', 'text-premium', 'text-error', 'text-error',
]

const Icons = {
  rank: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  fire: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
}

export default function RankWidget() {
  const { progression, dashboardLoading } = useArenaStore()

  if (dashboardLoading) {
    return (
      <div className="p-4 border-b border-border">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-surface rounded animate-pulse" />
          <div className="h-8 w-32 bg-surface rounded animate-pulse" />
          <div className="h-2 w-full bg-surface rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!progression) return null

  const rank = progression.rank
  const rankName = RANK_NAMES[rank] ?? 'Unknown'
  const rankColor = RANK_COLORS[rank] ?? 'text-dim'
  const pct = Math.round(progression.rankProgress * 100)

  return (
    <div className="p-4 border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <Icons.rank />
          <span className="text-xs font-medium tracking-wide uppercase">Rank</span>
        </div>
        <span className="text-xs font-mono text-text-secondary">{progression.xp.toLocaleString()} XP</span>
      </div>

      {/* Rank Display */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`font-display text-2xl font-bold ${rankColor}`}>{rank}</span>
        <span className={`text-sm font-mono ${rankColor}`}>{rankName}</span>
        {rank < 10 && (
          <span className="ml-auto text-xs font-mono text-text-secondary">→ {RANK_NAMES[rank + 1]}</span>
        )}
      </div>

      {/* Progress Bar */}
      {rank < 10 && (
        <div className="mb-3">
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-mono text-text-secondary">{progression.xpInCurrentRank} XP</span>
            <span className="text-[10px] font-mono text-text-secondary">{progression.xpToNextRank} to next</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Played" value={progression.totalGamesPlayed} />
        <MiniStat label="Won" value={progression.totalGamesWon} color="text-success" />
        <MiniStat
          label="Streak"
          value={progression.currentStreak}
          color={progression.currentStreak >= 3 ? 'text-premium' : 'text-text'}
          showFire={progression.currentStreak >= 3}
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  color = 'text-text',
  showFire = false,
}: {
  label: string
  value: number
  color?: string
  showFire?: boolean
}) {
  return (
    <div className="text-center p-2 rounded-md bg-surface/30 border border-border">
      <div className="flex items-center justify-center gap-1">
        <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        {showFire && <Icons.fire />}
      </div>
      <p className="text-[9px] font-medium tracking-wider text-text-secondary uppercase mt-0.5">{label}</p>
    </div>
  )
}
