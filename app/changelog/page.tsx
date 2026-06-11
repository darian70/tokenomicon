import type { Metadata } from 'next'
import MarketingShell from '@/components/layout/MarketingShell'

export const metadata: Metadata = {
  title: 'Changelog — Tokenomicon',
  description: 'What\'s new on Tokenomicon — platform updates, new games, new models, and improvements.',
}

type ChangeType = 'new' | 'improved' | 'fixed' | 'model' | 'game'

const TYPE_STYLE: Record<ChangeType, { label: string; color: string }> = {
  new:      { label: 'NEW',      color: '#59f5a9' },
  improved: { label: 'IMPROVED', color: '#5ad8ff' },
  fixed:    { label: 'FIXED',    color: '#ffd700' },
  model:    { label: 'MODEL',    color: '#e879f9' },
  game:     { label: 'GAME',     color: '#ff6b35' },
}

interface Change {
  type: ChangeType
  text: string
}

interface Release {
  version: string
  date: string
  title: string
  summary: string
  changes: Change[]
  highlight?: boolean
}

const RELEASES: Release[] = [
  {
    version: 'v0.9.0',
    date: 'May 21, 2026',
    title: 'Spot the AI + Platform Polish',
    summary: 'Rebuilt Spot the Deepfake as a text-based Turing test — no images needed, actually harder, genuinely interesting. Added Llama 4 Scout via Groq. Fixed stale model references across the platform.',
    highlight: true,
    changes: [
      { type: 'game',     text: 'Spot the AI — rebuilt from scratch as a text Turing test. Four messages: three human, one AI. Three difficulty tiers with progressively subtler tells.' },
      { type: 'game',     text: 'Benchmark Brawl now shows curated model outputs for all 10 scenarios. Previously the game showed model names with no outputs to evaluate — now actually playable.' },
      { type: 'game',     text: 'Prompt Crash — added two-phase reveal animation with crash explosion effect.' },
      { type: 'model',    text: 'Llama 4 Scout added via Groq — ultra-fast inference at 0.11 cr / 1K input tokens.' },
      { type: 'model',    text: 'Mistral Small 3.1 added — 128K context, vision support, 0.10 cr / 1K input.' },
      { type: 'improved', text: 'Rate Roulette now shows provider intel cards (typical latency range, LPU vs GPU note) before you pick. Skill-based, not a coin flip.' },
      { type: 'improved', text: 'Bug Exorcist result screen now shows a WHY THIS WAS THE BUG explanation after every session.' },
      { type: 'improved', text: 'All 9 games now appear in the landing page games grid and the Arena lobby.' },
      { type: 'fixed',    text: 'Fixed tokenomicon.dev → tokenomicon.io across all pages including docs, profile, wallet, and the OpenRouter client headers.' },
      { type: 'fixed',    text: 'OG image rebuilt — was 1024×1024 JPEG, now 1200×630 PNG generated via Next.js ImageResponse with full branding.' },
    ],
  },
  {
    version: 'v0.8.0',
    date: 'May 7, 2026',
    title: 'API Proxy + Provably Fair Backend',
    summary: 'The core API proxy went live — your Tokenomicon key now routes to real provider APIs. All games use commit-reveal for provable fairness.',
    changes: [
      { type: 'new',      text: 'API proxy live at /api/v1 — OpenAI-compatible endpoint routing to all providers.' },
      { type: 'new',      text: 'Provably fair commit-reveal implemented across all games. Server seed hash published before play; seed revealed on settle.' },
      { type: 'new',      text: 'Wallet page — buy credit packs via Stripe, view transaction history, generate API keys.' },
      { type: 'new',      text: 'Playground — browser-based API tester with model switcher and live credit counter.' },
      { type: 'model',    text: 'DeepSeek V3 and R1 added via OpenRouter.' },
      { type: 'model',    text: 'Gemini 2.0 Flash added — 1M context window, very fast, cheap.' },
      { type: 'improved', text: 'Streak bonuses now stack up to 5× — each consecutive win adds 5% to your reward multiplier.' },
      { type: 'improved', text: 'Live win ticker added to arena lobby and games page — shows recent player wins in real time.' },
      { type: 'fixed',    text: 'Context Chicken tier selection was not being sent to the game session — tier is now embedded in challenge hash.' },
    ],
  },
  {
    version: 'v0.7.0',
    date: 'April 23, 2026',
    title: 'Token Mines + Daily Challenges',
    summary: 'Added Token Mines — our Minesweeper-inspired multiplier game. Daily challenge rotation with 2× bonus rewards. Rate Roulette now uses real provider latency data.',
    changes: [
      { type: 'game',     text: 'Token Mines — 5×5 grid, pick safe cells to compound your multiplier. Cash out any time or keep digging.' },
      { type: 'new',      text: 'Daily Challenge — one featured game per day with a 2× bonus compute reward for winners.' },
      { type: 'new',      text: 'Leaderboard — global rankings by total bonus compute earned, with streak display.' },
      { type: 'improved', text: 'Rate Roulette latency values now sourced from a real 7-day rolling average of provider response times.' },
      { type: 'improved', text: 'Mobile sidebar navigation — full responsive layout with drawer overlay.' },
      { type: 'model',    text: 'Llama 3.3 70B added via Groq — fastest 70B inference available.' },
      { type: 'fixed',    text: 'Token Prophet score calculation was not accounting for negative guesses — clamped to 0.' },
    ],
  },
  {
    version: 'v0.6.0',
    date: 'April 9, 2026',
    title: 'Arena v1 — All 7 Core Games',
    summary: 'First complete Arena build with all seven original games. Clerk auth, Supabase backend, credit balance system.',
    changes: [
      { type: 'new',      text: 'Token Prophet, Prompt Golf, Bug Exorcist, Context Chicken, Rate Roulette, Benchmark Brawl, and Prompt Crash all live.' },
      { type: 'new',      text: 'Clerk authentication — sign in with email or OAuth.' },
      { type: 'new',      text: 'Supabase backend — game sessions, user balances, and leaderboard data.' },
      { type: 'new',      text: '100 free arena credits issued daily to every account at midnight UTC.' },
      { type: 'new',      text: 'Three difficulty tiers per game: Sandbox (15 cr), Production (30 cr), Blackbox (60 cr).' },
      { type: 'model',    text: 'Launch lineup: GPT-4o, GPT-4o mini, Claude Sonnet 4, Claude 3.5 Haiku, Gemini 1.5 Pro, Llama 3.3 70B, Mixtral 8×7B, Mistral Large.' },
    ],
  },
]

