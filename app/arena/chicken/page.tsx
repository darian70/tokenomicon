'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const ArenaLobby = dynamic(() => import('@/components/arena/ArenaLobby'), { ssr: false })
const ArenaDuel = dynamic(() => import('@/components/arena/ArenaDuel'), { ssr: false })

export default function ChickenArenaPage() {
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null)

  const handleEnterDuel = useCallback((duelId: string) => {
    setActiveDuelId(duelId)
  }, [])

  const handleExitDuel = useCallback(() => {
    setActiveDuelId(null)
  }, [])

  return (
    <div className="min-h-screen bg-[#070a10]">
      {activeDuelId ? (
        <ArenaDuel duelId={activeDuelId} onExit={handleExitDuel} />
      ) : (
        <ArenaLobby onEnterDuel={handleEnterDuel} />
      )}
    </div>
  )
}
