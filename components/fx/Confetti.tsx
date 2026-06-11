'use client'

import { useEffect, useRef } from 'react'

/**
 * Lightweight canvas-based confetti. No external deps.
 * Fires once per `trigger` change. Self-cleans when particles settle.
 */
export default function Confetti({
  trigger,
  intensity = 'normal',
  colors = ['#5ad8ff', '#59f5a9', '#ffd700', '#ff4d6d', '#a78bfa', '#fb923c'],
}: {
  trigger: number | boolean
  intensity?: 'normal' | 'big' | 'jackpot'
  colors?: string[]
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Honor prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const dpr = window.devicePixelRatio || 1
    const w = (canvas.width = window.innerWidth * dpr)
    const h = (canvas.height = window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'

    const count = intensity === 'jackpot' ? 320 : intensity === 'big' ? 180 : 100
    const gravity = 0.18 * dpr
    const drag = 0.985

    type P = { x: number; y: number; vx: number; vy: number; size: number; color: string; rot: number; vr: number; shape: 'rect' | 'circle'; alpha: number }
    const particles: P[] = []

    // Burst from center-top and corners
    const origins: Array<[number, number, number]> = [
      [w / 2, h * 0.25, 1.0],
      [w * 0.2, h * 0.4, 0.5],
      [w * 0.8, h * 0.4, 0.5],
    ]
    for (let i = 0; i < count; i++) {
      const [ox, oy, weight] = origins[Math.floor(Math.random() * origins.length)]
      if (Math.random() > weight) continue
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
      const speed = (8 + Math.random() * 10) * dpr
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4 * dpr,
        vy: Math.sin(angle) * speed,
        size: (4 + Math.random() * 6) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1,
      })
    }

    let frames = 0
    const maxFrames = 240 // ~4s @ 60fps

    const tick = () => {
      frames++
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of particles) {
        if (p.alpha <= 0) continue
        p.vy += gravity
        p.vx *= drag
        p.vy *= drag
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (frames > 120) p.alpha = Math.max(0, p.alpha - 0.012)

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        if (p.y < h + 100 && p.alpha > 0) alive++
      }
      if (alive > 0 && frames < maxFrames) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, w, h)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ctx.clearRect(0, 0, w, h)
    }
  }, [trigger, intensity, colors])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  )
}