export default function ChangelogPage() {
  return (
    <MarketingShell>
      {/* Header */}
      <section className="pt-16 pb-12 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(#5ad8ff 1px, transparent 1px), linear-gradient(90deg, #5ad8ff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-4">CHANGELOG</p>
          <h1 className="font-display text-5xl font-black text-white tracking-wide mb-4">
            What&apos;s new.
          </h1>
          <p className="text-[#6b7a8d] font-mono text-sm leading-relaxed">
            Platform updates, new games, new models. Shipped fast, shipped often.
          </p>
        </div>
      </section>

      {/* Releases */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#192433]" />

          <div className="space-y-16">
            {RELEASES.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    release.highlight
                      ? 'border-[#ff4d6d] bg-[#ff4d6d]/20'
                      : 'border-[#2a3a50] bg-[#080d14]'
                  }`}
                />

                {/* Release header */}
                <div className="mb-5">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span
                      className="font-display text-xs font-black tracking-widest"
                      style={{ color: release.highlight ? '#ff4d6d' : '#5ad8ff' }}
                    >
                      {release.version}
                    </span>
                    <span className="text-[10px] font-mono text-[#3a4a5a]">{release.date}</span>
                    {release.highlight && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#59f5a9]/30 text-[#59f5a9] bg-[#59f5a9]/5 tracking-wider">
                        LATEST
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-black text-white tracking-wide">{release.title}</h2>
                  <p className="text-xs text-[#4a5a6d] font-mono mt-2 leading-relaxed">{release.summary}</p>
                </div>

                {/* Changes */}
                <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                  <div className="divide-y divide-[#0f1520]">
                    {release.changes.map((change, i) => {
                      const style = TYPE_STYLE[change.type]
                      return (
                        <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded flex-shrink-0 mt-0.5 tracking-wider font-bold"
                            style={{
                              color: style.color,
                              backgroundColor: `${style.color}12`,
                              border: `1px solid ${style.color}30`,
                            }}
                          >
                            {style.label}
                          </span>
                          <p className="text-xs font-mono text-[#6b7a8d] leading-relaxed">{change.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
