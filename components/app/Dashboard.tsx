'use client'

import { useEffect, useMemo, useState } from 'react'

type BalancePayload = {
  balances: {
    purchased_compute: number
    arena_credits: number
    bonus_compute: number
  }
  keys: Array<{
    id: string
    name: string
    keyPrefix: string
    revokedAt: string | null
    createdAt: string
    lastUsedAt: string | null
  }>
  recentLedger: Array<{
    id: string
    bucket: string
    type: string
    amount: number
    createdAt: string
  }>
  gameStats: Array<{
    game: string
    bestScore: number
    attempts: number
  }>
}

const GAMES = [
  { id: 'token_prophet', label: 'Token Prophet' },
  { id: 'prompt_golf', label: 'Prompt Golf' },
  { id: 'bug_exorcist', label: 'Bug Exorcist' },
] as const

export default function Dashboard() {
  const [state, setState] = useState<BalancePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [activeGame, setActiveGame] = useState<(typeof GAMES)[number]['id']>('token_prophet')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<Record<string, unknown> | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ score: number; rewardAmount: number } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/credits/balance')
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to load')
      setLoading(false)
      return
    }
    setState(json)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  const totalCompute = useMemo(() => {
    if (!state) return 0
    return state.balances.purchased_compute + state.balances.bonus_compute
  }, [state])

  async function createKey() {
    const res = await fetch('/api/keys/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `Default Key ${new Date().toLocaleDateString()}` }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create key')
      return
    }
    setCreatedKey(json.rawKey)
    await load()
  }

  async function revokeKey(keyId: string) {
    const res = await fetch('/api/keys/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keyId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to revoke key')
      return
    }
    await load()
  }

  async function buyPack(pack: 'starter' | 'builder' | 'pro') {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pack }),
    })
    const json = await res.json()
    if (!res.ok || !json.url) {
      setError(json.error ?? 'Failed to initialize checkout')
      return
    }
    window.location.href = json.url
  }

  async function startGame() {
    setResult(null)
    setInput('')
    const res = await fetch('/api/games/challenge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game: activeGame }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Could not start game')
      return
    }
    setSessionId(json.sessionId)
    setChallenge(json.challenge ?? null)
  }

  async function submitGame() {
    if (!sessionId) return
    let submission: Record<string, unknown>
    if (activeGame === 'token_prophet') submission = { guess: Number(input) }
    else if (activeGame === 'prompt_golf') submission = { prompt: input }
    else submission = { fix: input }

    const res = await fetch('/api/games/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, submission }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Submit failed')
      return
    }
    setResult({ score: json.score, rewardAmount: json.rewardAmount })
    setSessionId(null)
    setChallenge(null)
    await load()
  }

  return (
    <>
      {loading && <p className="text-sm mt-6 text-dim">Loading...</p>}
      {error && <p className="text-sm mt-6 text-blood">{error}</p>}

      {state && (
        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <section className="panel p-4">
            <h2 className="font-display text-xs tracking-widest text-acid">Balances</h2>
            <p className="mt-3 text-sm">Purchased Compute: <span className="text-gold">{state.balances.purchased_compute}</span></p>
            <p className="text-sm">Bonus Compute: <span className="text-cyan">{state.balances.bonus_compute}</span></p>
            <p className="text-sm">Arena Credits: <span className="text-acid">{state.balances.arena_credits}</span></p>
            <p className="mt-2 text-xs text-dim">Usable API compute: {totalCompute}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => buyPack('starter')} className="px-3 py-1.5 border border-border text-xs hover:border-acid">Buy Starter</button>
              <button onClick={() => buyPack('builder')} className="px-3 py-1.5 border border-border text-xs hover:border-acid">Buy Builder</button>
              <button onClick={() => buyPack('pro')} className="px-3 py-1.5 border border-border text-xs hover:border-acid">Buy Pro</button>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="font-display text-xs tracking-widest text-acid">API Keys</h2>
            <button onClick={createKey} className="mt-3 px-3 py-1.5 border border-acid text-acid text-xs hover:bg-acid/10">
              Create API Key
            </button>
            {createdKey && (
              <div className="mt-3 border border-cyan/40 p-2 text-xs">
                <p className="text-cyan">Copy this key now (shown once):</p>
                <code className="break-all text-text">{createdKey}</code>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {state.keys.map((key) => (
                <div key={key.id} className="border border-border p-2 text-xs">
                  <p>{key.name} · {key.keyPrefix}...</p>
                  <p className="text-dim">Status: {key.revokedAt ? 'revoked' : 'active'}</p>
                  {!key.revokedAt && (
                    <button onClick={() => revokeKey(key.id)} className="mt-1 text-blood hover:underline">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="font-display text-xs tracking-widest text-acid">Skill Arena</h2>
            <div className="mt-3 flex gap-2">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGame(g.id)}
                  className={`px-2 py-1 border text-xs ${activeGame === g.id ? 'border-acid text-acid' : 'border-border text-dim'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <button onClick={startGame} className="mt-3 px-3 py-1.5 border border-gold text-gold text-xs hover:bg-gold/10">
              Start Challenge (25 Arena Credits)
            </button>
            {challenge && (
              <div className="mt-3 border border-border p-2 text-xs space-y-2">
                <pre className="whitespace-pre-wrap text-dim">{JSON.stringify(challenge, null, 2)}</pre>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full h-24 bg-panel border border-border p-2 text-xs text-text"
                />
                <button onClick={submitGame} className="px-3 py-1.5 border border-acid text-acid text-xs hover:bg-acid/10">
                  Submit
                </button>
              </div>
            )}
            {result && (
              <div className="mt-3 border border-cyan/30 p-2 text-xs">
                <p>Score: <span className="text-cyan">{result.score}</span></p>
                <p>Bonus Compute Earned: <span className="text-gold">{result.rewardAmount}</span></p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
