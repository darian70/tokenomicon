// Public live benchmarks page — no auth required.
// Data is aggregated from real oracle round results:
//   - Rate Roulette ground truth → model speed leaderboard
//   - Benchmark Brawl ground truth → model quality win rates
//   - OracleCallLog → transparency stats (pool/cache/live split)
//
// Revalidates every 60 seconds. Static by default between revalidations
// so it's SEO-friendly and CDN-cached. Updating content means search engines
// always have something to index — a key growth moat vs OpenRouter/Together.

import { db } from '@/lib/server/db'
import { GameType } from '@prisma/client'

// Force dynamic rendering — the page queries live DB data and must not be
// prerendered at build time (tables may not exist yet on first deploy).
// Migrate to 'use cache' + cacheLife('minutes') when cacheComponents is enabled.
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Data fetching — all server-side, no client JS required
// ---------------------------------------------------------------------------

interface ModelSpeedEntry {
  modelId: string
  displayName: string
  provider: string
  medianMs: number
  p90Ms: number
  sampleCount: number
}

interface ModelQualityEntry {
  displayName: string
  wins: number
  total: number
  winRate: number
}

interface OracleStats {
  totalRoundsToday: number
  poolHitRate: number
  cacheHitRate: number
  liveComputeRate: number
  totalCostUsdToday: number
}

