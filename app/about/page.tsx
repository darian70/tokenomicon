import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingShell from '@/components/layout/MarketingShell'

export const metadata: Metadata = {
  title: 'About — Tokenomicon',
  description: 'What is Tokenomicon, why we built it, and how provably fair gaming works.',
}

const PRINCIPLES = [
  {
    icon: '⚡',
    title: 'Skill, not luck',
    color: '#ffd700',
    desc: 'Every game tests real developer knowledge — token counts, provider latency, model capabilities, debugging. The better you know the AI ecosystem, the more you earn. No random number generators deciding your fate.',
  },
  {
    icon: '🔓',
    title: 'Provably fair',
    color: '#59f5a9',
    desc: "Before each game starts, the server commits to a hash of the secret seed. After the game, the seed is revealed. You can verify that the challenge wasn't generated after you made your pick. Open math, no trust required.",
  },
  {
    icon: '🗝️',
    title: 'One key, every model',
    color: '#5ad8ff',
    desc: 'The API proxy is the core product. We normalize every major LLM provider into one OpenAI-compatible endpoint. Change one string in your code and you can benchmark GPT-4o against Claude Sonnet against Llama — no extra accounts, no extra keys.',
  },
  {
    icon: '🚫',
    title: 'No crypto. No nonsense.',
    color: '#ff4d6d',
    desc: 'Credits are a utility, not a financial instrument. They have no cash value. You cannot sell them, trade them, or redeem them. We built this to make AI access cheaper for developers — not to create a speculative token.',
  },
]

