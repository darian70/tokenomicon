'use client'

import { useEffect, useState } from 'react'

interface FeedItem {
  id: string
  displayName: string
  game: string
  reward: number
  createdAt: string
}

const GAME_LABELS: Record<string, string> = {
  token_prophet: 'Token Prophet',
  prompt_golf: 'Prompt Golf',
  bug_exorcist: 'Bug Exorcist',
  context_chicken: 'Context Chicken',
  rate_limit_roulette: 'Rate Roulette',
  benchmark_brawl: 'Benchmark Brawl',
  spot_deepfake: 'Spot the Deepfake',
}

/**
 * Top-of-page marquee showing recent big wins. Polls /api/leaderboard for
 * the live feed every 25s. Hides itself when there are no recent wins.
 */
export default function BigWinTicker() {
  const [items, setItems] = useState<FeedItem[]>([])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/leaderboard')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data?.liveFeed) return
          const filtered: FeedItem[] = data.liveFeed
            .filter((e: FeedItem) => e.reward >= 30)
            .slice(0, 12)
          setItems(filtered)
        })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 25000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!items.length) return null
  const loop = [...items, ...items]

  return (
    <div className="relative w-full overflow-hidden border-b border-[#192433] bg-[#080d14]/90 backdrop-blur-sm">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#080d14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#080d14] to-transparent z-10 pointer-events-none" />

      <div className="flex items-center gap-3 px-4 py-2">
        <span className="flex items-center gap-1.5 flex-shrink-0 px-2 py-0.5 rounded border border-[#ff4d6d]/30 bg-[#ff4d6d]/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d6d] animate-pulse" />
          <span className="text-[9px] font-display font-bold tracking-widest text-[#ff4d6d]">LIVE</span>
        </span>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-8 whitespace-nowrap animate-ticker">
            {loop.map((entry, i) => (
              <span key={`${entry.id}-${i}`} className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-[#a8b8cc] font-bold">{entry.displayName}</span>
                <span className="text-[#3a4a5a]">won</span>
                <span className="text-[#59f5a9] font-bold tabular-nums">+{entry.reward} cr</span>
                <span className="text-[#3a4a5a]">in</span>
                <span className="text-[#5ad8ff]">{GAME_LABELS[entry.game] ?? entry.game.replace(/_/g, ' ')}</span>
                <span className="text-[#1a2535]">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
