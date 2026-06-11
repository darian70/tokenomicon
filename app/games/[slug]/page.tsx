'use client'

import { useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useArenaStore } from '@/lib/store'
import { GAME_BY_SLUG, GAME_CATALOG } from '@/lib/game-catalog'
import GameArea from '@/components/games/GameArea'
import AmbientParticles from '@/components/fx/AmbientParticles'

const DIFFICULTY_COLORS = {
  easy:   { text: '#59f5a9', bg: 'rgba(89,245,169,0.08)',  border: 'rgba(89,245,169,0.2)',  label: 'Easy'   },
  medium: { text: '#ffd700', bg: 'rgba(255,215,0,0.08)',   border: 'rgba(255,215,0,0.2)',   label: 'Medium' },
  hard:   { text: '#ff4d6d', bg: 'rgba(255,77,109,0.08)',  border: 'rgba(255,77,109,0.2)',  label: 'Hard'   },
}

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const game = GAME_BY_SLUG[slug]

  const { setActiveGame, gameStats } = useArenaStore()

  useEffect(() => {
    if (game) {
      setActiveGame(game.id)
    }
  }, [game, setActiveGame])

  if (!game) return notFound()

  const diff = DIFFICULTY_COLORS[game.difficulty]
  const myStats = gameStats.find((s) => s.game === game.id)
  const otherGames = GAME_CATALOG.filter((g) => g.id !== game.id).slice(0, 4)

  // Hex → "r,g,b" for particle color string.
  const hexToRgb = (hex: string) => {
    const m = hex.replace('#', '').match(/.{1,2}/g)
    if (!m) return '90,216,255'
    const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16))
    return `${r},${g},${b}`
  }
  const particleColor = `rgba(${hexToRgb(game.accent)},0.18)`

  return (
    <div className="relative min-h-full">
      {/* Ambient drift particles - subtle casino floor energy */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-60">
        <AmbientParticles color={particleColor} count={22} speed={0.3} />
      </div>
      {/* Page Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <Link
            href="/games"
            className="flex items-center gap-1.5 text-[#4a5a6d] hover:text-white transition-colors text-xs font-mono"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Games
          </Link>
          <span className="text-[#1a2535]">/</span>
          <h1 className="font-display text-sm font-bold text-white tracking-widest">{game.name.toUpperCase()}</h1>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded ml-2"
            style={{ color: diff.text, backgroundColor: diff.bg, border: `1px solid ${diff.border}` }}
          >
            {diff.label}
          </span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">

          {/* Game Area — Full Hero */}
          <div className="space-y-4">
            {/* Game Meta */}
            <div className="rounded-xl border bg-[#0c111a] p-5" style={{ borderColor: game.accentBorder }}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-display text-xl font-black text-white tracking-wider">{game.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: game.accent, backgroundColor: game.accentBg, border: `1px solid ${game.accentBorder}` }}>
                      {game.rewardRange}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b7a8d] leading-relaxed">{game.longDescription}</p>
                </div>
              </div>
            </div>

            {/* GameArea component — full width */}
            <div className="rounded-xl overflow-hidden border border-[#192433] min-h-[520px]">
              <GameArea />
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-4">

            {/* Your Stats */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433]">
                <p className="text-xs font-display tracking-widest text-[#a8b8cc]">YOUR STATS</p>
              </div>
              <div className="p-4 space-y-3">
                <StatRow label="Attempts" value={myStats ? String(myStats.attempts) : '0'} />
                <StatRow label="Best score" value={myStats ? String(myStats.bestScore) : '—'} accent="#59f5a9" />
                <StatRow
                  label="Avg score"
                  value={myStats && myStats.attempts > 0
                    ? `${myStats.avgScore}`
                    : '—'}
                  accent="#ffd700"
                />
              </div>
            </div>

            {/* Tier Guide */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433]">
                <p className="text-xs font-display tracking-widest text-[#a8b8cc]">DIFFICULTY TIERS</p>
              </div>
              <div className="p-4 space-y-2">
                <TierRow tier="SANDBOX" cost={15} reward={60} color="#59f5a9" />
                <TierRow tier="PRODUCTION" cost={30} reward={120} color="#ffd700" />
                <TierRow tier="BLACKBOX" cost={60} reward={240} color="#ff4d6d" />
              </div>
            </div>

            {/* Other Games */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433] flex items-center justify-between">
                <p className="text-xs font-display tracking-widest text-[#a8b8cc]">MORE GAMES</p>
                <Link href="/games" className="text-[10px] font-mono text-[#5ad8ff] hover:text-white transition-colors">All →</Link>
              </div>
              <div className="divide-y divide-[#0f1520]">
                {otherGames.map((g) => (
                  <Link
                    key={g.id}
                    href={`/games/${g.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#0a1520] transition-colors group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.accent }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#a8b8cc] group-hover:text-white truncate transition-colors">{g.name}</p>
                      <p className="text-[10px] text-[#3a4a5a]">{g.rewardRange}</p>
                    </div>
                    <svg className="w-3 h-3 text-[#3a4a5a] group-hover:text-[#6b7a8d] transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#4a5a6d]">{label}</span>
      <span className="text-xs font-mono font-bold" style={{ color: accent ?? '#a8b8cc' }}>{value}</span>
    </div>
  )
}

function TierRow({ tier, cost, reward, color }: { tier: string; cost: number; reward: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-[#0a1520]">
      <span className="text-[10px] font-display tracking-widest" style={{ color }}>{tier}</span>
      <div className="text-right">
        <span className="text-[10px] font-mono text-[#4a5a6d]">{cost} cr entry</span>
        <span className="text-[10px] font-mono text-[#4a5a6d] mx-1">→</span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>up to {reward} cr</span>
      </div>
    </div>
  )
}
