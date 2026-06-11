'use client'

import { useState, type ReactElement } from 'react'
import { useArenaStore } from '@/lib/store'
import type { CreditPackOneTime } from '@/lib/types'
import RankWidget from '@/components/arena/RankWidget'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const PACKS: { id: CreditPackOneTime; label: string; credits: string; price: string; bonus: string }[] = [
  { id: 'starter', label: 'Starter',  credits: '10,000',  price: '$10',  bonus: '' },
  { id: 'builder', label: 'Builder',  credits: '55,000',  price: '$49',  bonus: '+12%' },
  { id: 'pro',     label: 'Pro',      credits: '120,000', price: '$99',  bonus: '+21%' },
  { id: 'teams',   label: 'Teams',    credits: '350,000', price: '$249', bonus: '+29%' },
]

// SVG Icons
const Icons = {
  wallet: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  key: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3Z" />
    </svg>
  ),
  activity: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  plus: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  trash: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
}

export default function WalletPanel() {
  const { balances, keys, recentLedger, buyCredits, createKey, revokeKey, dashboardLoading } = useArenaStore()
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [buying, setBuying] = useState<CreditPackOneTime | null>(null)
  const [copied, setCopied] = useState(false)

  const totalCompute = balances
    ? balances.purchased_compute + balances.bonus_compute
    : 0

  async function handleBuy(pack: CreditPackOneTime) {
    setBuying(pack)
    try { await buyCredits(pack) } catch { setBuying(null) }
  }

  async function handleCreateKey() {
    setKeyError(null)
    setCreatedKey(null)
    try {
      const raw = await createKey(`Key ${new Date().toLocaleDateString()}`)
      setCreatedKey(raw)
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return
    try { await revokeKey(id) } catch { /* silent */ }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const activeKeys = keys.filter(k => !k.revokedAt)

  return (
    <aside className="panel flex flex-col gap-0 h-full overflow-hidden">
      {/* Balance Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-text-secondary mb-3">
          <Icons.wallet />
          <span className="text-xs font-medium tracking-wide uppercase">Compute Balance</span>
        </div>

        {dashboardLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-32 bg-surface rounded animate-pulse" />
            <div className="h-4 w-full bg-surface rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-3xl font-bold text-premium glow-text-premium tabular-nums">
                {fmt(totalCompute)}
              </span>
              <span className="text-sm text-text-secondary font-mono">cr</span>
            </div>

            <div className="space-y-1.5">
              <BalanceRow label="Purchased" value={balances?.purchased_compute ?? 0} color="accent" />
              <BalanceRow label="Bonus Won" value={balances?.bonus_compute ?? 0} color="success" />
              <BalanceRow label="Arena Credits" value={balances?.arena_credits ?? 0} color="warning" />
            </div>
          </>
        )}
      </div>

      <RankWidget />

      {/* Credit Packs */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-medium tracking-wide text-text-secondary uppercase mb-3">Buy Credits</p>
        <div className="space-y-2">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack.id)}
              disabled={buying !== null}
              className="w-full group flex items-center justify-between p-3 rounded-md border border-border bg-surface/30 hover:bg-surface hover:border-accent/30 transition-all duration-200 disabled:opacity-50"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-text">{pack.label}</span>
                <span className="text-xs text-text-secondary font-mono">
                  {pack.credits} cr
                  {pack.bonus && <span className="text-success ml-1">{pack.bonus}</span>}
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-premium">{pack.price}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-3 font-mono">
          Win more by playing games. Use credits via your API key.
        </p>
      </div>

      {/* API Keys */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text-secondary">
            <Icons.key />
            <span className="text-xs font-medium tracking-wide uppercase">API Keys</span>
          </div>
          <button
            onClick={handleCreateKey}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent bg-accent/5 border border-accent/20 rounded-md hover:bg-accent/10 transition-colors"
          >
            <Icons.plus />
            <span>New</span>
          </button>
        </div>

        {createdKey && (
          <div className="mb-3 p-3 rounded-md bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Icons.check />
              <span className="text-xs font-medium text-success">Key Created — Copy Now</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-text break-all bg-surface/50 px-2 py-1.5 rounded">
                {createdKey}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 text-accent hover:bg-accent/10 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Icons.check /> : <Icons.copy />}
              </button>
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              This is the only time this key will be shown.
            </p>
          </div>
        )}

        {keyError && (
          <div className="mb-3 p-2 rounded-md bg-error/5 border border-error/20">
            <p className="text-xs text-error">{keyError}</p>
          </div>
        )}

        <div className="space-y-2">
          {activeKeys.length === 0 ? (
            <div className="text-center py-4 rounded-md bg-surface/30 border border-border border-dashed">
              <p className="text-xs text-text-secondary">No active keys</p>
              <p className="text-[10px] text-dim mt-1">Create one to use your credits</p>
            </div>
          ) : (
            activeKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-2.5 rounded-md bg-surface/30 border border-border group hover:border-border/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono text-text truncate">
                    {key.keyPrefix}••••••••
                  </p>
                  <p className="text-[10px] text-text-secondary">{key.name}</p>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-error hover:bg-error/10 rounded transition-all"
                  title="Revoke key"
                >
                  <Icons.trash />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 text-text-secondary mb-3">
          <Icons.activity />
          <span className="text-xs font-medium tracking-wide uppercase">Recent Activity</span>
        </div>

        {recentLedger.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-text-secondary">No activity yet</p>
            <p className="text-[10px] text-dim mt-1">Play your first game to see activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentLedger.slice(0, 10).map((entry, i) => (
              <div
                key={entry.id}
                className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="text-xs text-text-secondary font-mono capitalize">
                  {entry.type.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-mono font-medium ${entry.amount >= 0 ? 'text-success' : 'text-error'}`}>
                  {entry.amount >= 0 ? '+' : ''}{entry.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function BalanceRow({ label, value, color }: { label: string; value: number; color: 'accent' | 'success' | 'warning' }) {
  const colorClasses = {
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-text-secondary font-mono">{label}</span>
      <span className={`font-mono font-medium tabular-nums ${colorClasses[color]}`}>
        {fmt(value)}
      </span>
    </div>
  )
}
