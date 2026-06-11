'use client'

import { useArenaStore } from '@/lib/store'
import type { ArenaGameId } from '@/lib/types'

// SVG Icons for each game - no emojis
const GameIcons: Record<ArenaGameId, () => React.ReactElement> = {
  token_prophet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7 7 0 1 0 10 10" />
      <path d="M12 12 6 6" />
      <path d="m12 12 6-2" />
    </svg>
  ),
  prompt_golf: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4" />
      <path d="m6 10 6 6" />
      <path d="M12 16v6" />
      <path d="M9 19h6" />
    </svg>
  ),
  bug_exorcist: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 18c-3.5 0-6-3-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3-2.5 6-6 6" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
      <path d="M19 8a2.5 2.5 0 0 1 0 5" />
      <path d="M5 8a2.5 2.5 0 0 0 0 5" />
    </svg>
  ),
  context_chicken: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  rate_limit_roulette: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 12 8 6" />
      <path d="m16 18-4-6" />
      <path d="m8 18 4-6" />
      <path d="m16 6-4 6" />
    </svg>
  ),
  benchmark_brawl: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
      <path d="M9 11l3-3" />
    </svg>
  ),
  spot_deepfake: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="m5 19 1.5-1.5" />
      <path d="m19 19-1.5-1.5" />
    </svg>
  ),
  prompt_crash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  ),
  token_mines: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
}

const GAMES: { id: ArenaGameId; name: string; tagline: string }[] = [
  { id: 'token_prophet',   name: 'Token Prophet',   tagline: 'calibration' },
  { id: 'prompt_golf',     name: 'Prompt Golf',     tagline: 'compression' },
  { id: 'bug_exorcist',    name: 'Bug Exorcist',    tagline: 'debug raid'  },
  { id: 'context_chicken', name: 'Context Chicken', tagline: 'resource bet' },
  { id: 'rate_limit_roulette', name: 'Rate Roulette', tagline: 'latency bet' },
  { id: 'benchmark_brawl', name: 'Benchmark Brawl', tagline: 'model arena' },
  { id: 'spot_deepfake',   name: 'Spot Deepfake',   tagline: 'detect ai' },
  { id: 'prompt_crash',    name: 'Prompt Crash',    tagline: 'cash-out timing' },
  { id: 'token_mines',     name: 'Token Mines',     tagline: 'minefield' },
]

export default function GameSelector() {
  const { activeGame, setActiveGame, gameStatus } = useArenaStore()
  const locked = gameStatus === 'active' || gameStatus === 'submitting' || gameStatus === 'loading'

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-text-secondary mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
        <span className="text-xs font-medium tracking-wide uppercase">Select Challenge</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {GAMES.map((game) => {
          const Icon = GameIcons[game.id]
          const isActive = game.id === activeGame

          return (
            <button
              key={game.id}
              onClick={() => !locked && setActiveGame(game.id)}
              disabled={locked}
              className={`
                group relative flex flex-col items-start gap-2 p-3 rounded-lg border text-left
                transition-all duration-200
                ${isActive
                  ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent/20'
                  : 'border-border bg-surface/30 text-text hover:border-accent/30 hover:bg-surface'
                }
                ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
              )}

              {/* Icon */}
              <div className={`transition-colors duration-200 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-accent'}`}>
                <Icon />
              </div>

              {/* Name */}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium tracking-wide leading-tight">{game.name}</span>
                <span className="text-[10px] font-mono text-text-secondary">{game.tagline}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
