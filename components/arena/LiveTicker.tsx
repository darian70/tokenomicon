'use client'

import { useState, useEffect, useRef } from 'react'

const STATIC_MESSAGES = [
  { text: 'Buy compute credits · play skill games · earn bonus credits', highlight: false },
  { text: '100 free arena credits every day — no purchase required', highlight: true },
  { text: '7 skill games — Token Prophet · Prompt Golf · Bug Exorcist · Context Chicken · Rate Roulette · Benchmark Brawl · Spot Deepfake', highlight: false },
  { text: 'Winnings credit instantly — use via your API key', highlight: true },
  { text: 'One key, all providers — OpenAI · Anthropic · Groq · DeepSeek · Google', highlight: false },
  { text: '15+ models from economy to premium tiers', highlight: false },
]

interface LiveEvent {
  displayName: string
  game: string
  score: number
  reward: number
}

export default function LiveTicker() {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    esRef.current = es
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as LiveEvent
        setLiveEvents((prev) => [data, ...prev].slice(0, 20))
      } catch { /* ignore parse errors */ }
    }
    return () => es.close()
  }, [])

  const liveMessages: Array<{ text: string; isLive: boolean; highlight?: boolean }> = liveEvents.map((e) => ({
    text: `${e.displayName} scored ${e.score.toLocaleString()} on ${e.game.replace(/_/g, ' ')} +${e.reward} cr`,
    isLive: true,
  }))

  const staticMessages: Array<{ text: string; isLive: boolean; highlight?: boolean }> = STATIC_MESSAGES.map((m) => ({
    text: m.text,
    isLive: false,
    highlight: m.highlight,
  }))

  const allMessages = [...liveMessages, ...staticMessages]
  const duplicatedMessages = [...allMessages, ...allMessages]

  return (
    <div className="bg-[#080d14] border-b border-[#192433] py-2 overflow-hidden flex-shrink-0">
      <div className="flex gap-8 animate-ticker whitespace-nowrap" style={{ width: 'max-content' }}>
        {duplicatedMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-[11px] font-mono px-2
              ${msg.isLive ? 'text-[#5ad8ff]' : msg.highlight ? 'text-[#59f5a9]' : 'text-[#3a4a5a]'}
            `}
          >
            {msg.isLive && (
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5ad8ff] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#5ad8ff]" />
              </span>
            )}
            {!msg.isLive && msg.highlight && (
              <span className="text-[#59f5a9]">★</span>
            )}
            <span>{msg.text}</span>
            <span className="mx-4 text-[#1a2535]">·</span>
          </div>
        ))}
      </div>
    </div>
  )
}
