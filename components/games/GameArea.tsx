'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useArenaStore } from '@/lib/store'
import type { ArenaGameId, DifficultyTier, ProgressionUpdate } from '@/lib/types'
import Confetti from '@/components/fx/Confetti'
import FloatingCredits from '@/components/fx/FloatingCredits'
import WinFlash from '@/components/fx/WinFlash'
import AnticipationReveal from '@/components/fx/AnticipationReveal'
import ScreenShake from '@/components/fx/ScreenShake'
import { useSound } from '@/lib/use-sound'
import { useActivePlayers } from '@/lib/use-active-players'

const TIER_META: Record<DifficultyTier, { label: string; color: string; cost: number }> = {
  sandbox:    { label: 'SANDBOX',    color: 'text-acid',  cost: 15 },
  production: { label: 'PRODUCTION', color: 'text-gold',  cost: 30 },
  blackbox:   { label: 'BLACKBOX',   color: 'text-blood', cost: 60 },
}

const GAME_META: Record<ArenaGameId, {
  icon: string; name: string; description: string;
  accentColor: string; glowColor: string; bgGradient: string;
}> = {
  token_prophet:       { icon: '🔮', name: 'Token Prophet',     description: 'Forecast how many tokens the model will output. Closer = more credits.',                    accentColor: '#a78bfa', glowColor: 'rgba(167,139,250,0.4)',  bgGradient: 'from-[#0d0a1f] to-[#080d14]' },
  prompt_golf:         { icon: '⛳', name: 'Prompt Golf',       description: 'Write the shortest prompt that hits every required target. Brevity pays.',                   accentColor: '#34d399', glowColor: 'rgba(52,211,153,0.4)',   bgGradient: 'from-[#061a12] to-[#080d14]' },
  bug_exorcist:        { icon: '🐛', name: 'Bug Exorcist',      description: 'Broken code. Three patches. Only one fixes the root cause. Choose wisely.',                  accentColor: '#f87171', glowColor: 'rgba(248,113,113,0.4)',  bgGradient: 'from-[#1a0808] to-[#080d14]' },
  context_chicken:     { icon: '🐔', name: 'Context Chicken',   description: 'Name the minimum context window. Too small = fail. Too big = wasted. Nail it.',             accentColor: '#fbbf24', glowColor: 'rgba(251,191,36,0.4)',   bgGradient: 'from-[#1a1206] to-[#080d14]' },
  rate_limit_roulette: { icon: '⚡', name: 'Rate Roulette',     description: 'Three providers. One prompt. Which responds first? Know your latencies.',                   accentColor: '#38bdf8', glowColor: 'rgba(56,189,248,0.4)',   bgGradient: 'from-[#050e1a] to-[#080d14]' },
  benchmark_brawl:     { icon: '⚔️', name: 'Benchmark Brawl',  description: 'Three models tackle the same task. Read their outputs. Crown the winner.',                  accentColor: '#fb923c', glowColor: 'rgba(251,146,60,0.4)',   bgGradient: 'from-[#1a0c05] to-[#080d14]' },
  spot_deepfake:       { icon: '👁', name: 'Spot the AI',       description: '4 messages. 3 human-written. 1 AI. Read carefully — the machine is getting good at hiding.',  accentColor: '#e879f9', glowColor: 'rgba(232,121,249,0.4)',  bgGradient: 'from-[#140818] to-[#080d14]' },
  prompt_crash:        { icon: '🚀', name: 'Prompt Crash',     description: 'The multiplier is climbing. Cash out before it crashes.',                                     accentColor: '#fb923c', glowColor: 'rgba(251,146,60,0.45)', bgGradient: 'from-[#1a0c05] to-[#080d14]' },
  token_mines:         { icon: '💎', name: 'Token Mines',      description: 'Reveal safe tokens. Each pick boosts your multiplier. One mine ends the run.',              accentColor: '#5eead4', glowColor: 'rgba(94,234,212,0.45)', bgGradient: 'from-[#051a17] to-[#080d14]' },
}

function Scanlines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)',
      }}
    />
  )
}

