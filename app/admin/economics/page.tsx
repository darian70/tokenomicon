'use client'

import { useState, useEffect } from 'react'

interface ProviderBalance {
  provider: string
  balanceUsd: number | null
  error: string | null
  fetchedAt: string
}

interface ReconRow {
  model: string
  provider: string
  requests: number
  totalTokens: number
  revenueUsd: number
  costUsd: number
  grossProfitUsd: number
  marginPct: number
}

interface ReconTotals {
  requests: number
  revenueUsd: number
  costUsd: number
  grossProfitUsd: number
  marginPct: number
}

interface ArenaRakeData {
  totalDuels: number
  completedDuels: number
  totalRakeCredits: number
  totalRakeUsd: number
  avgRakePerDuel: number
}

interface MarkupRow {
  model: string
  displayName: string
  provider: string
  tier: string
  userInputPriceUsdPer1M: number
  userOutputPriceUsdPer1M: number
  providerInputCostUsdPer1M: number
  providerOutputCostUsdPer1M: number
  inputMarkupX: number
  outputMarkupX: number
}

const usd = (n: number) => `$${n.toFixed(4)}`
const usd2 = (n: number) => `$${n.toFixed(2)}`
const pct = (n: number) => `${n.toFixed(1)}%`

export default function EconomicsPage() {
  const [balances, setBalances] = useState<ProviderBalance[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [reconRows, setReconRows] = useState<ReconRow[]>([])
  const [totals, setTotals] = useState<ReconTotals | null>(null)
  const [markup, setMarkup] = useState<MarkupRow[]>([])
  const [arenaRake, setArenaRake] = useState<ArenaRakeData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [tab, setTab] = useState<'reconciliation' | 'markup' | 'balances'>('reconciliation')

  useEffect(() => {
    setBalanceLoading(true)
    fetch('/api/admin/balances')
      .then((r) => r.json())
      .then((d) => {
        if (d.balances) setBalances(d.balances)
        if (d.warnings) setWarnings(d.warnings)
      })
      .catch(() => {})
      .finally(() => setBalanceLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/reconciliation?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.report) {
          setReconRows(d.report.rows)
          setTotals(d.report.totals)
        }
        if (d.markup) setMarkup(d.markup)
        if (d.arenaRake) setArenaRake(d.arenaRake)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="flex flex-col min-h-screen bg-void text-text">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <a href="/arena" className="text-dim hover:text-cyan text-xs font-mono transition-colors">&larr; Arena</a>
          <span className="text-border text-xs">/</span>
          <a href="/admin/health" className="text-dim hover:text-cyan text-xs font-mono transition-colors">Health</a>
          <span className="text-border text-xs">/</span>
          <h1 className="font-display text-sm tracking-widest text-blood">ECONOMICS</h1>
        </div>
        <a href="/" className="font-display text-sm tracking-widest text-gold">TOKENOMICON</a>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Low balance warnings */}
        {warnings.length > 0 && (
          <div className="border border-blood/60 bg-blood/10 p-4">
            <p className="text-blood font-display text-xs tracking-widest mb-2">⚠ LOW PROVIDER BALANCE</p>
            {warnings.map((w, i) => <p key={i} className="text-blood font-mono text-xs">{w}</p>)}
          </div>
        )}

        {/* Summary totals */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="API REVENUE" value={usd2(totals.revenueUsd)} color="text-acid" />
            <MetricCard label="PROVIDER COST" value={usd2(totals.costUsd)} color="text-blood" />
            <MetricCard label="API PROFIT" value={usd2(totals.grossProfitUsd)} color={totals.grossProfitUsd >= 0 ? 'text-acid' : 'text-blood'} />
            <MetricCard label="API MARGIN" value={pct(totals.marginPct)} color={totals.marginPct >= 30 ? 'text-acid' : totals.marginPct >= 0 ? 'text-gold' : 'text-blood'} />
            <MetricCard label="ARENA RAKE" value={arenaRake ? usd2(arenaRake.totalRakeUsd) : '—'} color="text-gold" />
            <MetricCard label="DUELS WON" value={arenaRake ? String(arenaRake.completedDuels) : '—'} color="text-cyan" />
          </div>
        )}

        {/* Period + tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-0 border-b border-border">
            {(['reconciliation', 'markup', 'balances'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-display tracking-widest border-b-2 transition-colors cursor-crosshair ${
                  tab === t ? 'border-acid text-acid' : 'border-transparent text-dim hover:text-text'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {tab === 'reconciliation' && (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-panel border border-border text-text text-xs font-mono px-2 py-1"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          )}
        </div>

        {/* Reconciliation tab */}
        {tab === 'reconciliation' && (
          <div>
            {loading ? (
              <p className="text-dim font-mono text-sm text-center py-12 animate-pulse">Loading...</p>
            ) : reconRows.length === 0 ? (
              <p className="text-dim font-mono text-sm text-center py-12">No API usage recorded in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-border text-dim">
                      <th className="text-left py-2 pr-4">Model</th>
                      <th className="text-left py-2 pr-4">Provider</th>
                      <th className="text-right py-2 pr-4">Requests</th>
                      <th className="text-right py-2 pr-4">Tokens</th>
                      <th className="text-right py-2 pr-4">Revenue</th>
                      <th className="text-right py-2 pr-4">Cost</th>
                      <th className="text-right py-2 pr-4">Profit</th>
                      <th className="text-right py-2">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconRows.map((r) => (
                      <tr key={`${r.provider}/${r.model}`} className="border-b border-border/30 hover:bg-panel/40">
                        <td className="py-2 pr-4 text-text">{r.model}</td>
                        <td className="py-2 pr-4 text-dim capitalize">{r.provider}</td>
                        <td className="py-2 pr-4 text-right">{r.requests.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right">{(r.totalTokens / 1000).toFixed(1)}K</td>
                        <td className="py-2 pr-4 text-right text-acid">{usd2(r.revenueUsd)}</td>
                        <td className="py-2 pr-4 text-right text-blood">{usd2(r.costUsd)}</td>
                        <td className={`py-2 pr-4 text-right font-bold ${r.grossProfitUsd >= 0 ? 'text-acid' : 'text-blood'}`}>
                          {usd2(r.grossProfitUsd)}
                        </td>
                        <td className={`py-2 text-right font-bold ${r.marginPct >= 30 ? 'text-acid' : r.marginPct >= 0 ? 'text-gold' : 'text-blood'}`}>
                          {pct(r.marginPct)}
                        </td>
                      </tr>
                    ))}
                    {totals && (
                      <tr className="border-t-2 border-border font-bold">
                        <td className="py-2 pr-4 text-text" colSpan={2}>TOTAL</td>
                        <td className="py-2 pr-4 text-right">{totals.requests.toLocaleString()}</td>
                        <td className="py-2 pr-4" />
                        <td className="py-2 pr-4 text-right text-acid">{usd2(totals.revenueUsd)}</td>
                        <td className="py-2 pr-4 text-right text-blood">{usd2(totals.costUsd)}</td>
                        <td className={`py-2 pr-4 text-right ${totals.grossProfitUsd >= 0 ? 'text-acid' : 'text-blood'}`}>{usd2(totals.grossProfitUsd)}</td>
                        <td className={`py-2 text-right ${totals.marginPct >= 30 ? 'text-acid' : 'text-gold'}`}>{pct(totals.marginPct)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Markup tab */}
        {tab === 'markup' && (
          <div className="overflow-x-auto">
            <p className="text-[10px] font-mono text-dim mb-3">1 credit = $0.001 USD. Markup = user price / provider cost.</p>
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border text-dim">
                  <th className="text-left py-2 pr-4">Model</th>
                  <th className="text-left py-2 pr-4">Provider</th>
                  <th className="text-left py-2 pr-4">Tier</th>
                  <th className="text-right py-2 pr-4">User $/1M in</th>
                  <th className="text-right py-2 pr-4">Cost $/1M in</th>
                  <th className="text-right py-2 pr-4">Markup in</th>
                  <th className="text-right py-2 pr-4">User $/1M out</th>
                  <th className="text-right py-2 pr-4">Cost $/1M out</th>
                  <th className="text-right py-2">Markup out</th>
                </tr>
              </thead>
              <tbody>
                {markup.map((m) => (
                  <tr key={m.model} className="border-b border-border/30 hover:bg-panel/40">
                    <td className="py-2 pr-4 text-text">{m.displayName}</td>
                    <td className="py-2 pr-4 text-dim capitalize">{m.provider}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 text-[10px] ${m.tier === 'premium' ? 'bg-gold/20 text-gold' : m.tier === 'standard' ? 'bg-cyan/20 text-cyan' : 'bg-dim/20 text-dim'}`}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right text-acid">{usd(m.userInputPriceUsdPer1M)}</td>
                    <td className="py-2 pr-4 text-right text-blood">{usd(m.providerInputCostUsdPer1M)}</td>
                    <td className={`py-2 pr-4 text-right font-bold ${m.inputMarkupX >= 1.5 ? 'text-acid' : m.inputMarkupX >= 1 ? 'text-gold' : 'text-blood'}`}>
                      {m.inputMarkupX}×
                    </td>
                    <td className="py-2 pr-4 text-right text-acid">{usd(m.userOutputPriceUsdPer1M)}</td>
                    <td className="py-2 pr-4 text-right text-blood">{usd(m.providerOutputCostUsdPer1M)}</td>
                    <td className={`py-2 text-right font-bold ${m.outputMarkupX >= 1.5 ? 'text-acid' : m.outputMarkupX >= 1 ? 'text-gold' : 'text-blood'}`}>
                      {m.outputMarkupX}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Balances tab */}
        {tab === 'balances' && (
          <div className="space-y-3">
            {balanceLoading ? (
              <p className="text-dim font-mono text-sm text-center py-12 animate-pulse">Fetching provider balances...</p>
            ) : (
              <>
                <p className="text-[10px] font-mono text-dim">Real-time provider account balances. Top up before hitting $10.</p>
                {balances.map((b) => (
                  <div key={b.provider} className={`border p-4 ${b.balanceUsd !== null && b.balanceUsd < 10 ? 'border-blood/60 bg-blood/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-display text-sm tracking-widest capitalize text-text">{b.provider}</p>
                        {b.error && <p className="text-dim font-mono text-[11px] mt-1">{b.error}</p>}
                      </div>
                      <div className="text-right">
                        {b.balanceUsd !== null ? (
                          <p className={`font-mono text-xl font-bold ${b.balanceUsd < 10 ? 'text-blood' : b.balanceUsd < 50 ? 'text-gold' : 'text-acid'}`}>
                            {usd2(b.balanceUsd)}
                          </p>
                        ) : (
                          <p className="font-mono text-sm text-dim">—</p>
                        )}
                        <p className="text-[9px] font-mono text-dim mt-1">
                          fetched {new Date(b.fetchedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border border-border/40 p-4 mt-4">
                  <p className="font-display text-xs tracking-widest text-dim mb-3">TOP-UP INSTRUCTIONS</p>
                  <div className="space-y-2 text-xs font-mono text-dim">
                    <p><span className="text-cyan">OpenRouter:</span> openrouter.ai/settings/credits — add credits via card/crypto. Balance visible via API.</p>
                    <p><span className="text-cyan">OpenAI:</span> platform.openai.com/settings/organization/billing — prepay or credit card. Monitor at /dashboard/billing.</p>
                    <p><span className="text-cyan">Anthropic:</span> console.anthropic.com/settings/plans — pay-as-you-go credit card. No balance API.</p>
                    <p><span className="text-cyan">Groq:</span> console.groq.com/settings/billing — free tier or prepaid blocks. No balance API.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="panel p-4 rounded-sm text-center">
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-display tracking-widest text-dim mt-1">{label}</p>
    </div>
  )
}
