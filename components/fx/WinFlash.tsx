'use client'

import { useEffect, useState } from 'react'

/**
 * Full-screen color flash + radial glow used to punctuate big wins.
 */
export default function WinFlash({ trigger, color = '#59f5a9' }: { trigger: number | boolean; color?: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!trigger) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 700)
    return () => clearTimeout(t)
  }, [trigger])

  if (!visible) return null
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[98]"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${color}28 0%, transparent 70%)`,
        animation: 'win-flash 0.7s ease-out forwards',
      }}
      aria-hidden
    >
      <style jsx>{`
        @keyframes win-flash {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