function GameGlow({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-20"
      style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${color}, transparent)` }}
    />
  )
}

export default function GameArea() {
  const { activeGame, selectedTier, setSelectedTier, gameStatus, activeSession, lastResult, lastProgression, startGame, submitGame, resetGame, balances } = useArenaStore()
  const meta = GAME_META[activeGame]
  const activePlayers = useActivePlayers(activeGame)
  const tierInfo = TIER_META[selectedTier]
  const arenaBalance = balances?.arena_credits ?? 0
  const canAfford = arenaBalance >= tierInfo.cost

  // Reveal anticipation gate — when result lands, run a quick countdown before
  // showing the actual scoreboard. Resets when the game returns to idle.
  const [revealing, setRevealing] = useState(false)
  const lastResultKey = useRef<string | null>(null)
  useEffect(() => {
    if (gameStatus === 'result' && lastResult) {
      const key = `${lastResult.game}-${lastResult.score}-${lastResult.rewardAmount}`
      if (lastResultKey.current !== key) {
        lastResultKey.current = key
        setRevealing(true)
      }
    } else if (gameStatus === 'idle') {
      lastResultKey.current = null
      setRevealing(false)
    }
  }, [gameStatus, lastResult])

  return (
    <div className={`relative flex flex-col h-full overflow-hidden bg-gradient-to-b ${meta.bgGradient}`}>
      <Scanlines />
      <GameGlow color={meta.glowColor} />

      {/* Header bar */}
      <div className="relative z-20 px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <h2 className="font-display text-xs font-bold tracking-[0.2em]" style={{ color: meta.accentColor }}>
              {meta.name.toUpperCase()}
            </h2>
            <p className="text-[10px] text-white/30 font-mono hidden sm:block max-w-xs truncate">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activePlayers !== null && activePlayers > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse flex-shrink-0" />
              <span className="text-[9px] font-mono text-[#59f5a9]/70">{activePlayers} playing</span>
            </div>
          )}
          {gameStatus === 'active' && activeSession?.expiresAt && (
            <CountdownTimer expiresAt={activeSession.expiresAt} accentColor={meta.accentColor} />
          )}
          <div className="text-right">
            <p className="text-[9px] text-white/30 font-mono tracking-widest">TIER</p>
            <p className={`text-xs font-display font-bold tracking-widest ${tierInfo.color}`}>{tierInfo.label}</p>
          </div>
        </div>
      </div>

      {/* Tier selector */}
      {gameStatus === 'idle' && (
        <TierSelector selectedTier={selectedTier} setSelectedTier={setSelectedTier} />
      )}

      {/* Game body */}
      <div className="relative z-20 flex-1 overflow-y-auto">
        {gameStatus === 'idle' && (
          <IdleState game={activeGame} tier={selectedTier} canAfford={canAfford} arenaBalance={arenaBalance} onStart={startGame} />
        )}
        {gameStatus === 'active' && activeSession && (
          <div className="p-5">
            <ActiveGame session={activeSession} onSubmit={submitGame} accentColor={meta.accentColor} />
          </div>
        )}
        {gameStatus === 'loading' && (
          <LoadingState accentColor={meta.accentColor} game={activeGame} />
        )}
        {gameStatus === 'submitting' && (
          <SubmittingState accentColor={meta.accentColor} />
        )}
        {gameStatus === 'result' && lastResult && (
          revealing
            ? <AnticipationReveal accentColor={meta.accentColor} onComplete={() => setRevealing(false)} />
            : <ResultState result={lastResult} progression={lastProgression} onPlayAgain={resetGame} accentColor={meta.accentColor} />
        )}
      </div>
    </div>
  )
}

function TierSelector({ selectedTier, setSelectedTier }: {
  selectedTier: DifficultyTier
  setSelectedTier: (t: DifficultyTier) => void
}) {
  const { play } = useSound()
  return (
    <div className="relative z-20 flex gap-1 px-4 pt-3">
      {(Object.keys(TIER_META) as DifficultyTier[]).map((tier) => {
        const t = TIER_META[tier]
        const active = selectedTier === tier
        return (
          <button
            key={tier}
            onClick={() => { play('tier'); setSelectedTier(tier) }}
            className={`flex-1 py-1.5 text-[9px] font-display tracking-widest border transition-all duration-150 cursor-crosshair ${
              active
                ? `border-white/20 bg-white/10 ${t.color}`
                : 'border-white/5 text-white/20 hover:border-white/15 hover:text-white/40'
            }`}
          >
            {t.label} · {t.cost}cr
          </button>
        )
      })}
    </div>
  )
}

function CountdownTimer({ expiresAt, accentColor }: { expiresAt: string; accentColor: string }) {
  const [remaining, setRemaining] = useState<number>(0)
  useEffect(() => {
    const target = new Date(expiresAt).getTime()
    const tick = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60
  const urgent = remaining <= 30
  const pct = Math.min(100, (remaining / 120) * 100)
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`text-xs font-mono font-bold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : ''}`}
        style={urgent ? undefined : { color: accentColor }}>
        {min}:{sec.toString().padStart(2, '0')}
      </span>
      <div className="w-16 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: urgent ? '#f87171' : accentColor }} />
      </div>
    </div>
  )
}

function IdleState({ game, tier, canAfford, arenaBalance, onStart }: {
  game: ArenaGameId; tier: DifficultyTier; canAfford: boolean; arenaBalance: number; onStart: () => void
}) {
  const meta = GAME_META[game]
  const tierInfo = TIER_META[tier]
  const [pulse, setPulse] = useState(false)
  const { play } = useSound()
  const handleStart = () => { play('submit'); onStart() }

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1200)
    return () => clearInterval(id)
  }, [])

  const tierMaxReward: Record<DifficultyTier, number> = { sandbox: 60, production: 120, blackbox: 240 }

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-8 text-center px-6 py-10">
      {/* Giant icon with glow halo */}
      <div className="relative">
        <div className="absolute inset-0 blur-2xl opacity-50 scale-150"
          style={{ background: meta.glowColor }} />
        <span className="relative text-7xl drop-shadow-2xl select-none" style={{ filter: `drop-shadow(0 0 24px ${meta.accentColor})` }}>
          {meta.icon}
        </span>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h3 className="font-display text-2xl font-black tracking-[0.15em] text-white">{meta.name.toUpperCase()}</h3>
        <p className="text-sm text-white/40 font-mono leading-relaxed max-w-sm">{meta.description}</p>
      </div>

      {/* Stakes bar */}
      <div className="flex items-center gap-6 text-center">
        <div>
          <p className="text-[9px] font-mono text-white/25 tracking-widest">ENTRY</p>
          <p className={`text-lg font-display font-bold ${tierInfo.color}`}>{tierInfo.cost} cr</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-[9px] font-mono text-white/25 tracking-widest">MAX WIN</p>
          <p className="text-lg font-display font-bold text-white/70">+{tierMaxReward[tier]} cr</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-[9px] font-mono text-white/25 tracking-widest">BALANCE</p>
          <p className={`text-lg font-display font-bold ${canAfford ? 'text-white/70' : 'text-red-400'}`}>{arenaBalance} cr</p>
        </div>
      </div>

      {/* Insert coin CTA */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStart}
          disabled={!canAfford}
          className={`relative px-12 py-4 font-display text-base tracking-[0.2em] font-black transition-all duration-200 cursor-crosshair overflow-hidden ${
            canAfford
              ? 'text-black hover:scale-105 active:scale-95'
              : 'text-white/20 border border-white/10 cursor-not-allowed'
          }`}
          style={canAfford ? { backgroundColor: meta.accentColor, boxShadow: `0 0 32px ${meta.glowColor}, 0 0 0 1px ${meta.accentColor}` } : undefined}
        >
          {canAfford && (
            <span className={`absolute inset-0 opacity-30 ${pulse ? 'opacity-50' : 'opacity-10'} transition-opacity duration-700`}
              style={{ background: 'radial-gradient(ellipse at 50% 120%, white, transparent)' }} />
          )}
          {canAfford ? `INSERT COIN · ${tierInfo.cost} CR` : `NEED ${tierInfo.cost - arenaBalance} MORE CR`}
        </button>
        {!canAfford && (
          <p className="text-[10px] text-white/20 font-mono">Daily arena credits reset at midnight.</p>
        )}
      </div>
    </div>
  )
}

function LoadingState({ accentColor, game }: { accentColor: string; game: ArenaGameId }) {
  const msgs: Record<ArenaGameId, string[]> = {
    token_prophet:       ['Crafting a juicy prompt...', 'Consulting the oracle...', 'Calibrating the output meter...'],
    prompt_golf:         ['Laying out the course...', 'Placing the hazards...', 'Measuring the par...'],
    bug_exorcist:        ['Injecting the bugs...', 'Writing the wrong answers...', 'Summoning the demons...'],
    context_chicken:     ['Sizing the task...', 'Calibrating the window...', 'Setting the trap...'],
    rate_limit_roulette: ['Warming up the providers...', 'Firing real API calls...', 'Timing the race...'],
    benchmark_brawl:     ['Queuing all three models...', 'Running the brawl...', 'Judging the outputs...'],
    spot_deepfake:       ['Crafting the imposter...', 'Mixing in the humans...', 'Sealing the session...'],
    prompt_crash:        ['Sealing the crash point...', 'Hashing the seed...', 'Loading the rocket...'],
    token_mines:         ['Laying the mines...', 'Sealing the grid...', 'Hashing the layout...'],
  }
  const [msgIdx, setMsgIdx] = useState(0)
  const pool = msgs[game] ?? ['Generating challenge...']
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % pool.length), 900)
    return () => clearInterval(id)
  }, [pool.length])

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-6">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full animate-spin" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <path d="M32 4 A28 28 0 0 1 60 32" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-mono text-sm transition-all duration-300" style={{ color: accentColor }}>{pool[msgIdx]}</p>
      <p className="text-[10px] text-white/20 font-mono">live data being fetched</p>
    </div>
  )
}

function SubmittingState({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-6">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-3 h-3 rounded-full animate-bounce"
            style={{ backgroundColor: accentColor, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p className="font-display text-lg tracking-[0.2em] font-bold" style={{ color: accentColor }}>
        SCORING
      </p>
    </div>
  )
}

function ActiveGame({ session, onSubmit, accentColor }: {
  session: { game: ArenaGameId; challenge: Record<string, unknown>; entryCost: number; sessionId: string }
  onSubmit: (s: Record<string, unknown>) => void
  accentColor: string
}) {
  const props = { challenge: session.challenge, onSubmit, accentColor }
  if (session.game === 'token_prophet')       return <TokenProphetGame {...props} />
  if (session.game === 'prompt_golf')         return <PromptGolfGame {...props} />
  if (session.game === 'context_chicken')     return <ContextChickenGame {...props} />
  if (session.game === 'rate_limit_roulette') return <RateRouletteGame {...props} />
  if (session.game === 'benchmark_brawl')     return <BenchmarkBrawlGame {...props} />
  if (session.game === 'spot_deepfake')       return <SpotDeepfakeGame {...props} />
  if (session.game === 'prompt_crash')        return <PromptCrashGame {...props} entryCost={session.entryCost} />
  if (session.game === 'token_mines')         return <TokenMinesGame {...props} entryCost={session.entryCost} sessionId={session.sessionId} />
  return <BugExorcistGame {...props} />
}

type GameProps = { challenge: Record<string, unknown>; onSubmit: (s: Record<string, unknown>) => void; accentColor: string }

function SubmitBtn({ onClick, disabled, children, accentColor }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; accentColor: string
}) {
  const { play } = useSound()
  return (
    <button
      onClick={() => { play('submit'); onClick() }}
      disabled={disabled}
      className="mt-6 w-full py-3.5 font-display text-sm tracking-[0.15em] font-bold transition-all duration-150 cursor-crosshair disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
      style={disabled ? { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }
        : { backgroundColor: accentColor, color: '#000', boxShadow: `0 0 20px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}40` }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// TOKEN PROPHET  v2 — head-to-head comparison
// Which prompt generates MORE output tokens?
// ─────────────────────────────────────────────────────────────
function TokenProphetGame({ challenge, onSubmit, accentColor }: GameProps) {
  const promptA = String(challenge.promptA ?? '')
  const promptB = String(challenge.promptB ?? '')
  const [pick, setPick] = useState<'A' | 'B' | null>(null)

  const cards: Array<{ key: 'A' | 'B'; prompt: string }> = [
    { key: 'A', prompt: promptA },
    { key: 'B', prompt: promptB },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-3 flex items-center gap-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-xs font-mono text-white/50 leading-relaxed">
          Which prompt will make the model produce <span style={{ color: accentColor }} className="font-bold">more output tokens</span>?
          Pick the one that generates a longer response.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {cards.map(({ key, prompt }) => {
          const isSelected = pick === key
          return (
            <button
              key={key}
              onClick={() => setPick(key)}
              className="w-full text-left rounded-xl border p-5 transition-all duration-150 cursor-crosshair group"
              style={isSelected
                ? { borderColor: accentColor, backgroundColor: `${accentColor}10`, boxShadow: `0 0 24px ${accentColor}20` }
                : { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
              <div className="flex items-start gap-4">
                {/* Label badge */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-black transition-all"
                  style={isSelected
                    ? { backgroundColor: accentColor, color: '#000' }
                    : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {key}
                </div>

                {/* Prompt text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono leading-relaxed"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)' }}>
                    {prompt}
                  </p>
                  {isSelected && (
                    <p className="text-[9px] font-mono mt-2 font-bold tracking-widest" style={{ color: accentColor }}>
                      ✓ YOUR PICK — THIS GENERATES MORE TOKENS
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <SubmitBtn onClick={() => onSubmit({ pick })} disabled={!pick} accentColor={accentColor}>
        {pick ? `PROMPT ${pick} GETS MORE TOKENS` : 'PICK A PROMPT'}
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROMPT GOLF
// ─────────────────────────────────────────────────────────────
function PromptGolfGame({ challenge, onSubmit, accentColor }: GameProps) {
  const required = Array.isArray(challenge.required) ? challenge.required.map(String) : []
  const target = String(challenge.text ?? challenge.target ?? '')
  const [prompt, setPrompt] = useState('')
  const promptLower = prompt.toLowerCase()
  const hitAll = required.every(w => promptLower.includes(w.toLowerCase()))
  const missing = required.filter(w => !promptLower.includes(w.toLowerCase()))
  const score = prompt.length > 0 ? Math.max(10, 100 - Math.floor(prompt.length / 3)) : 100
  const parPct = Math.min(100, (prompt.length / 150) * 100)

  const getGolfGrade = (s: number) => {
    if (s >= 90) return { label: 'EAGLE',        icon: '🦅', color: '#59f5a9' }
    if (s >= 80) return { label: 'BIRDIE',        icon: '🐦', color: '#34d399' }
    if (s >= 70) return { label: 'PAR',           icon: '⛳', color: '#fbbf24' }
    if (s >= 55) return { label: 'BOGEY',         icon: '😬', color: '#fb923c' }
    return             { label: 'DOUBLE BOGEY',   icon: '💀', color: '#f87171' }
  }
  const golfGrade = getGolfGrade(score)

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">OBJECTIVE</p>
        <p className="text-sm leading-relaxed text-white/80">{target}</p>
      </div>

      <div>
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">REQUIRED KEYWORDS</p>
        <div className="flex flex-wrap gap-2">
          {required.map(w => {
            const hit = promptLower.includes(w.toLowerCase())
            return (
              <span key={w} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all"
                style={hit
                  ? { borderColor: `${accentColor}60`, color: accentColor, backgroundColor: `${accentColor}15` }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                {hit ? '✓' : '○'} {w}
              </span>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">YOUR PROMPT</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30">{prompt.length} chars</span>
            {hitAll && prompt.length > 0 && (
              <span className="font-display text-sm font-black tracking-wider" style={{ color: golfGrade.color }}>
                {golfGrade.icon} {golfGrade.label}
              </span>
            )}
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Write the shortest prompt that hits every keyword..."
          rows={4}
          className="w-full rounded-lg bg-black/40 border p-3 text-sm font-mono text-white/80 placeholder:text-white/15 resize-none outline-none transition-all"
          style={{ borderColor: hitAll ? `${accentColor}60` : 'rgba(255,255,255,0.08)', boxShadow: hitAll ? `0 0 0 1px ${accentColor}30` : undefined }}
        />
        {/* Par bar */}
        <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${parPct}%`, backgroundColor: parPct > 80 ? '#f87171' : parPct > 50 ? '#fbbf24' : accentColor }} />
        </div>
        <div className="flex justify-between text-[9px] text-white/20 font-mono mt-1">
          <span>shorter = better score</span>
          {!hitAll && missing.length > 0 && <span className="text-yellow-400/60">missing: {missing.join(', ')}</span>}
          {hitAll && <span style={{ color: accentColor }}>all keywords hit ✓</span>}
        </div>
      </div>

      <SubmitBtn onClick={() => onSubmit({ prompt })} disabled={!prompt.trim()} accentColor={accentColor}>
        SUBMIT PROMPT
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BUG EXORCIST — patch options per snippet (client-side)
// Keyed by snippet string (matches server challenge.snippet).
// Correct answer always contains challenge.mustInclude.
// ─────────────────────────────────────────────────────────────
const BUG_PATCH_LOOKUP: Record<string, { label: string; code: string; mustInclude: string }[]> = {
  // SANDBOX bugs
  'if (items.length = 0) return []': [
    { label: 'strict equality check', code: 'if (items.length === 0) return []', mustInclude: '===' },
    { label: 'loose equality check', code: 'if (items.length == 0) return []', mustInclude: '==' },
    { label: 'negated assignment', code: 'if (items.length =! 0) return []', mustInclude: '=!' },
  ],
  'for (let i = 0; i <= arr.length; i++)': [
    { label: 'strict less-than bound', code: 'for (let i = 0; i < arr.length; i++)', mustInclude: '< arr.length' },
    { label: 'start from index 1', code: 'for (let i = 1; i <= arr.length; i++)', mustInclude: 'i = 1' },
    { label: 'bitwise shift (wrong)', code: 'for (let i = 0; i << arr.length; i++)', mustInclude: '<<' },
  ],
  'const total = price + taxRate': [
    { label: 'multiply rate into price', code: 'const total = price + price * taxRate', mustInclude: '* taxRate' },
    { label: 'multiply only', code: 'const total = price * taxRate', mustInclude: 'price * taxRate' },
    { label: 'compound tax', code: 'const total = price + taxRate * taxRate', mustInclude: 'taxRate * taxRate' },
  ],
  'setTimeout(callback, 1000 * 60 * 24)': [
    { label: 'correct 24h in ms', code: 'setTimeout(callback, 1000 * 60 * 60 * 24)', mustInclude: '60 * 60 * 24' },
    { label: 'minutes only (wrong)', code: 'setTimeout(callback, 1000 * 24)', mustInclude: '1000 * 24' },
    { label: 'seconds only (wrong)', code: 'setTimeout(callback, 60 * 24)', mustInclude: '60 * 24)' },
  ],
  'if (typeof value == "undefined")': [
    { label: 'strict typeof check', code: 'if (typeof value === "undefined")', mustInclude: '===' },
    { label: 'nullish check', code: 'if (value == null)', mustInclude: '== null' },
    { label: 'truthy check (wrong)', code: 'if (!value)', mustInclude: '!value' },
  ],
  'const copy = arr.slice().reverse().sort()': [
    { label: 'sort then reverse', code: 'const copy = arr.slice().sort().reverse()', mustInclude: '.sort().reverse()' },
    { label: 'reverse only', code: 'const copy = arr.slice().reverse()', mustInclude: 'slice().reverse()' },
    { label: 'sort in-place (wrong)', code: 'const copy = arr.sort().reverse()', mustInclude: 'arr.sort()' },
  ],
  'res.json({ ok: true }); next()': [
    { label: 'early return after response', code: 'return res.json({ ok: true })', mustInclude: 'return res.json' },
    { label: 'await the response (wrong)', code: 'await res.json({ ok: true }); next()', mustInclude: 'await res.json' },
    { label: 'send instead (wrong)', code: 'res.send({ ok: true }); next()', mustInclude: 'res.send' },
  ],
  'await fetch(url); return data;': [
    { label: 'await and parse JSON', code: 'const data = await fetch(url).then(r => r.json()); return data;', mustInclude: 'await fetch(url).then' },
    { label: 'missing await (wrong)', code: 'fetch(url); return data;', mustInclude: 'fetch(url);' },
    { label: 'double await (wrong)', code: 'const data = await (await fetch(url)); return data;', mustInclude: 'await (await' },
  ],
  "new Date().toLocaleDateString('en')": [
    { label: 'ISO 8601 format', code: 'new Date().toISOString()', mustInclude: 'toISOString' },
    { label: 'UTC string', code: 'new Date().toUTCString()', mustInclude: 'toUTCString' },
    { label: 'locale with timezone', code: "new Date().toLocaleDateString('en-US', { timeZone: 'UTC' })", mustInclude: 'timeZone' },
  ],
  'Math.round(0.1 + 0.2)': [
    { label: 'toFixed for precision', code: '(0.1 + 0.2).toFixed(1)', mustInclude: 'toFixed' },
    { label: 'parseInt (wrong type)', code: 'parseInt(0.1 + 0.2)', mustInclude: 'parseInt' },
    { label: 'Math.floor (wrong)', code: 'Math.floor(0.1 + 0.2)', mustInclude: 'Math.floor' },
  ],
  "const name = user && user.name || 'anon'": [
    { label: 'optional chaining', code: "const name = user?.name ?? 'anon'", mustInclude: 'user?.name' },
    { label: 'explicit grouping', code: "const name = (user && user.name) || 'anon'", mustInclude: '(user && user.name)' },
    { label: 'unsafe access (wrong)', code: "const name = user.name || 'anon'", mustInclude: 'user.name' },
  ],
  'arr.forEach(async (item) => { await processItem(item) })': [
    { label: 'Promise.all + map', code: 'await Promise.all(arr.map(async item => processItem(item)))', mustInclude: 'Promise.all' },
    { label: 'for...of loop', code: 'for (const item of arr) { await processItem(item) }', mustInclude: 'for...of' },
    { label: 'fire and forget (wrong)', code: 'arr.map(item => processItem(item))', mustInclude: 'arr.map' },
  ],
  "str.replace('/', '-')": [
    { label: 'global regex replace', code: "str.replace(/\\//g, '-')", mustInclude: '/\\//g' },
    { label: 'replaceAll method', code: "str.replaceAll('/', '-')", mustInclude: 'replaceAll' },
    { label: 'split/join', code: "str.split('/').join('-')", mustInclude: "split('/')" },
  ],
  'obj.hasOwnProperty(key)': [
    { label: 'safe prototype call', code: 'Object.prototype.hasOwnProperty.call(obj, key)', mustInclude: 'Object.prototype.hasOwnProperty' },
    { label: 'Object.hasOwn (ES2022)', code: 'Object.hasOwn(obj, key)', mustInclude: 'Object.hasOwn' },
    { label: 'in operator (wrong)', code: 'key in obj', mustInclude: 'key in' },
  ],
  'const squared = nums.map(n => n ^ 2)': [
    { label: 'exponentiation operator', code: 'const squared = nums.map(n => n ** 2)', mustInclude: 'n ** 2' },
    { label: 'Math.pow', code: 'const squared = nums.map(n => Math.pow(n, 2))', mustInclude: 'Math.pow' },
    { label: 'n * 2 (wrong)', code: 'const squared = nums.map(n => n * 2)', mustInclude: 'n * 2' },
  ],
  'if (arr.length == false)': [
    { label: 'explicit zero check', code: 'if (arr.length === 0)', mustInclude: 'arr.length === 0' },
    { label: 'negated length', code: 'if (!arr.length)', mustInclude: '!arr.length' },
    { label: 'undefined check (wrong)', code: 'if (arr.length == undefined)', mustInclude: '== undefined' },
  ],
  'delete obj.prop; return obj': [
    { label: 'destructuring spread', code: 'const { prop, ...rest } = obj; return rest', mustInclude: 'const { prop, ...rest }' },
    { label: 'Object.assign copy', code: 'const copy = Object.assign({}, obj); delete copy.prop; return copy', mustInclude: 'Object.assign' },
    { label: 'set to null (wrong)', code: 'obj.prop = null; return obj', mustInclude: 'obj.prop = null' },
  ],
  // PRODUCTION bugs
  'JSON.parse(userInput)': [
    { label: 'wrap in try/catch', code: 'try { JSON.parse(userInput) } catch(e) { return null }', mustInclude: 'try' },
    { label: 'validate before parse', code: 'if (userInput) JSON.parse(userInput)', mustInclude: 'if (userInput)' },
    { label: 'stringify first (wrong)', code: 'JSON.parse(JSON.stringify(userInput))', mustInclude: 'JSON.stringify' },
  ],
  'element.innerHTML = userComment': [
    { label: 'use textContent (safe)', code: 'element.textContent = userComment', mustInclude: 'textContent' },
    { label: 'DOMPurify sanitize', code: 'element.innerHTML = DOMPurify.sanitize(userComment)', mustInclude: 'DOMPurify' },
    { label: 'insertAdjacentHTML (same risk)', code: 'element.insertAdjacentHTML("beforeend", userComment)', mustInclude: 'insertAdjacentHTML' },
  ],
  "const id = Math.random().toString()": [
    { label: 'crypto.randomUUID()', code: 'const id = crypto.randomUUID()', mustInclude: 'crypto' },
    { label: 'nanoid library', code: 'const id = nanoid()', mustInclude: 'nanoid' },
    { label: 'base36 random (still weak)', code: "const id = Math.random().toString(36).slice(2)", mustInclude: 'toString(36)' },
  ],
  "if (password == storedHash)": [
    { label: 'timing-safe compare', code: 'if (crypto.timingSafeEqual(Buffer.from(password), Buffer.from(storedHash)))', mustInclude: 'timingSafeEqual' },
    { label: 'strict equality (still wrong)', code: 'if (password === storedHash)', mustInclude: 'password ===' },
    { label: 'bcrypt compare', code: 'if (await bcrypt.compare(password, storedHash))', mustInclude: 'bcrypt.compare' },
  ],
  'const users = await db.query("SELECT * FROM users WHERE id = " + id)': [
    { label: 'parameterized query', code: 'const users = await db.query("SELECT * FROM users WHERE id = $1", [id])', mustInclude: 'parameterized' },
    { label: 'escape the input', code: 'const users = await db.query("SELECT * FROM users WHERE id = " + db.escape(id))', mustInclude: 'db.escape' },
    { label: 'parseInt first (wrong)', code: 'const users = await db.query("SELECT * FROM users WHERE id = " + parseInt(id))', mustInclude: 'parseInt(id)' },
  ],
  'await Promise.all([a(), b(), c()]); return results': [
    { label: 'capture the result', code: 'const results = await Promise.all([a(), b(), c()]); return results', mustInclude: 'const results = await' },
    { label: 'Promise.allSettled', code: 'const results = await Promise.allSettled([a(), b(), c()]); return results', mustInclude: 'allSettled' },
    { label: 'sequential await (wrong)', code: 'return [await a(), await b(), await c()]', mustInclude: 'await a()' },
  ],
  'setInterval(async () => { await heavyTask() }, 100)': [
    { label: 'capture and clear the ID', code: 'const id = setInterval(async () => { await heavyTask() }, 100); return () => clearInterval(id)', mustInclude: 'clearInterval' },
    { label: 'use setTimeout recursively', code: 'const run = async () => { await heavyTask(); setTimeout(run, 100) }; run()', mustInclude: 'setTimeout(run' },
    { label: 'add AbortController (wrong focus)', code: 'const ctrl = new AbortController(); setInterval(() => heavyTask(ctrl.signal), 100)', mustInclude: 'AbortController' },
  ],
  'const data = cache[key] || fetchFromDB(key)': [
    { label: 'undefined check', code: 'const data = cache[key] !== undefined ? cache[key] : fetchFromDB(key)', mustInclude: 'cache[key] !== undefined' },
    { label: 'nullish coalescing', code: 'const data = cache[key] ?? fetchFromDB(key)', mustInclude: '??' },
    { label: 'Map.has() pattern', code: 'const data = cacheMap.has(key) ? cacheMap.get(key) : fetchFromDB(key)', mustInclude: 'cacheMap.has' },
  ],
  'req.user = jwt.verify(token, secret)': [
    { label: 'wrap in try/catch', code: 'try { req.user = jwt.verify(token, secret) } catch { return res.status(401).json({ error: "Invalid token" }) }', mustInclude: 'try' },
    { label: 'async verify', code: 'req.user = await new Promise((res, rej) => jwt.verify(token, secret, (e, d) => e ? rej(e) : res(d)))', mustInclude: 'Promise' },
    { label: 'decode without verify (wrong)', code: 'req.user = jwt.decode(token)', mustInclude: 'jwt.decode' },
  ],
  "type UserId = string | number": [
    { label: 'pin to string only', code: 'type UserId = string', mustInclude: 'type UserId = string' },
    { label: 'branded type', code: 'type UserId = string & { readonly __brand: "UserId" }', mustInclude: '__brand' },
    { label: 'widen to unknown (wrong)', code: 'type UserId = unknown', mustInclude: 'unknown' },
  ],
  'const result = await db.findMany(); result.forEach(process)': [
    { label: 'for...of with await', code: 'const result = await db.findMany(); for (const item of result) { await process(item) }', mustInclude: 'for...of' },
    { label: 'Promise.all + map', code: 'const result = await db.findMany(); await Promise.all(result.map(process))', mustInclude: 'Promise.all' },
    { label: 'async forEach helper (wrong)', code: 'const result = await db.findMany(); await result.forEachAsync(process)', mustInclude: 'forEachAsync' },
  ],
  "app.use(cors({ origin: '*' }))": [
    { label: 'explicit allowlist', code: "app.use(cors({ origin: ['https://yourapp.com'] }))", mustInclude: 'specific origin' },
    { label: 'environment-based origin', code: "app.use(cors({ origin: process.env.ALLOWED_ORIGIN }))", mustInclude: 'ALLOWED_ORIGIN' },
    { label: 'disable credentials (wrong)', code: "app.use(cors({ origin: '*', credentials: false }))", mustInclude: 'credentials: false' },
  ],
  'const hash = md5(password)': [
    { label: 'bcrypt hash', code: 'const hash = await bcrypt.hash(password, 12)', mustInclude: 'bcrypt' },
    { label: 'argon2 hash', code: 'const hash = await argon2.hash(password)', mustInclude: 'argon2' },
    { label: 'SHA-256 (still wrong)', code: 'const hash = crypto.createHash("sha256").update(password).digest("hex")', mustInclude: 'sha256' },
  ],
  'fs.readFileSync(`/uploads/${req.params.filename}`)': [
    { label: 'path.basename sanitize', code: 'const safe = path.basename(req.params.filename); fs.readFileSync(`/uploads/${safe}`)', mustInclude: 'path.basename' },
    { label: 'allowlist extension check', code: 'if (!req.params.filename.match(/^[\\w-]+\\.pdf$/)) throw new Error("Invalid"); fs.readFileSync(`/uploads/${req.params.filename}`)', mustInclude: 'whitelist' },
    { label: 'encodeURIComponent (wrong)', code: 'fs.readFileSync(`/uploads/${encodeURIComponent(req.params.filename)}`)', mustInclude: 'encodeURIComponent' },
  ],
  'const config = require(process.env.CONFIG_PATH)': [
    { label: 'use a whitelist', code: 'const allowed = { dev: "./config.dev.js", prod: "./config.prod.js" }; const config = require(allowed[process.env.ENV])', mustInclude: 'whitelist' },
    { label: 'read file instead', code: 'const config = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH, "utf8"))', mustInclude: 'readFileSync' },
    { label: 'validate path (wrong)', code: 'if (process.env.CONFIG_PATH) const config = require(process.env.CONFIG_PATH)', mustInclude: 'CONFIG_PATH)' },
  ],
  'res.redirect(req.query.returnUrl)': [
    { label: 'validate against allowlist', code: 'const url = req.query.returnUrl; if (!url.startsWith("/")) throw new Error("Invalid"); res.redirect(url)', mustInclude: 'allowedHosts' },
    { label: 'only allow relative paths', code: 'const safe = req.query.returnUrl?.startsWith("/") ? req.query.returnUrl : "/"; res.redirect(safe)', mustInclude: 'startsWith("/")' },
    { label: 'encode the URL (wrong)', code: 'res.redirect(encodeURI(req.query.returnUrl))', mustInclude: 'encodeURI' },
  ],
  'obj[req.body.key] = req.body.value': [
    { label: 'block prototype pollution', code: 'if (["__proto__", "constructor", "prototype"].includes(req.body.key)) throw new Error("Forbidden"); obj[req.body.key] = req.body.value', mustInclude: '__proto__' },
    { label: 'use a Map instead', code: 'const map = new Map(); map.set(req.body.key, req.body.value)', mustInclude: 'new Map' },
    { label: 'JSON parse roundtrip (wrong)', code: 'obj[req.body.key] = JSON.parse(JSON.stringify(req.body.value))', mustInclude: 'JSON.parse(JSON' },
  ],
  // BLACKBOX bugs
  'await db.$transaction([...ops])': [
    { label: 'interactive transaction', code: 'await db.$transaction(async (tx) => { /* ops using tx */ })', mustInclude: 'async (tx) =>' },
    { label: 'serialize isolation level', code: 'await db.$transaction([...ops], { isolationLevel: "Serializable" })', mustInclude: 'Serializable' },
    { label: 'retry on conflict (wrong)', code: 'for (let i = 0; i < 3; i++) { try { await db.$transaction([...ops]); break } catch {} }', mustInclude: 'break' },
  ],
  'if (count > 0) { count-- }': [
    { label: 'atomic DB decrement', code: 'await db.counter.updateMany({ where: { count: { gt: 0 } }, data: { count: { decrement: 1 } } })', mustInclude: 'atomic' },
    { label: 'pessimistic lock', code: 'await db.$transaction(async tx => { const row = await tx.counter.findFirst({ where: { id } }); if (row.count > 0) await tx.counter.update({ data: { count: row.count - 1 } }) })', mustInclude: 'lock' },
    { label: 'mutex wrapper', code: 'await mutex.runExclusive(async () => { if (count > 0) count-- })', mustInclude: 'mutex' },
  ],
  "const key = JSON.stringify(Object.keys(obj).sort())": [
    { label: 'stringify sorted entries', code: 'const key = JSON.stringify(Object.fromEntries(Object.entries(obj).sort()))', mustInclude: 'JSON.stringify(obj)' },
    { label: 'hash the values', code: 'const key = crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex")', mustInclude: 'sha256' },
    { label: 'sort values too (wrong)', code: 'const key = JSON.stringify(Object.values(obj).sort())', mustInclude: 'Object.values' },
  ],
  'const stream = fs.createReadStream(file); stream.pipe(res)': [
    { label: 'attach error handler', code: 'const stream = fs.createReadStream(file); stream.on("error", err => res.status(404).end()); stream.pipe(res)', mustInclude: 'stream.on("error"' },
    { label: 'use pipeline', code: 'await pipeline(fs.createReadStream(file), res)', mustInclude: 'pipeline' },
    { label: 'check existence first (wrong)', code: 'if (fs.existsSync(file)) { const stream = fs.createReadStream(file); stream.pipe(res) }', mustInclude: 'existsSync' },
  ],
  'Number.isInteger(parseFloat(value))': [
    { label: 'Number() with isInteger', code: 'Number.isInteger(Number(value))', mustInclude: 'Number.isInteger(Number(value))' },
    { label: 'regex integer check', code: '/^-?\\d+$/.test(String(value))', mustInclude: 'test(String' },
    { label: 'floor comparison (wrong)', code: 'Math.floor(parseFloat(value)) === parseFloat(value)', mustInclude: 'Math.floor' },
  ],
  'subscribers.push(callback); return () => subscribers.splice(0)': [
    { label: 'splice by index', code: 'subscribers.push(callback); return () => { const idx = subscribers.indexOf(callback); if (idx > -1) subscribers.splice(idx, 1) }', mustInclude: 'indexOf' },
    { label: 'filter out callback', code: 'subscribers.push(callback); return () => { subscribers = subscribers.filter(s => s !== callback) }', mustInclude: 'filter(s =>' },
    { label: 'splice(0, 1) (wrong)', code: 'subscribers.push(callback); return () => subscribers.splice(0, 1)', mustInclude: 'splice(0, 1)' },
  ],
  'const [a, b] = await Promise.all([fetchA(), fetchB()])': [
    { label: 'Promise.allSettled for resilience', code: 'const [aResult, bResult] = await Promise.allSettled([fetchA(), fetchB()])', mustInclude: 'Promise.allSettled' },
    { label: 'try/catch per call', code: 'const a = await fetchA().catch(() => null); const b = await fetchB().catch(() => null)', mustInclude: '.catch(() =>' },
    { label: 'sequential fallback (wrong)', code: 'const a = await fetchA(); const b = await fetchB()', mustInclude: 'const b = await' },
  ],
  'WHERE created_at BETWEEN $1 AND $2': [
    { label: 'add timezone context', code: "WHERE created_at AT TIME ZONE 'UTC' BETWEEN $1 AND $2", mustInclude: 'timezone' },
    { label: 'cast to date in UTC', code: 'WHERE date_trunc(\'day\', created_at AT TIME ZONE \'UTC\') = $1::date', mustInclude: 'date_trunc' },
    { label: 'use >= and <', code: 'WHERE created_at >= $1 AND created_at < $2', mustInclude: '>= $1 AND' },
  ],
  'SELECT * FROM orders LEFT JOIN users ON orders.user_id = users.id': [
    { label: 'add composite index', code: 'CREATE INDEX ON orders(status, user_id); -- then run the query', mustInclude: 'index' },
    { label: 'select only needed columns', code: 'SELECT o.id, o.total, u.name FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.status = $1', mustInclude: 'o.id, o.total' },
    { label: 'add LIMIT (wrong fix)', code: 'SELECT * FROM orders LEFT JOIN users ON orders.user_id = users.id LIMIT 1000', mustInclude: 'LIMIT 1000' },
  ],
  'export default class EventEmitter { listeners = {} }': [
    { label: 'use WeakRef for callbacks', code: 'class EventEmitter { #listeners = new Map(); on(e, cb) { this.#listeners.set(e, new WeakRef(cb)) } }', mustInclude: 'WeakRef' },
    { label: 'require explicit cleanup', code: 'class EventEmitter { listeners = new Map(); destroy() { this.listeners.clear() } }', mustInclude: 'destroy()' },
    { label: 'use FinalizationRegistry (wrong ctx)', code: 'const registry = new FinalizationRegistry(key => listeners.delete(key))', mustInclude: 'FinalizationRegistry' },
  ],
}

