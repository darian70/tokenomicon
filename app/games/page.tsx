'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { GAME_CATALOG } from '@/lib/game-catalog'
import HotGameBadge from '@/components/fx/HotGameBadge'
import LiveWinTicker from '@/components/fx/LiveWinTicker'
import DailyChallenge from '@/components/games/DailyChallenge'

type FilterCategory = 'all' | 'prediction' | 'optimization' | 'identification' | 'timing'
type FilterDifficulty = 'all' | 'easy' | 'medium' | 'hard'

const DIFFICULTY_COLORS = {
  easy:   { text: '#59f5a9', bg: 'rgba(89,245,169,0.08)',  border: 'rgba(89,245,169,0.2)',  label: 'EASY'   },
  medium: { text: '#ffd700', bg: 'rgba(255,215,0,0.08)',   border: 'rgba(255,215,0,0.2)',   label: 'MEDIUM' },
  hard:   { text: '#ff4d6d', bg: 'rgba(255,77,109,0.08)',  border: 'rgba(255,77,109,0.2)',  label: 'HARD'   },
}

export default function GamesPage() {
  const searchParams = useSearchParams()
  const [category, setCategory] = useState<FilterCategory>('all')
  const [difficulty, setDifficulty] = useState<FilterDifficulty>('all')
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') === '1') setShowWelcome(true)
  }, [searchParams])

  const filtered = GAME_CATALOG.filter((g) => {
    if (category !== 'all' && g.category !== category) return false
    if (difficulty !== 'all' && g.difficulty !== difficulty) return false
    return true
  })

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="font-display text-lg font-bold text-white tracking-widest">GAMES</h1>
          <p className="text-xs text-[#4a5a6d] font-mono">
            {GAME_CATALOG.length} games · play with daily arena credits · earn bonus compute
          </p>
        </div>
      </div>

      {showWelcome && (
        <div className="mx-6 mt-4 rounded-lg border border-[#59f5a9]/30 bg-[#59f5a9]/05 px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-display font-bold text-[#59f5a9] tracking-widest">WELCOME TO TOKENOMICON</p>
            <p className="text-xs font-mono text-[#4a5a6d] mt-0.5">
              You have been credited with {100} free arena credits. Pick a game and start playing — credits refresh daily.
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="text-[#4a5a6d] hover:text-white transition-colors text-lg leading-none shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Live win ticker */}
      <LiveWinTicker />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Daily challenge banner */}
        <DailyChallenge />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#4a5a6d] tracking-wider uppercase">Type</span>
            <div className="flex gap-1">
              {(['all', 'prediction', 'optimization', 'identification'] as FilterCategory[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 text-[10px] font-mono rounded-lg border transition-all capitalize ${
                    category === c
                      ? 'bg-[#1a2535] border-[#5ad8ff]/40 text-[#5ad8ff]'
                      : 'bg-[#0a1520] border-[#192433] text-[#4a5a6d] hover:border-[#2a3a50] hover:text-[#6b7a8d]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#4a5a6d] tracking-wider uppercase">Skill</span>
            <div className="flex gap-1">
              {(['all', 'easy', 'medium', 'hard'] as FilterDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 text-[10px] font-mono rounded-lg border transition-all capitalize ${
                    difficulty === d
                      ? 'bg-[#1a2535] border-[#5ad8ff]/40 text-[#5ad8ff]'
                      : 'bg-[#0a1520] border-[#192433] text-[#4a5a6d] hover:border-[#2a3a50] hover:text-[#6b7a8d]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((game) => {
            const diff = DIFFICULTY_COLORS[game.difficulty]
            return (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="group block rounded-xl border bg-[#0c111a] overflow-hidden cursor-pointer game-card-hover"
                style={{ borderColor: game.accentBorder, '--glow-color': game.accent } as React.CSSProperties}
              >
                {/* Accent bar */}
                <div className="h-0.5 w-full transition-all" style={{ backgroundColor: game.accent }} />

                <div className="p-5">
                  {/* Game ID / type */}
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: game.accent }}>
                      {game.category}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <HotGameBadge gameId={game.id} />
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded"
                        style={{ color: diff.text, backgroundColor: diff.bg, border: `1px solid ${diff.border}` }}
                      >
                        {diff.label}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="font-display text-sm font-bold text-white tracking-wider mb-1">{game.name}</h3>
                  <p className="text-[10px] font-mono text-[#59a0b8] mb-3">{game.tagline}</p>

                  {/* Description */}
                  <p className="text-xs text-[#4a5a6d] leading-relaxed mb-5">{game.description}</p>

                  {/* Footer */}
                  <div
                    className="rounded-lg border px-4 py-3 text-center transition-all group-hover:opacity-100"
                    style={{ borderColor: game.accentBorder, backgroundColor: game.accentBg }}
                  >
                    <p className="text-xs font-display font-bold tracking-widest" style={{ color: game.accent }}>
                      PLAY NOW
                    </p>
                    <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">{game.rewardRange}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#4a5a6d] font-mono text-sm">No games match your filters.</p>
            <button
              onClick={() => { setCategory('all'); setDifficulty('all') }}
              className="mt-3 text-xs text-[#5ad8ff] hover:text-white font-mono transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* How Credits Work */}
        <div className="mt-8 rounded-xl border border-[#192433] bg-[#0c111a] p-6">
          <h2 className="font-display text-sm tracking-widest text-[#a8b8cc] mb-4">HOW IT WORKS</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <HowItWorksStep
              step="01"
              title="Get Arena Credits"
              desc="100 free arena credits are added to your account every day at midnight. No purchase needed."
              color="#59f5a9"
            />
            <HowItWorksStep
              step="02"
              title="Play Skill Games"
              desc="Choose a game, select your difficulty tier, and submit your answer. Each game costs 15–60 arena credits to enter."
              color="#5ad8ff"
            />
            <HowItWorksStep
              step="03"
              title="Earn Bonus Compute"
              desc="Win and earn bonus compute credits that are applied to your API usage — free AI time, earned through skill."
              color="#ffd700"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function HowItWorksStep({ step, title, desc, color }: { step: string; title: string; desc: string; color: string }) {
  return (
    <div>
      <p className="text-2xl font-display font-black mb-2" style={{ color, opacity: 0.3 }}>{step}</p>
      <p className="text-sm font-medium text-white mb-1">{title}</p>
      <p className="text-xs text-[#4a5a6d] leading-relaxed">{desc}</p>
    </div>
  )
}
