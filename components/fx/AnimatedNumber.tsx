'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly tweens between numeric values. Used for balances and scores.
 */
export default function AnimatedNumber({
  value,
  duration = 800,
  format,
  className,
  style,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
  style?: React.CSSProperties
}) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | null>(null)
  const fromRef = useRef(value)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || duration <= 0) {
      setDisplay(value)
      return
    }
    fromRef.current = display
    startRef.current = performance.now()
    const target = value

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const next = fromRef.current + (target - fromRef.current) * eased
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const rounded = Math.round(display)
  return (
    <span className={className} style={style}>
      {format ? format(rounded) : rounded.toLocaleString()}
    </span>
  )
}
