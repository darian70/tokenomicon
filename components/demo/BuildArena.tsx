'use client'

import { useMemo, useRef, useState } from 'react'
import { formatCredits } from '@/lib/rng'
import { useToast } from '@/lib/toast'
import { useArenaStore } from '@/lib/store'

type GameId = 'token_prophet' | 'prompt_golf' | 'bug_exorcist'
type ZoneId = 'sandbox' | 'production' | 'blackbox'

type RunLog = {
  id: string
  game: GameId
  score: number
  reward: number
  verdict: string
  success: boolean
}

type PatchCard = {
  label: string
  code: string
  correct: boolean
}

const ZONES: Record<ZoneId, { name: string; stake: number; reward: number; pressure: number }> = {
  sandbox: { name: 'Sandbox Floor', stake: 20, reward: 120, pressure: 1 },
  production: { name: 'Production Tower', stake: 45, reward: 240, pressure: 2 },
  blackbox: { name: 'Blackbox Core', stake: 80, reward: 440, pressure: 3 },
}

const TOKEN_PROMPTS = [
  'Summarize a failed model-router deploy and include root cause, blast radius, rollback status.',
  'Write release notes for a faster prompt cache with one developer-facing migration note.',
  'Explain why token-aware chunking improves latency and reduces unexpected invoice spikes.',
]

const GOLF_GOALS = [
  {
    target: 'Generate JSON with title, score, verdict.',
    required: ['json', 'title', 'score', 'verdict'],
    extras: ['polite', 'verbose', 'markdown', 'example', 'schema', 'brief'],
  },
  {
    target: 'Write SQL for top five users by lifetime spend.',
    required: ['sql', 'top', 'five', 'users', 'spend'],
    extras: ['join', 'monthly', 'where', 'limit', 'descending', 'safe'],
  },
  {
    target: 'Create a slugify function in Python.',
    required: ['python', 'function', 'slugify'],
    extras: ['regex', 'lowercase', 'trim', 'unicode', 'spaces', 'return'],
  },
]

const BUG_ROUNDS: { broken: string; patches: PatchCard[] }[] = [
  {
    broken: 'if (items.length = 0) return []',
    patches: [
      { label: 'strict comparison', code: 'if (items.length === 0) return []', correct: true },
      { label: 'loose comparison', code: 'if (items.length == 0) return []', correct: false },
      { label: 'negated assignment', code: 'if (items.length =! 0) return []', correct: false },
    ],
  },
  {
    broken: 'for (let i = 0; i <= arr.length; i++)',
    patches: [
      { label: 'stop before length', code: 'for (let i = 0; i < arr.length; i++)', correct: true },
      { label: 'start at one', code: 'for (let i = 1; i <= arr.length; i++)', correct: false },
      { label: 'double shift', code: 'for (let i = 0; i << arr.length; i++)', correct: false },
    ],
  },
  {
    broken: 'const total = price + taxRate',
    patches: [
      { label: 'apply tax to price', code: 'const total = price + price * taxRate', correct: true },
      { label: 'multiply only', code: 'const total = price * taxRate', correct: false },
      { label: 'double tax', code: 'const total = price + taxRate * taxRate', correct: false },
    ],
  },
]

function gameName(game: GameId) {
  if (game === 'token_prophet') return 'Token Prophet'
  if (game === 'prompt_golf') return 'Prompt Golf'
  return 'Bug Exorcist'
}

function randomOf<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