async function getModelSpeedLeaderboard(): Promise<ModelSpeedEntry[]> {
  try {
  // Pull Rate Roulette cache entries from the last 7 days
  const entries = await db.oracleCacheEntry.findMany({
    where: {
      game: GameType.rate_limit_roulette,
      expiresAt: { gt: new Date() },
    },
    select: { groundTruth: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Aggregate latencies per model
  const latencyMap: Record<string, number[]> = {}
  const metaMap: Record<string, { displayName: string; provider: string }> = {}

  for (const entry of entries) {
    const truth = entry.groundTruth as {
      modelLatencies?: Array<{
        modelId: string
        displayName: string
        totalMs: number
        error?: string
      }>
    }
    if (!truth.modelLatencies) continue
    for (const ml of truth.modelLatencies) {
      if (ml.error || ml.totalMs <= 0) continue
      if (!latencyMap[ml.modelId]) latencyMap[ml.modelId] = []
      latencyMap[ml.modelId].push(ml.totalMs)
      metaMap[ml.modelId] = {
        displayName: ml.displayName,
        provider: ml.modelId.includes('/') ? ml.modelId.split('/')[0] : 'openai',
      }
    }
  }

  const result: ModelSpeedEntry[] = []
  for (const [modelId, latencies] of Object.entries(latencyMap)) {
    if (latencies.length < 2) continue
    const sorted = [...latencies].sort((a, b) => a - b)
    const p50Idx = Math.floor(sorted.length * 0.5)
    const p90Idx = Math.floor(sorted.length * 0.9)
    result.push({
      modelId,
      displayName: metaMap[modelId].displayName,
      provider: metaMap[modelId].provider,
      medianMs: Math.round(sorted[p50Idx]),
      p90Ms: Math.round(sorted[p90Idx]),
      sampleCount: latencies.length,
    })
  }

  return result.sort((a, b) => a.medianMs - b.medianMs)
  } catch { return [] }
}

async function getModelQualityRankings(): Promise<ModelQualityEntry[]> {
  try {
  const entries = await db.oracleCacheEntry.findMany({
    where: {
      game: GameType.benchmark_brawl,
      expiresAt: { gt: new Date() },
    },
    select: { groundTruth: true },
    take: 300,
  })

  const wins: Record<string, number> = {}
  const totals: Record<string, number> = {}

  for (const entry of entries) {
    const truth = entry.groundTruth as {
      bestModel?: string
      outputs?: Record<string, string>
    }
    if (!truth.bestModel || !truth.outputs) continue
    for (const displayName of Object.keys(truth.outputs)) {
      totals[displayName] = (totals[displayName] ?? 0) + 1
    }
    wins[truth.bestModel] = (wins[truth.bestModel] ?? 0) + 1
  }

  return Object.entries(totals)
    .map(([displayName, total]) => ({
      displayName,
      wins: wins[displayName] ?? 0,
      total,
      winRate: Math.round(((wins[displayName] ?? 0) / total) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10)
  } catch { return [] }
}

async function getOracleStats(): Promise<OracleStats> {
  const zero: OracleStats = { totalRoundsToday: 0, poolHitRate: 0, cacheHitRate: 0, liveComputeRate: 0, totalCostUsdToday: 0 }
  try {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [byOutcome, costRow] = await Promise.all([
    db.oracleCallLog.groupBy({
      by: ['outcome'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    db.oracleCallLog.aggregate({
      where: { createdAt: { gte: since }, outcome: 'live_compute' },
      _sum: { oracleCostUsd: true },
    }),
  ])

  const counts: Record<string, number> = {}
  let total = 0
  for (const row of byOutcome) {
    counts[row.outcome] = row._count.id
    if (row.outcome !== 'error') total += row._count.id
  }

  return {
    totalRoundsToday: total,
    poolHitRate: total > 0 ? Math.round(((counts.pool_hit ?? 0) / total) * 100) : 0,
    cacheHitRate: total > 0 ? Math.round(((counts.cache_hit ?? 0) / total) * 100) : 0,
    liveComputeRate: total > 0 ? Math.round(((counts.live_compute ?? 0) / total) * 100) : 0,
    totalCostUsdToday: costRow._sum.oracleCostUsd ?? 0,
  }
  } catch { return zero }
}

// ---------------------------------------------------------------------------
// UI components (inline — no separate file needed for a single page)
// ---------------------------------------------------------------------------

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50',
    anthropic: 'bg-orange-900/40 text-orange-300 border-orange-800/50',
    groq: 'bg-purple-900/40 text-purple-300 border-purple-800/50',
    google: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    deepseek: 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50',
    meta: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    qwen: 'bg-red-900/40 text-red-300 border-red-800/50',
    mistralai: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
  }
  const cls = colors[provider.toLowerCase()] ?? 'bg-gray-800/60 text-gray-300 border-gray-700/50'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${cls}`}>
      {provider.toLowerCase()}
    </span>
  )
}

function SpeedBar({ ms, maxMs }: { ms: number; maxMs: number }) {
  const pct = Math.max(4, Math.round((ms / maxMs) * 100))
  const color = ms < 300 ? '#22c55e' : ms < 700 ? '#eab308' : ms < 2000 ? '#f97316' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 bg-[#192433] rounded-full flex-1 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0d1520] border border-[#192433] rounded-lg p-4">
      <div className="text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest mb-1">{label}</div>
      <div className="font-display text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-[11px] text-[#4a5a6d] mt-1">{sub}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BenchmarksPage() {
  const [speedData, qualityData, oracleStats] = await Promise.all([
    getModelSpeedLeaderboard(),
    getModelQualityRankings(),
    getOracleStats(),
  ])

  const hasSpeedData = speedData.length > 0
  const hasQualityData = qualityData.length > 0
  const maxMs = speedData.length > 0 ? speedData[speedData.length - 1].medianMs : 5000

  return (
    <div className="min-h-screen bg-[#070a10] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#192433]/80 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-md flex items-center justify-center">
              <span className="font-display text-[10px] font-black text-[#ff4d6d]">TK</span>
            </div>
            <span className="font-display text-sm font-black text-white tracking-[0.14em]">TOKENOMICON</span>
            <span className="hidden sm:inline text-[10px] text-[#3d8fb5] font-mono tracking-widest border-l border-[#192433] pl-3">LIVE BENCHMARKS</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/arena" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Arena</a>
            <a href="/models" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Models</a>
            <a href="/pricing" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Pricing</a>
            <a href="/sign-in" className="ml-2 px-3 py-1.5 text-xs font-mono bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 text-[#ff4d6d] rounded hover:bg-[#ff4d6d]/20 transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-24 max-w-5xl mx-auto px-6">

        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[10px] font-mono text-[#ff4d6d] uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d6d] animate-pulse" />
              Live data
            </span>
            <span className="text-[10px] font-mono text-[#4a5a6d]">Updates every 60 seconds</span>
          </div>
          <h1 className="font-display text-4xl font-black text-white mb-3">
            AI Model Benchmarks
          </h1>
          <p className="text-[#4a5a6d] max-w-2xl">
            Real performance data collected from live inference calls during gameplay.
            Every number here is from an actual provider API call — no synthetic benchmarks,
            no vendor-supplied numbers.
          </p>
        </div>

        {/* Oracle Stats */}
        <section className="mb-12">
          <h2 className="font-display text-xs font-black tracking-widest text-[#4a5a6d] uppercase mb-4">
            24-hour activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Rounds played"
              value={oracleStats.totalRoundsToday > 0 ? oracleStats.totalRoundsToday.toLocaleString() : '—'}
              sub="last 24 hours"
            />
            <StatCard
              label="Pool hit rate"
              value={oracleStats.totalRoundsToday > 0 ? `${oracleStats.poolHitRate}%` : '—'}
              sub="pre-warmed rounds"
            />
            <StatCard
              label="Cache hit rate"
              value={oracleStats.totalRoundsToday > 0 ? `${oracleStats.cacheHitRate}%` : '—'}
              sub="deduplicated rounds"
            />
            <StatCard
              label="Provider cost"
              value={oracleStats.totalRoundsToday > 0 ? `$${oracleStats.totalCostUsdToday.toFixed(4)}` : '—'}
              sub="USD, live compute only"
            />
          </div>
        </section>

        {/* Speed Leaderboard */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-xl font-black text-white">
              Model Speed Leaderboard
            </h2>
            <span className="text-[10px] font-mono text-[#4a5a6d]">
              Measured: time-to-first-byte on short prompts
            </span>
          </div>

          {!hasSpeedData ? (
            <div className="bg-[#0d1520] border border-[#192433] rounded-lg p-8 text-center">
              <p className="text-[#4a5a6d] font-mono text-sm">
                No speed data yet — play Rate Roulette to generate the first data points.
              </p>
              <a
                href="/games/rate-limit-roulette"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 text-[#ff4d6d] text-xs font-mono rounded hover:bg-[#ff4d6d]/20 transition-colors"
              >
                Play Rate Roulette →
              </a>
            </div>
          ) : (
            <div className="bg-[#0d1520] border border-[#192433] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#192433]">
                    <th className="text-left px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest w-8">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest">Model</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest">Median</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest hidden sm:table-cell">p90</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest hidden md:table-cell">Samples</th>
                    <th className="px-4 py-3 hidden sm:table-cell w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#192433]/50">
                  {speedData.map((entry, idx) => (
                    <tr key={entry.modelId} className="hover:bg-[#192433]/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[#4a5a6d] text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-white">{entry.displayName}</span>
                          <ProviderBadge provider={entry.provider} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-bold ${
                          entry.medianMs < 300 ? 'text-emerald-400'
                          : entry.medianMs < 700 ? 'text-yellow-400'
                          : entry.medianMs < 2000 ? 'text-orange-400'
                          : 'text-red-400'
                        }`}>
                          {entry.medianMs < 1000
                            ? `${entry.medianMs}ms`
                            : `${(entry.medianMs / 1000).toFixed(1)}s`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-xs text-[#4a5a6d]">
                          {entry.p90Ms < 1000
                            ? `${entry.p90Ms}ms`
                            : `${(entry.p90Ms / 1000).toFixed(1)}s`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-mono text-xs text-[#4a5a6d]">{entry.sampleCount}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <SpeedBar ms={entry.medianMs} maxMs={maxMs} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-[#192433] flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#4a5a6d]">
                  Data from Rate Roulette — {speedData.reduce((s, e) => s + e.sampleCount, 0)} total measurements
                </p>
                <a
                  href="/games/rate-limit-roulette"
                  className="text-[10px] font-mono text-[#3d8fb5] hover:text-white transition-colors"
                >
                  Contribute data →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Quality Rankings */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-xl font-black text-white">
              Model Quality Rankings
            </h2>
            <span className="text-[10px] font-mono text-[#4a5a6d]">
              Judged by a neutral LLM on code &amp; explanation tasks
            </span>
          </div>

          {!hasQualityData ? (
            <div className="bg-[#0d1520] border border-[#192433] rounded-lg p-8 text-center">
              <p className="text-[#4a5a6d] font-mono text-sm">
                No quality data yet — play Benchmark Brawl to generate the first data points.
              </p>
              <a
                href="/games/benchmark-brawl"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 text-[#ff4d6d] text-xs font-mono rounded hover:bg-[#ff4d6d]/20 transition-colors"
              >
                Play Benchmark Brawl →
              </a>
            </div>
          ) : (
            <div className="bg-[#0d1520] border border-[#192433] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#192433]">
                    <th className="text-left px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest w-8">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest">Model</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest">Win rate</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono text-[#4a5a6d] uppercase tracking-widest">W / Rounds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#192433]/50">
                  {qualityData.map((entry, idx) => (
                    <tr key={entry.displayName} className="hover:bg-[#192433]/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[#4a5a6d] text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white">{entry.displayName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-bold ${
                          entry.winRate >= 60 ? 'text-emerald-400'
                          : entry.winRate >= 40 ? 'text-yellow-400'
                          : 'text-[#4a5a6d]'
                        }`}>
                          {entry.winRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[#4a5a6d]">
                        {entry.wins} / {entry.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-[#192433] flex items-center justify-between">
                <p className="text-[10px] font-mono text-[#4a5a6d]">
                  Judge: cheapest available fast model. Same judge across all rounds.
                </p>
                <a
                  href="/games/benchmark-brawl"
                  className="text-[10px] font-mono text-[#3d8fb5] hover:text-white transition-colors"
                >
                  Contribute data →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Transparency note */}
        <section>
          <div className="border border-[#192433] rounded-lg p-6 bg-[#0d1520]/50">
            <h3 className="font-display text-sm font-black text-white mb-2">Data methodology</h3>
            <ul className="space-y-1 text-[11px] font-mono text-[#4a5a6d]">
              <li>→ Speed data: wall-clock latency from request dispatch to first token received</li>
              <li>→ All provider calls routed via Tokenomicon's inference proxy — no vendor SDK magic</li>
              <li>→ Judge model for quality rankings: smallest/fastest available model at round time</li>
              <li>→ Cache deduplication: identical prompts share one cached result (not counted twice)</li>
              <li>→ Pre-warmed pool: rounds generated in advance so you never wait on a cold call</li>
              <li>→ Open methodology: <a href="/docs" className="text-[#3d8fb5] hover:text-white transition-colors">read the docs →</a></li>
            </ul>
          </div>
        </section>

      </main>
    </div>
  )
}
