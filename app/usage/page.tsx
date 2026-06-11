'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyPoint {
  date: string
  totalTokens: number
  totalCost: number
  requests: number
}

interface ModelPoint {
  model: string
  provider: string
  totalTokens: number
  totalCost: number
  requests: number
}

interface KeyPoint {
  apiKeyId: string
  name: string
  keyPrefix: string | null
  totalTokens: number
  totalCost: number
  requests: number
}

interface RecentCall {
  id: string
  model: string
  provider: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costInCredits: number
  createdAt: string
  keyName: string
  keyPrefix: string | null
}

interface UsageData {
  totalRequests: number
  totalTokens: number
  totalCost: number
  daily: DailyPoint[]
  byModel: ModelPoint[]
  byKey: KeyPoint[]
  recent: RecentCall[]
}

type ChartMetric = 'totalCost' | 'requests' | 'totalTokens'
type TimeRange = 7 | 30 | 90

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtDate(dateStr: string, short = false): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  if (short) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fillDateGaps(data: DailyPoint[], days: number): DailyPoint[] {
  const byDate = Object.fromEntries(data.map((d) => [d.date, d]))
  const result: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push(byDate[dateStr] ?? { date: dateStr, totalTokens: 0, totalCost: 0, requests: 0 })
  }
  return result
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cp1x = prev.x + (curr.x - prev.x) * 0.45
    const cp2x = curr.x - (curr.x - prev.x) * 0.45
    d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`
  }
  return d
}

function shortModelName(model: string): string {
  // e.g. "deepseek/deepseek-chat-v3-0324" → "DeepSeek V3"
  // Use the last segment, clean it up
  const seg = model.includes('/') ? model.split('/').pop()! : model
  return seg
    .replace(/-\d{8}$/, '')        // remove date suffixes
    .replace(/-\d{4}$/, '')        // remove year suffixes
    .replace(/-\d{2}$/, '')        // e.g. -it
    .replace(/-instruct$/, '')
    .replace(/-versatile$/, '')
    .replace(/-preview$/, '')
    .replace(/-latest$/, '')
    .replace(/-\d+b(-a\d+b)?$/i, (m) => ` ${m.replace(/-/g, ' ').trim().toUpperCase()}`)
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Area Chart ───────────────────────────────────────────────────────────────

const CHART_COLORS: Record<ChartMetric, string> = {
  totalCost: '#5ad8ff',
  requests: '#59f5a9',
  totalTokens: '#6e9bff',
}

const CHART_LABELS: Record<ChartMetric, string> = {
  totalCost: 'Credits',
  requests: 'Requests',
  totalTokens: 'Tokens',
}

interface TooltipState {
  x: number
  y: number
  index: number
}

function AreaChart({
  data,
  metric,
  days,
}: {
  data: DailyPoint[]
  metric: ChartMetric
  days: TimeRange
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const color = CHART_COLORS[metric]

  const filled = fillDateGaps(data, days)
  const values = filled.map((d) => d[metric])
  const maxV = Math.max(...values, 1)

  // SVG coordinate space
  const VW = 1000
  const VH = 220
  const pad = { top: 20, right: 16, bottom: 40, left: 60 }
  const cW = VW - pad.left - pad.right
  const cH = VH - pad.top - pad.bottom

  const px = (i: number) => pad.left + (i / Math.max(filled.length - 1, 1)) * cW
  const py = (v: number) => pad.top + cH - Math.max(0, (v / maxV)) * cH

  const pts = filled.map((d, i) => ({ x: px(i), y: py(d[metric]) }))
  const linePath = smoothPath(pts)
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${pad.top + cH} L ${pts[0].x} ${pad.top + cH} Z`
    : ''

  // Y-axis grid lines (4 levels)
  const yLevels = [0, 0.33, 0.67, 1].map((f) => ({
    y: py(maxV * f),
    label: f === 0 ? '0' : fmtNum(Math.round(maxV * f)),
  }))

  // X-axis labels — show ~6 evenly spaced
  const labelStep = Math.ceil(filled.length / 6)
  const xLabels = filled
    .map((d, i) => ({ i, date: d.date }))
    .filter(({ i }) => i === 0 || i === filled.length - 1 || i % labelStep === 0)

  const gradId = `area-grad-${metric}`

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (!svgRef.current || filled.length === 0) return
      const rect = svgRef.current.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const svgX = relX * VW
      const clampedX = Math.max(pad.left, Math.min(pad.left + cW, svgX))
      const ratio = (clampedX - pad.left) / cW
      const idx = Math.round(ratio * (filled.length - 1))
      const clampedIdx = Math.max(0, Math.min(filled.length - 1, idx))
      setTooltip({
        x: (pts[clampedIdx]?.x ?? 0) / VW,
        y: (pts[clampedIdx]?.y ?? 0) / VH,
        index: clampedIdx,
      })
    },
    [filled, pts, cW, VW, VH, pad.left],
  )

  if (filled.every((d) => d[metric] === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center">
        <p className="text-3xl mb-2 opacity-30">📊</p>
        <p className="text-xs text-[#4a5a6d] font-mono">No {CHART_LABELS[metric].toLowerCase()} data yet</p>
        <p className="text-[10px] text-[#2a3a4a] mt-1 font-mono">Make an API call to see usage appear here</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 220 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLevels.map(({ y, label }) => (
          <g key={label}>
            <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="#192433" strokeWidth="1" />
            <text
              x={pad.left - 8} y={y + 4}
              textAnchor="end"
              fill="#3a4a5a"
              fontSize="11"
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hovered point highlight */}
        {tooltip !== null && (
          <>
            <line
              x1={pts[tooltip.index].x}
              y1={pad.top}
              x2={pts[tooltip.index].x}
              y2={pad.top + cH}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            <circle
              cx={pts[tooltip.index].x}
              cy={pts[tooltip.index].y}
              r="5"
              fill={color}
              stroke="#070a10"
              strokeWidth="2"
            />
          </>
        )}

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text
            key={date}
            x={px(i)}
            y={VH - 6}
            textAnchor="middle"
            fill="#3a4a5a"
            fontSize="10"
            fontFamily="monospace"
          >
            {fmtDate(date, true)}
          </text>
        ))}

        {/* Invisible mouse-tracking overlay */}
        <rect
          x={pad.left}
          y={pad.top}
          width={cW}
          height={cH}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          style={{ cursor: 'crosshair' }}
        />
      </svg>

      {/* Tooltip bubble */}
      {tooltip !== null && filled[tooltip.index] && (
        <div
          className="pointer-events-none absolute z-10 bg-[#0c111a] border border-[#2a3a50] rounded-lg px-3 py-2 text-[11px] font-mono shadow-xl"
          style={{
            left: `calc(${tooltip.x * 100}% + 12px)`,
            top: `calc(${tooltip.y * 100}% - 36px)`,
            transform: tooltip.x > 0.7 ? 'translateX(-110%)' : undefined,
          }}
        >
          <p className="text-[#6a7a8d] mb-0.5">{fmtDate(filled[tooltip.index].date)}</p>
          <p style={{ color }}>{fmtNum(filled[tooltip.index][metric])} {CHART_LABELS[metric].toLowerCase()}</p>
        </div>
      )}
    </div>
  )
}

