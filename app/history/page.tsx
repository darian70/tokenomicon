'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const GAME_LABELS: Record<string, string> = {
  token_prophet: 'Token Prophet',
  prompt_golf: 'Prompt Golf',
  bug_exorcist: 'Bug Exorcist',
  context_chicken: 'Context Chicken',
  rate_limit_roulette: 'Rate Limit Roulette',
  benchmark_brawl: 'Benchmark Brawl',
  spot_deepfake: 'Spot Deepfake',
  prompt_crash: 'Prompt Crash',
  token_mines: 'Token Mines',
}

type Attempt = {
  id: string
  game: string
  score: number
  rewardAmount: number
  createdAt: string
  fairness: {
    sessionId: string
    clientSeed: string | null
    serverSeed: string | null
    serverSeedHash: string | null
    nonce: string | null
  }
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? '#ffd700' : score >= 70 ? '#59f5a9' : score >= 40 ? '#5ad8ff' : '#4a5a6d'
  return (
    <span className="text-sm font-mono font-bold" style={{ color }}>
      {score}
    </span>
  )
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [gameFilter, setGameFilter] = useState<string>('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(
    async (cursor?: string, replace = false) => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (gameFilter) params.set('game', gameFilter)
      const r = await fetch(`/api/games/history?${params}`)
      const data = await r.json()
      if (data.attempts) {
        setAttempts((prev) => (replace ? data.attempts : [...prev, ...data.attempts]))
        setNextCursor(data.nextCursor)
        setHasMore(data.hasMore)
      }
      setLoading(false)
      setLoadingMore(false)
    },
    [gameFilter],
  )

  useEffect(() => {
    setLoading(true)
    setAttempts([])
    load(undefined, true)
  }, [load])

  const loadMore = () => {
    if (!nextCursor) return
    setLoadingMore(true)
    load(nextCursor)
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-widest">GAME HISTORY</h1>
            <p className="text-xs text-[#4a5a6d] font-mono">Your past attempts with provably-fair seeds</p>
          </div>
          {/* Filter */}
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="bg-[#0c111a] border border-[#192433] rounded-lg px-3 py-1.5 text-xs font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
          >
            <option value="">All games</option>
            {Object.entries(GAME_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-[#0c111a] rounded-xl border border-[#192433] animate-pulse" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-[#a8b8cc] font-mono text-sm">No games played yet.</p>
            <p className="text-[#4a5a6d] text-xs mt-1">
              Head to the{' '}
              <Link href="/arena" className="text-[#5ad8ff] hover:underline">
                arena
              </Link>{' '}
              to start playing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map((a) => {
              const isOpen = expanded === a.id
              const hasServerSeed = !!a.fairness.serverSeed
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#0a1520] transition-colors text-left"
                  >
                    {/* Game name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-white truncate">
                        {GAME_LABELS[a.game] ?? a.game.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">
                        {relativeTime(a.createdAt)}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right w-16">
                      <p className="text-[10px] text-[#4a5a6d] font-mono">SCORE</p>
                      <ScoreBadge score={a.score} />
                    </div>

                    {/* Reward */}
                    <div className="text-right w-20">
                      <p className="text-[10px] text-[#4a5a6d] font-mono">EARNED</p>
                      <p className="text-sm font-mono font-bold text-[#59f5a9]">
                        {a.rewardAmount > 0 ? `+${a.rewardAmount}` : '—'}
                      </p>
                    </div>

                    {/* Seed indicator */}
                    <div className="flex items-center gap-1.5 w-20 justify-end">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: hasServerSeed ? '#59f5a9' : '#4a5a6d' }}
                      />
                      <span className="text-[10px] font-mono text-[#4a5a6d]">
                        {hasServerSeed ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>

                    <span className="text-[#4a5a6d] text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#192433] px-5 py-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-[#4a5a6d] mb-1">SESSION ID</p>
                          <p className="text-[#a8b8cc] break-all">{a.fairness.sessionId}</p>
                        </div>
                        <div>
                          <p className="text-[#4a5a6d] mb-1">NONCE</p>
                          <p className="text-[#a8b8cc]">{a.fairness.nonce ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#4a5a6d] mb-1">CLIENT SEED</p>
                          <p className="text-[#a8b8cc] break-all">{a.fairness.clientSeed ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#4a5a6d] mb-1">SERVER SEED HASH</p>
                          <p className="text-[#a8b8cc] break-all">{a.fairness.serverSeedHash ?? '—'}</p>
                        </div>
                        {hasServerSeed && (
                          <div className="col-span-2">
                            <p className="text-[#4a5a6d] mb-1">SERVER SEED (revealed)</p>
                            <p className="text-[#59f5a9] break-all">{a.fairness.serverSeed}</p>
                          </div>
                        )}
                      </div>

                      {(a.game === 'prompt_crash' || a.game === 'token_mines') &&
                        hasServerSeed &&
                        a.fairness.clientSeed &&
                        a.fairness.nonce && (
                          <Link
                            href={`/verify?game=${a.game}&serverSeed=${encodeURIComponent(a.fairness.serverSeed!)}&clientSeed=${encodeURIComponent(a.fairness.clientSeed)}&nonce=${a.fairness.nonce}`}
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5ad8ff] hover:text-[#5ad8ff]/80 transition-colors"
                          >
                            Verify independently →
                          </Link>
                        )}
                    </div>
                  )}
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-xs font-mono text-[#4a5a6d] hover:text-[#a8b8cc] transition-colors disabled:opacity-40"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
