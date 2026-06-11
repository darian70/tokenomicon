import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingShell from '@/components/layout/MarketingShell'

export const metadata: Metadata = {
  title: 'Pricing — Tokenomicon',
  description: 'Simple, transparent pricing. Buy compute credits or subscribe monthly. 100 free arena credits every day — no purchase required.',
}

const ONE_TIME_PACKS = [
  {
    name: 'Starter',
    price: '$10',
    credits: 10_000,
    usdPer1k: 1.00,
    detail: 'Try every model',
    color: '#6e9bff',
    features: [
      '10,000 compute credits',
      '~3.3M GPT-4o mini tokens',
      '~1.6M Claude Haiku tokens',
      'All 15+ AI models',
      '1 API key',
      'No expiry',
    ],
  },
  {
    name: 'Builder',
    price: '$49',
    credits: 55_000,
    usdPer1k: 0.89,
    detail: 'Most popular',
    highlight: true,
    color: '#5ad8ff',
    features: [
      '55,000 compute credits',
      '~18M GPT-4o mini tokens',
      '~8.5M Claude Haiku tokens',
      'All 15+ AI models',
      'Unlimited API keys',
      'No expiry',
    ],
  },
  {
    name: 'Pro Pack',
    price: '$99',
    credits: 120_000,
    usdPer1k: 0.83,
    detail: 'Best per-credit rate',
    color: '#a78bfa',
    features: [
      '120,000 compute credits',
      '~40M GPT-4o mini tokens',
      '~18M Claude Haiku tokens',
      'All 15+ AI models',
      'Unlimited API keys',
      'No expiry',
    ],
  },
]

