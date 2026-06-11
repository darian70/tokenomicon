'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useArenaStore } from '@/lib/store'
import { GAME_CATALOG } from '@/lib/game-catalog'
import OnboardingBanner from '@/components/arena/OnboardingBanner'
import AnimatedNumber from '@/components/fx/AnimatedNumber'
import HotGameBadge from '@/components/fx/HotGameBadge'
import LiveWinTicker from '@/components/fx/LiveWinTicker'
import DailyChallenge from '@/components/games/DailyChallenge'

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

const DIFFICULTY_COLORS = {
  easy:   { text: '#59f5a9', bg: 'rgba(89,245,169,0.1)',  border: 'rgba(89,245,169,0.2)',  label: 'EASY'   },
  medium: { text: '#ffd700', bg: 'rgba(255,215,0,0.1)',   border: 'rgba(255,215,0,0.2)',   label: 'MEDIUM' },
  hard:   { text: '#ff4d6d', bg: 'rgba(255,77,109,0.1)',  border: 'rgba(255,77,109,0.2)',  label: 'HARD'   },
}

const CATEGORY_LABELS = {
  prediction:    'Prediction',
  optimization:  'Optimization',
  identification:'Identification',
  timing:        'Timing',
}

interface LiveFeed {
  name: string
  game: string
  reward: number
  time: string
}


