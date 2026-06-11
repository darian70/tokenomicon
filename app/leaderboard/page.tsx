'use client'

import { useState, useEffect } from 'react'
import { useArenaStore } from '@/lib/store'
import type { LeaderboardEntry, LiveFeedEntry } from '@/lib/types'

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']

export default function LeaderboardPage() {
  const { progression, gameStats } = useArenaStore()
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [feed, setFeed] = useState<LiveFeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          if (data.leaderboard) setBoard(data.leaderboard)
          if (data.liveFeed) setFeed(data.liveFeed)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  const top3 = board.slice(0, 3)
  const rest = board.slice(3)

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-widest">LEADERBOARD</h1>
            <p className="text-xs text-[#4a5a6d] font-mono">All-time rankings by bonus compute earned</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
            <span className="text-xs font-mono text-[#59f5a9]">Live</span>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Your Rank Banner */}
        {progression && (
          <div className="rounded-xl border border-[#1a3050] bg-[#0a1828] px-6 py-4 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0c1f30] border-2 border-[#5ad8ff]/30 flex items-center justify-center">
                <span className="text-sm font-display font-bold text-[#5ad8ff]">{progression.rank}</span>
              </div>
              <div>
                <p className="text-xs text-[#4a5a6d] font-mono">YOUR RANK</p>
                <p className="text-sm font-display font-bold text-white">Rank {progression.rank}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#1a2535]" />
            <div>
              <p className="text-xs text-[#4a5a6d] font-mono">XP</p>
              <p className="text-sm font-mono font-bold text-[#5ad8ff]">{progression.xp.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[#4a5a6d] font-mono">GAMES PLAYED</p>
              <p className="text-sm font-mono font-bold text-white">{progression.totalGamesPlayed}</p>
            </div>
            <div>
              <p className="text-xs text-[#4a5a6d] font-mono">STREAK</p>
              <p className="text-sm font-mono font-bold text-[#ffd700]">{progression.currentStreak}🔥</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#3a4a5a] mb-1">
                <span>XP to next rank</span>
                <span>{progression.xpToNextRank} needed</span>
              </div>
              <div className="h-1.5 bg-[#0c1520] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5ad8ff] rounded-full transition-all duration-700"
                  style={{ width: `${progression.rankProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            {/* Podium Top 3 */}
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-[#0c111a] rounded-xl border border-[#192433] animate-pulse" />
                ))}
              </div>
            ) : top3.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {top3.map((entry, i) => (
                  <div
                    key={entry.rank}
                    className="rounded-xl border bg-[#0c111a] p-5 text-center"
                    style={{ borderColor: RANK_COLORS[i] + '40' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center border-2 text-xl font-display font-black"
                      style={{
                        borderColor: RANK_COLORS[i],
                        backgroundColor: RANK_COLORS[i] + '15',
                        color: RANK_COLORS[i],
                      }}
                    >
                      {entry.rank}
                    </div>
                    <p className="text-xs font-mono font-bold text-white truncate">{entry.displayName}</p>
                    <p className="text-[10px] text-[#4a5a6d] mt-0.5">{entry.gamesPlayed} games</p>
                    <p className="text-sm font-mono font-bold mt-2" style={{ color: RANK_COLORS[i] }}>
                      {fmt(entry.totalReward)} cr
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Full Table */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#192433] grid grid-cols-[40px_1fr_80px_80px_80px] gap-4 text-[10px] font-mono text-[#3a4a5a] uppercase tracking-wider">
                <span>#</span>
                <span>Player</span>
                <span className="text-right">Games</span>
                <span className="text-right">Best</span>
                <span className="text-right">Earned</span>
              </div>

              {loading ? (
                <div className="divide-y divide-[#0f1520]">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="px-5 py-3.5 flex gap-4">
                      <div className="h-4 w-8 bg-[#0a1520] rounded animate-pulse" />
                      <div className="h-4 flex-1 bg-[#0a1520] rounded animate-pulse" />
                      <div className="h-4 w-16 bg-[#0a1520] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : board.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#4a5a6d] text-sm font-mono">No players ranked yet.</p>
                  <p className="text-[10px] text-[#2a3a4a] mt-1">Play games to appear on the leaderboard.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#0f1520]">
                  {board.map((entry) => (
                    <div
                      key={entry.rank}
                      className="px-5 py-3.5 grid grid-cols-[40px_1fr_80px_80px_80px] gap-4 items-center hover:bg-[#0a1520] transition-colors"
                    >
                      <span
                        className="text-sm font-display font-bold"
                        style={{ color: entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : '#4a5a6d' }}
                      >
                        {entry.rank}
                      </span>
                      <span className="text-sm font-mono text-white truncate">{entry.displayName}</span>
                      <span className="text-xs font-mono text-[#4a5a6d] text-right">{entry.gamesPlayed}</span>
                      <span className="text-xs font-mono text-[#5ad8ff] text-right">{entry.bestScore}</span>
                      <span className="text-xs font-mono font-bold text-[#59f5a9] text-right">{fmt(entry.totalReward)} cr</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-4">
            {/* Live Feed */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
                <span className="text-xs font-display tracking-widest text-[#a8b8cc]">LIVE ACTIVITY</span>
              </div>
              {feed.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[#4a5a6d] font-mono">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-[#0f1520]">
                  {feed.slice(0, 12).map((e, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0a1520] border border-[#192433] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-mono text-[#4a5a6d]">{e.displayName[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono">
                          <span className="text-[#5ad8ff]">{e.displayName}</span>
                          <span className="text-[#4a5a6d]"> scored </span>
                          <span className="text-white">{e.score}</span>
                        </p>
                        <p className="text-[10px] text-[#4a5a6d] capitalize">{e.game.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#59f5a9] flex-shrink-0">+{e.reward}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your Game Breakdown */}
            {gameStats.length > 0 && (
              <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#192433]">
                  <p className="text-xs font-display tracking-widest text-[#a8b8cc]">YOUR BREAKDOWN</p>
                </div>
                <div className="divide-y divide-[#0f1520]">
                  {gameStats.map((gs) => (
                    <div key={gs.game} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-[#a8b8cc] capitalize">{gs.game.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-[#3a4a5a]">{gs.attempts} attempts</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-[#5ad8ff]">{gs.bestScore}</p>
                        <p className="text-[10px] text-[#3a4a5a]">best score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
