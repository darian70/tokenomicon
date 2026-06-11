'use client'

import { useEffect, useRef } from 'react'

/**
 * Slow-drifting ambient particles used as backdrop on game pages.
 * Cheap canvas-based ~30fps render. Self-paused when off-screen / reduced motion.
 */
export default function AmbientParticles({
  color = 'rgba(90,216,255,0.35)',
  count = 28,
  speed = 0.4,
}: {
  color?: string
  count?: number
  speed?: number
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = (canvas.width = canvas.offsetWidth * dpr)
    let h = (canvas.height = canvas.offsetHeight * dpr)

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (0.6 + Math.random() * 1.8) * dpr,
      vx: (Math.random() - 0.5) * speed * dpr,
      vy: -(0.2 + Math.random() * speed) * dpr,
      a: 0.25 + Math.random() * 0.55,
    }))

    let raf = 0
    let lastT = 0
    const tick = (t: number) => {
      if (t - lastT < 33) {
        raf = requestAnimationFrame(tick)
        return
      }
      lastT = t
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        ctx.globalAlpha = p.a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth * dpr
      h = canvas.height = canvas.offsetHeight * dpr
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [color, count, speed])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
}