const STACK = [
  { name: 'Next.js 15', desc: 'App Router, Server Components, Edge runtime', color: '#a8b8cc' },
  { name: 'Supabase', desc: 'Game sessions, user balances, leaderboard data', color: '#3ecf8e' },
  { name: 'Clerk', desc: 'Authentication — email, GitHub, Google', color: '#6c47ff' },
  { name: 'Stripe', desc: 'Payments and subscription billing', color: '#635bff' },
  { name: 'OpenRouter', desc: 'API routing to Anthropic, Google, Mistral, DeepSeek', color: '#e879f9' },
  { name: 'Vercel', desc: 'Hosting, edge functions, CDN', color: '#ffffff' },
]

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="pt-16 pb-16 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ff4d6d 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-4">ABOUT</p>
          <h1 className="font-display text-5xl lg:text-6xl font-black text-white tracking-wide mb-6">
            AI access shouldn&apos;t<br />
            require a <span className="text-[#ff4d6d]" style={{ textShadow: '0 0 40px rgba(255,77,109,0.35)' }}>corporate card.</span>
          </h1>
          <p className="text-[#6b7a8d] font-mono text-base leading-relaxed max-w-2xl">
            Tokenomicon started as a question: what if you could earn compute credits by being good at understanding AI?
            Not by paying more. Not by subscribing to ten different services. Just by knowing your craft.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#192433] bg-[#0c111a] p-8">
          <h2 className="font-display text-xs tracking-[0.2em] text-[#4a5a6d] mb-5 uppercase">The Problem We Saw</h2>
          <div className="space-y-4 text-sm font-mono text-[#6b7a8d] leading-relaxed">
            <p>
              Every serious developer working with AI ends up in the same situation: six different API keys, six different billing portals, six different rate limits to manage. You want to compare GPT-4o against Claude Sonnet on a real task, and suddenly you&apos;re doing accounting instead of building.
            </p>
            <p>
              Meanwhile, the people who understand these models best — who know which provider has the fastest latency for short prompts, which model handles edge cases better, which context window actually matters — that knowledge has no value in the existing ecosystem. Everyone pays the same rate regardless of expertise.
            </p>
            <p className="text-[#a8b8cc]">
              We thought that was backwards. Knowledge should be worth something.
            </p>
          </div>
        </div>
      </section>

      {/* What we built */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">WHAT WE BUILT</p>
          <h2 className="font-display text-3xl font-black text-white tracking-wide">Two products in one.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#5ad8ff]/20 bg-[#0a1828] p-8">
            <div className="w-10 h-10 rounded-xl bg-[#5ad8ff]/10 border border-[#5ad8ff]/20 flex items-center justify-center mb-5">
              <span className="text-xl">🗝️</span>
            </div>
            <h3 className="font-display text-lg font-black text-white tracking-wide mb-3">The API Proxy</h3>
            <p className="text-xs font-mono text-[#4a5a6d] leading-relaxed">
              A single OpenAI-compatible endpoint that routes to GPT-4o, Claude Sonnet, Gemini Flash, Llama, Mistral, DeepSeek, and more. One key. One base URL. One billing portal. Your credits are debited per-token at transparent rates — no markup opacity, no hidden conversion fees.
            </p>
            <Link href="/docs" className="inline-block mt-5 text-[10px] font-mono text-[#5ad8ff] hover:text-white transition-colors">
              Read the API docs →
            </Link>
          </div>
          <div className="rounded-2xl border border-[#ff4d6d]/20 bg-[#180810] p-8">
            <div className="w-10 h-10 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 flex items-center justify-center mb-5">
              <span className="text-xl">🎮</span>
            </div>
            <h3 className="font-display text-lg font-black text-white tracking-wide mb-3">The Arena</h3>
            <p className="text-xs font-mono text-[#4a5a6d] leading-relaxed">
              Nine skill games that test developer knowledge of the AI ecosystem. Every game has three difficulty tiers. Win and earn bonus compute credits applied directly to your API balance. Lose and get a partial refund. Build a win streak for a multiplier bonus. The daily cap is 2,000 bonus credits — meaningful free compute for anyone who knows their stuff.
            </p>
            <Link href="/games" className="inline-block mt-5 text-[10px] font-mono text-[#ff4d6d] hover:text-white transition-colors">
              See the games →
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">PRINCIPLES</p>
          <h2 className="font-display text-3xl font-black text-white tracking-wide">How we operate.</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-xl border border-[#192433] bg-[#0c111a] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{p.icon}</span>
                <h3 className="font-display text-sm font-black text-white tracking-wider" style={{ color: p.color }}>
                  {p.title.toUpperCase()}
                </h3>
              </div>
              <p className="text-xs font-mono text-[#4a5a6d] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provably fair explainer */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#59f5a9]/20 bg-[#081a10] p-8">
          <h2 className="font-display text-sm font-black tracking-[0.2em] text-[#59f5a9] mb-1">PROVABLY FAIR GAMING</h2>
          <h3 className="font-display text-xl font-black text-white tracking-wide mb-5">The math, not the promise.</h3>
          <div className="space-y-5">
            <Step n="1" color="#59f5a9" title="Server commits to a seed">
              Before your game session starts, the server generates a random seed and sends you{' '}
              <span className="text-[#59f5a9]">SHA-256(serverSeed + clientSeed + nonce)</span>. You can see this hash before you make any decisions.
            </Step>
            <Step n="2" color="#5ad8ff" title="You play">
              The actual challenge is generated deterministically from the seed you already have a commitment to. The server cannot change the answer after you pick.
            </Step>
            <Step n="3" color="#ffd700" title="Server reveals the seed">
              After you submit, the raw server seed is revealed. You can run the same hash yourself and verify it matches the commitment you received in step 1.
            </Step>
            <Step n="4" color="#a78bfa" title="You verify">
              Hash <code className="text-[#a78bfa] text-[10px]">SHA-256(serverSeed + clientSeed + nonce)</code> yourself. If it matches what you were shown before the game — the round was fair.
            </Step>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">BUILT WITH</p>
          <h2 className="font-display text-2xl font-black text-white tracking-wide">The stack.</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {STACK.map((s) => (
            <div key={s.name} className="flex items-start gap-3 rounded-xl border border-[#192433] bg-[#0c111a] px-4 py-3.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: s.color }} />
              <div>
                <p className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.name}</p>
                <p className="text-[11px] font-mono text-[#4a5a6d] mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 pb-8 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#192433] bg-[#0c111a] p-8 text-center">
          <h2 className="font-display text-xl font-black text-white tracking-wide mb-2">Get in touch.</h2>
          <p className="text-xs text-[#4a5a6d] font-mono mb-6">
            Questions, feedback, bug reports, or security disclosures — we read everything.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs font-mono">
            <div>
              <p className="text-[10px] tracking-widest text-[#3a4a5a] mb-1">GENERAL</p>
              <p className="text-[#5ad8ff]">support@tokenomicon.io</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-[#192433]" />
            <div>
              <p className="text-[10px] tracking-widest text-[#3a4a5a] mb-1">SECURITY</p>
              <p className="text-[#ff4d6d]">security@tokenomicon.io</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-[#192433]" />
            <div>
              <p className="text-[10px] tracking-widest text-[#3a4a5a] mb-1">RESPONSE</p>
              <p className="text-[#59f5a9]">&lt; 24 hours</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

function Step({ n, color, title, children }: { n: string; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-display font-black border mt-0.5"
        style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
      >
        {n}
      </div>
      <div>
        <p className="text-xs font-display font-bold tracking-wider text-white mb-1">{title}</p>
        <p className="text-xs font-mono text-[#4a5a6d] leading-relaxed">{children}</p>
      </div>
    </div>
  )
}
