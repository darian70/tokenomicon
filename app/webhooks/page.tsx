'use client'

import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ALL_EVENTS = [
  { value: 'credit.low',        label: 'Credit Low',        desc: 'Balance drops below threshold' },
  { value: 'credit.topup',      label: 'Credit Topup',      desc: 'Auto-topup fires successfully' },
  { value: 'game.result',       label: 'Game Result',       desc: 'Game session scored' },
  { value: 'daily.grant',       label: 'Daily Grant',       desc: 'Daily arena credits claimed' },
  { value: 'api.usage',         label: 'API Usage',         desc: 'Single request costs >50 credits' },
  { value: 'referral.redeemed', label: 'Referral Redeemed', desc: 'Someone used your referral code' },
] as const

type EventValue = typeof ALL_EVENTS[number]['value']

interface Delivery {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  durationMs: number
  createdAt: string
  error: string | null
}

interface Endpoint {
  id: string
  url: string
  secret: string
  events: string[]
  enabled: boolean
  description: string | null
  createdAt: string
  deliveries: Delivery[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusPill({ success, code }: { success: boolean; code: number | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
      style={{
        backgroundColor: success ? '#0a2a1a' : '#2a0a0a',
        color: success ? '#59f5a9' : '#f55a5a',
        border: `1px solid ${success ? '#59f5a9' : '#f55a5a'}40`,
      }}
    >
      {code ?? '—'} {success ? '✓' : '✗'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<Set<EventValue>>(new Set(['game.result']))
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Test state
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; statusCode: number | null; durationMs: number; error: string | null }>>({})

  const load = async () => {
    const r = await fetch('/api/webhooks')
    const d = await r.json()
    if (d.endpoints) setEndpoints(d.endpoints)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    setCreateError('')
    if (!newUrl.startsWith('https://')) { setCreateError('URL must start with https://'); return }
    if (newEvents.size === 0) { setCreateError('Select at least one event'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: [...newEvents], description: newDesc || undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setShowCreate(false)
      setNewUrl('')
      setNewEvents(new Set(['game.result']))
      setNewDesc('')
      await load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setEndpoints((prev) => prev.map((ep) => ep.id === id ? { ...ep, enabled } : ep))
  }

  async function remove(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    setEndpoints((prev) => prev.filter((ep) => ep.id !== id))
  }

  async function test(id: string) {
    setTesting(id)
    const r = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
    const d = await r.json()
    setTestResult((prev) => ({ ...prev, [id]: d }))
    setTesting(null)
    await load()
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-widest">WEBHOOKS</h1>
            <p className="text-xs text-[#4a5a6d] font-mono">Receive signed HTTP POST events at your endpoints</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#5ad8ff]/10 border border-[#5ad8ff]/30 rounded-lg text-xs font-mono font-bold text-[#5ad8ff] hover:bg-[#5ad8ff]/20 transition-colors"
          >
            + Add endpoint
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* How signing works */}
        <div className="rounded-xl border border-[#1a2a3a] bg-[#080f1a] p-4 text-[10px] font-mono text-[#4a5a6d] space-y-1">
          <p className="text-[#5ad8ff] text-xs font-bold mb-2">Signature verification</p>
          <p>Each request includes <code className="text-[#a8b8cc]">X-Tokenomicon-Signature: sha256=&lt;hex&gt;</code></p>
          <p>Verify with: <code className="text-[#59f5a9]">HMAC-SHA256(secret, &quot;{'{'}timestamp{'}'}.{'{'}body{'}'}&quot;)</code> where <code>timestamp</code> = <code>X-Tokenomicon-Timestamp</code></p>
          <p className="text-[#3a4a5a] pt-1">Reject requests where <code>|now − timestamp| &gt; 300s</code> to prevent replay attacks.</p>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl border border-[#5ad8ff]/20 bg-[#0c111a] p-5 space-y-4">
            <p className="text-xs font-display tracking-widest text-[#a8b8cc]">NEW ENDPOINT</p>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">URL (HTTPS required)</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-server.com/webhooks/tokenomicon"
                className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#5ad8ff]/40 placeholder:text-[#3a4a5a]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Description (optional)</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="My production webhook"
                className="w-full bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#5ad8ff]/40 placeholder:text-[#3a4a5a]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-wider">Events to receive</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map((ev) => {
                  const on = newEvents.has(ev.value)
                  return (
                    <button
                      key={ev.value}
                      onClick={() => {
                        setNewEvents((prev) => {
                          const next = new Set(prev)
                          on ? next.delete(ev.value) : next.add(ev.value)
                          return next
                        })
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${on ? 'border-[#5ad8ff]/40 bg-[#5ad8ff]/5' : 'border-[#192433] hover:border-[#5ad8ff]/20'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${on ? 'bg-[#5ad8ff] border-[#5ad8ff]' : 'bg-transparent border-[#4a5a6d]'}`} />
                        <span className="text-[11px] font-mono font-bold text-white">{ev.label}</span>
                      </div>
                      <p className="text-[10px] text-[#4a5a6d] mt-0.5 pl-4">{ev.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {createError && <p className="text-xs font-mono text-red-400">{createError}</p>}

            <div className="flex gap-2">
              <button
                onClick={create}
                disabled={creating}
                className="px-4 py-2 bg-[#5ad8ff]/10 border border-[#5ad8ff]/30 rounded-lg text-xs font-mono font-bold text-[#5ad8ff] hover:bg-[#5ad8ff]/20 disabled:opacity-40 transition-colors"
              >
                {creating ? 'Creating…' : 'Create endpoint'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError('') }}
                className="px-4 py-2 border border-[#192433] rounded-lg text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Endpoint list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-[#0c111a] rounded-xl border border-[#192433] animate-pulse" />
            ))}
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-[#a8b8cc] font-mono text-sm">No endpoints yet.</p>
            <p className="text-[#4a5a6d] text-xs mt-1">Add an HTTPS endpoint to start receiving events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => {
              const isOpen = expanded === ep.id
              const tr = testResult[ep.id]
              return (
                <div key={ep.id} className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                  {/* Summary row */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Enable toggle */}
                    <button
                      onClick={() => toggle(ep.id, !ep.enabled)}
                      className={`w-8 h-4 rounded-full border transition-colors flex-shrink-0 ${ep.enabled ? 'bg-[#59f5a9]/30 border-[#59f5a9]/50' : 'bg-transparent border-[#4a5a6d]'}`}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full mx-auto transition-all ${ep.enabled ? 'bg-[#59f5a9] translate-x-2' : 'bg-[#4a5a6d] -translate-x-0'}`}
                        style={{ transform: ep.enabled ? 'translateX(4px)' : 'translateX(-4px)' }}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-white truncate">{ep.url}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ep.description && (
                          <span className="text-[10px] text-[#4a5a6d] font-mono">{ep.description}</span>
                        )}
                        {ep.events.map((ev) => (
                          <span key={ev} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1a2535] text-[#5ad8ff]">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recent delivery status */}
                    {ep.deliveries[0] && (
                      <StatusPill success={ep.deliveries[0].success} code={ep.deliveries[0].statusCode} />
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => test(ep.id)}
                        disabled={testing === ep.id}
                        className="px-2.5 py-1 border border-[#192433] rounded text-[10px] font-mono text-[#4a5a6d] hover:text-[#a8b8cc] hover:border-[#5ad8ff]/30 disabled:opacity-40 transition-colors"
                      >
                        {testing === ep.id ? '…' : 'Test'}
                      </button>
                      <button
                        onClick={() => setExpanded(isOpen ? null : ep.id)}
                        className="px-2.5 py-1 border border-[#192433] rounded text-[10px] font-mono text-[#4a5a6d] hover:text-[#a8b8cc] transition-colors"
                      >
                        {isOpen ? 'Hide' : 'Log'}
                      </button>
                      <button
                        onClick={() => remove(ep.id)}
                        className="px-2.5 py-1 border border-[#192433] rounded text-[10px] font-mono text-[#4a5a6d] hover:text-red-400 hover:border-red-800/40 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Test result banner */}
                  {tr && (
                    <div
                      className="mx-5 mb-3 px-3 py-2 rounded-lg text-xs font-mono"
                      style={{
                        backgroundColor: tr.success ? '#0a2a1a' : '#2a0a0a',
                        color: tr.success ? '#59f5a9' : '#f55a5a',
                        border: `1px solid ${tr.success ? '#59f5a940' : '#f55a5a40'}`,
                      }}
                    >
                      Test: {tr.success ? '✓ delivered' : `✗ failed`}
                      {tr.statusCode && ` — HTTP ${tr.statusCode}`}
                      {` — ${tr.durationMs}ms`}
                      {tr.error && ` — ${tr.error}`}
                    </div>
                  )}

                  {/* Delivery log */}
                  {isOpen && (
                    <div className="border-t border-[#192433]">
                      <div className="px-5 py-2 border-b border-[#192433] grid grid-cols-[1fr_80px_60px_80px] gap-3 text-[9px] font-mono text-[#3a4a5a] uppercase tracking-wider">
                        <span>Event</span>
                        <span>Status</span>
                        <span className="text-right">ms</span>
                        <span className="text-right">Time</span>
                      </div>
                      {ep.deliveries.length === 0 ? (
                        <div className="px-5 py-4 text-xs font-mono text-[#4a5a6d]">No deliveries yet</div>
                      ) : (
                        ep.deliveries.map((d) => (
                          <div key={d.id} className="px-5 py-2.5 grid grid-cols-[1fr_80px_60px_80px] gap-3 items-center border-b border-[#0f1520] last:border-0">
                            <span className="text-xs font-mono text-[#a8b8cc]">{d.event}</span>
                            <StatusPill success={d.success} code={d.statusCode} />
                            <span className="text-xs font-mono text-[#4a5a6d] text-right">{d.durationMs}</span>
                            <span className="text-[10px] font-mono text-[#3a4a5a] text-right">
                              {new Date(d.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))
                      )}

                      {/* Secret reveal */}
                      <div className="px-5 py-3 border-t border-[#192433] flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#4a5a6d]">SIGNING SECRET</span>
                        <code className="text-[10px] font-mono text-[#5ad8ff]">{ep.secret}</code>
                        <span className="text-[9px] font-mono text-[#3a4a5a]">(prefix only — copy from creation response)</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
