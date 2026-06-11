'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GAME_CATALOG } from '@/lib/game-catalog'

function getSeededDailyGame() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return GAME_CATALOG[seed % GAME_CATALOG.length]
}

function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

function formatCountdown(ms: number) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function DailyChallenge() {
  const game = getSeededDailyGame()
  const [countdown, setCountdown] = useState(getTimeUntilMidnight())

  useEffect(() => {
    const id = setInterval(() => setCountdown(getTimeUntilMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-5 game-card-hover"
      style={{
        borderColor: `${game.accent}40`,
        background: `linear-gradient(135deg, ${game.accentBg} 0%, rgba(12,17,26,0.98) 100%)`,
        '--glow-color': game.accent,
      } as React.CSSProperties}
    >
      {/* Animated accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${game.accent}, transparent)`,
          animation: 'shimmer 3s infinite',
          backgroundSize: '200% 100%',
        }}
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded"
              style={{
                color: game.accent,
                backgroundColor: `${game.accent}15`,
                border: `1px solid ${game.accent}30`,
              }}
            >
              DAILY CHALLENGE
            </span>
            <span className="text-[9px] font-mono text-[#4a5a6d]">2× BONUS</span>
          </div>
          <h3 className="font-display text-sm font-bold text-white tracking-wider">{game.name}</h3>
          <p className="text-[10px] font-mono text-[#6b7a8d] mt-1">{game.tagline}</p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-mono text-[#4a5a6d] tracking-wider">EXPIRES IN</p>
            <p className="text-sm font-mono font-bold tabular-nums" style={{ color: game.accent }}>
              {formatCountdown(countdown)}
            </p>
          </div>
          <Link
            href={`/games/${game.slug}`}
            className="px-4 py-2 text-[10px] font-display font-bold tracking-widest rounded-lg transition-all hover:scale-105 active:scale-95 breathe"
            style={{
              backgroundColor: game.accent,
              color: '#000',
              '--breathe-color': `${game.accent}40`,
            } as React.CSSProperties}
          >
            PLAY NOW
          </Link>
        </div>
      </div>

      {/* Reward callout */}
      <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#4a5a6d]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={game.accent} strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span>Win the daily challenge for <strong style={{ color: game.accent }}>double bonus compute</strong></span>
      </div>
    </div>
  )
}
