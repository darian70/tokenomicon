'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useArenaStore } from '@/lib/store'
import { useToast } from '@/lib/toast'
import type { CreditPackOneTime, SubscriptionPlan } from '@/lib/types'
import { TOPUP_PACKS, type TopupPackId } from '@/lib/topup-packs'

interface AutoTopupConfig {
  enabled: boolean
  thresholdCredits: number
  topupPackId: TopupPackId
  lastTopupAt: string | null
  lastFailedAt: string | null
  failureReason: string | null
  pack: { amountCents: number; credits: number; label: string } | null
}

const LOW_BALANCE_THRESHOLD = 500

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const PACKS: {
  id: CreditPackOneTime
  label: string
  credits: number
  price: string
  usd: number
  bonus: string
  highlight?: boolean
}[] = [
  { id: 'starter', label: 'Starter', credits: 10000,  price: '$10',  usd: 10,  bonus: ''     },
  { id: 'builder', label: 'Builder', credits: 55000,  price: '$49',  usd: 49,  bonus: '+12%', highlight: true },
  { id: 'pro',     label: 'Pro',     credits: 120000, price: '$99',  usd: 99,  bonus: '+21%' },
  { id: 'teams',   label: 'Teams',   credits: 350000, price: '$249', usd: 249, bonus: '+29%' },
]

const SUBSCRIPTION_PLANS: {
  id: SubscriptionPlan
  label: string
  credits: number
  price: string
  usd: number
  perks: string[]
  highlight?: boolean
}[] = [
  {
    id: 'dev_monthly',
    label: 'Dev',
    credits: 20000,
    price: '$15/mo',
    usd: 15,
    perks: ['20,000 credits/month', '2× daily arena grant', 'Priority API routing'],
  },
  {
    id: 'pro_monthly',
    label: 'Pro',
    credits: 75000,
    price: '$49/mo',
    usd: 49,
    perks: ['75,000 credits/month', '5× daily arena grant', 'Priority API routing', 'Blackbox tier unlocked'],
    highlight: true,
  },
]

