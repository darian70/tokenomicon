'use client'

import { useEffect, useState, useRef } from 'react'

interface WinEvent {
  id: string
  username: string
  game: string
  amount: number
  timestamp: number
}

const GAME_LABELS: Record<string, { label: string; color: string }> = {
  token_prophet:       { label: 'Token Prophet',  color: '#a78bfa' },
  prompt_golf:         { label: 'Prompt Golf',    color: '#34d399' },
  bug_exorcist:        { label: 'Bug Exorcist',   color: '#f87171' },
  context_chicken:     { label: 'Context Chicken', color: '#fbbf24' },
  rate_limit_roulette: { label: 'Rate Roulette',  color: '#38bdf8' },
  benchmark_brawl:     { label: 'Benchmark Brawl', color: '#fb923c' },
  prompt_crash:        { label: 'Prompt Crash',   color: '#fb923c' },
  token_mines:         { label: 'Token Mines',    color: '#5eead4' },
}

const FAKE_NAMES = [
  'hyperdev', 'quantumcoder', 'nullptr', 'tokenlord', 'basedbuilder',
  'gptwhisperer', 'latencyking', 'promptmaxi', 'stackgod', 'memleaker',
  'asyncawait', 'bytecrusher', 'rustacean', 'degendev', 'gradient42',
  'tensorpunk', 'parseerror', 'heapmaster', 'segfault99', 'bitflip',
]

const GAME_IDS = Object.keys(GAME_LABELS)

function generateFakeWin(): WinEvent {
  const game = GAME_IDS[Math.floor(Math.random() * GAME_IDS.length)]
  const amounts = [45, 60, 80, 100, 120, 150, 180, 200, 240, 340, 500]
  return {
    id: Math.random().toString(36).slice(2, 10),
    username: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
    game,
    amount: amounts[Math.floor(Math.random() * amounts.length)],
    timestamp: Date.now(),
  }
}

export default function LiveWinTicker() {
  const [wins, setWins] = useState<WinEvent[]>(() =>
    Array.from({ length: 20 }, generateFakeWin)
  )
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setWins(prev => {
        const next = [generateFakeWin(), ...prev]
        return next.slice(0, 30)
      })
    }, 3000 + Math.random() * 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden border-y border-[#192433]/60 bg-[#080d14]/80 backdrop-blur-sm">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#080d14] to-transparent z-10 pointer-events-none" />
      {/* Right fade + DEMO label */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#080d14] to-transparent z-10 pointer-events-none flex items-center justify-end pr-2">
        <span className="text-[8px] font-mono tracking-wider text-[#2a3a4a] border border-[#1a2535] rounded px-1.5 py-0.5 bg-[#080d14]">
          DEMO
        </span>
      </div>

      <div ref={containerRef} className="flex items-center gap-6 py-2 px-4 ticker-scroll whitespace-nowrap">
        {[...wins, ...wins].map((win, i) => {
          const meta = GAME_LABELS[win.game] ?? { label: win.game, color: '#5ad8ff' }
          const isBig = win.amount >= 200
          return (
            <div key={`${win.id}-${i}`} className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isBig ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: meta.color }} />
              <span className="text-[10px] font-mono text-[#4a5a6d]">{win.username}</span>
              <span className="text-[10px] font-mono text-[#3a4a5a]">won</span>
              <span className={`text-[10px] font-mono font-bold ${isBig ? 'fire-glow' : ''}`}
                style={{ color: isBig ? '#ffd700' : '#59f5a9' }}>
                +{win.amount} cr
              </span>
              <span className="text-[10px] font-mono" style={{ color: meta.color }}>
                {meta.label}
              </span>
              {isBig && <span className="text-xs">🔥</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
