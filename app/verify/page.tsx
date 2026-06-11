'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ---------------------------------------------------------------------------
// Client-side HMAC-SHA256 via Web Crypto — mirrors the server-side Node crypto
// calls exactly so players can independently verify game outcomes.
// ---------------------------------------------------------------------------

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(message))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Mirrors derivePromptCrashPoint in lib/server/games.ts */
async function deriveCrashPoint(serverSeed: string, clientSeed: string, nonce: string): Promise<number> {
  const h = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:crash`)
  const r = parseInt(h.slice(0, 13), 16) / 0xfffffffffffff
  if (r < 0.01) return 1.0
  const m = 99 / (100 * r)
  return Math.max(1.01, Math.min(100, Math.floor(m * 100) / 100))
}

/** Mirrors deriveMinePositions (Fisher-Yates) in lib/server/games.ts */
async function deriveMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: string,
  gridSize: number,
  mineCount: number,
): Promise<number[]> {
  const indexes = Array.from({ length: gridSize }, (_, i) => i)
  for (let i = gridSize - 1; i > 0; i--) {
    const h = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:mines:${i}`)
    const r = parseInt(h.slice(0, 12), 16)
    const j = r % (i + 1)
    ;[indexes[i], indexes[j]] = [indexes[j], indexes[i]]
  }
  return indexes.slice(0, mineCount).sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type VerifyResult =
  | { type: 'crash'; crashPoint: number; serverSeedHashMatch: boolean; computedHash: string }
  | { type: 'mines'; positions: number[]; serverSeedHashMatch: boolean; computedHash: string }
  | { type: 'hash'; computedHash: string }

