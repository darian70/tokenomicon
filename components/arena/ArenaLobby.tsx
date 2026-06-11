'use client'

import { useState, useEffect, useCallback } from 'react'
import { useArenaStore } from '@/lib/store'
import { useToast } from '@/lib/toast'

interface ArenaStats {
  rating: number
  totalGames: number
  wins: number
  losses: number
  winRate: number
  netProfit: number
  isPlacement: boolean
}

export default function ArenaLobby({ onEnterDuel }: { onEnterDuel: (duelId: string) => void }) {
  const [entryAmount, setEntryAmount] = useState(200)
  const [isMatchmaking, setIsMatchmaking] = useState(false)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null)
  const [stats, setStats] = useState<ArenaStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; username: string; rating: number; totalGames: number }>>([])
  const [queueDepth, setQueueDepth] = useState<number | null>(null)
  const balances = useArenaStore((state) => state.balances)
  const toast = useToast()
  const arenaCredits = balances?.arena_credits ?? 0

  // Poll for matchmaking status
  useEffect(() => {
    if (!isMatchmaking) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/arena/stats?type=personal')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)

        // Check for active duel
        const duelRes = await fetch('/api/arena/duel?id=active')
        if (duelRes.ok) {
          const duelData = await duelRes.json()
          if (duelData.duel?.id) {
            onEnterDuel(duelData.duel.id)
            setIsMatchmaking(false)
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [isMatchmaking, onEnterDuel])

  // Poll queue depth
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/arena/matchmaking')
        if (res.ok) {
          const d = await res.json()
          setQueueDepth(d.queueDepth ?? 0)
        }
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          fetch('/api/arena/stats?type=personal'),
          fetch('/api/arena/stats?type=leaderboard&limit=10'),
        ])
        
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data)
        }
        
        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json()
          setLeaderboard(data)
        }
      } catch {
        // Ignore errors
      }
    }
    loadStats()
  }, [])

  const joinMatchmaking = useCallback(async () => {
    if (arenaCredits < entryAmount) {
      toast.error('Insufficient arena credits')
      return
    }

    setIsMatchmaking(true)
    
    try {
      const res = await fetch('/api/arena/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryAmount }),
      })

      const data = await res.json()

      if (data.duelId) {
        onEnterDuel(data.duelId)
        setIsMatchmaking(false)
      } else {
        setQueuePosition(data.position ?? null)
        setEstimatedWait(data.estimatedWait ?? null)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Matchmaking failed'
      toast.error(msg)
      setIsMatchmaking(false)
    }
  }, [entryAmount, arenaCredits, onEnterDuel, toast])

  const leaveMatchmaking = useCallback(async () => {
    setIsMatchmaking(false)
    setQueuePosition(null)
    
    try {
      await fetch('/api/arena/matchmaking', { method: 'DELETE' })
    } catch {
      // Ignore errors
    }
  }, [])

  const getRankTitle = (rating: number) => {
    if (rating >= 2000) return 'Grandmaster'
    if (rating >= 1800) return 'Diamond'
    if (rating >= 1600) return 'Platinum'
    if (rating >= 1400) return 'Gold'
    if (rating >= 1200) return 'Silver'
    return 'Bronze'
  }

  const getRankColor = (rating: number) => {
    if (rating >= 2000) return '#ffd700'
    if (rating >= 1800) return '#5ad8ff'
    if (rating >= 1600) return '#6e9bff'
    if (rating >= 1400) return '#ffd700'
    if (rating >= 1200) return '#a8b8cc'
    return '#b87333'
  }

  return (
    <div className="min-h-full py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#ffd700]/20 bg-[#ffd700]/5 text-[10px] font-mono text-[#ffd700]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
            PvP · Real-time duels
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-black tracking-[0.06em] text-white">
            CONTEXT CHICKEN <span className="text-[#ffd700]">ARENA</span>
          </h1>
          <p className="text-sm font-mono text-[#6b7a8d] max-w-xl mx-auto">
            Keep the AI conversation alive. First player to exceed the token limit crashes and loses.
            Winner takes 85% of the combined pot.
          </p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Rating"
              value={stats.rating}
              sub={getRankTitle(stats.rating)}
              color={getRankColor(stats.rating)}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.wins}W / ${stats.losses}L`}
              color="#59f5a9"
            />
            <StatCard
              label="Games"
              value={stats.totalGames}
              sub={stats.isPlacement ? 'Placement' : 'Ranked'}
              color="#5ad8ff"
            />
            <StatCard
              label="Net Profit"
              value={`${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit} cr`}
              sub="all time"
              color={stats.netProfit >= 0 ? '#59f5a9' : '#ff4d6d'}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          {/* Matchmaking Card */}
          <div className="rounded-2xl border border-[#ffd700]/20 bg-[#0c111a] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#192433]">
              <p className="font-display text-sm font-bold text-white tracking-widest">ENTER ARENA</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">{arenaCredits} arena credits available</p>
                {queueDepth !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#59f5a9]">{queueDepth} in queue</span>
                  </div>
                )}
              </div>
            </div>

            {!isMatchmaking ? (
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-mono text-[#6b7a8d]">Entry stake</p>
                    <span className="font-display text-2xl font-black text-[#ffd700]">{entryAmount}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1a2535] rounded-full appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-[#3a4a5a] mt-1">
                    <span>100</span><span>550</span><span>1,000</span>
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-[#080d14] border border-[#192433]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#4a5a6d]">Your stake</span>
                    <span className="text-[#a8b8cc]">{entryAmount} cr</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#4a5a6d]">Opponent stake</span>
                    <span className="text-[#a8b8cc]">{entryAmount} cr</span>
                  </div>
                  <div className="h-px bg-[#192433]" />
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#4a5a6d]">Winner takes</span>
                    <span className="text-[#59f5a9] font-bold">+{Math.floor(entryAmount * 2 * 0.85)} cr</span>
                  </div>
                  <p className="text-[9px] font-mono text-[#2a3a4a]">15% platform fee applies</p>
                </div>

                <button
                  onClick={joinMatchmaking}
                  disabled={arenaCredits < entryAmount}
                  className="w-full py-4 font-display text-sm font-black tracking-widest rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: arenaCredits >= entryAmount ? '#ffd700' : '#2a3a50',
                    color: arenaCredits >= entryAmount ? '#ffd700' : '#4a5a6d',
                    background: arenaCredits >= entryAmount ? 'rgba(255,215,0,0.06)' : 'transparent',
                  }}
                >
                  {arenaCredits < entryAmount ? 'INSUFFICIENT CREDITS' : 'FIND MATCH'}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 border-2 border-[#ffd700]/20 border-t-[#ffd700] rounded-full animate-spin mx-auto" />
                <p className="font-display text-base font-black text-[#ffd700] tracking-widest">FINDING OPPONENT</p>
                {queuePosition !== null && (
                  <p className="text-xs font-mono text-[#6b7a8d]">Queue position #{queuePosition}</p>
                )}
                {estimatedWait !== null && (
                  <p className="text-[11px] font-mono text-[#4a5a6d]">~{estimatedWait}s estimated</p>
                )}
                <button
                  onClick={leaveMatchmaking}
                  className="mt-4 px-5 py-2 text-xs font-mono text-[#ff4d6d] border border-[#ff4d6d]/20 rounded-lg hover:bg-[#ff4d6d]/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#192433]">
                  <p className="text-xs font-display tracking-widest text-[#a8b8cc]">TOP DUELISTS</p>
                </div>
                <div className="divide-y divide-[#0f1520]">
                  {leaderboard.map((player, i) => (
                    <div key={player.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-display font-black w-5 text-center"
                          style={{ color: i < 3 ? ['#ffd700', '#a8b8cc', '#b87333'][i] : '#3a4a5a' }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-mono text-[#a8b8cc]">{player.username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[#4a5a6d]">{player.totalGames} games</span>
                        <span className="text-sm font-mono font-bold text-[#ffd700]">{player.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#192433]">
                <p className="text-xs font-display tracking-widest text-[#a8b8cc]">HOW IT WORKS</p>
              </div>
              <div className="divide-y divide-[#0f1520]">
                {[
                  { n: '01', text: 'Stake arena credits. Matched with opponent of equal rating.' },
                  { n: '02', text: 'Both players chat with the same AI model. Every message burns tokens.' },
                  { n: '03', text: `First to exceed ${8192} tokens crashes. Winner collects 85% of the pot.` },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4 px-5 py-4">
                    <span className="font-display text-xs font-black text-[#ffd700]/40 flex-shrink-0 mt-0.5">{step.n}</span>
                    <p className="text-xs font-mono text-[#6b7a8d] leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 text-center">
      <p className="text-[10px] font-mono text-[#4a5a6d] tracking-wider uppercase mb-2">{label}</p>
      <p className="font-display text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono text-[#3a4a5a] mt-1">{sub}</p>
    </div>
  )
}
