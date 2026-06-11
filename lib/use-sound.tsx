'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Lightweight Web Audio-based UI sound foundation. No external audio files —
 * generates short synthetic blips/chimes at runtime so the app has zero asset
 * cost while still giving casino-style audible feedback for clicks, wins, and
 * losses. Users can mute via the navbar toggle; preference persists in
 * localStorage.
 */

export type SoundName =
  | 'click'
  | 'tier'
  | 'submit'
  | 'win'
  | 'big_win'
  | 'jackpot'
  | 'lose'
  | 'reveal'
  | 'tick'

const STORAGE_KEY = 'tk_muted'

let ctxRef: AudioContext | null = null
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctxRef) return ctxRef
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctxRef = new AC()
    return ctxRef
  } catch {
    return null
  }
}

function blip(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.04, delay = 0) {
  const c = ctx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function sweep(from: number, to: number, duration: number, type: OscillatorType = 'sawtooth', gain = 0.05) {
  const c = ctx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + duration)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

const PATCHES: Record<SoundName, () => void> = {
  click:    () => blip(720, 0.04, 'square', 0.025),
  tier:     () => blip(540, 0.06, 'triangle', 0.03),
  submit:   () => { blip(440, 0.05, 'triangle'); blip(660, 0.06, 'triangle', 0.03, 0.04) },
  reveal:   () => sweep(220, 880, 0.45, 'sawtooth', 0.04),
  tick:     () => blip(820, 0.03, 'square', 0.02),
  win:      () => { blip(660, 0.08, 'triangle', 0.05); blip(880, 0.09, 'triangle', 0.05, 0.08); blip(1100, 0.12, 'triangle', 0.045, 0.18) },
  big_win:  () => {
    [523, 659, 784, 988, 1175].forEach((f, i) => blip(f, 0.18, 'triangle', 0.05, i * 0.1))
    sweep(180, 1200, 0.7, 'sawtooth', 0.025)
  },
  jackpot:  () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => blip(f, 0.22, 'triangle', 0.055, i * 0.08))
    sweep(120, 1500, 1.1, 'sawtooth', 0.03)
    setTimeout(() => [1568, 1319, 1047, 1319, 1568, 2093].forEach((f, i) => blip(f, 0.18, 'triangle', 0.05, i * 0.07)), 700)
  },
  lose:     () => sweep(440, 110, 0.5, 'sawtooth', 0.045),
}

export function useSound() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })

  // Hydrate from localStorage post-mount (in case server-rendered)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMuted(window.localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  const play = useCallback(
    (name: SoundName) => {
      if (muted) return
      try {
        PATCHES[name]?.()
      } catch {
        // Silently swallow — audio is non-critical
      }
    },
    [muted],
  )

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }, [])

  return { play, muted, toggleMuted }
}