// ─── Provider badge ───────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  openai:     { bg: '#0a1820', text: '#5ad8ff', label: 'OpenAI' },
  anthropic:  { bg: '#1a100a', text: '#ff8c42', label: 'Anthropic' },
  groq:       { bg: '#0a1a0a', text: '#59f5a9', label: 'Groq' },
  openrouter: { bg: '#1a0a1a', text: '#b87fff', label: 'OpenRouter' },
}

function ProviderBadge({ provider }: { provider: string }) {
  const c = PROVIDER_COLORS[provider] ?? { bg: '#0a1520', text: '#6a7a8d', label: provider }
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
      style={{ background: c.bg, color: c.text, borderColor: c.text + '30' }}
    >
      {c.label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [days, setDays] = useState<TimeRange>(30)
  const [metric, setMetric] = useState<ChartMetric>('totalCost')
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/v1/usage?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d as UsageData)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load usage'))
      .finally(() => setLoading(false))
  }, [days])

  const avgCostPerReq = data && data.totalRequests > 0
    ? (data.totalCost / data.totalRequests).toFixed(1)
    : '0'

  const topModel = data?.byModel[0]

  return (
    <div className="min-h-full">

      {/* ── Header ── */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-widest">API USAGE</h1>
            <p className="text-xs text-[#4a5a6d] font-mono">Credits consumed · requests made · tokens used</p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 border border-[#192433] rounded-lg p-1 bg-[#0c111a]">
            {([7, 30, 90] as TimeRange[]).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-[11px] font-display tracking-wider rounded-md transition-all ${
                  days === d
                    ? 'bg-[#1a2535] text-white border border-[#2a3a50]'
                    : 'text-[#4a5a6d] hover:text-[#a8b8cc]'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {error && (
          <div className="rounded-xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/5 px-5 py-4 text-sm text-[#ff4d6d] font-mono">
            {error === 'Unauthorized'
              ? <span>Sign in to view usage. <Link href="/sign-in" className="underline">Sign in →</Link></span>
              : error}
          </div>
        )}

        {/* ── Summary stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={loading ? null : fmtNum(data?.totalRequests ?? 0)}
            sub={`last ${days} days`}
            color="#59f5a9"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            }
          />
          <StatCard
            label="Total Tokens"
            value={loading ? null : fmtNum(data?.totalTokens ?? 0)}
            sub="in + out"
            color="#6e9bff"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            }
          />
          <StatCard
            label="Credits Spent"
            value={loading ? null : fmtNum(data?.totalCost ?? 0)}
            sub="compute credits"
            color="#5ad8ff"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            }
          />
          <StatCard
            label="Avg Cost / Request"
            value={loading ? null : `${avgCostPerReq} cr`}
            sub={topModel ? shortModelName(topModel.model) : 'no data'}
            color="#f59e0b"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m2 20 20-16M7 20h13M4 4h13"/>
              </svg>
            }
          />
        </div>

        {/* ── Main chart ── */}
        <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#192433] flex items-center justify-between gap-4">
            <p className="text-xs font-display tracking-widest text-white">USAGE OVER TIME</p>
            <div className="flex items-center gap-1">
              {(Object.entries(CHART_LABELS) as [ChartMetric, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMetric(k)}
                  className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-all ${
                    metric === k
                      ? 'text-white border-[#2a3a50] bg-[#1a2535]'
                      : 'text-[#4a5a6d] border-transparent hover:text-[#a8b8cc]'
                  }`}
                  style={metric === k ? { color: CHART_COLORS[k] } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            {loading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#5ad8ff] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <AreaChart data={data?.daily ?? []} metric={metric} days={days} />
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Model breakdown ── */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#192433]">
              <p className="text-xs font-display tracking-widest text-white">BY MODEL</p>
              <p className="text-[10px] text-[#4a5a6d] mt-0.5 font-mono">Credits consumed per model</p>
            </div>
            {loading ? (
              <LoadingRows />
            ) : !data?.byModel.length ? (
              <EmptyState text="No model usage yet" />
            ) : (
              <div className="divide-y divide-[#0f1520]">
                {data.byModel.slice(0, 8).map((m) => {
                  const maxCost = data.byModel[0]?.totalCost ?? 1
                  const pct = Math.max(2, (m.totalCost / maxCost) * 100)
                  return (
                    <div key={m.model} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <ProviderBadge provider={m.provider} />
                          <span className="text-[11px] font-mono text-[#a8b8cc] truncate">
                            {shortModelName(m.model)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-mono text-[#6a7a8d]">{fmtNum(m.requests)} req</span>
                          <span className="text-[11px] font-mono text-[#5ad8ff]">{fmtNum(m.totalCost)} cr</span>
                        </div>
                      </div>
                      <div className="h-1 bg-[#0a1520] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: '#5ad8ff', opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── By API key ── */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#192433] flex items-center justify-between">
              <div>
                <p className="text-xs font-display tracking-widest text-white">BY API KEY</p>
                <p className="text-[10px] text-[#4a5a6d] mt-0.5 font-mono">Credits consumed per key</p>
              </div>
              <Link
                href="/wallet"
                className="text-[10px] font-display tracking-wider text-[#5ad8ff] hover:text-white transition-colors"
              >
                MANAGE KEYS →
              </Link>
            </div>
            {loading ? (
              <LoadingRows />
            ) : !data?.byKey.length ? (
              <EmptyState text="No key usage yet" />
            ) : (
              <div className="divide-y divide-[#0f1520]">
                {data.byKey.slice(0, 8).map((k) => {
                  const maxCost = data.byKey[0]?.totalCost ?? 1
                  const pct = Math.max(2, (k.totalCost / maxCost) * 100)
                  return (
                    <div key={k.apiKeyId} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <span className="text-[11px] font-mono text-[#a8b8cc] truncate block">{k.name}</span>
                          {k.keyPrefix && (
                            <span className="text-[9px] font-mono text-[#3a4a5a]">{k.keyPrefix}••••</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-mono text-[#6a7a8d]">{fmtNum(k.requests)} req</span>
                          <span className="text-[11px] font-mono text-[#59f5a9]">{fmtNum(k.totalCost)} cr</span>
                        </div>
                      </div>
                      <div className="h-1 bg-[#0a1520] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: '#59f5a9', opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent API Calls ── */}
        <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#192433]">
            <p className="text-xs font-display tracking-widest text-white">RECENT API CALLS</p>
            <p className="text-[10px] text-[#4a5a6d] mt-0.5 font-mono">Last 50 requests in this window</p>
          </div>
          {loading ? (
            <LoadingRows count={6} />
          ) : !data?.recent.length ? (
            <EmptyState text="No API calls yet — make your first request to see it here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#192433]">
                    <th className="px-5 py-2.5 text-left text-[#3a4a5a] font-normal tracking-wider text-[10px]">TIME</th>
                    <th className="px-3 py-2.5 text-left text-[#3a4a5a] font-normal tracking-wider text-[10px]">MODEL</th>
                    <th className="px-3 py-2.5 text-right text-[#3a4a5a] font-normal tracking-wider text-[10px]">PROMPT</th>
                    <th className="px-3 py-2.5 text-right text-[#3a4a5a] font-normal tracking-wider text-[10px]">COMPLETION</th>
                    <th className="px-3 py-2.5 text-right text-[#3a4a5a] font-normal tracking-wider text-[10px]">COST</th>
                    <th className="px-5 py-2.5 text-left text-[#3a4a5a] font-normal tracking-wider text-[10px]">KEY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0a1018]">
                  {data.recent.map((r) => (
                    <tr key={r.id} className="hover:bg-[#0a1520]/50 transition-colors">
                      <td className="px-5 py-2.5 text-[#4a5a6d] whitespace-nowrap">
                        {fmtTime(r.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ProviderBadge provider={r.provider} />
                          <span className="text-[#a8b8cc] max-w-[160px] truncate">
                            {shortModelName(r.model)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#6a7a8d]">{r.promptTokens.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-[#6a7a8d]">{r.completionTokens.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-[#5ad8ff]">{r.costInCredits} cr</td>
                      <td className="px-5 py-2.5 text-[#4a5a6d] max-w-[120px] truncate">{r.keyName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#2a3a4a]">
          <span>Usage data refreshes in real-time. Credits = 1 cr = $0.001 USD.</span>
          <Link href="/docs" className="hover:text-[#5ad8ff] transition-colors">API docs →</Link>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string
  value: string | null
  sub: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-[#4a5a6d] tracking-wider uppercase">{label}</p>
        <span style={{ color }} className="opacity-60">{icon}</span>
      </div>
      {value === null ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-[#0a1520] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[#0a1520] rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-mono font-black" style={{ color }}>{value}</p>
          <p className="text-[10px] text-[#3a4a5a] mt-1 truncate">{sub}</p>
        </>
      )}
    </div>
  )
}

function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-[#0f1520]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-3">
          <div className="h-3 bg-[#0a1520] rounded animate-pulse flex-1" />
          <div className="h-3 bg-[#0a1520] rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-xs text-[#3a4a5a] font-mono">{text}</p>
    </div>
  )
}
