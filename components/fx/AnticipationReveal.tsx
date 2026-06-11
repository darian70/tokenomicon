'use client'

import { useEffect, useState } from 'react'
import { useSound } from '@/lib/use-sound'

/**
 * 3-2-1-style anticipation countdown shown before revealing a game result.
 * Renders nothing once finished (parent flips to result UI).
 */
export default function AnticipationReveal({
  accentColor,
  onComplete,
  steps = ['3', '2', '1', 'GO'],
  durationMs = 400,
}: {
  accentColor: string
  onComplete: () => void
  steps?: string[]
  durationMs?: number
}) {
  const [idx, setIdx] = useState(0)
  const { play } = useSound()

  useEffect(() => {
    play('tick')
    const id = setInterval(() => {
      setIdx((i) => {
        const next = i + 1
        if (next < steps.length) {
          play('tick')
        } else {
          play('reveal')
        }
        return next
      })
    }, durationMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (idx >= steps.length) onComplete()
  }, [idx, steps.length, onComplete])

  if (idx >= steps.length) return null
  const label = steps[idx]
  const isGo = label.toLowerCase() === 'go' || label.toLowerCase() === 'reveal'

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-4 select-none">
      <div className="relative">
        <div
          className="absolute inset-0 blur-3xl opacity-50 scale-150 rounded-full"
          style={{ background: isGo ? '#fbbf24' : accentColor }}
        />
        <p
          key={idx}
          className="relative font-display font-black tabular-nums"
          style={{
            fontSize: isGo ? '5rem' : '6.5rem',
            lineHeight: 1,
            color: isGo ? '#fbbf24' : accentColor,
            textShadow: `0 0 60px ${isGo ? '#fbbf24' : accentColor}`,
            animation: 'count-pop 400ms cubic-bezier(0.2, 0.7, 0.3, 1.4)',
          }}
        >
          {label}
        </p>
      </div>
      <p className="text-[10px] font-mono tracking-[0.3em] text-white/30">REVEALING RESULT</p>
      <style jsx>{`
        @keyframes count-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          40%  { transform: scale(1.2); opacity: 1; }
          70%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.95; }
        }
      `}</style>
    </div>
  )
}
