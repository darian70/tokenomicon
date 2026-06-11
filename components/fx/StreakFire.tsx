'use client'

import { useEffect, useState } from 'react'

export default function StreakFire({ streak }: { streak: number }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([])

  useEffect(() => {
    if (streak < 2) { setParticles([]); return }
    const count = Math.min(streak * 2, 12)
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 20 + Math.random() * 60,
        delay: Math.random() * 2,
      }))
    )
  }, [streak])

  if (streak < 2) return null

  const intensity = streak >= 10 ? 'legendary' : streak >= 5 ? 'hot' : 'warm'
  const colors = {
    warm: { text: '#ff8c42', glow: 'rgba(255,140,66,0.5)' },
    hot: { text: '#ff6b35', glow: 'rgba(255,107,53,0.6)' },
    legendary: { text: '#ffd700', glow: 'rgba(255,215,0,0.7)' },
  }
  const c = colors[intensity]

  return (
    <div className="relative inline-flex items-center gap-1.5 group">
      <div className="relative">
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute w-1 h-1 rounded-full opacity-0"
            style={{
              left: `${p.x}%`,
              bottom: '100%',
              backgroundColor: c.text,
              animation: `fire-particle 1.2s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
        <span
          className="text-base leading-none fire-glow select-none"
          style={{ color: c.text }}
        >
          🔥
        </span>
      </div>
      <span
        className="text-xs font-display font-black tabular-nums tracking-wider"
        style={{ color: c.text, textShadow: `0 0 12px ${c.glow}` }}
      >
        {streak}
      </span>
      {streak >= 5 && (
        <span
          className="text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
          style={{
            color: c.text,
            backgroundColor: `${c.text}15`,
            border: `1px solid ${c.text}30`,
          }}
        >
          {intensity === 'legendary' ? 'LEGENDARY' : 'ON FIRE'}
        </span>
      )}
      <style jsx>{`
        @keyframes fire-particle {
          0%   { opacity: 0.8; transform: translateY(0) scale(1); }
          50%  { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-16px) scale(0.3); }
        }
      `}</style>
    </div>
  )
}
