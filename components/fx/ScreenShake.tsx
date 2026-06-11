'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function ScreenShake({
  trigger,
  intensity = 'normal',
  children,
}: {
  trigger: number
  intensity?: 'normal' | 'big' | 'jackpot'
  children: ReactNode
}) {
  const [shaking, setShaking] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const prevTrigger = useRef(trigger)

  useEffect(() => {
    if (trigger !== prevTrigger.current && trigger > 0) {
      prevTrigger.current = trigger
      setShaking(true)
      if (intensity === 'jackpot') setFlashing(true)
      const t1 = setTimeout(() => setShaking(false), intensity === 'jackpot' ? 600 : 400)
      const t2 = setTimeout(() => setFlashing(false), 300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [trigger, intensity])

  return (
    <div className={`relative ${shaking ? (intensity === 'jackpot' ? 'shake-lg' : 'shake-sm') : ''}`}>
      {flashing && (
        <div className="fixed inset-0 z-[100] pointer-events-none bg-white/70 flash-overlay" />
      )}
      {children}
    </div>
  )
}
