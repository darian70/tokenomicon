'use client'

import { useEffect, useState } from 'react'

type Counts = Record<string, number>

let cached: Counts = {}
let lastFetch = 0
let inflight: Promise<Counts> | null = null
const listeners = new Set<(c: Counts) => void>()
const TTL = 15_000 // refresh at most every 15s

async function fetchCounts(): Promise<Counts> {
  const now = Date.now()
  if (now - lastFetch < TTL) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/games/active-players', { cache: 'no-store' })
      if (!res.ok) return cached
      const json = await res.json()
      cached = (json.counts ?? {}) as Counts
      lastFetch = now
      listeners.forEach((l) => l(cached))
      return cached
    } catch {
      return cached
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Returns live player count for a given gameId, polling /api/games/active-players
 * with a shared module-level cache + listeners so every badge only triggers one
 * network call per 15s. Returns null until first fetch resolves.
 */
export function useActivePlayers(gameId: string): number | null {
  const [count, setCount] = useState<number | null>(
    lastFetch > 0 ? (cached[gameId] ?? 0) : null
  )

  useEffect(() => {
    let mounted = true
    const listener = (c: Counts) => {
      if (mounted) setCount(c[gameId] ?? 0)
    }
    listeners.add(listener)
    fetchCounts().then((c) => mounted && setCount(c[gameId] ?? 0))
    const id = setInterval(() => fetchCounts(), TTL)
    return () => {
      mounted = false
      listeners.delete(listener)
      clearInterval(id)
    }
  }, [gameId])

  return count
}