export default function ArenaPage() {
  const { balances, progression, dashboardLoading, dashboardError, loadDashboard } = useArenaStore()
  const [liveFeed, setLiveFeed] = useState<LiveFeed[]>([])
  const [grantClaimed, setGrantClaimed] = useState<boolean | null>(null)
  const [grantAmount, setGrantAmount] = useState<number>(100)
  const [grantClaiming, setGrantClaiming] = useState(false)

  // Check daily grant status on mount
  useEffect(() => {
    fetch('/api/credits/daily-grant')
      .then((r) => r.json())
      .then((data) => {
        setGrantClaimed(data.claimed ?? true)
        setGrantAmount(data.available ?? 100)
      })
      .catch(() => setGrantClaimed(true)) // fail safe: hide banner
  }, [])

  const claimDailyGrant = async () => {
    setGrantClaiming(true)
    try {
      const res = await fetch('/api/credits/daily-grant', { method: 'POST' })
      if (res.ok) {
        setGrantClaimed(true)
        await loadDashboard()
      }
    } catch {
      // ignore
    } finally {
      setGrantClaiming(false)
    }
  }

  useEffect(() => {
    const fetchFeed = () =>
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          if (data.liveFeed) {
            const timeAgo = (d: string) => {
              const diff = Date.now() - new Date(d).getTime()
              if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
              if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
              return `${Math.floor(diff / 3600000)}h ago`
            }
            setLiveFeed(
              data.liveFeed.slice(0, 5).map((e: { displayName: string; game: string; reward: number; createdAt: string }) => ({
                name: e.displayName,
                game: e.game.replace(/_/g, ' '),
                reward: e.reward,
                time: timeAgo(e.createdAt),
              }))
            )
          }
        })
        .catch(() => {})
    fetchFeed()
    const id = setInterval(fetchFeed, 30000)
    return () => clearInterval(id)
  }, [])

  const totalCompute = balances ? balances.purchased_compute + balances.bonus_compute : null
  const arenaCredits = balances?.arena_credits ?? null
  const bonusCompute = balances?.bonus_compute ?? null

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-widest">LOBBY</h1>
            <p className="text-xs text-[#4a5a6d] font-mono">Daily arena credits reset at midnight</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#59f5a9] animate-pulse" />
            <span className="text-xs font-mono text-[#59f5a9]">Platform live</span>
          </div>
        </div>
      </div>

      {/* Live win ticker */}
      <LiveWinTicker />

      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* Onboarding Banner */}
        <OnboardingBanner />

        {/* Daily Grant Banner */}
        {grantClaimed === false && (
          <div className="rounded-xl border border-[#59f5a9]/25 bg-[#59f5a9]/5 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">🎁</span>
              <div className="min-w-0">
                <p className="text-sm font-display font-bold tracking-wider text-[#59f5a9]">FREE DAILY CREDITS READY</p>
                <p className="text-xs text-[#59f5a9]/60 font-mono mt-0.5">{grantAmount} arena credits — play any game for free</p>
              </div>
            </div>
            <button
              onClick={claimDailyGrant}
              disabled={grantClaiming}
              className="flex-shrink-0 px-5 py-2 rounded-lg font-display text-xs font-bold tracking-widest border border-[#59f5a9]/40 text-[#59f5a9] bg-[#59f5a9]/10 hover:bg-[#59f5a9]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {grantClaiming ? 'CLAIMING…' : 'CLAIM NOW'}
            </button>
          </div>
        )}

        {/* Error */}
        {dashboardError && (
          <div className="bg-[#1a0a0a] border border-[#ff4d6d]/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-[#ff4d6d] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[#ff4d6d]">{dashboardError}</p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Compute Credits" numericValue={totalCompute} sub="available for API calls" accent="#5ad8ff" loading={dashboardLoading} />
          <StatCard label="Arena Credits"   numericValue={arenaCredits} sub="free to play daily" accent="#59f5a9" loading={dashboardLoading} />
          <StatCard label="Bonus Compute"   numericValue={bonusCompute} sub="earned from wins" accent="#ffd700" loading={dashboardLoading} />
          <StatCard
            label="Player Rank"
            value={progression ? `Rank ${progression.rank}` : '—'}
            sub={progression ? `${progression.xp.toLocaleString()} XP` : 'play to earn XP'}
            accent="#6e9bff"
            loading={dashboardLoading}
          />
        </div>

        {/* Games + Activity */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* Games Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display tracking-widest text-[#a8b8cc]">GAMES</h2>
              <Link href="/games" className="text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors">
                View all →
              </Link>
            </div>

            {/* Daily challenge */}
            <div className="mb-4">
              <DailyChallenge />
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {GAME_CATALOG.map((game) => {
                const diff = DIFFICULTY_COLORS[game.difficulty]
                return (
                  <Link
                    key={game.id}
                    href={`/games/${game.slug}`}
                    className="group block rounded-xl border bg-[#0c111a] overflow-hidden game-card-hover"
                    style={{ borderColor: game.accentBorder, '--glow-color': game.accent } as React.CSSProperties}
                  >
                    {/* Top accent bar */}
                    <div className="h-0.5 w-full" style={{ backgroundColor: game.accent }} />

                    <div className="p-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: game.accent }}>
                            {CATEGORY_LABELS[game.category]}
                          </p>
                          <h3 className="font-display text-sm font-bold text-white tracking-wider group-hover:text-white transition-colors">
                            {game.name}
                          </h3>
                        </div>
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded"
                          style={{ color: diff.text, backgroundColor: diff.bg, border: `1px solid ${diff.border}` }}
                        >
                          {diff.label}
                        </span>
                      </div>

                      <p className="text-xs text-[#4a5a6d] leading-relaxed mb-4">{game.description}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: game.accent }}>
                            {game.rewardRange}
                          </span>
                          <HotGameBadge gameId={game.id} />
                        </div>
                        <span
                          className="text-[10px] font-display tracking-wider px-3 py-1.5 rounded-lg border transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                          style={{ color: game.accent, borderColor: game.accentBorder, backgroundColor: game.accentBg }}
                        >
                          PLAY →
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Live Activity Sidebar */}
          <div className="space-y-4">
            {/* Live Feed */}
            <div className="bg-[#0c111a] rounded-xl border border-[#192433] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
                <span className="text-xs font-display tracking-widest text-[#a8b8cc]">LIVE WINS</span>
              </div>
              <div className="divide-y divide-[#0f1520]">
                {liveFeed.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#4a5a6d] font-mono">No recent activity</p>
                    <p className="text-[10px] text-[#2a3a4a] mt-1">Play a game to be the first!</p>
                  </div>
                ) : (
                  liveFeed.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0a1520] border border-[#192433] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-mono text-[#4a5a6d]">{entry.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-white truncate">{entry.name}</p>
                      <p className="text-[10px] text-[#4a5a6d] truncate">{entry.game}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono font-bold text-[#59f5a9]">+{entry.reward} cr</p>
                      <p className="text-[9px] text-[#3a4a5a]">{entry.time}</p>
                    </div>
                  </div>
                ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-[#192433]">
                <Link href="/leaderboard" className="text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors">
                  Full leaderboard →
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0c111a] rounded-xl border border-[#192433] p-4 space-y-3">
              <p className="text-xs font-display tracking-widest text-[#a8b8cc]">QUICK ACCESS</p>
              <Link
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0a1520] border border-[#192433] hover:border-[#5ad8ff]/30 transition-colors group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ad8ff" strokeWidth="2">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
                </svg>
                <div>
                  <p className="text-xs font-medium text-white">Buy Credits</p>
                  <p className="text-[10px] text-[#4a5a6d]">Top up your compute balance</p>
                </div>
                <svg className="ml-auto w-3 h-3 text-[#3a4a5a] group-hover:text-[#5ad8ff] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0a1520] border border-[#192433] hover:border-[#59f5a9]/30 transition-colors group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div>
                  <p className="text-xs font-medium text-white">API Docs</p>
                  <p className="text-[10px] text-[#4a5a6d]">Integrate your API key</p>
                </div>
                <svg className="ml-auto w-3 h-3 text-[#3a4a5a] group-hover:text-[#59f5a9] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
              <Link
                href="/playground"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0a1520] border border-[#192433] hover:border-[#6e9bff]/30 transition-colors group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e9bff" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <div>
                  <p className="text-xs font-medium text-white">Playground</p>
                  <p className="text-[10px] text-[#4a5a6d]">Test models interactively</p>
                </div>
                <svg className="ml-auto w-3 h-3 text-[#3a4a5a] group-hover:text-[#6e9bff] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({
  label, value, numericValue, sub, accent, loading
}: {
  label: string
  value?: string
  numericValue?: number | null
  sub: string
  accent: string
  loading: boolean
}) {
  return (
    <div
      className="rounded-xl bg-[#0c111a] border p-4 transition-all hover:border-[#2a3a50] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
      style={{ borderColor: 'rgba(25,36,51,1)' }}
    >
      <p className="text-[10px] font-mono tracking-wider text-[#4a5a6d] uppercase mb-2">{label}</p>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-7 w-24 bg-[#0a1520] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[#0a1520] rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-xl font-mono font-bold" style={{ color: accent }}>
            {numericValue !== undefined
              ? (numericValue === null
                  ? '—'
                  : <><AnimatedNumber value={numericValue} format={(n) => fmt(n)} /> cr</>)
              : value}
          </p>
          <p className="text-[10px] text-[#3a4a5a] mt-0.5">{sub}</p>
        </>
      )}
    </div>
  )
}
