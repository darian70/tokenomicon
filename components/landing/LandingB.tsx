// Persona B landing — inference benchmarking nerds.
// Angle: real latency/quality data from live API calls, not vendor numbers.
// The games are framed as "you generate the data" rather than "earn credits."

import { SignInCtaPrimary, SignInCtaNav } from '@/components/landing/SignInCta'
import { LandingFooter } from '@/components/landing/LandingA'
import { db } from '@/lib/server/db'

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

type LatencyEntry = {
  modelId: string
  displayName: string
  totalMs: number
  error?: boolean
}

type RateTruth = {
  modelLatencies?: LatencyEntry[]
}

type SpeedRow = {
  model: string
  medianMs: number
  p90Ms: number
  samples: number
}

// Sample data shown before any oracle rounds have been played.
const STATIC_SPEED_DATA: SpeedRow[] = [
  { model: 'gemma2-9b-it (Groq)',       medianMs: 198,  p90Ms: 312,  samples: 0 },
  { model: 'llama-3.3-70b (Groq)',      medianMs: 287,  p90Ms: 441,  samples: 0 },
  { model: 'gpt-4o-mini',               medianMs: 623,  p90Ms: 891,  samples: 0 },
  { model: 'claude-3-5-haiku',          medianMs: 789,  p90Ms: 1180, samples: 0 },
  { model: 'gpt-4o',                    medianMs: 1342, p90Ms: 2100, samples: 0 },
  { model: 'gemini-2.5-pro',            medianMs: 1890, p90Ms: 3200, samples: 0 },
]