// ─────────────────────────────────────────────────────────────
// BUG EXORCIST
// ─────────────────────────────────────────────────────────────
function BugExorcistGame({ challenge, onSubmit, accentColor }: GameProps) {
  const snippet = String(challenge.snippet ?? '')
  const context = String(challenge.context ?? '')
  const language = String(challenge.language ?? 'js')
  const patches = useMemo(() => {
    const pool = BUG_PATCH_LOOKUP[snippet] ?? [
      { label: 'strict equality', code: '=== instead of ==', mustInclude: '===' },
      { label: 'null check', code: 'value != null &&', mustInclude: 'null' },
      { label: 'try/catch wrapper', code: 'try { ... } catch(e) { }', mustInclude: 'try' },
    ]
    // Use server-provided seeded patchOrder when available so the shuffle is
    // deterministic and provably fair. Fall back to original order (not
    // Math.random()) so at least the client is consistent on re-render.
    const order = Array.isArray(challenge.patchOrder) ? (challenge.patchOrder as number[]) : [0, 1, 2]
    return order.map((i) => pool[i]).filter(Boolean)
  }, [snippet, challenge.patchOrder])
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(45)
  const selectedRef = useRef<string | null>(null)
  const submitted = useRef(false)
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (timeLeft === 0 && !submitted.current) {
      submitted.current = true
      onSubmitRef.current({ fix: selectedRef.current ?? '' })
    }
  }, [timeLeft])

  const handleSelect = (v: string) => { selectedRef.current = v; setSelected(v) }
  const handleSubmit = () => {
    if (submitted.current) return
    submitted.current = true
    onSubmit({ fix: selected ?? '' })
  }

  const timerPct = (timeLeft / 45) * 100
  const timerColor = timeLeft <= 10 ? '#f87171' : timeLeft <= 20 ? '#fbbf24' : '#34d399'
  const urgent = timeLeft <= 15

  const contextLines = context ? context.split('\n') : [snippet]
  const bugLineIdx = contextLines.findIndex(l => l.includes(snippet.trim()))

  return (
    <div className="space-y-5">
      {/* Countdown timer */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${timerColor}30` }}>
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[9px] font-mono tracking-[0.2em]" style={{ color: timerColor }}>
            {urgent ? '⚠ TIME RUNNING OUT' : 'TIME REMAINING'}
          </p>
          <span className={`font-display text-base font-black tabular-nums ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}>
            {timeLeft}s
          </span>
        </div>
        <div className="h-1 bg-white/5">
          <div className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
        </div>
      </div>

      {/* Context code block */}
      <div className="rounded-lg border bg-red-950/20 overflow-hidden" style={{ borderColor: 'rgba(248,113,113,0.25)' }}>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-red-900/30 bg-red-950/30">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <p className="text-[9px] font-mono tracking-[0.2em] text-red-400/80">BROKEN CODE · {language.toUpperCase()}</p>
        </div>
        <div className="p-4">
          {contextLines.map((line, i) => {
            const isBugLine = i === bugLineIdx || (bugLineIdx === -1 && i === 0)
            return (
              <div key={i} className={`flex gap-3 ${isBugLine ? 'rounded' : ''}`}
                style={isBugLine ? { backgroundColor: 'rgba(248,113,113,0.12)', marginLeft: '-8px', marginRight: '-8px', paddingLeft: '8px', paddingRight: '8px' } : undefined}>
                <span className="text-[10px] font-mono text-white/20 select-none w-5 flex-shrink-0 text-right pt-0.5">{i + 1}</span>
                <pre className="text-sm font-mono leading-relaxed flex-1 whitespace-pre-wrap"
                  style={{ color: isBugLine ? '#fca5a5' : 'rgba(255,255,255,0.55)' }}>
                  {line || ' '}
                </pre>
                {isBugLine && <span className="text-[9px] text-red-400/60 font-mono flex-shrink-0 pt-0.5">← bug</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Patch options */}
      <div className="space-y-2.5">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">CHOOSE THE CORRECT PATCH</p>
        {patches.map((patch, i) => {
          const isSelected = selected === patch.mustInclude
          return (
            <button
              key={patch.code}
              onClick={() => handleSelect(patch.mustInclude)}
              className="w-full text-left rounded-lg border p-4 transition-all duration-150 cursor-crosshair"
              style={isSelected
                ? { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}10` }
                : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all"
                  style={isSelected
                    ? { borderColor: accentColor, backgroundColor: accentColor, color: '#000' }
                    : { borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }}>
                  {['A', 'B', 'C'][i]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-mono tracking-widest mb-1.5"
                    style={{ color: isSelected ? accentColor : 'rgba(255,255,255,0.3)' }}>{patch.label.toUpperCase()}</p>
                  <code className="text-xs font-mono text-white/70 leading-relaxed break-all">{patch.code}</code>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <SubmitBtn onClick={handleSubmit} disabled={!selected} accentColor={accentColor}>
        APPLY PATCH
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CONTEXT CHICKEN
// ─────────────────────────────────────────────────────────────
const CONTEXT_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384, 32768]
const CONTEXT_RISK = ['safe', 'safe', 'caution', 'caution', 'risky', 'risky', 'degen']
const CONTEXT_RISK_COLOR = ['#34d399', '#34d399', '#fbbf24', '#fbbf24', '#fb923c', '#fb923c', '#f87171']

function ContextChickenGame({ challenge, onSubmit, accentColor }: GameProps) {
  const description = String(challenge.description ?? '')
  const [bet, setBet] = useState<number | null>(null)
  const betIdx = bet ? CONTEXT_OPTIONS.indexOf(bet) : -1

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">THE TASK</p>
        <p className="text-sm leading-relaxed text-white/80">{description}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">MINIMUM CONTEXT WINDOW</p>
          {bet && (
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded"
              style={{ color: CONTEXT_RISK_COLOR[betIdx], backgroundColor: `${CONTEXT_RISK_COLOR[betIdx]}20` }}>
              {CONTEXT_RISK[betIdx]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {CONTEXT_OPTIONS.map((opt, i) => {
            const isSelected = bet === opt
            const label = opt >= 1024 ? `${opt / 1024}K` : `${opt}`
            return (
              <button
                key={opt}
                onClick={() => setBet(opt)}
                className="rounded-lg border p-3 text-center transition-all duration-150 cursor-crosshair group"
                style={isSelected
                  ? { borderColor: `${CONTEXT_RISK_COLOR[i]}80`, backgroundColor: `${CONTEXT_RISK_COLOR[i]}15`, boxShadow: `0 0 12px ${CONTEXT_RISK_COLOR[i]}30` }
                  : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <p className="text-base font-mono font-black" style={{ color: isSelected ? CONTEXT_RISK_COLOR[i] : 'rgba(255,255,255,0.6)' }}>{label}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: isSelected ? CONTEXT_RISK_COLOR[i] : 'rgba(255,255,255,0.2)' }}>tokens</p>
              </button>
            )
          })}
        </div>

        {bet && (
          <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3 text-center">
            <p className="text-xs font-mono text-white/40">Your bet:</p>
            <p className="text-xl font-display font-black mt-0.5" style={{ color: accentColor }}>{bet.toLocaleString()} tokens</p>
            <p className="text-[9px] font-mono text-white/20 mt-1">too small = task fails · too large = wasted potential</p>
          </div>
        )}
      </div>

      <SubmitBtn onClick={() => onSubmit({ contextBet: bet })} disabled={!bet} accentColor={accentColor}>
        LOCK IN BET
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RATE LIMIT ROULETTE
// ─────────────────────────────────────────────────────────────
function RateRouletteGame({ challenge, onSubmit, accentColor }: GameProps) {
  const prompt = String(challenge.prompt ?? '')
  const providers = Array.isArray(challenge.providers) ? challenge.providers.map(String) : []
  const liveRaced = Boolean(challenge.liveRaced)
  const insight = String(challenge.insight ?? '')
  // providerProfiles: [{ provider, typicalRange, note }]
  const providerProfiles = Array.isArray(challenge.providerProfiles)
    ? (challenge.providerProfiles as Array<{ provider: string; typicalRange: string; note: string }>)
    : []

  const [pick, setPick] = useState<string | null>(null)
  const [raceCountdown, setRaceCountdown] = useState<number | null>(null)
  const pickRef = useRef(pick)
  pickRef.current = pick
  const onSubmitRaceRef = useRef(onSubmit)
  onSubmitRaceRef.current = onSubmit

  useEffect(() => {
    if (raceCountdown === null) return
    if (raceCountdown === 0) {
      const t = setTimeout(() => onSubmitRaceRef.current({ pick: pickRef.current }), 700)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRaceCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [raceCountdown])

  const PROVIDER_COLORS = ['#38bdf8', '#a78bfa', '#34d399']
  const PROVIDER_LOGOS: Record<string, string> = {
    OpenAI: '🟢', Anthropic: '🟣', Groq: '🟡', 'Mistral AI': '🔵', Cohere: '🔴',
    'Google': '🔴', 'Together AI': '⚪',
  }

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">PROMPT SENT TO ALL PROVIDERS</p>
          {liveRaced && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}40` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              LIVE RACE
            </span>
          )}
        </div>
        <p className="text-sm text-white/70 font-mono italic">&ldquo;{prompt}&rdquo;</p>
      </div>

      {/* Matchup insight — the "why this is interesting" */}
      {insight && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 px-4 py-3 flex gap-3 items-start">
          <span className="text-base flex-shrink-0 mt-0.5">⚡</span>
          <p className="text-xs font-mono text-sky-300/70 leading-relaxed">{insight}</p>
        </div>
      )}

      {/* Provider intelligence cards */}
      {providerProfiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">PROVIDER INTEL · USE THIS TO PICK</p>
          <div className="grid grid-cols-1 gap-2">
            {providers.map((provider, i) => {
              const profile = providerProfiles.find(p => p.provider === provider)
              const isSelected = pick === provider
              const color = PROVIDER_COLORS[i % PROVIDER_COLORS.length]
              return (
                <button
                  key={provider}
                  onClick={() => setPick(provider)}
                  className="rounded-lg border p-3.5 text-left transition-all duration-150 cursor-crosshair"
                  style={isSelected
                    ? { borderColor: `${color}60`, backgroundColor: `${color}08`, boxShadow: `0 0 20px ${color}18` }
                    : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Logo + radio */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: isSelected ? `${color}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}` }}>
                      {PROVIDER_LOGOS[provider] ?? '◉'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-mono font-bold" style={{ color: isSelected ? color : 'rgba(255,255,255,0.75)' }}>{provider}</p>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{ color, backgroundColor: `${color}20` }}>YOUR PICK ✓</span>
                        )}
                      </div>
                      {profile && (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-mono text-white/25 tracking-widest">TYPICAL</span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: isSelected ? color : 'rgba(255,255,255,0.5)' }}>
                              {profile.typicalRange}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-white/35 leading-relaxed">{profile.note}</p>
                        </>
                      )}
                    </div>

                    {/* Radio dot */}
                    <div className="w-3 h-3 rounded-full border-2 flex-shrink-0 mt-2 transition-all"
                      style={isSelected ? { borderColor: color, backgroundColor: color } : { borderColor: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Fallback: no profiles (old-format challenge) */}
      {providerProfiles.length === 0 && (
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-3">
            {liveRaced ? 'RACE ALREADY RAN — PICK THE WINNER (HIDDEN UNTIL SUBMIT)' : 'PICK THE FASTEST PROVIDER'}
          </p>
          <div className="flex flex-col gap-2.5">
            {providers.map((provider, i) => {
              const isSelected = pick === provider
              const color = PROVIDER_COLORS[i % PROVIDER_COLORS.length]
              return (
                <button
                  key={provider}
                  onClick={() => setPick(provider)}
                  className="rounded-lg border p-4 text-left transition-all duration-150 cursor-crosshair"
                  style={isSelected
                    ? { borderColor: `${color}60`, backgroundColor: `${color}10`, boxShadow: `0 0 16px ${color}20` }
                    : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: isSelected ? `${color}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}` }}>
                      {PROVIDER_LOGOS[provider] ?? '◉'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-mono font-bold" style={{ color: isSelected ? color : 'rgba(255,255,255,0.7)' }}>{provider}</p>
                      <p className="text-[9px] font-mono mt-0.5" style={{ color: isSelected ? `${color}80` : 'rgba(255,255,255,0.2)' }}>
                        {isSelected ? 'YOUR PICK ✓' : 'click to select'}
                      </p>
                    </div>
                    <div className="w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all"
                      style={isSelected ? { borderColor: color, backgroundColor: color } : { borderColor: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => pick && raceCountdown === null && setRaceCountdown(3)}
        disabled={!pick || raceCountdown !== null}
        className="mt-6 w-full py-3.5 font-display text-sm tracking-[0.15em] font-bold transition-all duration-150 cursor-crosshair disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        style={(!pick || raceCountdown !== null)
          ? { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }
          : { backgroundColor: accentColor, color: '#000', boxShadow: `0 0 20px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}40` }}>
        {pick ? '🏁 START RACE' : 'PICK A PROVIDER FIRST'}
      </button>

      {/* Race countdown overlay */}
      {raceCountdown !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#070a10]/95 backdrop-blur-sm">
          {raceCountdown > 0 ? (
            <>
              <p className="text-[10px] font-mono text-white/40 tracking-[0.4em]">RACE STARTS IN</p>
              <div className="font-display font-black animate-pulse"
                style={{ fontSize: '10rem', lineHeight: 1, color: accentColor, textShadow: `0 0 80px ${accentColor}` }}>
                {raceCountdown}
              </div>
              <p className="font-mono text-sm text-white/30">
                Your pick: <span className="font-bold" style={{ color: accentColor }}>{pick}</span>
              </p>
            </>
          ) : (
            <>
              <div className="text-7xl">🏁</div>
              <div className="font-display font-black text-6xl tracking-[0.15em]"
                style={{ color: '#ffd700', textShadow: '0 0 80px #ffd700' }}>
                RACE!
              </div>
              <p className="text-[10px] font-mono text-white/40 tracking-widest animate-pulse">TRANSMITTING BET...</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BENCHMARK BRAWL
// ─────────────────────────────────────────────────────────────
function BenchmarkBrawlGame({ challenge, onSubmit, accentColor }: GameProps) {
  const task = String(challenge.task ?? '')
  const criteria = String(challenge.criteria ?? '')
  const models = Array.isArray(challenge.models) ? challenge.models.map(String) : []
  const outputs = (challenge.outputs ?? {}) as Record<string, string>
  const hasOutputs = Object.keys(outputs).length > 0
  const [pick, setPick] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const MODEL_COLORS = ['#38bdf8', '#fb923c', '#a78bfa']

  return (
    <div className="space-y-5">
      {/* Task header */}
      <div className="space-y-3">
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">THE TASK</p>
          <p className="text-sm leading-relaxed text-white/80">{task}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[9px] font-mono text-white/25">JUDGING BY:</p>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>{criteria}</span>
        </div>
      </div>

      {/* Outputs — always shown when available */}
      <div className="space-y-2.5">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">
          {hasOutputs ? 'READ EACH OUTPUT · CROWN THE WINNER' : 'WHICH MODEL WOULD WIN THIS TASK?'}
        </p>
        {models.map((model, i) => {
          const output = outputs[model] ?? ''
          const isOpen = expanded === model
          const isSelected = pick === model
          const color = MODEL_COLORS[i % MODEL_COLORS.length]
          return (
            <div key={model} className="rounded-lg border overflow-hidden transition-all duration-200"
              style={isSelected
                ? { borderColor: `${color}60`, boxShadow: `0 0 16px ${color}18` }
                : { borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Header row — always visible */}
              <div className="flex items-stretch bg-black/20">
                {/* Expand/collapse — left side */}
                {hasOutputs && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : model)}
                    className="flex items-center gap-3 flex-1 px-4 py-3 text-left cursor-crosshair min-w-0"
                  >
                    <span className="text-base flex-shrink-0">🤖</span>
                    <span className="text-sm font-mono font-bold truncate" style={{ color: isSelected ? color : 'rgba(255,255,255,0.7)' }}>{model}</span>
                    {isSelected && <span className="text-[9px] font-mono flex-shrink-0" style={{ color }}>✓</span>}
                    <span className="text-[9px] font-mono text-white/20 ml-auto flex-shrink-0">{isOpen ? '▾' : '▸'}</span>
                  </button>
                )}
                {/* No-output mode: whole row is the select button */}
                {!hasOutputs && (
                  <button
                    onClick={() => setPick(model)}
                    className="flex items-center gap-3 flex-1 px-4 py-3 text-left cursor-crosshair"
                  >
                    <span className="text-base">🤖</span>
                    <span className="text-sm font-mono font-bold" style={{ color: isSelected ? color : 'rgba(255,255,255,0.7)' }}>{model}</span>
                    <div className="ml-auto w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all"
                      style={isSelected ? { borderColor: color, backgroundColor: color } : { borderColor: 'rgba(255,255,255,0.15)' }} />
                  </button>
                )}
                {/* Select badge — right side (output mode) */}
                {hasOutputs && (
                  <button
                    onClick={() => setPick(model)}
                    className="flex-shrink-0 px-3 border-l border-white/5 flex items-center gap-1.5 cursor-crosshair transition-colors"
                    style={isSelected
                      ? { backgroundColor: `${color}15`, color }
                      : { color: 'rgba(255,255,255,0.2)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full border-2 transition-all"
                      style={isSelected ? { borderColor: color, backgroundColor: color } : { borderColor: 'rgba(255,255,255,0.2)' }} />
                    <span className="text-[9px] font-mono">{isSelected ? 'PICK' : 'pick'}</span>
                  </button>
                )}
              </div>

              {/* Expanded output */}
              {hasOutputs && isOpen && (
                <div className="border-t border-white/5 bg-black/30 px-4 pt-3 pb-4">
                  <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto"
                    style={{ color: isSelected ? `${color}cc` : 'rgba(255,255,255,0.6)' }}>
                    {output || '[no output]'}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SubmitBtn onClick={() => onSubmit({ pick })} disabled={!pick} accentColor={accentColor}>
        CROWN THE WINNER
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SPOT THE AI  (formerly Spot the Deepfake — text Turing test)
// ─────────────────────────────────────────────────────────────
function SpotDeepfakeGame({ challenge, onSubmit, accentColor }: GameProps) {
  const theme = String(challenge.theme ?? '')
  const difficulty = String(challenge.difficulty ?? 'easy')
  const snippets = Array.isArray(challenge.snippets)
    ? (challenge.snippets as Array<{ id: string; text: string; position: number }>)
    : []
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<'unsure' | 'confident' | 'certain'>('confident')

  const CONFIDENCE_OPTS: Array<{ key: typeof confidence; label: string; sub: string; color: string }> = [
    { key: 'unsure',    label: 'UNSURE',    sub: '1× reward',   color: 'rgba(255,255,255,0.4)' },
    { key: 'confident', label: 'CONFIDENT', sub: '1.5× reward', color: '#fbbf24' },
    { key: 'certain',   label: 'CERTAIN',   sub: '2× reward',   color: '#59f5a9' },
  ]

  const difficultyColors: Record<string, string> = { easy: '#34d399', medium: '#fbbf24', hard: '#f87171' }
  const dColor = difficultyColors[difficulty] ?? '#fbbf24'
  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-1">CONTEXT</p>
          <p className="text-xs font-mono text-white/60 leading-relaxed">{theme}</p>
        </div>
        <span className="flex-shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded"
          style={{ color: dColor, backgroundColor: `${dColor}18`, border: `1px solid ${dColor}30` }}>
          {difficulty.toUpperCase()}
        </span>
      </div>

      <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 px-3 py-2.5 flex gap-2 items-center">
        <span className="text-base flex-shrink-0">👁</span>
        <p className="text-[10px] font-mono text-purple-300/70">
          3 of these are written by humans. 1 was generated by an AI. Find the fake.
        </p>
      </div>

      {/* Snippet cards */}
      <div className="space-y-2.5">
        {snippets.map((snippet) => {
          const isSelected = selectedPosition === snippet.position
          const label = LABELS[snippet.position] ?? String(snippet.position + 1)
          return (
            <button
              key={snippet.id}
              onClick={() => setSelectedPosition(snippet.position)}
              className="w-full text-left rounded-lg border transition-all duration-150 cursor-crosshair overflow-hidden"
              style={isSelected
                ? { borderColor: `${accentColor}60`, boxShadow: `0 0 18px ${accentColor}18` }
                : { borderColor: 'rgba(255,255,255,0.07)' }}
            >
              {/* Label strip */}
              <div className="flex items-center gap-2 px-3 py-2 border-b"
                style={isSelected
                  ? { borderColor: `${accentColor}25`, backgroundColor: `${accentColor}10` }
                  : { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <span className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-mono font-black transition-all"
                  style={isSelected
                    ? { backgroundColor: accentColor, color: '#000' }
                    : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  {label}
                </span>
                {isSelected && (
                  <span className="text-[9px] font-mono" style={{ color: accentColor }}>YOUR PICK — AI GENERATED? ✓</span>
                )}
              </div>
              {/* Text body */}
              <div className="px-3 py-3 bg-black/20">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-left"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>
                  {snippet.text}
                </pre>
              </div>
            </button>
          )
        })}
      </div>

      {/* Confidence selector — only shown once a pick is made */}
      {selectedPosition !== null && (
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">HOW SURE ARE YOU?</p>
          <div className="grid grid-cols-3 gap-2">
            {CONFIDENCE_OPTS.map(opt => {
              const isActive = confidence === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setConfidence(opt.key)}
                  className="rounded-lg border py-2.5 text-center transition-all cursor-crosshair"
                  style={isActive
                    ? { borderColor: `${opt.color}60`, backgroundColor: `${opt.color}10` }
                    : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <p className="text-[9px] font-display font-bold tracking-widest"
                    style={{ color: isActive ? opt.color : 'rgba(255,255,255,0.35)' }}>{opt.label}</p>
                  <p className="text-[9px] font-mono mt-0.5"
                    style={{ color: isActive ? opt.color : 'rgba(255,255,255,0.2)' }}>{opt.sub}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <SubmitBtn
        onClick={() => { if (selectedPosition !== null) onSubmit({ selectedPosition, confidence }) }}
        disabled={selectedPosition === null}
        accentColor={accentColor}
      >
        {confidence === 'certain' ? 'FLAG AS AI — CERTAIN ✓' : confidence === 'unsure' ? 'FLAG AS AI (UNSURE)' : 'FLAG AS AI'}
      </SubmitBtn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROMPT CRASH — rising multiplier, cash-out timing
// ─────────────────────────────────────────────────────────────
function PromptCrashGame({ challenge, onSubmit, accentColor, entryCost }: GameProps & { entryCost: number }) {
  const scenario = String(challenge.scenario ?? 'Crash round')
  const model = String(challenge.model ?? '')
  const note = String(challenge.note ?? '')

  // Multiplier rises with an exponential-ish curve that feels fast at first
  // then accelerates. Time tracked via rAF for smoothness; client doesn't
  // know the server-side crash point, so it just keeps climbing until the
  // player cashes out (or until our soft cap at 100x as a safety net).
  const [multiplier, setMultiplier] = useState(1.0)
  const [running, setRunning] = useState(true)
  const startedRef = useRef(performance.now())
  const rafRef = useRef<number | null>(null)
  const { play } = useSound()

  useEffect(() => {
    let lastTick = 0
    const loop = (now: number) => {
      const t = (now - startedRef.current) / 1000 // seconds elapsed
      // M(t) = 1.00 + 0.10*t^1.55 — gentle for first 2s, then accelerates.
      const m = 1 + 0.1 * Math.pow(t, 1.55)
      setMultiplier(m)
      // Tick sound at every 0.5x boundary for tension
      if (Math.floor(m * 2) > Math.floor(lastTick * 2)) {
        lastTick = m
        play('tick')
      }
      // Hard safety cap: if we somehow exceed 100x, force submit as max.
      if (m >= 100) {
        cashOut(100)
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cashOut = (atOverride?: number) => {
    if (!running) return
    setRunning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const at = typeof atOverride === 'number' ? atOverride : multiplier
    const clamped = Math.max(1.01, Math.floor(at * 100) / 100)
    play('submit')
    onSubmit({ cashOutAt: clamped })
  }

  const projected = Math.floor(entryCost * multiplier)
  const profit = projected - entryCost
  const heat = Math.min(1, (multiplier - 1) / 6) // 0 → 1 over first 7x
  const dangerZone = multiplier >= 5
  const legendary = multiplier >= 10

  // Heat-blended color: orange → red → gold at legendary
  const multColor = legendary
    ? '#ffd700'
    : heat > 0.6
      ? `rgb(${Math.floor(255)}, ${Math.floor(140 - heat * 140)}, 0)`
      : accentColor

  return (
    <div className="space-y-5">
      {/* Scenario card */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-mono tracking-[0.2em]" style={{ color: accentColor }}>SCENARIO</p>
          <div className="flex items-center gap-2">
            {dangerZone && running && (
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded animate-pulse"
                style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {legendary ? '🔥 LEGENDARY' : '⚠ DANGER ZONE'}
              </span>
            )}
            <span className="text-[9px] font-mono text-white/30">model: {model}</span>
          </div>
        </div>
        <p className="text-sm text-white/80 font-mono">{scenario}</p>
        {note && <p className="text-[10px] text-white/30 font-mono italic mt-1">&ldquo;{note}&rdquo;</p>}
      </div>

      {/* Multiplier display */}
      <div
        className="relative rounded-lg overflow-hidden border p-8 text-center transition-all duration-500"
        style={{
          background: `linear-gradient(to bottom, ${legendary ? 'rgba(26,10,0,1)' : dangerZone ? 'rgba(26,5,0,1)' : 'rgba(26,12,5,1)'}, #0a0a0a)`,
          borderColor: dangerZone ? `rgba(239,68,68,${0.3 + heat * 0.4})` : `${accentColor}40`,
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 transition-all duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${multColor}${Math.floor(heat * 80).toString(16).padStart(2, '0')}, transparent 70%)`,
            opacity: 0.3 + heat * 0.7,
          }}
        />
        {/* Climbing line */}
        <CrashChart multiplier={multiplier} accent={multColor} />

        {/* Multiplier readout */}
        <div className="relative">
          <p className="font-display font-black tabular-nums leading-none"
            style={{
              fontSize: '5.5rem',
              color: multColor,
              textShadow: `0 0 ${20 + heat * 60}px ${multColor}, 0 0 ${heat * 120}px ${multColor}40`,
              animation: running ? 'pulse-mult 0.4s ease-out' : undefined,
              letterSpacing: '-0.02em',
            }}>
            {multiplier.toFixed(2)}<span className="text-white/50 text-3xl">×</span>
          </p>
          <p className="font-display text-[10px] tracking-[0.3em] mt-2 transition-colors duration-500"
            style={{ color: dangerZone && running ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.3)' }}>
            {running
              ? (legendary ? 'LEGENDARY — CASH OUT NOW' : dangerZone ? 'DANGER — IT COULD CRASH ANY TICK' : 'CLIMBING — CASH OUT BEFORE IT CRASHES')
              : 'LOCKED IN'}
          </p>
        </div>
      </div>

      {/* Projected payout */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Wager" value={`${entryCost} cr`} color="rgba(255,255,255,0.5)" />
        <Stat label="Projected Payout" value={`${projected} cr`} color={multColor} highlight />
        <Stat label="Profit" value={`${profit >= 0 ? '+' : ''}${profit} cr`} color={profit >= 0 ? '#59f5a9' : '#f87171'} />
      </div>

      {/* Cash-out button */}
      <button
        onClick={() => cashOut()}
        disabled={!running}
        className="relative w-full py-5 font-display text-xl tracking-[0.2em] font-black transition-all duration-150 cursor-crosshair overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        style={{
          backgroundColor: running ? multColor : 'rgba(255,255,255,0.05)',
          color: running ? '#000' : 'rgba(255,255,255,0.3)',
          boxShadow: running
            ? `0 0 ${32 + heat * 48}px ${multColor}80, 0 0 0 1px ${multColor}, inset 0 1px 0 rgba(255,255,255,0.3)`
            : undefined,
        }}
      >
        <span className="absolute inset-0 pointer-events-none"
          style={running ? { background: 'radial-gradient(ellipse at 50% 120%, rgba(255,255,255,0.5), transparent)', animation: 'crash-shine 1.5s ease-in-out infinite' } : undefined} />
        <span className="relative">
          {running ? `CASH OUT · ${projected} CR` : 'SCORING…'}
        </span>
      </button>

      <p className="text-center text-[10px] font-mono text-white/20">
        Higher multiplier = higher payout, but every tick is a higher chance of crashing.
      </p>

      <style jsx>{`
        @keyframes pulse-mult {
          0%   { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes crash-shine {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

function CrashChart({ multiplier, accent }: { multiplier: number; accent: string }) {
  // Build a simple SVG sparkline tracking the multiplier rise.
  const samplesRef = useRef<number[]>([1])
  if (samplesRef.current[samplesRef.current.length - 1] !== multiplier) {
    samplesRef.current.push(multiplier)
    if (samplesRef.current.length > 60) samplesRef.current.shift()
  }
  const samples = samplesRef.current
  const max = Math.max(...samples, 1.5)
  const w = 280
  const h = 80
  const points = samples.map((m, i) => {
    const x = (i / Math.max(1, samples.length - 1)) * w
    const y = h - ((m - 1) / (max - 1 || 1)) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-x-6 top-4 h-20 w-auto opacity-60 pointer-events-none">
      <defs>
        <linearGradient id="crashGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${points} ${w},${h}`} fill="url(#crashGrad)" />
    </svg>
  )
}

function Stat({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${highlight ? 'bg-black/40' : 'bg-black/20'}`}
      style={{ borderColor: highlight ? `${color}50` : 'rgba(255,255,255,0.07)' }}
    >
      <p className="text-[9px] font-mono tracking-widest text-white/30 mb-1">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROMPT CRASH REVEAL (after submit, in result state)
// ─────────────────────────────────────────────────────────────
function CrashReveal({ challenge }: { challenge: Record<string, unknown> }) {
  const cashOutAt = Number(challenge.cashOutAt ?? 0)
  const crashPoint = Number(challenge.crashPoint ?? 0)
  const won = Boolean(challenge.won)
  const margin = won ? crashPoint - cashOutAt : cashOutAt - crashPoint
  const nearMiss = !won && cashOutAt > 0 && margin < 0.5
  const [animPhase, setAnimPhase] = useState(0)

  // Sequence: 0 = silence, 1 = crash flash, 2 = full reveal
  useEffect(() => {
    if (!won) {
      const t1 = setTimeout(() => setAnimPhase(1), 150)
      const t2 = setTimeout(() => setAnimPhase(2), 800)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else {
      setAnimPhase(2)
    }
  }, [won])

  let verdict = ''
  let verdictColor = ''
  if (won) {
    verdict = cashOutAt >= 10 ? '🏆 LEGENDARY EXIT' : cashOutAt >= 5 ? '💎 INCREDIBLE CALL' : cashOutAt >= 3 ? '🚀 SHARP EXIT' : '✓ SAFE EXIT'
    verdictColor = '#59f5a9'
  } else if (cashOutAt === 0) {
    verdict = '💥 NEVER CASHED OUT'
    verdictColor = '#f87171'
  } else if (nearMiss) {
    verdict = '😬 SO CLOSE — ' + margin.toFixed(2) + '× TOO GREEDY'
    verdictColor = '#fbbf24'
  } else {
    verdict = '💀 REKT — ' + margin.toFixed(2) + '× PAST THE CRASH'
    verdictColor = '#f87171'
  }

  return (
    <div className="space-y-3">
      {/* Crash flash for losses */}
      {!won && animPhase >= 1 && (
        <div
          className="rounded-lg flex flex-col items-center justify-center py-6 gap-2 transition-all"
          style={{
            backgroundColor: animPhase < 2 ? 'rgba(239,68,68,0.15)' : 'transparent',
            border: `1px solid ${animPhase < 2 ? 'rgba(239,68,68,0.5)' : 'transparent'}`,
          }}
        >
          <span
            className="text-5xl"
            style={{
              animation: animPhase < 2 ? 'crash-explode 0.6s ease-out' : undefined,
              display: 'block',
            }}
          >
            {nearMiss ? '😱' : '💥'}
          </span>
          {animPhase < 2 && (
            <p className="text-sm font-display font-black tracking-[0.2em] text-red-400">
              {nearMiss ? 'SO CLOSE' : 'CRASHED'}
            </p>
          )}
        </div>
      )}

      {/* Main stats — shown after flash */}
      {animPhase >= 2 && (
        <div className="rounded-lg border bg-black/30 p-4 space-y-3"
          style={{ borderColor: won ? 'rgba(89,245,169,0.25)' : nearMiss ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.15)' }}>
          <div className="text-center">
            <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-1">CRASH REVEAL</p>
            <p className="text-sm font-display font-black tracking-wider" style={{ color: verdictColor }}>{verdict}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded border border-white/10 bg-black/30 p-3">
              <p className="text-[9px] font-mono text-white/30 tracking-widest mb-1">YOU CASHED</p>
              <p className="text-2xl font-display font-black tabular-nums" style={{ color: won ? '#59f5a9' : nearMiss ? '#fbbf24' : '#64748b' }}>
                {cashOutAt > 0 ? cashOutAt.toFixed(2) : '—'}<span className="text-base text-white/40">×</span>
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/30 p-3">
              <p className="text-[9px] font-mono text-white/30 tracking-widest mb-1">CRASHED AT</p>
              <p className="text-2xl font-display font-black tabular-nums" style={{ color: won ? '#fb923c' : '#f87171' }}>
                {crashPoint.toFixed(2)}<span className="text-base text-white/40">×</span>
              </p>
            </div>
          </div>
          {won && cashOutAt >= 3 && (
            <div className="rounded border border-green-500/20 bg-green-950/10 p-2 text-center">
              <p className="text-[10px] font-mono text-green-400/70">
                Crashed {margin.toFixed(2)}× after your exit — perfect timing
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes crash-explode {
          0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          50%  { transform: scale(1.3) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TOKEN MINES — incremental reveal, multiplier ladder, cash out
// ─────────────────────────────────────────────────────────────
function TokenMinesGame({
  challenge,
  accentColor,
  entryCost,
  sessionId,
}: GameProps & { entryCost: number; sessionId: string }) {
  const initialGrid = Number(challenge.gridSize ?? 25)
  const initialMines = Number(challenge.mineCount ?? 3)
  const initialLadder = (Array.isArray(challenge.multiplierLadder)
    ? (challenge.multiplierLadder as number[])
    : [1.0])

  const [revealed, setRevealed] = useState<number[]>([])
  const [mineHit, setMineHit] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justRevealed, setJustRevealed] = useState<number | null>(null)

  const safeCount = revealed.length - (mineHit !== null ? 1 : 0)
  const ladder = initialLadder
  const currentMult = mineHit !== null ? 0 : (ladder[safeCount] ?? 1.0)
  const nextMult = mineHit !== null ? 0 : (ladder[safeCount + 1] ?? currentMult)
  const projected = Math.floor(entryCost * currentMult)
  const heat = Math.min(1, currentMult / 10)

  const { play } = useSound()
  const settle = useArenaStore((s) => s.settleFromAction)

  const action = async (body: Record<string, unknown>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/games/mines/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, ...body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      // Update local state from server
      setRevealed(json.state.revealed)
      if (json.state.exploded) {
        setMineHit(json.state.explodedAt)
        play('lose')
      } else if (body.action === 'reveal') {
        const cellIdx = body.cellIndex as number
        setJustRevealed(cellIdx)
        setTimeout(() => setJustRevealed(null), 400)
        play('tick')
      }
      // If session settled, transition to result state
      if (json.resolved) {
        const r = json.resolved as {
          finalMultiplier: number
          reward: number
          score: number
          flavorMessage: string
          minePositions: number[]
          revealed: number[]
          exploded: boolean
          explodedAt: number | null
          progression?: unknown
        }
        if (!r.exploded) play('submit')
        await settle({
          game: 'token_mines',
          score: r.score,
          rewardAmount: r.reward,
          flavorMessage: r.flavorMessage,
          challenge: {
            gridSize: initialGrid,
            mineCount: initialMines,
            multiplierLadder: ladder,
            finalMultiplier: r.finalMultiplier,
            minePositions: r.minePositions,
            revealed: r.revealed,
            exploded: r.exploded,
            explodedAt: r.explodedAt,
          },
          progression: r.progression as never,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em]" style={{ color: accentColor }}>TOKEN MINES</p>
          <p className="text-xs text-white/60 font-mono mt-0.5">
            {initialMines} mines in a {Math.sqrt(initialGrid)}×{Math.sqrt(initialGrid)} grid
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono text-white/40 tracking-widest">SAFE PICKS</p>
          <p className="text-base font-display font-bold tabular-nums" style={{ color: accentColor }}>
            {safeCount}<span className="text-white/30 text-xs"> / {initialGrid - initialMines}</span>
          </p>
        </div>
      </div>

      {/* Grid */}
      <div
        className="relative rounded-lg overflow-hidden border bg-gradient-to-b from-[#051a17] to-[#0a0a0a] p-4"
        style={{ borderColor: `${accentColor}40` }}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${accentColor}${Math.floor(heat * 50).toString(16).padStart(2, '0')}, transparent 70%)`,
            opacity: 0.3 + heat * 0.5,
          }}
        />
        <div
          className="relative grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.sqrt(initialGrid)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: initialGrid }, (_, i) => {
            const isRevealed = revealed.includes(i)
            const isMine = mineHit === i
            const isJustRevealed = justRevealed === i
            const disabled = isRevealed || busy || mineHit !== null
            return (
              <button
                key={i}
                onClick={() => !disabled && action({ action: 'reveal', cellIndex: i })}
                disabled={disabled}
                className="aspect-square rounded border flex items-center justify-center font-display text-lg font-bold"
                style={{
                  backgroundColor: isMine
                    ? 'rgba(239,68,68,0.3)'
                    : isRevealed
                      ? `${accentColor}25`
                      : 'rgba(255,255,255,0.03)',
                  borderColor: isMine
                    ? 'rgba(239,68,68,0.8)'
                    : isRevealed
                      ? `${accentColor}80`
                      : 'rgba(255,255,255,0.08)',
                  color: isMine ? '#fca5a5' : isRevealed ? accentColor : 'rgba(255,255,255,0.15)',
                  cursor: disabled ? (mineHit !== null ? 'default' : 'wait') : 'crosshair',
                  boxShadow: isMine
                    ? '0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3)'
                    : isRevealed
                      ? `0 0 10px ${accentColor}50`
                      : 'none',
                  animation: isMine
                    ? 'mine-explode 0.5s ease-out'
                    : isJustRevealed
                      ? 'cell-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      : !isRevealed && !disabled
                        ? undefined
                        : undefined,
                  transition: isJustRevealed || isMine ? 'none' : 'background-color 0.15s, border-color 0.15s',
                }}
              >
                {isMine ? '💥' : isRevealed ? '◆' : ''}
              </button>
            )
          })}
          <style jsx>{`
            @keyframes cell-pop {
              0%   { transform: scale(0.6); opacity: 0.4; }
              65%  { transform: scale(1.15); opacity: 1; }
              100% { transform: scale(0.95); opacity: 1; }
            }
            @keyframes mine-explode {
              0%   { transform: scale(1); }
              20%  { transform: scale(1.4); }
              40%  { transform: scale(0.9); }
              60%  { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <MStat label="Wager" value={`${entryCost} cr`} color="rgba(255,255,255,0.5)" />
        <MStat label="Current Payout" value={`${projected} cr`} color={accentColor} highlight />
        <MStat
          label={`Next Pick (${nextMult.toFixed(2)}×)`}
          value={`${Math.floor(entryCost * nextMult)} cr`}
          color="#5ad8ff"
        />
      </div>

      {/* Cash-out button */}
      <button
        onClick={() => action({ action: 'cashout' })}
        disabled={safeCount === 0 || busy || mineHit !== null}
        className="relative w-full py-5 font-display text-xl tracking-[0.2em] font-black transition-all duration-150 cursor-pointer overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        style={{
          backgroundColor: safeCount > 0 && mineHit === null ? accentColor : 'rgba(255,255,255,0.05)',
          color: safeCount > 0 && mineHit === null ? '#000' : 'rgba(255,255,255,0.3)',
          boxShadow: safeCount > 0 && mineHit === null ? `0 0 32px ${accentColor}80, 0 0 0 1px ${accentColor}` : undefined,
        }}
      >
        <span className="relative">
          {safeCount === 0
            ? 'PICK A CELL TO BEGIN'
            : mineHit !== null
              ? 'BUSTED'
              : `CASH OUT · ${projected} CR (${currentMult.toFixed(2)}×)`}
        </span>
      </button>

      {error && <p className="text-xs font-mono text-red-400 text-center">{error}</p>}
      <p className="text-center text-[10px] font-mono text-white/20">
        Each safe pick compounds your multiplier. Hit one mine and you lose everything.
      </p>
    </div>
  )
}

function MStat({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${highlight ? 'bg-black/40' : 'bg-black/20'}`}
      style={{ borderColor: highlight ? `${color}50` : 'rgba(255,255,255,0.07)' }}
    >
      <p className="text-[9px] font-mono tracking-widest text-white/30 mb-1 uppercase">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TOKEN MINES REVEAL (after settle, in result state)
// ─────────────────────────────────────────────────────────────
function MinesReveal({ challenge }: { challenge: Record<string, unknown> }) {
  const gridSize = Number(challenge.gridSize ?? 25)
  const mineCount = Number(challenge.mineCount ?? 3)
  const revealed = Array.isArray(challenge.revealed) ? (challenge.revealed as number[]) : []
  const minePositions = Array.isArray(challenge.minePositions) ? (challenge.minePositions as number[]) : []
  const exploded = Boolean(challenge.exploded)
  const explodedAt = challenge.explodedAt === null ? null : Number(challenge.explodedAt ?? -1)
  const finalMultiplier = Number(challenge.finalMultiplier ?? 0)
  const cols = Math.sqrt(gridSize)
  const safePicks = revealed.length - (exploded ? 1 : 0)

  const totalSafe = gridSize - mineCount
  const nearMiss = exploded && safePicks >= Math.floor(totalSafe * 0.75)

  let verdict = ''
  let verdictColor = '#5eead4'
  if (exploded) {
    if (safePicks === 0) { verdict = '💥 FIRST PICK MINE'; verdictColor = '#f87171' }
    else if (nearMiss) { verdict = `😱 SO CLOSE — ${totalSafe - safePicks} MORE TO WIN`; verdictColor = '#fbbf24' }
    else { verdict = `💀 BUSTED AFTER ${safePicks} SAFE PICK${safePicks === 1 ? '' : 'S'}`; verdictColor = '#f87171' }
  } else {
    verdict = finalMultiplier >= 5 ? `🏆 INCREDIBLE — ${finalMultiplier.toFixed(2)}× SECURED` : `💎 ${finalMultiplier.toFixed(2)}× BANKED`
  }

  return (
    <div className="rounded-lg border bg-black/30 p-4 space-y-3"
      style={{ borderColor: exploded ? (nearMiss ? 'rgba(251,191,36,0.25)' : 'rgba(248,113,113,0.15)') : 'rgba(94,234,212,0.2)' }}>
      <div className="text-center">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-1">MINES REVEAL</p>
        <p className="text-sm font-display font-black tracking-wider" style={{ color: verdictColor }}>{verdict}</p>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: gridSize }, (_, i) => {
          const isMine = minePositions.includes(i)
          const wasPicked = revealed.includes(i)
          const explodedHere = isMine && i === explodedAt
          return (
            <div
              key={i}
              className="aspect-square rounded border flex items-center justify-center text-xs"
              style={{
                backgroundColor: explodedHere
                  ? 'rgba(239,68,68,0.4)'
                  : isMine
                    ? 'rgba(239,68,68,0.15)'
                    : wasPicked
                      ? 'rgba(94,234,212,0.25)'
                      : 'rgba(255,255,255,0.02)',
                borderColor: explodedHere
                  ? 'rgba(239,68,68,0.8)'
                  : isMine
                    ? 'rgba(239,68,68,0.4)'
                    : wasPicked
                      ? 'rgba(94,234,212,0.6)'
                      : 'rgba(255,255,255,0.05)',
                color: isMine ? '#fca5a5' : wasPicked ? '#5eead4' : 'rgba(255,255,255,0.15)',
              }}
            >
              {isMine ? '💣' : wasPicked ? '◆' : ''}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center pt-1">
        <div className="rounded border border-white/10 bg-black/30 p-2">
          <p className="text-[9px] font-mono text-white/30 tracking-widest mb-0.5">SAFE PICKS</p>
          <p className="text-xl font-display font-black tabular-nums" style={{ color: exploded ? '#64748b' : '#5eead4' }}>
            {safePicks}<span className="text-xs text-white/40"> / {gridSize - mineCount}</span>
          </p>
        </div>
        <div className="rounded border border-white/10 bg-black/30 p-2">
          <p className="text-[9px] font-mono text-white/30 tracking-widest mb-0.5">FINAL MULT</p>
          <p className="text-xl font-display font-black tabular-nums" style={{ color: exploded ? '#f87171' : '#5eead4' }}>
            {finalMultiplier.toFixed(2)}<span className="text-base text-white/40">×</span>
          </p>
        </div>
      </div>
      <p className="text-[10px] font-mono text-center" style={{ color: exploded ? '#f87171' : '#5eead4' }}>
        {exploded
          ? `Hit a mine after ${safePicks} safe pick${safePicks === 1 ? '' : 's'}`
          : `Walked away with ${finalMultiplier.toFixed(2)}× — ${mineCount} mines unfired`}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TOKEN PROPHET REVEAL
// ─────────────────────────────────────────────────────────────
function ProphetReveal({ challenge, accentColor }: { challenge: Record<string, unknown>; accentColor: string }) {
  const promptA   = String(challenge.promptA ?? '')
  const promptB   = String(challenge.promptB ?? '')
  const tokensA   = Number(challenge.tokensA ?? 0)
  const tokensB   = Number(challenge.tokensB ?? 0)
  const longerIs  = String(challenge.longerIs ?? '')
  const playerPick = String(challenge.playerPick ?? '')
  const hint      = String(challenge.hint ?? '')
  const correct   = playerPick === longerIs
  const maxTokens = Math.max(tokensA, tokensB, 1)

  const bars = [
    { key: 'A', prompt: promptA, tokens: tokensA, isLonger: longerIs === 'A', isPick: playerPick === 'A' },
    { key: 'B', prompt: promptB, tokens: tokensB, isLonger: longerIs === 'B', isPick: playerPick === 'B' },
  ]

  return (
    <div className="rounded-lg border bg-black/30 p-4 space-y-4"
      style={{ borderColor: correct ? `${accentColor}40` : 'rgba(248,113,113,0.2)' }}>
      <div className="text-center">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-1">TOKEN REVEAL</p>
        <p className="text-sm font-display font-black tracking-wider"
          style={{ color: correct ? accentColor : '#f87171' }}>
          {correct ? '✓ CORRECT READ' : '✗ WRONG CALL'}
        </p>
      </div>

      <div className="space-y-3">
        {bars.map(({ key, prompt, tokens, isLonger, isPick }) => {
          const pct = Math.round((tokens / maxTokens) * 100)
          const barColor = isLonger ? accentColor : 'rgba(255,255,255,0.2)'
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-mono font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                    style={isLonger
                      ? { color: accentColor, backgroundColor: `${accentColor}20` }
                      : { color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    {key}
                  </span>
                  <p className="text-[10px] font-mono text-white/40 truncate">{prompt}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {isPick && <span className="text-[8px] font-mono text-white/30">YOUR PICK</span>}
                  {isLonger && <span className="text-[8px] font-mono font-bold" style={{ color: accentColor }}>LONGER ↑</span>}
                  <span className="text-xs font-mono font-bold tabular-nums"
                    style={{ color: isLonger ? accentColor : 'rgba(255,255,255,0.4)' }}>
                    ~{tokens}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
            </div>
          )
        })}
      </div>

      {hint && (
        <div className="rounded border border-white/8 bg-black/20 px-3 py-2.5 flex gap-2 items-start">
          <span className="text-sm flex-shrink-0">💡</span>
          <p className="text-[10px] font-mono text-white/45 leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENT META
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENT_META: Record<string, { name: string; icon: string }> = {
  first_blood:       { name: 'First Blood',       icon: '🩸' },
  calibrated:        { name: 'Calibrated',        icon: '🎯' },
  under_par:         { name: 'Under Par',         icon: '⛳' },
  bug_hunter:        { name: 'Bug Hunter',        icon: '🐛' },
  chicken_dinner:    { name: 'Chicken Dinner',    icon: '🍗' },
  speed_demon:       { name: 'Speed Demon',       icon: '⚡' },
  model_master:      { name: 'Model Master',      icon: '🧠' },
  deepfake_detector: { name: 'Deepfake Detector', icon: '👁' },
  streak_3:          { name: 'Hot Streak',        icon: '🔥' },
  streak_5:          { name: 'The Streak',        icon: '💫' },
  streak_10:         { name: 'Unstoppable',       icon: '🌟' },
  degen_hours:       { name: 'Degen Hours',       icon: '🌙' },
  rank_5:            { name: 'Promoted',          icon: '⬆' },
  rank_10:           { name: 'Champion',          icon: '👑' },
  all_games:         { name: 'Completionist',     icon: '🏆' },
}

// ─────────────────────────────────────────────────────────────
// REVEAL COMPONENTS (shown after result)
// ─────────────────────────────────────────────────────────────
function RaceReveal({ challenge }: { challenge: Record<string, unknown> }) {
  const latencies = Array.isArray(challenge.latencies)
    ? (challenge.latencies as Array<{ provider: string; latencyMs: number | null; ok: boolean }>)
    : []
  const fastest = String(challenge.fastest ?? '')
  const insight = String(challenge.insight ?? '')
  const providerProfiles = Array.isArray(challenge.providerProfiles)
    ? (challenge.providerProfiles as Array<{ provider: string; typicalRange: string; note: string }>)
    : []

  if (!latencies.length) return null
  const maxMs = Math.max(...latencies.map(l => l.latencyMs ?? 0), 1)
  const sorted = [...latencies].sort((a, b) => (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999))

  return (
    <div className="space-y-3">
      {/* Race bar chart */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">RACE RESULTS</p>
        {sorted.map((l, i) => {
          const pct = l.latencyMs ? Math.max(5, (l.latencyMs / maxMs) * 100) : 100
          const isWinner = l.provider === fastest
          const color = isWinner ? '#38bdf8' : l.ok ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'
          const profile = providerProfiles.find(p => p.provider === l.provider)
          return (
            <div key={l.provider}>
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: isWinner ? '#38bdf8' : 'rgba(255,255,255,0.4)' }}>
                    {['🥇', '🥈', '🥉'][i]} {l.provider}
                  </span>
                  {profile && (
                    <span className="text-[9px] text-white/20 font-mono hidden sm:block">
                      (typical {profile.typicalRange})
                    </span>
                  )}
                </div>
                <span style={{ color: isWinner ? '#38bdf8' : 'rgba(255,255,255,0.25)' }}>
                  {l.ok && l.latencyMs ? `${l.latencyMs}ms` : 'N/A'}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${l.ok ? pct : 100}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Insight callout */}
      {insight && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 px-3 py-2.5 flex gap-2.5 items-start">
          <span className="text-sm flex-shrink-0 mt-0.5">💡</span>
          <p className="text-[10px] font-mono text-sky-300/60 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  )
}

function BrawlReveal({ challenge }: { challenge: Record<string, unknown> }) {
  const outputs = (challenge.outputs ?? {}) as Record<string, string>
  const bestModel = String(challenge.bestModel ?? '')
  const playerPick = String(challenge.playerPick ?? '')
  const models = challenge.models
    ? (challenge.models as string[])
    : Object.keys(outputs)
  const [open, setOpen] = useState<string | null>(null)
  if (!models.length) return null

  const correct = playerPick === bestModel

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/30">JUDGE VERDICT</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-mono">
            <span className="text-white/40">Winner: </span>
            <span className="font-bold text-green-400">★ {bestModel}</span>
          </p>
          {playerPick && playerPick !== bestModel && (
            <p className="text-xs font-mono text-white/30">
              Your pick: <span className="text-red-400/70">{playerPick}</span>
            </p>
          )}
        </div>
        <div className="space-y-1 pt-1">
          {models.map(m => {
            const isWinner = m === bestModel
            const isPlayerPick = m === playerPick
            return (
              <div key={m} className="rounded border overflow-hidden transition-all"
                style={{ borderColor: isWinner ? 'rgba(74,222,128,0.4)' : isPlayerPick ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)' }}>
                <button onClick={() => setOpen(open === m ? null : m)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-crosshair">
                  <span className="text-xs font-mono font-bold flex-1"
                    style={{ color: isWinner ? '#4ade80' : isPlayerPick ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                    {isWinner ? '★ ' : isPlayerPick ? '✗ ' : ''}{m}
                  </span>
                  {isPlayerPick && !isWinner && (
                    <span className="text-[9px] font-mono text-red-400/60">your pick</span>
                  )}
                  {isWinner && isPlayerPick && (
                    <span className="text-[9px] font-mono text-green-400">your pick ✓</span>
                  )}
                  <span className="text-[9px] text-white/20">{open === m ? '▾' : '▸'}</span>
                </button>
                {open === m && (
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap px-3 pb-3 pt-1 bg-black/30 border-t border-white/5 max-h-48 overflow-y-auto"
                    style={{ color: isWinner ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.45)' }}>
                    {outputs[m] || '[No output]'}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!correct && playerPick && (
        <div className="rounded-lg border border-orange-500/20 bg-orange-950/10 px-3 py-2.5 flex gap-2 items-start">
          <span className="text-base flex-shrink-0">💡</span>
          <p className="text-[10px] font-mono text-orange-300/60 leading-relaxed">
            Expand {bestModel}&apos;s output above to see why it scored highest on {String(challenge.criteria ?? 'this criteria')}.
          </p>
        </div>
      )}
    </div>
  )
}

function DeepfakeReveal({ challenge }: { challenge: Record<string, unknown> }) {
  const snippets = Array.isArray(challenge.snippets)
    ? (challenge.snippets as Array<{ id: string; text: string; isAI: boolean; position: number }>)
    : []
  const selectedPosition = Number(challenge.playerSelectedPosition ?? -1)
  const explanation = String(challenge.explanation ?? '')
  const LABELS = ['A', 'B', 'C', 'D']
  if (!snippets.length) return null

  const aiSnippet = snippets.find(s => s.isAI)
  const correct = aiSnippet ? selectedPosition === aiSnippet.position : false

  return (
    <div className="space-y-3">
      {/* Snippet reveal */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-2">
        <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 mb-2">REVEAL</p>
        {snippets.map(snippet => {
          const isAI = snippet.isAI
          const isSelected = snippet.position === selectedPosition
          const label = LABELS[snippet.position] ?? String(snippet.position + 1)
          const borderColor = isAI ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.3)'
          const bg = isAI ? 'rgba(239,68,68,0.07)' : 'transparent'
          return (
            <div key={snippet.id} className="rounded border overflow-hidden"
              style={{ borderColor, backgroundColor: bg }}>
              <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor }}>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={isAI
                    ? { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }
                    : { backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                  {label}
                </span>
                <span className="text-[9px] font-mono font-bold"
                  style={{ color: isAI ? '#f87171' : '#4ade80' }}>
                  {isAI ? '⚠ AI GENERATED' : '✓ HUMAN'}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[9px] font-mono text-yellow-400">YOUR PICK</span>
                )}
              </div>
              <pre className="px-3 py-2 text-[10px] font-mono leading-relaxed whitespace-pre-wrap"
                style={{ color: isAI ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.4)' }}>
                {snippet.text}
              </pre>
            </div>
          )
        })}
      </div>

      {/* Explanation */}
      {explanation && (
        <div className={`rounded-lg border px-3 py-2.5 flex gap-2.5 items-start ${correct ? 'border-green-500/20 bg-green-950/10' : 'border-purple-500/20 bg-purple-950/10'}`}>
          <span className="text-base flex-shrink-0 mt-0.5">{correct ? '🎯' : '💡'}</span>
          <p className="text-[10px] font-mono leading-relaxed"
            style={{ color: correct ? 'rgba(74,222,128,0.7)' : 'rgba(192,132,252,0.7)' }}>
            {explanation}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARE RESULT BUTTON
// ─────────────────────────────────────────────────────────────
function ShareResultButton({ result }: {
  result: { score: number; rewardAmount: number; game: ArenaGameId }
}) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const gameName = result.game.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const grade = result.score >= 90 ? 'PERFECT' : result.score >= 70 ? 'GREAT' : result.score >= 40 ? 'OKAY' : 'MISS'
    const reward = result.rewardAmount > 0 ? ` +${result.rewardAmount} credits` : ''
    const text = `Tokenomicon · ${gameName}\n${grade} — ${result.score}/100${reward}\ntokenomicon.io/arena`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 text-[10px] font-mono text-white/20 hover:text-white/50 transition-colors cursor-crosshair"
    >
      {copied ? (
        <><span className="text-[#59f5a9]">✓</span> <span className="text-[#59f5a9]/60">copied</span></>
      ) : (
        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> share</>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// RESULT STATE
// ─────────────────────────────────────────────────────────────
function ResultState({ result, progression, onPlayAgain, accentColor }: {
  result: { score: number; rewardAmount: number; game: ArenaGameId; flavorMessage?: string; challenge?: Record<string, unknown>; fairness?: { serverSeed: string | null; serverSeedHash: string | null; clientSeed: string | null } }
  progression: ProgressionUpdate | null
  onPlayAgain: () => void
  accentColor: string
}) {
  const won = result.rewardAmount > 0
  const grade = result.score >= 90 ? 'PERFECT' : result.score >= 70 ? 'GREAT' : result.score >= 40 ? 'OKAY' : 'MISS'
  const [showFairness, setShowFairness] = useState(false)
  const scoreColor = result.score >= 70 ? accentColor : result.score >= 40 ? '#fbbf24' : '#f87171'

  // Celebrate exactly once per result render.
  const { play } = useSound()
  const fxKey = useRef<number>(0)
  const [fxTrigger, setFxTrigger] = useState(0)
  useEffect(() => {
    fxKey.current += 1
    setFxTrigger(fxKey.current)
    if (result.score >= 90 && result.rewardAmount > 0) play('jackpot')
    else if (result.score >= 70 && result.rewardAmount > 0) play('big_win')
    else if (result.rewardAmount > 0) play('win')
    else play('lose')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const intensity: 'normal' | 'big' | 'jackpot' =
    result.score >= 90 ? 'jackpot' : result.score >= 70 ? 'big' : 'normal'

  // Near-miss detection for scoring games (score 30-39: just below the win floor)
  const nearMiss = !won && result.score >= 30 && result.score < 40

  return (
    <ScreenShake trigger={fxTrigger} intensity={intensity}>
    <div className="flex flex-col items-center gap-6 px-5 py-10 text-center">
      {won && <Confetti trigger={fxTrigger} intensity={intensity} />}
      {won && result.score >= 70 && <WinFlash trigger={fxTrigger} color={accentColor} />}
      {won && <FloatingCredits trigger={fxTrigger} amount={result.rewardAmount} color={accentColor} />}

      {/* Near-miss banner (only for non-Crash/Mines — those have their own reveal) */}
      {nearMiss && result.game !== 'prompt_crash' && result.game !== 'token_mines' && (
        <div className="w-full max-w-xs rounded-lg border border-[#fbbf24]/30 bg-[#fbbf24]/5 px-4 py-2.5 near-miss-pulse">
          <p className="text-[10px] font-display font-bold tracking-[0.15em] text-[#fbbf24]">SO CLOSE —</p>
          <p className="text-xs font-mono text-[#fbbf24]/70 mt-0.5">You were {40 - result.score} points from a payout</p>
        </div>
      )}

      {/* Score */}
      <div className="relative">
        <div className="absolute inset-0 blur-3xl opacity-30 scale-150" style={{ background: scoreColor }} />
        <div className="relative font-display font-black tabular-nums" style={{ fontSize: '5rem', lineHeight: 1, color: scoreColor, textShadow: `0 0 40px ${scoreColor}` }}>
          {result.score}
        </div>
        <p className="font-display text-lg font-black tracking-[0.2em] mt-1" style={{ color: scoreColor }}>{grade}</p>
      </div>

      {/* Reward */}
      <div className="space-y-1">
        {won
          ? <p className="font-mono text-base font-bold" style={{ color: accentColor }}>+{result.rewardAmount} bonus compute credits</p>
          : <p className="font-mono text-sm text-white/30">no bonus this round</p>}
        {result.flavorMessage && (
          <p className="text-white/40 font-mono text-xs italic max-w-xs">&ldquo;{result.flavorMessage}&rdquo;</p>
        )}
      </div>

      {/* Progression */}
      {progression && (
        <div className="w-full max-w-xs rounded-lg border border-white/10 bg-black/30 p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white/30">XP gained</span>
            <span className="font-bold" style={{ color: accentColor }}>+{progression.xpGained}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white/30">Total XP</span>
            <span className="text-white/60">{progression.newXp.toLocaleString()}</span>
          </div>
          {progression.newStreak >= 2 && (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/30">Streak</span>
              <div className="flex items-center gap-1">
                <span className="text-sm leading-none">🔥</span>
                <span className="font-bold font-mono"
                  style={{ color: progression.newStreak >= 10 ? '#ffd700' : progression.newStreak >= 5 ? '#ff6b35' : '#ff8c42' }}>
                  {progression.newStreak}
                  {progression.newStreak >= 5 && <span className="text-[9px] ml-1">{progression.newStreak >= 10 ? 'LEGENDARY' : 'ON FIRE'}</span>}
                </span>
              </div>
            </div>
          )}
          {progression.rankUp && (
            <div className="border-t border-white/10 pt-2 text-center">
              <p className="font-display text-sm font-black tracking-[0.15em] animate-pulse" style={{ color: '#fbbf24' }}>
                ⬆ RANK UP → {progression.newRank}
              </p>
            </div>
          )}
          {progression.newAchievements.length > 0 && (
            <div className="border-t border-white/10 pt-2 space-y-1.5">
              <p className="text-[9px] font-mono tracking-widest text-white/25">ACHIEVEMENTS UNLOCKED</p>
              {progression.newAchievements.map(code => {
                const a = ACHIEVEMENT_META[code]
                return a ? (
                  <div key={code} className="flex items-center gap-2">
                    <span className="text-base">{a.icon}</span>
                    <span className="text-xs font-mono font-bold text-yellow-400">{a.name}</span>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
      )}

      {/* Game-specific reveals */}
      {result.challenge && result.game === 'token_prophet' && (
        <div className="w-full max-w-xs"><ProphetReveal challenge={result.challenge} accentColor={accentColor} /></div>
      )}
      {result.challenge && result.game === 'bug_exorcist' && !!result.challenge.explanation && (
        <div className="w-full max-w-xs rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-left space-y-2">
          <p className="text-[9px] font-mono tracking-[0.2em] text-red-400/60">WHY THIS WAS THE BUG</p>
          <p className="text-xs font-mono text-white/55 leading-relaxed">{String(result.challenge.explanation)}</p>
        </div>
      )}
      {result.challenge && result.game === 'rate_limit_roulette' && (
        <div className="w-full max-w-xs"><RaceReveal challenge={result.challenge} /></div>
      )}
      {result.challenge && result.game === 'benchmark_brawl' && (
        <div className="w-full max-w-xs"><BrawlReveal challenge={result.challenge} /></div>
      )}
      {result.challenge && result.game === 'spot_deepfake' && (
        <div className="w-full max-w-xs"><DeepfakeReveal challenge={result.challenge} /></div>
      )}
      {result.challenge && result.game === 'prompt_crash' && (
        <div className="w-full max-w-xs"><CrashReveal challenge={result.challenge} /></div>
      )}
      {result.challenge && result.game === 'token_mines' && (
        <div className="w-full max-w-xs"><MinesReveal challenge={result.challenge} /></div>
      )}

      {/* Stats row */}
      <div className="w-full max-w-xs rounded-lg border border-white/5 bg-black/20 p-3 text-left">
        <div className="flex justify-between text-[10px] font-mono text-white/30">
          <span>{result.game.replace(/_/g, ' ')}</span>
          <span>{result.score} / 100</span>
        </div>
        <p className="text-[9px] font-mono text-white/15 mt-1">Bonus credits are usable immediately via your API key.</p>
      </div>

      {/* Fairness proof + share row */}
      <div className="w-full max-w-xs flex items-center justify-between gap-3">
        {result.fairness?.serverSeed ? (
          <button onClick={() => setShowFairness(!showFairness)}
            className="text-[10px] font-mono text-white/20 hover:text-white/40 transition-colors cursor-crosshair">
            {showFairness ? '▾ HIDE' : '▸ VERIFY'} PROOF
          </button>
        ) : <span />}
        <ShareResultButton result={result} />
      </div>
      {showFairness && result.fairness?.serverSeed && (
        <div className="w-full max-w-xs rounded border border-white/5 p-3 text-[9px] font-mono text-white/25 text-left break-all space-y-1">
          <p>Server seed: <span className="text-white/40">{result.fairness.serverSeed}</span></p>
          <p>Hash: <span className="text-white/40">{result.fairness.serverSeedHash}</span></p>
          <p>Client seed: <span className="text-white/40">{result.fairness.clientSeed}</span></p>
          <a
            href={`/verify?serverSeed=${encodeURIComponent(result.fairness.serverSeed)}&hash=${encodeURIComponent(result.fairness.serverSeedHash ?? '')}&clientSeed=${encodeURIComponent(result.fairness.clientSeed ?? '')}`}
            target="_blank"
            rel="noreferrer"
            className="block mt-2 text-[#5ad8ff]/50 hover:text-[#5ad8ff] transition-colors"
          >
            Open verifier →
          </a>
        </div>
      )}

      {/* Play again */}
      <button
        onClick={() => { play('click'); onPlayAgain() }}
        className="px-10 py-3.5 font-display text-sm font-bold tracking-[0.15em] rounded-lg border transition-all duration-150 cursor-crosshair hover:scale-105 active:scale-95 breathe"
        style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10`, '--breathe-color': `${accentColor}30` } as React.CSSProperties}
      >
        PLAY AGAIN
      </button>
    </div>
    </ScreenShake>
  )
}