export default function BuildArena() {
  const [game, setGame] = useState<GameId>('token_prophet')
  const [zone, setZone] = useState<ZoneId>('sandbox')
  const [arenaCredits, setArenaCredits] = useState(500)
  const [purchasedCompute, setPurchasedCompute] = useState(6400)
  const [bonusCompute, setBonusCompute] = useState(0)
  const [combo, setCombo] = useState(0)
  const [rankXp, setRankXp] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [status, setStatus] = useState('Choose a cabinet and play a round.')
  const [logs, setLogs] = useState<RunLog[]>([])

  const [tokenPrompt, setTokenPrompt] = useState(TOKEN_PROMPTS[0])
  const [tokenGuess, setTokenGuess] = useState(110)
  const [tokenActual, setTokenActual] = useState(138)

  const [golfGoal, setGolfGoal] = useState(GOLF_GOALS[0])
  const [promptText, setPromptText] = useState('')

  const [bugRound, setBugRound] = useState(BUG_ROUNDS[0])
  const [selectedPatch, setSelectedPatch] = useState<PatchCard | null>(null)
  const [bugFix, setBugFix] = useState('')
  const [isScoring, setIsScoring] = useState(false)
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(false)
  const [isRealMode, setIsRealMode] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const toast = useToast()
  const loadDashboard = useArenaStore((s) => s.loadDashboard)

  const totalCompute = purchasedCompute + bonusCompute
  const rank = 1 + Math.floor(rankXp / 500)
  const zoneConfig = ZONES[zone]
  const bestScore = useMemo(() => logs.reduce((best, log) => Math.max(best, log.score), 0), [logs])

  function _fallbackNewRound(nextGame = game) {
    setIsRealMode(false)
    sessionIdRef.current = null
    if (nextGame === 'token_prophet') {
      const prompt = randomOf(TOKEN_PROMPTS)
      setTokenPrompt(prompt)
      setTokenActual(Math.ceil(prompt.length / 3) + 45 + Math.floor(Math.random() * 90))
      setTokenGuess(110)
    }
    if (nextGame === 'prompt_golf') {
      setGolfGoal(randomOf(GOLF_GOALS))
    }
    if (nextGame === 'bug_exorcist') {
      setBugRound(randomOf(BUG_ROUNDS))
    }
  }

  async function newRound(nextGame = game) {
    setSelectedPatch(null)
    setPromptText('')
    setBugFix('')
    setLastScore(0)
    sessionIdRef.current = null
    setIsLoadingChallenge(true)
    try {
      const res = await fetch('/api/games/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: nextGame, tier: zone }),
      })
      if (res.ok) {
        const data = await res.json()
        sessionIdRef.current = data.sessionId ?? null
        const c = (data.challenge ?? {}) as Record<string, unknown>
        if (nextGame === 'token_prophet' && c.prompt) {
          setTokenPrompt(String(c.prompt))
          setTokenGuess(110)
          setIsRealMode(true)
        } else if (nextGame === 'prompt_golf' && c.text) {
          setGolfGoal({ target: String(c.text), required: Array.isArray(c.required) ? c.required.map(String) : [], extras: [] })
          setIsRealMode(true)
        } else if (nextGame === 'bug_exorcist' && c.snippet) {
          setBugRound({ broken: String(c.snippet), patches: [] })
          setIsRealMode(true)
        } else {
          _fallbackNewRound(nextGame)
        }
      } else {
        _fallbackNewRound(nextGame)
      }
    } catch {
      _fallbackNewRound(nextGame)
    } finally {
      setIsLoadingChallenge(false)
    }
  }

  function chooseGame(nextGame: GameId) {
    setGame(nextGame)
    void newRound(nextGame)
    setStatus(`${gameName(nextGame)} loading…`)
  }

  function addCredits() {
    setArenaCredits((value) => value + 200)
    setPurchasedCompute((value) => value + 1500)
    setStatus('Demo credits added.')
  }

  function _localScoreRound() {
    let score = 0
    let verdict = ''
    if (game === 'token_prophet') {
      const diff = Math.abs(tokenGuess - tokenActual)
      score = Math.max(0, 100 - diff)
      verdict = diff <= 8 ? 'perfect calibration' : diff <= 24 ? 'usable forecast' : 'missed token band'
    }
    if (game === 'prompt_golf') {
      const promptLower = promptText.toLowerCase()
      const requiredHit = golfGoal.required.filter((word) => promptLower.includes(word.toLowerCase())).length
      const hasAllRequired = requiredHit === golfGoal.required.length
      const lengthPenalty = Math.ceil(promptText.length / 3)
      score = hasAllRequired ? Math.max(10, 100 - lengthPenalty) : 0
      verdict = hasAllRequired ? 'clean prompt packet' : 'missing required keywords'
    }
    if (game === 'bug_exorcist') {
      score = selectedPatch?.correct ? 100 : selectedPatch ? 18 : 0
      verdict = selectedPatch?.correct ? 'patch accepted' : 'bad patch rejected'
    }
    const pressureBonus = zoneConfig.pressure * 12
    const comboBonus = combo * 6
    const finalScore = Math.min(160, Math.max(0, score + pressureBonus + comboBonus))
    const success = finalScore >= 70
    const reward = success
      ? Math.floor(zoneConfig.reward + finalScore * (1 + zoneConfig.pressure * 0.16))
      : Math.floor(zoneConfig.reward * 0.18)
    setArenaCredits((value) => value - zoneConfig.stake)
    setBonusCompute((value) => value + reward)
    setRankXp((value) => value + finalScore)
    setCombo((value) => success ? Math.min(9, value + 1) : 0)
    setLastScore(finalScore)
    setLogs((items) => [
      { id: crypto.randomUUID(), game, score: finalScore, reward, verdict, success },
      ...items,
    ].slice(0, 12))
    setStatus(`${verdict}. Score ${finalScore}. Reward +${reward} bonus compute.`)
    _fallbackNewRound()
  }

  async function scoreRound() {
    if (arenaCredits < zoneConfig.stake) {
      setStatus(`Need ${zoneConfig.stake} arena credits for ${zoneConfig.name}.`)
      toast.error(`Need ${zoneConfig.stake} arena credits`)
      return
    }
    if (!sessionIdRef.current) {
      _localScoreRound()
      return
    }
    let submission: Record<string, unknown> = {}
    if (game === 'token_prophet') submission = { guess: tokenGuess }
    else if (game === 'prompt_golf') submission = { prompt: promptText }
    else if (game === 'bug_exorcist') submission = { fix: bugFix }
    setIsScoring(true)
    try {
      const res = await fetch('/api/games/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, submission }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      const score: number = data.score ?? 0
      const reward: number = data.rewardAmount ?? 0
      const verdict: string = data.flavorMessage ?? (score >= 60 ? 'accepted' : 'rejected')
      const success = score >= 60
      setArenaCredits((v) => v - zoneConfig.stake)
      setBonusCompute((v) => v + reward)
      setRankXp((v) => v + score)
      setCombo((v) => success ? Math.min(9, v + 1) : 0)
      setLastScore(score)
      setLogs((items) => [
        { id: crypto.randomUUID(), game, score, reward, verdict, success },
        ...items,
      ].slice(0, 12))
      setStatus(`${verdict}. Score ${score}. Reward +${reward} bonus compute.`)
      if (success) toast.success(`Score ${score} · +${reward} bonus compute`)
      else toast.warning(`Score ${score} · ${verdict}`)
      void loadDashboard()
      sessionIdRef.current = null
      await newRound()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submission failed'
      toast.error(msg)
      setStatus(msg)
      sessionIdRef.current = null
      _fallbackNewRound()
    } finally {
      setIsScoring(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)_280px] 2xl:grid-cols-[300px_minmax(0,1fr)_320px] gap-3 mt-3 min-h-[calc(100vh-170px)]">
      <aside className="rounded-xl border border-[#192433] bg-[#0c111a] p-4 min-w-0">
        <p className="text-[10px] tracking-widest text-[#4a5a6d] font-display">PLAYER RIG</p>
        <p className="text-4xl font-display text-[#ffd700] mt-2">{formatCredits(totalCompute)} cr</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <StatBox label="Arena" value={formatCredits(arenaCredits)} />
          <StatBox label="Bonus" value={formatCredits(bonusCompute)} />
          <StatBox label="Rank" value={`R${rank}`} />
          <StatBox label="Combo" value={`${combo}x`} />
        </div>
        <button onClick={addCredits} className="mt-3 w-full border border-[#5ad8ff]/30 text-[#5ad8ff] py-2 min-h-11 text-xs hover:bg-[#5ad8ff]/8 rounded-lg transition-colors font-mono">
          Add Test Credits
        </button>

        <p className="text-[10px] tracking-widest text-[#4a5a6d] font-display mt-5">RISK ZONE</p>
        <div className="mt-2 space-y-2">
          {(Object.keys(ZONES) as ZoneId[]).map((id) => (
            <button
              key={id}
              onClick={() => setZone(id)}
              className={`w-full text-left rounded-lg border p-2 min-h-16 transition-colors ${
                zone === id
                  ? 'border-[#5ad8ff]/50 text-[#5ad8ff] bg-[#5ad8ff]/8'
                  : 'border-[#192433] text-[#a8b8cc] hover:border-[#5ad8ff]/30'
              }`}
            >
              <p className="text-xs font-display">{ZONES[id].name}</p>
              <p className="text-[10px] text-[#4a5a6d] mt-0.5">Stake {ZONES[id].stake} / Base {ZONES[id].reward}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-xl border border-[#192433] bg-[#0c111a] p-4 min-h-[620px] min-w-0">
        <div className="grid md:grid-cols-3 gap-2">
          <CabinetButton id="token_prophet" active={game} onClick={chooseGame} label="Token Prophet" kicker="calibration" />
          <CabinetButton id="prompt_golf" active={game} onClick={chooseGame} label="Prompt Golf" kicker="compression" />
          <CabinetButton id="bug_exorcist" active={game} onClick={chooseGame} label="Bug Exorcist" kicker="debug raid" />
        </div>

        <div className="mt-4 min-h-[430px] border border-[#192433] bg-[#070a10] p-4 relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'linear-gradient(rgba(90,216,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(90,216,255,.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
          <div className="relative">
            {game === 'token_prophet' && (
              <TokenProphetGame prompt={tokenPrompt} guess={tokenGuess} actual={tokenActual} onGuess={setTokenGuess} lastScore={lastScore} />
            )}
            {game === 'prompt_golf' && (
              <PromptGolfGame goal={golfGoal} promptText={promptText} onChange={setPromptText} lastScore={lastScore} />
            )}
            {game === 'bug_exorcist' && (
              isRealMode
                ? <BugExorcistTextGame snippet={bugRound.broken} fix={bugFix} onFixChange={setBugFix} lastScore={lastScore} />
                : <BugExorcistGame round={bugRound} selected={selectedPatch} onSelect={setSelectedPatch} lastScore={lastScore} />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#4a5a6d] font-mono">{status}</p>
          <button
            onClick={scoreRound}
            disabled={isScoring || isLoadingChallenge}
            className="border border-[#59f5a9]/40 text-[#59f5a9] px-5 py-2 min-h-11 text-xs font-display hover:bg-[#59f5a9]/8 rounded-lg transition-colors tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isScoring ? 'SCORING…' : isLoadingChallenge ? 'LOADING…' : 'RUN CHECK'}
          </button>
        </div>
      </section>

      <aside className="rounded-xl border border-[#192433] bg-[#0c111a] p-4 min-w-0">
        <p className="text-[10px] tracking-widest text-[#4a5a6d] font-display">LIVE SCOREBOARD</p>
        <p className="text-sm font-mono mt-2 text-[#a8b8cc]">Best <span className="text-[#5ad8ff]">{bestScore}</span></p>
        <p className="text-sm font-mono text-[#a8b8cc]">Zone <span className="text-[#ffd700]">{zoneConfig.name}</span></p>
        <div className="mt-4 space-y-2">
          {logs.length === 0 ? <p className="text-xs text-[#4a5a6d] font-mono">Play a round to log results.</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-[#192433] bg-[#080d14] p-2 text-xs">
              <p className="text-[#a8b8cc] font-mono">{gameName(log.game)}</p>
              <p className={`font-mono ${log.success ? 'text-[#59f5a9]' : 'text-[#ff4d6d]'}`}>{log.verdict}</p>
              <p className="text-[#4a5a6d] font-mono">Score {log.score} / +{log.reward} cr</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function StatBox(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#192433] p-2">
      <p className="text-[10px] text-[#4a5a6d] font-mono">{props.label}</p>
      <p className="text-sm text-[#a8b8cc] font-mono">{props.value}</p>
    </div>
  )
}

function CabinetButton(props: { id: GameId; active: GameId; onClick: (id: GameId) => void; label: string; kicker: string }) {
  const active = props.active === props.id
  return (
    <button
      onClick={() => props.onClick(props.id)}
      className={`rounded-lg border p-3 text-left min-h-20 transition-colors ${
        active
          ? 'border-[#5ad8ff]/50 bg-[#5ad8ff]/8 text-[#5ad8ff]'
          : 'border-[#192433] text-[#a8b8cc] hover:border-[#5ad8ff]/30'
      }`}
    >
      <p className="text-xs font-display tracking-widest">{props.label}</p>
      <p className="text-[10px] text-[#4a5a6d] mt-1 font-mono">{props.kicker}</p>
    </button>
  )
}

function TokenProphetGame(props: { prompt: string; guess: number; actual: number; onGuess: (v: number) => void; lastScore: number }) {
  const needle = Math.min(100, Math.max(0, (props.guess / 260) * 100))
  return (
    <div>
      <p className="text-[10px] text-[#4a5a6d] tracking-widest font-display">TOKEN PROPHET</p>
      <h2 className="text-xl text-[#5ad8ff] font-display mt-1">Forecast The Hidden Usage Band</h2>
      <div className="mt-4 border border-[#192433] rounded-lg p-4 bg-[#080d14]">
        <p className="text-sm leading-relaxed text-[#a8b8cc] font-mono">{props.prompt}</p>
      </div>
      <div className="mt-6 h-28 border border-[#192433] rounded-lg relative bg-[#080d14]">
        <div className="absolute left-[45%] top-0 bottom-0 w-[16%] bg-[#59f5a9]/8 border-x border-[#59f5a9]/20" />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,.6)]" style={{ left: `${needle}%` }} />
        <div className="absolute inset-x-4 bottom-4 flex justify-between text-[10px] text-[#3a4a5a] font-mono">
          <span>20</span><span>140</span><span>260</span>
        </div>
      </div>
      <input type="range" min={20} max={260} value={props.guess} onChange={(e) => props.onGuess(Number(e.target.value))} className="w-full mt-4 accent-[#5ad8ff]" />
      <div className="mt-3 flex justify-between text-sm font-mono">
        <span className="text-[#a8b8cc]">Guess <span className="text-[#ffd700]">{props.guess}</span></span>
        <span className="text-[#a8b8cc]">Last <span className="text-[#5ad8ff]">{props.lastScore}</span></span>
        <span className="text-[#4a5a6d]">Diff hidden until commit</span>
      </div>
    </div>
  )
}

function PromptGolfGame(props: { goal: typeof GOLF_GOALS[number]; promptText: string; onChange: (text: string) => void; lastScore: number }) {
  const promptLower = props.promptText.toLowerCase()
  const requiredHit = props.goal.required.filter((word) => promptLower.includes(word.toLowerCase())).length
  const hasAllRequired = requiredHit === props.goal.required.length
  const missing = props.goal.required.filter((word) => !promptLower.includes(word.toLowerCase()))

  return (
    <div>
      <p className="text-[10px] text-[#4a5a6d] tracking-widest font-display">PROMPT GOLF</p>
      <h2 className="text-xl text-[#5ad8ff] font-display mt-1">Build The Shortest Prompt That Passes</h2>
      <div className="mt-4 border border-[#192433] rounded-lg p-4 bg-[#080d14]">
        <p className="text-[10px] text-[#4a5a6d] font-display tracking-widest mb-1">TASK OBJECTIVE</p>
        <p className="text-sm text-[#a8b8cc] font-mono">{props.goal.target}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <p className="text-[10px] text-[#4a5a6d] font-display tracking-widest w-full mb-0.5">REQUIRED KEYWORDS</p>
        {props.goal.required.map((word) => (
          <span key={word} className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
            promptLower.includes(word.toLowerCase())
              ? 'border-[#59f5a9]/40 text-[#59f5a9] bg-[#59f5a9]/8'
              : 'border-[#192433] text-[#4a5a6d]'
          }`}>{word}</span>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-[10px] text-[#4a5a6d] font-display tracking-widest mb-1.5">YOUR PROMPT</p>
        <textarea
          value={props.promptText}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Write the shortest prompt that includes all required keywords..."
          rows={4}
          className="w-full bg-[#070a10] border border-[#2a3a50] rounded-lg p-3 text-sm font-mono text-white placeholder:text-[#2a3a50] resize-none focus:border-[#5ad8ff]/40 focus:outline-none transition-colors"
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-[#4a5a6d] mt-1">
        <span>
          {props.promptText.length} chars{' '}
          {hasAllRequired
            ? <span className="text-[#59f5a9]">· all keywords hit</span>
            : <span className="text-[#ffd700]">· missing: {missing.join(', ')}</span>}
        </span>
        <span>Score = max(10, 100 − chars÷3)</span>
      </div>
    </div>
  )
}

function BugExorcistGame(props: { round: typeof BUG_ROUNDS[number]; selected: PatchCard | null; onSelect: (patch: PatchCard) => void; lastScore: number }) {
  const options = useMemo(() => shuffle(props.round.patches), [props.round])
  return (
    <div>
      <p className="text-[10px] text-[#4a5a6d] tracking-widest font-display">BUG EXORCIST</p>
      <h2 className="text-xl text-[#5ad8ff] font-display mt-1">Choose The Patch Before It Ships</h2>
      <pre className="mt-4 border border-[#ff4d6d]/30 rounded-lg bg-[#ff4d6d]/5 p-4 text-sm whitespace-pre-wrap text-[#ff4d6d] font-mono">{props.round.broken}</pre>
      <div className="mt-5 grid gap-3">
        {options.map((patch) => {
          const selected = props.selected?.code === patch.code
          return (
            <button
              key={patch.code}
              onClick={() => props.onSelect(patch)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                selected
                  ? 'border-[#5ad8ff]/50 bg-[#5ad8ff]/8 text-[#5ad8ff]'
                  : 'border-[#192433] text-[#a8b8cc] hover:border-[#5ad8ff]/30'
              }`}
            >
              <p className="text-[10px] text-[#4a5a6d] font-mono mb-1">{patch.label}</p>
              <code className="text-sm font-mono">{patch.code}</code>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-[#4a5a6d] font-mono mt-3">Last Score {props.lastScore}</p>
    </div>
  )
}

function BugExorcistTextGame(props: { snippet: string; fix: string; onFixChange: (fix: string) => void; lastScore: number }) {
  return (
    <div>
      <p className="text-[10px] text-[#4a5a6d] tracking-widest font-display">BUG EXORCIST</p>
      <h2 className="text-xl text-[#5ad8ff] font-display mt-1">Type The Fix That Passes Review</h2>
      <pre className="mt-4 border border-[#ff4d6d]/30 rounded-lg bg-[#ff4d6d]/5 p-4 text-sm whitespace-pre-wrap text-[#ff4d6d] font-mono">{props.snippet}</pre>
      <div className="mt-4">
        <p className="text-[10px] text-[#4a5a6d] font-display tracking-widest mb-1.5">YOUR FIX</p>
        <textarea
          value={props.fix}
          onChange={(e) => props.onFixChange(e.target.value)}
          placeholder="Type the corrected code…"
          rows={3}
          className="w-full bg-[#070a10] border border-[#2a3a50] rounded-lg p-3 text-sm font-mono text-white placeholder:text-[#2a3a50] resize-none focus:border-[#5ad8ff]/40 focus:outline-none transition-colors"
        />
      </div>
      <p className="text-xs text-[#4a5a6d] font-mono mt-2">Last Score {props.lastScore}</p>
    </div>
  )
}
