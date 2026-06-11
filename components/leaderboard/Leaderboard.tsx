'use client'

import { useState, useEffect } from 'react'
import { useArenaStore } from '@/lib/store'
import type { LeaderboardEntry, LiveFeedEntry } from '@/lib/types'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// Rank indicators - SVG instead of emojis
const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <svg className="w-4 h-4 text-premium" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    )
  }
  if (rank === 2) {
    return (
      <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    )
  }
  if (rank === 3) {
    return (
      <svg className="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M16.5 14.5 19 22l-4-2-4 2 2.5-7.5" />
      </svg>
    )
  }
  return <span className="text-xs font-mono text-text-secondary w-4 text-center">{rank}</span>
}

const Icons = {
  trophy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  user: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  activity: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
}

export default function Leaderboard() {
  const { balances, gameStats, dashboardLoading } = useArenaStore()
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [feed, setFeed] = useState<LiveFeedEntry[]>([])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.leaderboard) setBoard(data.leaderboard)
        if (data.liveFeed) setFeed(data.liveFeed)
      })
      .catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          if (data.leaderboard) setBoard(data.leaderboard)
          if (data.liveFeed) setFeed(data.liveFeed)
        })
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const totalAttempts = gameStats.reduce((s, g) => s + g.attempts, 0)
  const totalCompute = balances ? balances.purchased_compute + balances.bonus_compute : 0

  return (
    <aside className="panel flex flex-col h-full overflow-hidden">
      {/* Top Players */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-text-secondary mb-3">
          <Icons.trophy />
          <span className="text-xs font-medium tracking-wide uppercase">Top Players</span>
        </div>

        <div className="flex flex-col gap-1">
          {board.length === 0 ? (
            <div className="text-center py-4 rounded-md bg-surface/30 border border-border border-dashed">
              <p className="text-xs text-text-secondary">No rankings yet</p>
              <p className="text-[10px] text-dim mt-1">Be the first to play</p>
            </div>
          ) : (
            board.slice(0, 5).map((entry, i) => (
              <div
                key={entry.rank}
                className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 group animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex-shrink-0">
                  <RankIcon rank={entry.rank} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-text truncate group-hover:text-accent transition-colors">
                    {entry.displayName}
                  </p>
                  <p className="text-[10px] text-text-secondary font-mono">
                    {entry.gamesPlayed} games · best {entry.bestScore}
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-premium flex-shrink-0 tabular-nums">
                  {fmt(entry.totalReward)} cr
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Your Stats */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-text-secondary mb-3">
          <Icons.user />
          <span className="text-xs font-medium tracking-wide uppercase">Your Stats</span>
        </div>

        {dashboardLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-full bg-surface rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-surface rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-2 rounded-lg bg-accent/5 border border-accent/10 p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">Compute</span>
              <span className="text-xs font-mono font-medium text-premium tabular-nums">{fmt(totalCompute)} cr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">Challenges</span>
              <span className="text-xs font-mono font-medium text-accent tabular-nums">{totalAttempts}</span>
            </div>
            {gameStats.slice(0, 3).map((gs) => (
              <div key={gs.game} className="flex justify-between items-center">
                <span className="text-xs text-text-secondary capitalize">{gs.game.replace(/_/g, ' ')}</span>
                <span className="text-xs font-mono font-medium text-success">best {gs.bestScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Feed */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 text-text-secondary mb-3">
          <Icons.activity />
          <span className="text-xs font-medium tracking-wide uppercase">Live Activity</span>
        </div>

        <div className="flex flex-col gap-2">
          {feed.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-text-secondary">No recent activity</p>
            </div>
          ) : (
            feed.slice(0, 8).map((e, i) => (
              <div
                key={i}
                className="text-xs font-mono animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-accent/80">{e.displayName}</span>
                <span className="text-text-secondary"> scored </span>
                <span className="text-text">{e.score}</span>
                <span className="text-text-secondary"> on </span>
                <span className="text-text capitalize">{e.game.replace(/_/g, ' ')}</span>
                <span className="text-success font-medium"> +{e.reward} cr</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