const MONTHLY_PLANS = [
  {
    name: 'Dev',
    price: '$15',
    credits: 20_000,
    perCredit: '0.75',
    color: '#5ad8ff',
    features: [
      '20,000 credits / month',
      '~6.6M GPT-4o mini tokens',
      'All 15+ AI models',
      '1 API key',
      '100 daily arena credits',
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    credits: 75_000,
    perCredit: '0.65',
    highlight: true,
    color: '#59f5a9',
    features: [
      '75,000 credits / month',
      '~25M GPT-4o mini tokens',
      'All 15+ AI models',
      'Unlimited API keys',
      '100 daily arena credits',
      'Priority support',
    ],
  },
]

const FAQS = [
  {
    q: 'What is a compute credit?',
    a: 'Compute credits are the unit of account for API usage on Tokenomicon. Every API call deducts credits based on the model and token count. 1,000 credits ≈ $0.65–1.00 of AI API costs depending on your plan.',
  },
  {
    q: 'Do credits expire?',
    a: 'One-time pack credits never expire. Monthly subscription credits reset each billing cycle — unused credits do not roll over. The 100 free daily arena credits reset every midnight UTC.',
  },
  {
    q: 'Can I mix one-time packs and a subscription?',
    a: "Yes. If you have both, bonus compute from games is used first, then purchased compute from one-time packs, then your subscription's monthly credits. You're always spending the cheapest bucket first.",
  },
  {
    q: 'What counts toward the API?',
    a: 'All /api/v1/chat/completions calls using your Tokenomicon API key. Playground calls, game sessions, and internal platform operations are free and do not deduct credits.',
  },
  {
    q: 'Can I earn free credits without buying?',
    a: 'Yes. Every account receives 100 free arena credits per day. Play the 9 skill games in the Arena to earn bonus compute credits on top — up to 2,000 extra per day.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. No crypto accepted.',
  },
]

const COMPARISON = [
  { feature: 'Daily free arena credits', free: '100 cr', starter: '100 cr', dev: '100 cr', pro: '100 cr' },
  { feature: 'Access to all models', free: '✓', starter: '✓', dev: '✓', pro: '✓' },
  { feature: 'API keys', free: '1', starter: '1', dev: '1', pro: 'Unlimited' },
  { feature: 'Bonus compute cap / day', free: '2,000 cr', starter: '2,000 cr', dev: '2,000 cr', pro: '2,000 cr' },
  { feature: 'Purchased compute', free: '—', starter: '10K one-time', dev: '20K/mo', pro: '75K/mo' },
  { feature: 'Credit expiry', free: 'Daily reset', starter: 'Never', dev: 'Monthly reset', pro: 'Monthly reset' },
  { feature: 'Priority support', free: '—', starter: '—', dev: '—', pro: '✓' },
]

export default function PricingPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="pt-16 pb-12 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#5ad8ff 1px, transparent 1px), linear-gradient(90deg, #5ad8ff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#59f5a9]/20 bg-[#59f5a9]/5 text-[10px] font-mono text-[#59f5a9] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
            100 free credits every single day — no card required
          </div>
          <h1 className="font-display text-5xl lg:text-7xl font-black text-white tracking-wide mb-4">
            Simple pricing.<br />
            <span className="text-[#ff4d6d]" style={{ textShadow: '0 0 40px rgba(255,77,109,0.4)' }}>No surprises.</span>
          </h1>
          <p className="text-[#6b7a8d] font-mono text-base leading-relaxed max-w-xl mx-auto">
            Buy credits once and they never expire, or subscribe monthly for a lower per-credit rate.
            Either way, you keep earning free compute through skill games every day.
          </p>
        </div>
      </section>

      {/* One-time packs */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">ONE-TIME</p>
          <h2 className="font-display text-2xl font-black text-white tracking-wide">Credit Packs</h2>
          <p className="text-xs text-[#4a5a6d] font-mono mt-2">Buy once. Use forever. Credits never expire.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {ONE_TIME_PACKS.map((plan) => (
            <PriceCard key={plan.name} {...plan} />
          ))}
        </div>
      </section>

      {/* Monthly subscriptions */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">MONTHLY</p>
          <h2 className="font-display text-2xl font-black text-white tracking-wide">Subscriptions</h2>
          <p className="text-xs text-[#4a5a6d] font-mono mt-2">Lower per-credit rate. Cancel any time.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {MONTHLY_PLANS.map((plan) => (
            <SubCard key={plan.name} {...plan} />
          ))}
        </div>
      </section>

      {/* Free tier callout */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-[#59f5a9]/20 bg-gradient-to-br from-[#081a10] to-[#070a10] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#59f5a9]/30 text-[#59f5a9] bg-[#59f5a9]/5 tracking-wider">FREE FOREVER</span>
            </div>
            <h3 className="font-display text-xl font-black text-white tracking-wide">Play every day for free.</h3>
            <p className="text-xs text-[#4a5a6d] font-mono mt-2 max-w-lg leading-relaxed">
              100 arena credits land in your account every day at midnight UTC. No card, no trial, no strings.
              Use them to play the 9 skill games and earn bonus compute on top. The daily cap for bonus earnings is 2,000 cr.
            </p>
          </div>
          <Link
            href="/arena"
            className="flex-shrink-0 px-8 py-4 bg-[#59f5a9]/10 border border-[#59f5a9]/30 text-[#59f5a9] font-display text-sm tracking-[0.15em] rounded-xl hover:bg-[#59f5a9]/20 transition-all whitespace-nowrap"
          >
            START FREE
          </Link>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">COMPARE</p>
          <h2 className="font-display text-2xl font-black text-white tracking-wide">Plan comparison</h2>
        </div>

        <div className="rounded-xl border border-[#192433] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#192433] bg-[#0c111a]">
                  <th className="text-left px-5 py-4 text-[#4a5a6d] font-normal tracking-wider w-1/3">Feature</th>
                  <th className="text-center px-4 py-4 text-[#4a5a6d] font-normal tracking-wider">Free</th>
                  <th className="text-center px-4 py-4 text-[#6e9bff] font-normal tracking-wider">Starter</th>
                  <th className="text-center px-4 py-4 text-[#5ad8ff] font-normal tracking-wider">Dev Monthly</th>
                  <th className="text-center px-4 py-4 text-[#59f5a9] font-normal tracking-wider">Pro Monthly</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[#0f1520] ${i % 2 === 0 ? 'bg-[#080d14]' : 'bg-[#0a1018]'}`}
                  >
                    <td className="px-5 py-3.5 text-[#6b7a8d]">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center text-[#4a5a6d]">{row.free}</td>
                    <td className="px-4 py-3.5 text-center text-[#6e9bff]">{row.starter}</td>
                    <td className="px-4 py-3.5 text-center text-[#5ad8ff]">{row.dev}</td>
                    <td className="px-4 py-3.5 text-center text-[#59f5a9]">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">FAQ</p>
          <h2 className="font-display text-2xl font-black text-white tracking-wide">Common questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-mono text-[#a8b8cc] hover:text-white transition-colors list-none">
                <span>{item.q}</span>
                <span className="text-[#4a5a6d] group-open:rotate-90 transition-transform duration-200 text-xs flex-shrink-0 ml-4">▸</span>
              </summary>
              <div className="px-5 pb-4 text-xs text-[#6b7a8d] font-mono leading-relaxed border-t border-[#192433] pt-3">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-8 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-display text-4xl font-black text-white tracking-wide">Start earning free compute today.</h2>
          <p className="text-xs text-[#4a5a6d] font-mono">Create your account. Get 100 arena credits. Play games. Use the API.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/arena"
              className="px-8 py-4 bg-[#ff4d6d] text-white font-display text-sm tracking-[0.15em] rounded-xl hover:bg-[#ff6b84] hover:shadow-[0_0_30px_rgba(255,77,109,0.4)] transition-all"
            >
              PLAY FOR FREE
            </Link>
            <Link href="/models" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors">
              View all models →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

function PriceCard({
  name, price, credits, usdPer1k, detail, features, highlight, color,
}: {
  name: string; price: string; credits: number; usdPer1k: number
  detail: string; features: string[]; highlight?: boolean; color: string
}) {
  return (
    <div
      className={`rounded-2xl border p-7 flex flex-col gap-6 relative overflow-hidden transition-transform hover:-translate-y-0.5 ${
        highlight ? 'border-[#5ad8ff]/30 bg-[#0a1828]' : 'border-[#192433] bg-[#0c111a]'
      }`}
    >
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #5ad8ff, transparent)' }} />
      )}
      <div>
        {highlight && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#5ad8ff]/30 text-[#5ad8ff] bg-[#5ad8ff]/5 tracking-wider">
            MOST POPULAR
          </span>
        )}
        <p className="font-display text-xs font-bold text-[#4a5a6d] tracking-widest mt-3 uppercase">{name}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-4xl font-black text-white">{price}</span>
          <span className="text-xs text-[#4a5a6d] font-mono">one-time</span>
        </div>
        <p className="text-xs font-mono mt-1.5" style={{ color }}>
          {credits.toLocaleString()} cr &middot; ~${usdPer1k.toFixed(2)} / 1K tokens
        </p>
        <p className="text-[11px] text-[#4a5a6d] font-mono mt-0.5">{detail}</p>
      </div>

      <ul className="space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-xs font-mono text-[#6b7a8d]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/arena"
        className="block text-center py-3 rounded-xl border font-display text-xs tracking-[0.15em] transition-all hover:opacity-90"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
      >
        GET STARTED
      </Link>
    </div>
  )
}

function SubCard({
  name, price, credits, perCredit, features, highlight, color,
}: {
  name: string; price: string; credits: number; perCredit: string
  features: string[]; highlight?: boolean; color: string
}) {
  return (
    <div
      className={`rounded-2xl border p-7 flex flex-col gap-6 relative overflow-hidden transition-transform hover:-translate-y-0.5 ${
        highlight ? 'border-[#59f5a9]/30 bg-[#081a10]' : 'border-[#192433] bg-[#0c111a]'
      }`}
    >
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #59f5a9, transparent)' }} />
      )}
      <div>
        {highlight && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#59f5a9]/30 text-[#59f5a9] bg-[#59f5a9]/5 tracking-wider">
            BEST VALUE
          </span>
        )}
        <p className="font-display text-xs font-bold text-[#4a5a6d] tracking-widest mt-3 uppercase">{name} Monthly</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-4xl font-black text-white">{price}</span>
          <span className="text-xs text-[#4a5a6d] font-mono">/ month</span>
        </div>
        <p className="text-xs font-mono mt-1.5" style={{ color }}>
          {credits.toLocaleString()} cr / mo &middot; ~${perCredit} / 1K tokens
        </p>
      </div>

      <ul className="space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-xs font-mono text-[#6b7a8d]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/arena"
        className="block text-center py-3 rounded-xl border font-display text-xs tracking-[0.15em] transition-all hover:opacity-90"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
      >
        SUBSCRIBE
      </Link>
    </div>
  )
}
