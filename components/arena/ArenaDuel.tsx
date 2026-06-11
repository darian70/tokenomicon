'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/lib/toast'

interface DuelMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface DuelPlayer {
  userId: string
  username: string
  rating: number
  totalTokens: number
  crashed: boolean
  connected: boolean
}

interface DuelState {
  id: string
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  model: string
  maxTokens: number
  player: DuelPlayer
  opponent: DuelPlayer | null
  messages: DuelMessage[]
  winnerId?: string
  ratingDelta?: number | null
  newRating?: number | null
}

export default function ArenaDuel({ duelId, onExit }: { duelId: string; onExit: () => void }) {
  const [duel, setDuel] = useState<DuelState | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCrashWarning, setShowCrashWarning] = useState(false)
  const [resultToasted, setResultToasted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Poll duel status
  useEffect(() => {
    const pollDuel = async () => {
      try {
        const res = await fetch(`/api/arena/duel?id=${duelId}`)
        if (!res.ok) {
          if (res.status === 404) {
            onExit()
            return
          }
          throw new Error('Failed to fetch duel')
        }
        const data = await res.json()
        setDuel(data.duel)
        
        if (data.duel.status === 'completed' || data.duel.status === 'abandoned') {
          // Show result for 5 seconds then exit
          setTimeout(() => onExit(), 5000)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection error')
      }
    }

    pollDuel()
    const interval = setInterval(pollDuel, 1000)
    return () => clearInterval(interval)
  }, [duelId, onExit])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [duel?.messages])

  // Show crash warning at 85% tokens
  useEffect(() => {
    if (duel && duel.player.totalTokens > duel.maxTokens * 0.85 && !showCrashWarning) {
      setShowCrashWarning(true)
      toast.warning('Approaching token limit — type STOP to exit safely')
    }
  }, [duel, showCrashWarning, toast])

  // Toast result once when duel completes
  useEffect(() => {
    if (!duel || resultToasted) return
    if (duel.status === 'completed' || duel.status === 'abandoned') {
      const won = duel.winnerId === duel.player.userId
      const delta = duel.ratingDelta
      const deltaStr = delta != null ? ` (${delta >= 0 ? '+' : ''}${delta} rating)` : ''
      if (won) {
        toast.success(`Victory!${deltaStr}`)
      } else {
        toast.error(`Defeated.${deltaStr}`)
      }
      setResultToasted(true)
    }
  }, [duel, resultToasted, toast])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !duel || duel.player.crashed) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/arena/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          action: 'message',
          content: input.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.crashed) {
        // Player crashed
        setShowCrashWarning(false)
      }

      setInput('')
      setDuel(data.duel)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [input, duelId, isLoading, duel])

  const forfeit = useCallback(async () => {
    try {
      await fetch('/api/arena/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duelId, action: 'forfeit' }),
      })
      toast.info('Duel forfeited')
      onExit()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to forfeit'
      setError(msg)
      toast.error(msg)
    }
  }, [duelId, onExit, toast])

  const stopSafely = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/arena/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          action: 'message',
          content: 'STOP',
        }),
      })

      const data = await res.json()
      setDuel(data.duel)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to stop'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [duelId, toast])

  if (!duel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a10]">
        <div className="w-12 h-12 border-2 border-[#ffd700]/20 border-t-[#ffd700] rounded-full animate-spin" />
      </div>
    )
  }

  const tokenPercentage = (duel.player.totalTokens / duel.maxTokens) * 100
  const isDangerZone = tokenPercentage > 85
  const isCritical = tokenPercentage > 95

  return (
    <div className="min-h-screen bg-[#070a10] flex flex-col">
      {/* Header */}
      <div className="bg-[#0c111a] border-b border-[#192433] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-3 py-2 border border-[#2a3a50] text-[#6b7a8d] text-xs font-mono rounded-lg hover:border-[#3a4a60] hover:text-white transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Leave
            </button>
            <div>
              <h1 className="font-display text-base font-black text-[#ffd700] tracking-wider">CONTEXT CHICKEN ARENA</h1>
              <p className="text-[10px] font-mono text-[#4a5a6d]">{duel.model}</p>
            </div>
          </div>

          {duel.opponent ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-[#192433] bg-[#080d14]">
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-[#a8b8cc]">{duel.opponent.username}</p>
                <p className="text-[10px] font-mono text-[#4a5a6d]">Rating {duel.opponent.rating}</p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${duel.opponent.connected ? 'bg-[#59f5a9] shadow-[0_0_8px_#59f5a9]' : 'bg-[#3a4a5a]'}`} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#192433] bg-[#080d14]">
              <div className="w-2 h-2 rounded-full bg-[#ffd700] animate-pulse" />
              <span className="text-xs font-mono text-[#ffd700]">Finding opponent...</span>
            </div>
          )}
        </div>
      </div>

      {/* Token Bar */}
      <div className="bg-[#080d14] border-b border-[#192433] px-6 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-[#4a5a6d]">Token Burn — Your Side</span>
            <span className={`text-xs font-mono font-bold ${isCritical ? 'text-[#ff4d6d]' : isDangerZone ? 'text-[#ffd700]' : 'text-[#a8b8cc]'}`}>
              {duel.player.totalTokens.toLocaleString()} / {duel.maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 bg-[#0a1520] rounded-full overflow-hidden border border-[#192433]">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.min(tokenPercentage, 100)}%`,
                background: isCritical
                  ? '#ff4d6d'
                  : isDangerZone
                    ? 'linear-gradient(90deg, #ffd700, #ff8c00)'
                    : 'linear-gradient(90deg, #59f5a9, #5ad8ff)',
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#2a3a4a] mt-1">
            <span>0</span>
            <span className="text-[#ffd700]/50">85% danger zone</span>
            <span className="text-[#ff4d6d]/50">100% CRASH</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {showCrashWarning && duel.status === 'active' && (
        <div className="bg-[#ff4d6d]/10 border-b border-[#ff4d6d]/30 px-6 py-2.5 text-center">
          <p className="text-xs font-mono text-[#ff4d6d] font-bold animate-pulse">
            CRITICAL — Approaching token limit. Type STOP to exit safely before you crash.
          </p>
        </div>
      )}

      {/* Waiting State */}
      {duel.status === 'waiting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 border-2 border-[#ffd700]/20 border-t-[#ffd700] rounded-full animate-spin mx-auto" />
            <p className="font-display text-lg font-black text-[#ffd700] tracking-widest">WAITING FOR OPPONENT</p>
            <p className="text-xs font-mono text-[#4a5a6d]">Both players must connect to begin</p>
          </div>
        </div>
      )}

      {/* Result State */}
      {(duel.status === 'completed' || duel.status === 'abandoned') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 p-10 rounded-2xl border border-[#192433] bg-[#0c111a] min-w-[320px]">
            {duel.winnerId === duel.player.userId ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#59f5a9]/10 border-2 border-[#59f5a9]/40 flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                  </svg>
                </div>
                <p className="font-display text-3xl font-black text-[#59f5a9] tracking-widest">VICTORY</p>
                <p className="text-sm font-mono text-[#6b7a8d]">You outlasted the arena</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#ff4d6d]/10 border-2 border-[#ff4d6d]/40 flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                  </svg>
                </div>
                <p className="font-display text-3xl font-black text-[#ff4d6d] tracking-widest">DEFEAT</p>
                <p className="text-sm font-mono text-[#6b7a8d]">Better calibration next time</p>
              </>
            )}
            {/* Rating change badge */}
            {duel.ratingDelta != null && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border font-mono text-sm font-bold mx-auto"
                style={{
                  borderColor: (duel.ratingDelta ?? 0) >= 0 ? '#59f5a9' : '#ff4d6d',
                  color: (duel.ratingDelta ?? 0) >= 0 ? '#59f5a9' : '#ff4d6d',
                  background: (duel.ratingDelta ?? 0) >= 0 ? 'rgba(89,245,169,0.08)' : 'rgba(255,77,109,0.08)',
                }}
              >
                <span>{(duel.ratingDelta ?? 0) >= 0 ? '+' : ''}{duel.ratingDelta} rating</span>
                {duel.newRating != null && (
                  <span className="text-[10px] opacity-70">→ {duel.newRating}</span>
                )}
              </div>
            )}
            <p className="text-[10px] font-mono text-[#3a4a5a] pt-2">Returning to lobby in 5 seconds...</p>
          </div>
        </div>
      )}

      {/* Active Game */}
      {duel.status === 'active' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-3">
              {duel.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl px-4 py-3 text-sm font-mono leading-relaxed ${
                    msg.role === 'system'
                      ? 'bg-[#080d14] border border-[#192433] text-[#4a5a6d] text-center text-xs'
                      : msg.role === 'user'
                        ? 'bg-[#ffd700]/8 border border-[#ffd700]/20 ml-12 text-[#e0c060]'
                        : 'bg-[#0c111a] border border-[#192433] mr-12 text-[#a8b8cc]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="bg-[#0c111a] border-t border-[#192433] px-4 py-4">
            <div className="max-w-3xl mx-auto space-y-3">
              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/30">
                  <p className="text-xs font-mono text-[#ff4d6d]">{error}</p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder='Type a message… or "STOP" to exit safely'
                  disabled={isLoading || duel.player.crashed}
                  className="flex-1 px-4 py-3 bg-[#070a10] border border-[#2a3a50] rounded-xl text-sm font-mono text-white placeholder:text-[#2a3a50] focus:border-[#ffd700]/40 focus:outline-none disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || duel.player.crashed}
                  className="px-6 py-3 bg-[#ffd700] text-[#070a10] font-display font-black text-xs tracking-widest rounded-xl hover:bg-[#e6c200] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? '···' : 'SEND'}
                </button>
              </div>
              <div className="flex justify-between">
                <button onClick={stopSafely} disabled={isLoading} className="text-[11px] font-mono text-[#ffd700]/70 hover:text-[#ffd700] transition-colors disabled:opacity-40">
                  Stop safely (voluntary exit)
                </button>
                <button onClick={forfeit} disabled={isLoading} className="text-[11px] font-mono text-[#ff4d6d]/70 hover:text-[#ff4d6d] transition-colors disabled:opacity-40">
                  Forfeit duel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