async function getSpeedPreview(): Promise<{ rows: SpeedRow[]; isLive: boolean }> {
  try {
    const entries = await db.oracleCacheEntry.findMany({
      where: { game: 'rate_limit_roulette', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { groundTruth: true },
    })

    if (entries.length === 0) {
      return { rows: STATIC_SPEED_DATA, isLive: false }
    }

    // Aggregate per-model latencies across all cached rounds
    const latenciesByModel = new Map<string, number[]>()
    for (const entry of entries) {
      const truth = entry.groundTruth as RateTruth
      for (const l of truth.modelLatencies ?? []) {
        if (!l.error && l.totalMs > 0) {
          const key = l.displayName || l.modelId
          if (!latenciesByModel.has(key)) latenciesByModel.set(key, [])
          latenciesByModel.get(key)!.push(l.totalMs)
        }
      }
    }

    const rows: SpeedRow[] = []
    for (const [model, latencies] of latenciesByModel) {
      if (latencies.length < 2) continue  // need at least 2 samples
      const sorted = [...latencies].sort((a, b) => a - b)
      const medianMs = sorted[Math.floor(sorted.length / 2)]
      const p90Ms = sorted[Math.floor(sorted.length * 0.9)]
      rows.push({ model, medianMs, p90Ms, samples: latencies.length })
    }

    if (rows.length === 0) {
      return { rows: STATIC_SPEED_DATA, isLive: false }
    }

    rows.sort((a, b) => a.medianMs - b.medianMs)
    return { rows: rows.slice(0, 6), isLive: true }
  } catch {
    // DB unavailable at build time — show static sample
    return { rows: STATIC_SPEED_DATA, isLive: false }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default async function LandingB() {
  const { rows: speedRows, isLive } = await getSpeedPreview()
  const maxMs = Math.max(...speedRows.map((r) => r.p90Ms), 1)

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
            <span className="hidden sm:inline text-[10px] text-[#3d8fb5] font-mono tracking-widest border-l border-[#192433] pl-3">INFERENCE LAB</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/benchmarks" className="hidden sm:inline text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors px-3 py-1.5 border border-[#5ad8ff]/20 rounded-sm">
              Live Benchmarks
            </a>
            <a href="/models" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Models</a>
            <a href="/pricing" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Pricing</a>
            <a href="/docs" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Docs</a>
            <SignInCtaNav />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(#5ad8ff 1px, transparent 1px), linear-gradient(90deg, #5ad8ff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[420px] bg-[#5ad8ff]/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#5ad8ff]/25 bg-[#5ad8ff]/5 text-[10px] font-mono text-[#5ad8ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5ad8ff] animate-pulse" />
            Oracle fires every 5 min · 15+ models tested live
          </div>

          <h1 className="font-display text-5xl lg:text-8xl font-black tracking-[0.05em] leading-none">
            <span className="text-white">REAL</span>
            <span className="text-[#5ad8ff]" style={{ textShadow: '0 0 60px rgba(90,216,255,0.35)' }}> AI</span>
            <br />
            <span className="text-white">BENCHMARKS</span>
          </h1>

          <p className="text-lg lg:text-xl text-[#6b7a8d] font-mono max-w-2xl mx-auto leading-relaxed">
            Latency, throughput, and quality rankings from actual API calls —<br />
            not vendor-supplied numbers, not synthetic test suites.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/benchmarks"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-sm font-display text-sm tracking-[0.15em] bg-[#5ad8ff] text-[#070a10] hover:bg-[#7ae4ff] transition-all"
            >
              VIEW LIVE BENCHMARKS
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <SignInCtaPrimary label="GET 100 FREE CREDITS" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 pt-4 border-t border-[#192433]">
            <HeroBadge value="15+" label="models tested" color="#5ad8ff" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <HeroBadge value="5 min" label="refresh interval" color="#59f5a9" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <HeroBadge value="100%" label="public data" color="#ffd700" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <HeroBadge value="$0" label="to view or contribute" color="#a78bfa" />
          </div>
        </div>
      </section>

      {/* Speed preview */}
      <section className="py-16 px-6 bg-[#080d14] border-y border-[#192433]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <SectionLabel text="SPEED LEADERBOARD" />
              <h2 className="font-display text-2xl font-black text-white tracking-wide mt-2">
                First-token latency by model
              </h2>
              <p className="text-xs font-mono text-[#4a5a6d] mt-1">
                {isLive
                  ? 'Live data from oracle rounds — updates every 5 minutes'
                  : 'Sample data — live results appear after first oracle rounds are played'}
              </p>
            </div>
            <a href="/benchmarks" className="text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors hidden sm:inline">
              Full leaderboard →
            </a>
          </div>

          <div className="space-y-3">
            {speedRows.map((row, i) => (
              <SpeedRow key={row.model} row={row} rank={i + 1} maxMs={maxMs} />
            ))}
          </div>

          {!isLive && (
            <p className="text-[10px] font-mono text-[#3a4a5a] mt-4 text-center">
              Sample data for illustration. Sign up and play Rate Roulette to generate real data.
            </p>
          )}
        </div>
      </section>

      {/* How the data works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionLabel text="HOW THE DATA IS COLLECTED" />
          <h2 className="font-display text-2xl font-black text-white tracking-wide mt-2 mb-10">
            No vendor numbers. No synthetic tests.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <DataCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5ad8ff" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              }
              color="#5ad8ff"
              title="Live Oracle Calls"
              desc="Every 5 minutes, our oracle fires real prompts at 15+ models simultaneously and records wall-clock latency and output tokens. No mocking. No caching the result before you see it."
            />
            <DataCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
              color="#59f5a9"
              title="Player Verification"
              desc="Developers play skill games that require predicting model behavior: which model responds fastest, which output is highest quality. Each round is an independent verification data point."
            />
            <DataCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
              }
              color="#ffd700"
              title="Fully Public"
              desc="Every data point is published at /benchmarks with per-model, per-provider, per-prompt granularity. The raw numbers are yours — link to them, cite them, build on them."
            />
          </div>
        </div>
      </section>

      {/* Benchmark games */}
      <section className="py-16 px-6 bg-[#080d14] border-y border-[#192433]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel text="THE GAMES" />
              <h2 className="font-display text-2xl font-black text-white tracking-wide mt-2">
                Play games. Generate data. Earn compute.
              </h2>
            </div>
            <a href="/games" className="text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors hidden sm:inline">
              All 9 games →
            </a>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <BenchGameCard
              accent="#38bdf8"
              tag="Latency"
              name="Rate Roulette"
              desc="Three providers race to respond to the same prompt. Predict the winner. Know your LPUs from your GPUs — each correct pick feeds the speed leaderboard."
              data="Feeds: Speed rankings"
              href="/games"
            />
            <BenchGameCard
              accent="#fb923c"
              tag="Quality"
              name="Benchmark Brawl"
              desc="Three flagship models tackle the same coding or reasoning task. Read all three outputs and judge which is best. Your picks calibrate the quality rankings."
              data="Feeds: Quality rankings"
              href="/games"
            />
            <BenchGameCard
              accent="#a78bfa"
              tag="Throughput"
              name="Token Prophet"
              desc="Given two prompts, predict which generates more tokens. Your accuracy reflects understanding of how prompt structure affects token density — real throughput data."
              data="Feeds: Throughput data"
              href="/games"
            />
          </div>
        </div>
      </section>

      {/* API section — brief, technical */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <SectionLabel text="ALSO: A CHEAPER API PROXY" />
            <h2 className="font-display text-3xl font-black text-white tracking-wide leading-tight">
              The credits you earn<br />
              <span className="text-[#5ad8ff]">pay for real API calls.</span>
            </h2>
            <p className="text-[#6b7a8d] font-mono text-sm leading-relaxed">
              Every model you benchmark is available through a single OpenAI-compatible endpoint.
              Credits won in games reduce your API bill — and our semantic cache cuts costs
              another 30–70% on repetitive workloads.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat label="cheaper than OpenAI direct" value="2.5×" color="#59f5a9" />
              <MiniStat label="semantic cache savings" value="30–70%" color="#5ad8ff" />
            </div>
            <a href="/docs" className="inline-block text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors border-b border-[#5ad8ff]/30 pb-0.5">
              Read the API docs →
            </a>
          </div>
          <div className="rounded-xl border border-[#1a2535] bg-[#070a10] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#192433]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff4d6d]/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffd700]/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#59f5a9]/40" />
              <span className="ml-2 text-[10px] font-mono text-[#3a4a5a]">integration.py</span>
            </div>
            <pre className="p-5 text-[12px] font-mono leading-relaxed overflow-x-auto">
              <code>
                <span className="text-[#4a5a6d]"># Drop-in OpenAI replacement{'\n'}</span>
                <span className="text-[#6e9bff]">from</span>
                <span className="text-white"> openai </span>
                <span className="text-[#6e9bff]">import</span>
                <span className="text-white"> OpenAI{'\n\n'}</span>
                <span className="text-white">client = OpenAI({'\n'}</span>
                <span className="text-white">    api_key=</span>
                <span className="text-[#59f5a9]">&quot;tok-your-key&quot;</span>
                <span className="text-white">,{'\n'}</span>
                <span className="text-white">    base_url=</span>
                <span className="text-[#59f5a9]">&quot;https://tokenomicon.io/api/v1&quot;</span>
                <span className="text-white">{'\n'}){'\n\n'}</span>
                <span className="text-[#4a5a6d]"># Same SDK — any model, one key{'\n'}</span>
                <span className="text-white">resp = client.chat.completions.create({'\n'}</span>
                <span className="text-white">    model=</span>
                <span className="text-[#59f5a9]">&quot;gpt-4o&quot;</span>
                <span className="text-white">,  </span>
                <span className="text-[#4a5a6d]"># or claude-sonnet, gemini...</span>
                <span className="text-white">{'\n'}    messages=[...]</span>
                <span className="text-white">{'\n'})</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden bg-[#080d14] border-y border-[#192433]">
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #5ad8ff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#5ad8ff]/25 bg-[#5ad8ff]/5 text-[10px] font-mono text-[#5ad8ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5ad8ff] animate-pulse" />
            {isLive ? 'Live data available now' : 'Oracle warming up — be the first to play'}
          </div>
          <h2 className="font-display text-4xl lg:text-6xl font-black text-white tracking-wide">
            See the numbers.
          </h2>
          <p className="text-[#6b7a8d] font-mono text-sm leading-relaxed">
            Every model. Real latency. Updated live.<br />
            No sign-up required to view. Sign up to play and contribute data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/benchmarks"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-sm font-display text-sm tracking-[0.15em] bg-[#5ad8ff] text-[#070a10] hover:bg-[#7ae4ff] transition-all"
            >
              VIEW LIVE BENCHMARKS
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <SignInCtaPrimary label="GET FREE CREDITS" />
          </div>
          <p className="text-[10px] font-mono text-[#3a4a5a]">100 free arena credits daily · No credit card required</p>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper components (all at module level — rerender-no-inline-components)
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a]">{text}</p>
}

function HeroBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono text-[#4a5a6d]">{label}</p>
    </div>
  )
}

function latencyColor(ms: number): string {
  if (ms < 300)  return '#59f5a9'
  if (ms < 700)  return '#a8f59a'
  if (ms < 2000) return '#ffd700'
  return '#fb923c'
}

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}

function SpeedRow({ row, rank, maxMs }: { row: SpeedRow; rank: number; maxMs: number }) {
  const color = latencyColor(row.medianMs)
  const barPct = Math.max(4, Math.round((row.p90Ms / maxMs) * 100))

  return (
    <div className="rounded-lg border border-[#192433] bg-[#0c111a] px-5 py-4 flex items-center gap-4">
      <span className="font-display text-xs font-black text-[#3a4a5a] w-5 shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-sm text-white truncate pr-4">{row.model}</span>
          <span className="font-mono text-sm font-bold shrink-0" style={{ color }}>{fmt(row.medianMs)}</span>
        </div>
        <div className="h-1.5 w-full bg-[#192433] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.7 }}
          />
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[10px] font-mono text-[#4a5a6d]">p90</p>
        <p className="text-xs font-mono text-[#6b7a8d]">{fmt(row.p90Ms)}</p>
      </div>
      {row.samples > 0 && (
        <div className="text-right shrink-0 hidden md:block">
          <p className="text-[10px] font-mono text-[#3a4a5a]">n={row.samples}</p>
        </div>
      )}
    </div>
  )
}

function DataCard({ icon, color, title, desc }: {
  icon: React.ReactNode; color: string; title: string; desc: string
}) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-6 flex flex-col gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center border"
        style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
        {icon}
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-white tracking-wider mb-2">{title}</h3>
        <p className="text-xs text-[#4a5a6d] font-mono leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function BenchGameCard({ accent, tag, name, desc, data, href }: {
  accent: string; tag: string; name: string; desc: string; data: string; href: string
}) {
  return (
    <a href={href}
      className="rounded-xl border bg-[#0c111a] p-5 flex flex-col gap-3 hover:bg-[#0f1822] transition-all block"
      style={{ borderColor: `${accent}25` }}>
      <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
      <div>
        <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: accent }}>{tag.toUpperCase()}</p>
        <h3 className="font-display text-sm font-bold text-white tracking-wider">{name}</h3>
      </div>
      <p className="text-xs text-[#4a5a6d] font-mono leading-relaxed flex-1">{desc}</p>
      <p className="text-[10px] font-mono" style={{ color: accent }}>{data}</p>
    </a>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#192433] bg-[#070a10] p-3">
      <p className="font-display text-lg font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">{label}</p>
    </div>
  )
}