function VerifyInner() {
  const searchParams = useSearchParams()

  const [game, setGame] = useState(searchParams.get('game') ?? 'prompt_crash')
  const [serverSeed, setServerSeed] = useState(searchParams.get('serverSeed') ?? '')
  const [clientSeed, setClientSeed] = useState(searchParams.get('clientSeed') ?? '')
  const [nonce, setNonce] = useState(searchParams.get('nonce') ?? '')
  const [serverSeedHash, setServerSeedHash] = useState(searchParams.get('serverSeedHash') ?? '')
  const [gridSize, setGridSize] = useState('25')
  const [mineCount, setMineCount] = useState('5')

  const [result, setResult] = useState<VerifyResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  // Auto-run when arriving from history page with all params pre-filled
  useEffect(() => {
    const hasAll =
      searchParams.get('serverSeed') &&
      searchParams.get('clientSeed') &&
      searchParams.get('nonce')
    if (hasAll) verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify() {
    setError('')
    setResult(null)

    if (!serverSeed.trim()) {
      setError('Server seed is required.')
      return
    }
    if (!clientSeed.trim() || !nonce.trim()) {
      // Hash-only mode — just verify the server seed hash
      if (!serverSeedHash.trim()) {
        setError('Provide at minimum a server seed + seed hash to verify.')
        return
      }
      setRunning(true)
      try {
        const computedHash = await sha256Hex(serverSeed.trim())
        setResult({ type: 'hash', computedHash })
      } finally {
        setRunning(false)
      }
      return
    }

    setRunning(true)
    try {
      const computedHash = await sha256Hex(serverSeed.trim())
      const hashMatch = serverSeedHash.trim()
        ? computedHash === serverSeedHash.trim()
        : true // no hash to compare

      if (game === 'prompt_crash') {
        const crashPoint = await deriveCrashPoint(serverSeed.trim(), clientSeed.trim(), nonce.trim())
        setResult({ type: 'crash', crashPoint, serverSeedHashMatch: hashMatch, computedHash })
      } else if (game === 'token_mines') {
        const gs = Math.max(4, Math.min(100, parseInt(gridSize) || 25))
        const mc = Math.max(1, Math.min(gs - 1, parseInt(mineCount) || 5))
        const positions = await deriveMinePositions(
          serverSeed.trim(),
          clientSeed.trim(),
          nonce.trim(),
          gs,
          mc,
        )
        setResult({ type: 'mines', positions, serverSeedHashMatch: hashMatch, computedHash })
      } else {
        // Generic: just hash-verify the server seed
        setResult({ type: 'hash', computedHash })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.')
    } finally {
      setRunning(false)
    }
  }

  const hashOk =
    result && 'serverSeedHashMatch' in result && serverSeedHash.trim()
      ? result.serverSeedHashMatch
      : null

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="font-display text-lg font-bold text-white tracking-widest">PROVABLY FAIR VERIFY</h1>
          <p className="text-xs text-[#4a5a6d] font-mono">
            Independently verify any game outcome using HMAC-SHA256 — no server needed
          </p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* How it works */}
        <div className="rounded-xl border border-[#1a2a3a] bg-[#080f1a] p-5 text-xs font-mono text-[#4a5a6d] space-y-2">
          <p className="text-[#a8b8cc] font-semibold mb-3">HOW IT WORKS</p>
          <p>1. Before each game, the server commits to a <span className="text-[#5ad8ff]">server seed</span> by publishing its SHA-256 hash.</p>
          <p>2. You provide a <span className="text-[#5ad8ff]">client seed</span>. Neither party can manipulate the other.</p>
          <p>3. After the game, the server reveals the seed. You can verify: <code className="text-[#59f5a9]">SHA256(serverSeed) === serverSeedHash</code></p>
          <p>4. The outcome is derived as: <code className="text-[#59f5a9]">HMAC-SHA256(serverSeed, &quot;clientSeed:nonce:...&quot;)</code></p>
          <p className="text-[#2a4a3a] pt-1">All computation runs client-side in your browser. Nothing is sent to our servers.</p>
        </div>

        {/* Inputs */}
        <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Game</label>
            <select
              value={game}
              onChange={(e) => { setGame(e.target.value); setResult(null) }}
              className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
            >
              <option value="prompt_crash">Prompt Crash (crash point)</option>
              <option value="token_mines">Token Mines (mine positions)</option>
              <option value="other">Other game (hash verify only)</option>
            </select>
          </div>

          {game === 'token_mines' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Grid size</label>
                <input
                  value={gridSize}
                  onChange={(e) => setGridSize(e.target.value)}
                  className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
                  placeholder="25"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Mine count</label>
                <input
                  value={mineCount}
                  onChange={(e) => setMineCount(e.target.value)}
                  className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
                  placeholder="5"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">
              Server Seed <span className="text-[#59f5a9]">(revealed after game)</span>
            </label>
            <input
              value={serverSeed}
              onChange={(e) => { setServerSeed(e.target.value); setResult(null) }}
              className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
              placeholder="hex string…"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">
              Server Seed Hash <span className="text-[#4a5a6d]">(committed before game)</span>
            </label>
            <input
              value={serverSeedHash}
              onChange={(e) => { setServerSeedHash(e.target.value); setResult(null) }}
              className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
              placeholder="SHA-256 of server seed (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Client Seed</label>
              <input
                value={clientSeed}
                onChange={(e) => { setClientSeed(e.target.value); setResult(null) }}
                className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
                placeholder="your seed"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Nonce</label>
              <input
                value={nonce}
                onChange={(e) => { setNonce(e.target.value); setResult(null) }}
                className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-[#a8b8cc] focus:outline-none focus:border-[#5ad8ff]/40"
                placeholder="integer"
              />
            </div>
          </div>

          {error && <p className="text-xs font-mono text-red-400">{error}</p>}

          <button
            onClick={verify}
            disabled={running || !serverSeed.trim()}
            className="w-full py-2.5 rounded-lg bg-[#5ad8ff]/10 border border-[#5ad8ff]/30 text-sm font-mono font-bold text-[#5ad8ff] hover:bg-[#5ad8ff]/20 transition-colors disabled:opacity-40"
          >
            {running ? 'Verifying…' : 'Verify'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 space-y-4">
            <p className="text-xs font-display tracking-widest text-[#a8b8cc]">RESULT</p>

            {/* Hash match indicator */}
            {serverSeedHash.trim() && (
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: hashOk ? '#0a2a1a' : '#2a0a0a',
                  borderColor: hashOk ? '#59f5a9' : '#f55a5a',
                  border: '1px solid',
                }}
              >
                <span className="text-xl">{hashOk ? '✓' : '✗'}</span>
                <div>
                  <p className="text-sm font-mono font-bold" style={{ color: hashOk ? '#59f5a9' : '#f55a5a' }}>
                    {hashOk ? 'Seed hash verified' : 'Hash MISMATCH — seed may be forged'}
                  </p>
                  <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">
                    SHA-256(serverSeed) = {result.computedHash.slice(0, 16)}…
                  </p>
                </div>
              </div>
            )}

            {result.type === 'crash' && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-[#4a5a6d]">CRASH POINT</p>
                <p className="text-4xl font-display font-black text-[#ffd700]">
                  {result.crashPoint.toFixed(2)}×
                </p>
                <p className="text-xs font-mono text-[#4a5a6d] mt-2">
                  Derived from:{' '}
                  <code className="text-[#5ad8ff]">
                    HMAC-SHA256(serverSeed, &quot;{clientSeed}:{nonce}:crash&quot;)
                  </code>
                </p>
              </div>
            )}

            {result.type === 'mines' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-mono text-[#4a5a6d] mb-1">MINE POSITIONS (0-indexed)</p>
                  <p className="text-sm font-mono text-[#f55a5a] font-bold">
                    [{result.positions.join(', ')}]
                  </p>
                </div>
                {/* Grid preview */}
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#4a5a6d]">GRID PREVIEW</p>
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(parseInt(gridSize) || 25))}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: parseInt(gridSize) || 25 }, (_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded flex items-center justify-center text-[8px]"
                        style={{
                          backgroundColor: result.positions.includes(i) ? '#3a0a0a' : '#0a1520',
                          border: `1px solid ${result.positions.includes(i) ? '#f55a5a40' : '#192433'}`,
                        }}
                      >
                        {result.positions.includes(i) ? '💣' : ''}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs font-mono text-[#4a5a6d]">
                  Derived via Fisher-Yates shuffle seeded by{' '}
                  <code className="text-[#5ad8ff]">HMAC-SHA256(serverSeed, &quot;clientSeed:nonce:mines:i&quot;)</code>
                </p>
              </div>
            )}

            {result.type === 'hash' && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-[#4a5a6d]">COMPUTED SHA-256 HASH</p>
                <p className="text-xs font-mono text-[#59f5a9] break-all">{result.computedHash}</p>
                {serverSeedHash.trim() && (
                  <p className="text-xs font-mono mt-2" style={{ color: hashOk === false ? '#f55a5a' : '#4a5a6d' }}>
                    {hashOk === false
                      ? '✗ Does not match the committed hash.'
                      : '✓ Matches the committed hash.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex items-center justify-center"><span className="text-xs font-mono text-[#4a5a6d]">Loading…</span></div>}>
      <VerifyInner />
    </Suspense>
  )
}