export default function WalletPage() {
  const { balances, keys, recentLedger, buyCredits, createKey, revokeKey, dashboardLoading } = useArenaStore()
  const toast = useToast()
  const [buying, setBuying] = useState<CreditPackOneTime | SubscriptionPlan | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancelled' | null>(null)

  // Promo code state
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoBanner, setPromoBanner] = useState<{ credits: number; description: string } | null>(null)

  // Auto-topup state
  const [autoTopup, setAutoTopup] = useState<AutoTopupConfig | null>(null)
  const [autoTopupLoading, setAutoTopupLoading] = useState(true)
  const [setupTopupLoading, setSetupTopupLoading] = useState(false)
  const [topupUpdating, setTopupUpdating] = useState(false)

  // Budget alert state
  interface BudgetAlertConfig { enabled: boolean; email: string; thresholdCredits: number; lastAlertAt: string | null }
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlertConfig | null>(null)
  const [budgetAlertLoading, setBudgetAlertLoading] = useState(true)
  const [budgetAlertSaving, setBudgetAlertSaving] = useState(false)
  const [budgetAlertEmail, setBudgetAlertEmail] = useState('')
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(1000)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const topup = params.get('topup')

    if (checkout === 'success') {
      setCheckoutBanner('success')
      toast.success('Payment successful! Credits are being added to your account.')
    } else if (checkout === 'cancelled') {
      setCheckoutBanner('cancelled')
      toast.info('Purchase cancelled.')
    }

    if (topup === 'enabled') {
      toast.success('Auto-topup enabled! Your card has been saved.')
    } else if (topup === 'cancelled') {
      toast.info('Auto-topup setup cancelled.')
    }

    if (checkout || topup) {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('topup')
      window.history.replaceState({}, '', url.toString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load auto-topup config
  useEffect(() => {
    fetch('/api/billing/auto-topup')
      .then((r) => r.json())
      .then((d) => setAutoTopup(d.config ?? null))
      .catch(() => {})
      .finally(() => setAutoTopupLoading(false))
  }, [])

  // Load budget alert config
  useEffect(() => {
    fetch('/api/billing/budget-alert')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setBudgetAlert(d.config)
          setBudgetAlertEmail(d.config.email)
          setBudgetAlertThreshold(d.config.thresholdCredits)
        }
      })
      .catch(() => {})
      .finally(() => setBudgetAlertLoading(false))
  }, [])

  async function handleBudgetAlertSave() {
    setBudgetAlertSaving(true)
    try {
      const res = await fetch('/api/billing/budget-alert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: budgetAlertEmail, thresholdCredits: budgetAlertThreshold }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setBudgetAlert(data.config)
      toast.success('Budget alert saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBudgetAlertSaving(false)
    }
  }

  async function handleBudgetAlertToggle() {
    if (!budgetAlert) return
    setBudgetAlertSaving(true)
    try {
      const res = await fetch('/api/billing/budget-alert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !budgetAlert.enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setBudgetAlert(data.config)
      toast.success(data.config.enabled ? 'Budget alerts enabled' : 'Budget alerts disabled')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBudgetAlertSaving(false)
    }
  }

  async function handleSetupTopup() {
    setSetupTopupLoading(true)
    try {
      const res = await fetch('/api/billing/setup-payment', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Setup failed')
      window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set up auto-topup')
      setSetupTopupLoading(false)
    }
  }

  async function handleTopupUpdate(patch: Partial<{ enabled: boolean; thresholdCredits: number; topupPackId: TopupPackId }>) {
    setTopupUpdating(true)
    try {
      const res = await fetch('/api/billing/auto-topup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setAutoTopup((prev) => prev ? { ...prev, ...data.config } : null)
      toast.success('Auto-topup updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setTopupUpdating(false)
    }
  }

  async function handleRedeemPromo(e: React.FormEvent) {
    e.preventDefault()
    if (!promoCode.trim()) return
    setPromoLoading(true)
    try {
      const res = await fetch('/api/credits/redeem-promo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Redemption failed')
      setPromoBanner({ credits: data.credits, description: data.description })
      setPromoCode('')
      toast.success(`+${data.credits.toLocaleString()} credits added!`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const totalCompute = balances ? balances.purchased_compute + balances.bonus_compute : 0
  const isLowBalance = !dashboardLoading && totalCompute < LOW_BALANCE_THRESHOLD && totalCompute >= 0

  async function handleBuy(pack: CreditPackOneTime | SubscriptionPlan) {
    setBuying(pack)
    try { await buyCredits(pack) } catch { setBuying(null) }
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to open billing portal')
      window.location.href = data.url
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to open billing portal'
      toast.error(msg)
      setPortalLoading(false)
    }
  }

  async function handleCreateKey() {
    setKeyError(null)
    setCreatedKey(null)
    try {
      const name = keyName.trim() || `Key ${new Date().toLocaleDateString()}`
      const raw = await createKey(name)
      setCreatedKey(raw)
      setKeyName('')
      setShowKeyForm(false)
      toast.success('API key created — copy it now!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create key'
      setKeyError(msg)
      toast.error(msg)
    }
  }

  async function handleRevoke(id: string) {
    setPendingRevoke(null)
    try {
      await revokeKey(id)
      toast.info('API key revoked')
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  function handleCopy() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeKeys = keys.filter((k) => !k.revokedAt)

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="font-display text-lg font-bold text-white tracking-widest">WALLET</h1>
          <p className="text-xs text-[#4a5a6d] font-mono">Credits, API keys, and transaction history</p>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Low balance warning */}
        {isLowBalance && (
          <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-5 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-bold text-[#f59e0b] tracking-wide">Low balance — {totalCompute} credits remaining</p>
              <p className="text-xs font-mono text-[#6a5a2a] mt-0.5">
                Top up below or{' '}
                <button
                  onClick={() => handleSetupTopup()}
                  className="text-[#f59e0b] underline hover:no-underline"
                >
                  enable auto-topup
                </button>
                {' '}so your API calls never fail.
              </p>
            </div>
          </div>
        )}

        {/* Stripe post-purchase banner */}
        {checkoutBanner === 'success' && (
          <div className="rounded-xl border border-[#59f5a9]/30 bg-[#59f5a9]/5 px-5 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#59f5a9]/15 border border-[#59f5a9]/30 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-bold text-[#59f5a9] tracking-wide">Payment confirmed</p>
              <p className="text-xs font-mono text-[#4a6a4a] mt-0.5">Your credits will appear once Stripe confirms the payment. This usually takes a few seconds.</p>
            </div>
            <button onClick={() => setCheckoutBanner(null)} className="text-[#3a4a3a] hover:text-[#59f5a9] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

      {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BalanceCard
            label="Total Compute"
            value={totalCompute}
            sub="available for API calls"
            color="#5ad8ff"
            loading={dashboardLoading}
          />
          <BalanceCard
            label="Purchased"
            value={balances?.purchased_compute ?? 0}
            sub="bought via Stripe"
            color="#6e9bff"
            loading={dashboardLoading}
          />
          <BalanceCard
            label="Bonus Compute"
            value={balances?.bonus_compute ?? 0}
            sub="earned from game wins"
            color="#59f5a9"
            loading={dashboardLoading}
          />
        </div>

        {/* Credit Spend Breakdown */}
        {recentLedger.length > 0 && (() => {
          const groups: Record<string, number> = {}
          for (const e of recentLedger) {
            const key = e.type.replace(/_/g, ' ')
            groups[key] = (groups[key] ?? 0) + Math.abs(e.amount)
          }
          const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6)
          const max = Math.max(...entries.map((e) => e[1]), 1)
          return (
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5">
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4">CREDIT ACTIVITY BREAKDOWN</p>
              <div className="space-y-2.5">
                {entries.map(([label, total]) => (
                  <div key={label} className="flex items-center gap-3">
                    <p className="text-[10px] font-mono text-[#6a7a8d] capitalize w-32 flex-shrink-0 truncate">{label}</p>
                    <div className="flex-1 h-1.5 bg-[#0a1520] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5ad8ff]/60 rounded-full transition-all duration-700"
                        style={{ width: `${(total / max) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-[#5ad8ff] w-16 text-right flex-shrink-0">{fmt(total)} cr</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Usage shortcut */}
        <div className="rounded-xl border border-[#192433] bg-[#0c111a] px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5ad8ff]/10 border border-[#5ad8ff]/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5ad8ff" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">API Usage Dashboard</p>
              <p className="text-xs text-[#4a5a6d] mt-0.5">Charts, model breakdown, per-key stats, recent calls</p>
            </div>
          </div>
          <Link
            href="/usage"
            className="flex-shrink-0 px-4 py-2 text-[10px] font-display tracking-widest rounded-lg border border-[#5ad8ff]/30 text-[#5ad8ff] hover:bg-[#5ad8ff]/10 transition-all"
          >
            VIEW USAGE →
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">

            {/* Buy Credits */}
            <section className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#192433]">
                <h2 className="text-sm font-display font-bold text-white tracking-widest">BUY COMPUTE CREDITS</h2>
                <p className="text-xs text-[#4a5a6d] mt-0.5">Top up your balance. Credits never expire.</p>
              </div>
              <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className={`rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                      pack.highlight
                        ? 'border-[#5ad8ff]/40 bg-[#0a1828]'
                        : 'border-[#192433] bg-[#080d14]'
                    }`}
                  >
                    {pack.highlight && (
                      <div className="text-center">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#5ad8ff]/10 border border-[#5ad8ff]/30 text-[#5ad8ff] tracking-wider">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono text-[#4a5a6d] tracking-wider uppercase">{pack.label}</p>
                      <p className="text-2xl font-display font-black text-white mt-1">{pack.price}</p>
                    </div>
                    <div>
                      <p className="text-sm font-mono font-bold text-[#5ad8ff]">{fmt(pack.credits)} cr</p>
                      {pack.bonus && (
                        <p className="text-xs text-[#59f5a9] font-mono mt-0.5">{pack.bonus} bonus</p>
                      )}
                      <p className="text-[10px] text-[#3a4a5a] mt-1">
                        ~{fmt(Math.floor(pack.credits / 3))} gpt-4o tokens
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuy(pack.id)}
                      disabled={buying !== null}
                      className={`w-full py-2.5 text-xs font-display font-bold tracking-widest rounded-lg border transition-all disabled:opacity-50 ${
                        pack.highlight
                          ? 'bg-[#5ad8ff] text-[#070a10] border-[#5ad8ff] hover:bg-[#4ac8ef]'
                          : 'bg-transparent text-white border-[#2a3a50] hover:border-[#5ad8ff]/40 hover:text-[#5ad8ff]'
                      }`}
                    >
                      {buying === pack.id ? 'REDIRECTING...' : 'BUY NOW'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-4">
                <p className="text-xs text-[#3a4a5a] font-mono">
                  Secured by Stripe. Credits used for AI API calls via your Tokenomicon key. No refunds.
                </p>
              </div>
            </section>

            {/* Subscribe for Monthly Credits */}
            <section className="rounded-xl border border-[#6e9bff]/20 bg-[#0c111a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#6e9bff]/20">
                <h2 className="text-sm font-display font-bold text-white tracking-widest">MONTHLY PLANS</h2>
                <p className="text-xs text-[#4a5a6d] mt-0.5">Credits auto-refill every month. Cancel anytime.</p>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                      plan.highlight
                        ? 'border-[#6e9bff]/40 bg-[#0a0d1e]'
                        : 'border-[#192433] bg-[#080d14]'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="text-center">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#6e9bff]/10 border border-[#6e9bff]/30 text-[#6e9bff] tracking-wider">
                          BEST VALUE
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono text-[#4a5a6d] tracking-wider uppercase">{plan.label} Monthly</p>
                      <p className="text-2xl font-display font-black text-white mt-1">{plan.price}</p>
                    </div>
                    <ul className="space-y-1">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2 text-[10px] font-mono text-[#6a7a8d]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6e9bff" strokeWidth="2.5">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleBuy(plan.id)}
                      disabled={buying !== null}
                      className={`w-full py-2.5 text-xs font-display font-bold tracking-widest rounded-lg border transition-all disabled:opacity-50 ${
                        plan.highlight
                          ? 'bg-[#6e9bff] text-[#070a10] border-[#6e9bff] hover:bg-[#5e8bef]'
                          : 'bg-transparent text-white border-[#2a3a50] hover:border-[#6e9bff]/40 hover:text-[#6e9bff]'
                      }`}
                    >
                      {buying === plan.id ? 'REDIRECTING...' : 'SUBSCRIBE'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-4 flex items-center justify-between gap-4">
                <p className="text-xs text-[#3a4a5a] font-mono">
                  Billed monthly via Stripe. Cancel anytime.
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="flex-shrink-0 px-3 py-1.5 text-[10px] font-display tracking-widest rounded-lg border border-[#2a3a50] text-[#6e9bff] hover:border-[#6e9bff]/40 hover:bg-[#6e9bff]/5 transition-all disabled:opacity-50"
                >
                  {portalLoading ? 'OPENING...' : 'MANAGE SUBSCRIPTION'}
                </button>
              </div>
            </section>

            {/* Auto-Topup */}
            <section className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#192433] flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-display font-bold text-white tracking-widest">AUTO-TOPUP</h2>
                  <p className="text-xs text-[#4a5a6d] mt-0.5">Automatically buy credits when your balance runs low.</p>
                </div>
                {autoTopup && !autoTopupLoading && (
                  <div className={`text-[9px] font-mono px-2 py-1 rounded-full border ${
                    autoTopup.enabled
                      ? 'text-[#59f5a9] border-[#59f5a9]/30 bg-[#59f5a9]/10'
                      : 'text-[#4a5a6d] border-[#2a3a50] bg-[#0a1520]'
                  }`}>
                    {autoTopup.enabled ? '● ON' : '○ OFF'}
                  </div>
                )}
              </div>

              <div className="p-6">
                {autoTopupLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-[#0a1520] rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-[#0a1520] rounded animate-pulse w-1/2" />
                  </div>
                ) : !autoTopup ? (
                  /* Not configured yet */
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-mono text-[#6a7a8d] leading-relaxed">
                        Save a payment method and set a credit threshold. We&apos;ll automatically top
                        up your balance so your apps never go offline.
                      </p>
                      {autoTopup === null && (
                        <p className="text-[10px] font-mono text-[#3a4a5a] mt-2">
                          No payment method saved yet.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSetupTopup}
                      disabled={setupTopupLoading}
                      className="flex-shrink-0 px-4 py-2.5 text-xs font-display tracking-widest rounded-lg bg-[#5ad8ff] text-[#070a10] font-bold hover:bg-[#4ac8ef] transition-all disabled:opacity-50"
                    >
                      {setupTopupLoading ? 'REDIRECTING...' : 'ADD PAYMENT METHOD →'}
                    </button>
                  </div>
                ) : (
                  /* Configured — show controls */
                  <div className="space-y-4">
                    {autoTopup.lastFailedAt && (
                      <div className="rounded-lg border border-[#ff4d6d]/30 bg-[#ff4d6d]/5 px-3 py-2 text-xs font-mono text-[#ff4d6d]">
                        Last topup failed: {autoTopup.failureReason ?? 'Unknown error'}
                        <button
                          onClick={handleSetupTopup}
                          className="ml-2 underline hover:no-underline"
                        >
                          Update card →
                        </button>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Threshold picker */}
                      <div>
                        <p className="text-[10px] font-mono text-[#4a5a6d] mb-2 tracking-wider">TRIGGER THRESHOLD</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[250, 500, 1000, 2500].map((t) => (
                            <button
                              key={t}
                              onClick={() => handleTopupUpdate({ thresholdCredits: t })}
                              disabled={topupUpdating}
                              className={`px-2.5 py-1 text-[10px] font-mono rounded border transition-all disabled:opacity-50 ${
                                autoTopup.thresholdCredits === t
                                  ? 'border-[#5ad8ff]/60 bg-[#5ad8ff]/10 text-[#5ad8ff]'
                                  : 'border-[#1a2535] text-[#4a5a6d] hover:border-[#2a3a50]'
                              }`}
                            >
                              {t.toLocaleString()} cr
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-[#2a3a4a] mt-1.5 font-mono">
                          Topup fires when balance falls below this
                        </p>
                      </div>

                      {/* Pack picker */}
                      <div>
                        <p className="text-[10px] font-mono text-[#4a5a6d] mb-2 tracking-wider">TOPUP AMOUNT</p>
                        <div className="flex flex-col gap-1">
                          {(Object.entries(TOPUP_PACKS) as [TopupPackId, typeof TOPUP_PACKS[TopupPackId]][]).map(([id, pack]) => (
                            <button
                              key={id}
                              onClick={() => handleTopupUpdate({ topupPackId: id })}
                              disabled={topupUpdating}
                              className={`text-left px-2.5 py-1.5 text-[10px] font-mono rounded border transition-all disabled:opacity-50 ${
                                autoTopup.topupPackId === id
                                  ? 'border-[#5ad8ff]/60 bg-[#5ad8ff]/10 text-[#5ad8ff]'
                                  : 'border-[#1a2535] text-[#4a5a6d] hover:border-[#2a3a50]'
                              }`}
                            >
                              {pack.price} — {(pack.credits / 1000).toFixed(0)}K credits
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#192433]">
                      <div className="text-[10px] font-mono text-[#3a4a5a]">
                        {autoTopup.lastTopupAt
                          ? `Last topped up ${new Date(autoTopup.lastTopupAt).toLocaleDateString()}`
                          : 'Never triggered yet'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSetupTopup}
                          disabled={setupTopupLoading}
                          className="px-3 py-1.5 text-[10px] font-mono rounded border border-[#1a2535] text-[#4a5a6d] hover:border-[#2a3a50] transition-all disabled:opacity-50"
                        >
                          Change card
                        </button>
                        <button
                          onClick={() => handleTopupUpdate({ enabled: !autoTopup.enabled })}
                          disabled={topupUpdating}
                          className={`px-3 py-1.5 text-[10px] font-display tracking-widest rounded border transition-all disabled:opacity-50 ${
                            autoTopup.enabled
                              ? 'border-[#ff4d6d]/40 text-[#ff4d6d] hover:bg-[#ff4d6d]/10'
                              : 'border-[#59f5a9]/40 text-[#59f5a9] hover:bg-[#59f5a9]/10'
                          }`}
                        >
                          {topupUpdating ? '...' : autoTopup.enabled ? 'DISABLE' : 'ENABLE'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Budget Alerts */}
            <section className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#192433] flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-display font-bold text-white tracking-widest">BUDGET ALERTS</h2>
                  <p className="text-xs text-[#4a5a6d] mt-0.5">Get emailed when your compute balance drops below a threshold.</p>
                </div>
                {budgetAlert && !budgetAlertLoading && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 border ${budgetAlert.enabled ? 'border-[#59f5a9]/40 text-[#59f5a9] bg-[#59f5a9]/5' : 'border-[#333] text-[#555]'}`}>
                    {budgetAlert.enabled ? '● ON' : '○ OFF'}
                  </span>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {budgetAlertLoading ? (
                  <p className="text-xs text-[#4a5a6d] font-mono">Loading…</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-display tracking-widest text-[#4a5a6d] block mb-1.5">ALERT EMAIL</label>
                        <input
                          type="email"
                          value={budgetAlertEmail}
                          onChange={(e) => setBudgetAlertEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-[#0a1520] border border-[#1a2535] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#3a4a5a] focus:border-[#5ad8ff]/40 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-display tracking-widest text-[#4a5a6d] block mb-1.5">ALERT THRESHOLD</label>
                        <div className="flex flex-wrap gap-2">
                          {[500, 1000, 2500, 5000].map((t) => (
                            <button
                              key={t}
                              onClick={() => setBudgetAlertThreshold(t)}
                              className={`px-3 py-1.5 text-[10px] font-mono rounded-lg border transition-all ${
                                budgetAlertThreshold === t
                                  ? 'border-[#5ad8ff]/60 bg-[#5ad8ff]/10 text-[#5ad8ff]'
                                  : 'border-[#2a3a50] text-[#4a5a6d] hover:border-[#5ad8ff]/30'
                              }`}
                            >
                              {t.toLocaleString()} cr
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleBudgetAlertSave}
                        disabled={budgetAlertSaving || !budgetAlertEmail}
                        className="px-4 py-1.5 text-[10px] font-display tracking-widest rounded-lg border border-[#5ad8ff]/40 text-[#5ad8ff] hover:bg-[#5ad8ff]/10 transition-all disabled:opacity-40"
                      >
                        {budgetAlertSaving ? 'SAVING…' : budgetAlert ? 'UPDATE' : 'SAVE ALERT'}
                      </button>
                      {budgetAlert && (
                        <button
                          onClick={handleBudgetAlertToggle}
                          disabled={budgetAlertSaving}
                          className={`px-4 py-1.5 text-[10px] font-display tracking-widest rounded-lg border transition-all disabled:opacity-40 ${
                            budgetAlert.enabled
                              ? 'border-[#555]/40 text-[#555] hover:bg-[#333]/10'
                              : 'border-[#59f5a9]/40 text-[#59f5a9] hover:bg-[#59f5a9]/10'
                          }`}
                        >
                          {budgetAlertSaving ? '…' : budgetAlert.enabled ? 'DISABLE' : 'ENABLE'}
                        </button>
                      )}
                    </div>
                    {budgetAlert?.lastAlertAt && (
                      <p className="text-[10px] text-[#4a5a6d] font-mono">
                        Last alert sent {new Date(budgetAlert.lastAlertAt).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Arena Credits Info */}
            <div className="rounded-xl border border-[#1a3a1a] bg-[#0a180a] px-6 py-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#59f5a9]/10 border border-[#59f5a9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#59f5a9]">Daily Arena Grant</p>
                <p className="text-xs text-[#4a6a4a] mt-1 leading-relaxed">
                  You receive <strong className="text-[#59f5a9]">100 free arena credits</strong> every day at midnight.
                  These are used to enter games — not API calls. Win games to earn bonus compute.
                  Current balance: <strong className="text-[#59f5a9]">{balances?.arena_credits ?? '—'} cr</strong>
                </p>
              </div>
            </div>

          </div>

          {/* Right Rail */}
          <div className="space-y-4">

            {/* API Keys */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433] flex items-center justify-between">
                <div>
                  <p className="text-xs font-display tracking-widest text-white">API KEYS</p>
                  <p className="text-[10px] text-[#4a5a6d] mt-0.5">{activeKeys.length} active</p>
                </div>
                <button
                  onClick={() => setShowKeyForm(!showKeyForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-widest rounded-lg border border-[#2a3a50] text-[#5ad8ff] hover:border-[#5ad8ff]/40 hover:bg-[#5ad8ff]/5 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  NEW KEY
                </button>
              </div>

              {showKeyForm && (
                <div className="px-4 py-3 border-b border-[#192433] bg-[#080d14] space-y-2">
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Key name (optional)"
                    className="w-full bg-[#0a1520] border border-[#1a2535] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#3a4a5a] focus:border-[#5ad8ff]/40 focus:outline-none transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateKey}
                      className="flex-1 py-2 text-[10px] font-display tracking-widest bg-[#5ad8ff] text-[#070a10] rounded-lg font-bold hover:bg-[#4ac8ef] transition-colors"
                    >
                      CREATE
                    </button>
                    <button
                      onClick={() => { setShowKeyForm(false); setKeyName('') }}
                      className="px-4 py-2 text-[10px] font-mono text-[#4a5a6d] border border-[#192433] rounded-lg hover:border-[#2a3a50] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {createdKey && (
                <div className="px-4 py-3 border-b border-[#192433] bg-[#0a1a0a]">
                  <p className="text-[10px] font-display tracking-widest text-[#59f5a9] mb-2">KEY CREATED — COPY NOW</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-white bg-[#070a10] border border-[#1a3a1a] rounded-lg px-3 py-2 break-all">
                      {createdKey}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2 rounded-lg border border-[#1a3a1a] text-[#59f5a9] hover:bg-[#59f5a9]/10 transition-colors"
                    >
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[9px] text-[#3a4a5a] mt-1.5">This key is only shown once.</p>
                </div>
              )}

              {keyError && (
                <div className="px-4 py-2.5 border-b border-[#192433] bg-[#1a0a0a]">
                  <p className="text-xs text-[#ff4d6d]">{keyError}</p>
                </div>
              )}

              <div className="divide-y divide-[#0f1520]">
                {activeKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-[#4a5a6d] font-mono">No active API keys</p>
                    <p className="text-[10px] text-[#2a3a4a] mt-1">Create a key to access the API</p>
                  </div>
                ) : (
                  activeKeys.map((key) => (
                    <div
                      key={key.id}
                      className="px-4 py-3.5 flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-white">{key.keyPrefix}••••••••</p>
                        <p className="text-[10px] text-[#4a5a6d] mt-0.5">{key.name}</p>
                        {key.lastUsedAt && (
                          <p className="text-[9px] text-[#2a3a4a]">
                            Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {pendingRevoke === key.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="px-2.5 py-1 text-[10px] font-mono text-[#ff4d6d] border border-[#ff4d6d]/40 rounded-lg bg-[#ff4d6d]/10 hover:bg-[#ff4d6d]/20 transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setPendingRevoke(null)}
                            className="px-2.5 py-1 text-[10px] font-mono text-[#4a5a6d] border border-[#192433] rounded-lg hover:border-[#2a3a50] transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingRevoke(key.id)}
                          className="opacity-0 group-hover:opacity-100 px-2.5 py-1 text-[10px] font-mono text-[#ff4d6d] border border-[#ff4d6d]/20 rounded-lg hover:bg-[#ff4d6d]/10 transition-all"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-[#192433]">
                <p className="text-[10px] text-[#3a4a5a] font-mono">
                  Base URL: <code className="text-[#5ad8ff]">https://tokenomicon.io/api/v1</code>
                </p>
              </div>
            </div>

            {/* Promo Code */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433]">
                <p className="text-xs font-display tracking-widest text-white">PROMO CODE</p>
                <p className="text-[10px] text-[#4a5a6d] mt-0.5">Redeem a code for free credits</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {promoBanner && (
                  <div className="rounded-lg border border-[#59f5a9]/30 bg-[#59f5a9]/5 px-3 py-2.5 flex items-start gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2.5" className="flex-shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5"/></svg>
                    <div className="min-w-0">
                      <p className="text-[10px] font-display tracking-wider text-[#59f5a9]">+{promoBanner.credits.toLocaleString()} CREDITS ADDED</p>
                      <p className="text-[9px] text-[#3a5a3a] mt-0.5">{promoBanner.description}</p>
                    </div>
                    <button onClick={() => setPromoBanner(null)} className="flex-shrink-0 text-[#3a5a3a] hover:text-[#59f5a9]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
                <form onSubmit={handleRedeemPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={64}
                    className="flex-1 bg-[#0a1520] border border-[#1a2535] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#3a4a5a] uppercase tracking-widest focus:border-[#5ad8ff]/40 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={promoLoading || !promoCode.trim()}
                    className="flex-shrink-0 px-3 py-2 text-[10px] font-display tracking-widest rounded-lg bg-[#5ad8ff] text-[#070a10] font-bold hover:bg-[#4ac8ef] transition-all disabled:opacity-40"
                  >
                    {promoLoading ? '…' : 'APPLY'}
                  </button>
                </form>
              </div>
            </div>

            {/* Transaction History */}
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#192433]">
                <p className="text-xs font-display tracking-widest text-white">RECENT ACTIVITY</p>
              </div>
              {recentLedger.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[#4a5a6d] font-mono">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#0f1520]">
                  {recentLedger.slice(0, 15).map((entry) => (
                    <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-[#a8b8cc] capitalize">
                          {entry.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[9px] text-[#3a4a5a]">
                          {new Date(entry.createdAt).toLocaleDateString()} · {entry.bucket}
                        </p>
                      </div>
                      <span className={`text-xs font-mono font-bold ${entry.amount >= 0 ? 'text-[#59f5a9]' : 'text-[#ff4d6d]'}`}>
                        {entry.amount >= 0 ? '+' : ''}{entry.amount} cr
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function BalanceCard({
  label, value, sub, color, loading
}: {
  label: string
  value: number
  sub: string
  color: string
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5">
      <p className="text-[10px] font-mono text-[#4a5a6d] tracking-wider uppercase mb-2">{label}</p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-28 bg-[#0a1520] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#0a1520] rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-mono font-black" style={{ color }}>{fmt(value)}</p>
          <p className="text-[10px] text-[#3a4a5a] mt-1 font-mono">cr · {sub}</p>
        </>
      )}
    </div>
  )
}
