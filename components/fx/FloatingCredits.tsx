'use client'

import { useEffect, useState } from 'react'

/**
 * Floating "+N CR" text that drifts upward and fades. Used after game wins.
 */
export default function FloatingCredits({
  amount,
  trigger,
  color = '#59f5a9',
}: {
  amount: number
  trigger: number | boolean
  color?: string
}) {
  const [items, setItems] = useState<Array<{ id: number; delay: number; offsetX: number }>>([])

  useEffect(() => {
    if (!trigger || !amount) return
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return
    const newItems = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      delay: i * 90,
      offsetX: (i - 2.5) * 28,
    }))
    setItems(newItems)
    const t = setTimeout(() => setItems([]), 2200)
    return () => clearTimeout(t)
  }, [trigger, amount])

  if (!items.length) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[99] flex items-center justify-center" aria-hidden>
      <div className="relative">
        {items.map((item) => (
          <span
            key={item.id}
            className="absolute font-display text-2xl sm:text-3xl font-black tabular-nums"
            style={{
              left: `${item.offsetX}px`,
              top: 0,
              color,
              textShadow: `0 0 24px ${color}, 0 2px 8px rgba(0,0,0,0.6)`,
              animation: `float-credit 1.8s ${item.delay}ms cubic-bezier(0.2, 0.6, 0.3, 1) forwards`,
              opacity: 0,
            }}
          >
            +{amount} CR
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes float-credit {
          0%   { transform: translateY(20px) scale(0.6); opacity: 0; }
          15%  { transform: translateY(0) scale(1.15); opacity: 1; }
          30%  { transform: translateY(-10px) scale(1); opacity: 1; }
          100% { transform: translateY(-180px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
