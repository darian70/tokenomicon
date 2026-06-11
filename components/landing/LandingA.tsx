// Persona A landing — AI app builders.
// Angle: drop-in OpenAI replacement, earn compute through skill games,
// semantic cache cuts API costs 30–70% on repetitive workloads.

import { SignInCtaPrimary, SignInCtaNav } from '@/components/landing/SignInCta'

export default function LandingA() {
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
            <span className="hidden sm:inline text-[10px] text-[#3d8fb5] font-mono tracking-widest border-l border-[#192433] pl-3">COMPUTE ARCADE</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/pricing" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Pricing</a>
            <a href="/models" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Models</a>
            <a href="/benchmarks" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Benchmarks</a>
            <a href="/docs" className="hidden sm:inline text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5">Docs</a>
            <SignInCtaNav />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#5ad8ff 1px, transparent 1px), linear-gradient(90deg, #5ad8ff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#ff4d6d]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#59f5a9]/20 bg-[#59f5a9]/5 text-[10px] font-mono text-[#59f5a9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
            Platform live · 100 free credits every day
          </div>

          <h1 className="font-display text-6xl lg:text-9xl font-black tracking-[0.06em] leading-none">
            <span className="text-[#ff4d6d]" style={{ textShadow: '0 0 60px rgba(255,77,109,0.4)' }}>TOKEN</span>
            <span className="text-white">OMICON</span>
          </h1>

          <p className="text-lg lg:text-xl text-[#6b7a8d] font-mono max-w-2xl mx-auto leading-relaxed">
            One API key for every major AI model.<br />
            Play skill games. Win bonus compute. Use it on real API calls.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignInCtaPrimary label="CLAIM FREE CREDITS" />
            <a
              href="#how-it-works"
              className="px-8 py-4 border border-[#2a3a50] text-[#a8b8cc] font-display text-sm tracking-[0.15em] hover:border-[#5ad8ff]/40 hover:text-white transition-all rounded-sm"
            >
              HOW IT WORKS
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 pt-4 border-t border-[#192433]">
            <StatBadge value="100" label="free credits / day" color="#59f5a9" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <StatBadge value="9" label="skill games" color="#5ad8ff" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <StatBadge value="15+" label="AI models" color="#6e9bff" />
            <div className="w-px h-4 bg-[#192433] hidden sm:block" />
            <StatBadge value="$0" label="to start playing" color="#ffd700" />
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="border-y border-[#192433] bg-[#080d14] py-5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2">
            <span className="text-[10px] font-mono text-[#3a4a5a] tracking-widest uppercase mr-4">Supported providers</span>
            {['OpenAI', 'Anthropic', 'Google Gemini', 'Groq', 'DeepSeek', 'Mistral'].map((p) => (
              <span key={p} className="text-xs font-mono text-[#4a5a6d]">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionLabel text="HOW IT WORKS" />
          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            <StepCard
              step="01"
              color="#5ad8ff"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5ad8ff" strokeWidth="1.5"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>}
              title="Buy Credits"
              desc="Purchase compute credits via Stripe. Credits act as a prepaid balance for AI API calls across OpenAI, Anthropic, and more. Credits never expire."
            />
            <StepCard
              step="02"
              color="#59f5a9"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="12" y1="6" x2="12" y2="18"/></svg>}
              title="Play Skill Games"
              desc="100 free arena credits land in your account daily. Use them to play 9 developer-themed skill games. Win to earn bonus compute on top of what you bought."
            />
            <StepCard
              step="03"
              color="#ffd700"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3Z"/></svg>}
              title="One Key, All Models"
              desc="Get a single API key that routes to any supported model. All credits — purchased and won — are available via the same endpoint. Drop-in compatible with OpenAI SDK."
            />
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 px-6 bg-[#080d14] border-y border-[#192433]">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <SectionLabel text="DEVELOPER FIRST" />
            <h2 className="font-display text-3xl lg:text-4xl font-black text-white tracking-wide leading-tight">
              Drop-in OpenAI compatible.<br />
              <span className="text-[#5ad8ff]">Two-line integration.</span>
            </h2>
            <p className="text-[#6b7a8d] font-mono text-sm leading-relaxed">
              Change your base URL and API key. That&apos;s it. Every model, every provider,
              through a single endpoint. Your winnings apply automatically.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <CacheStat label="avg cost reduction" value="2.5×" color="#59f5a9" sub="vs OpenAI direct" />
              <CacheStat label="semantic cache saves" value="30–70%" color="#5ad8ff" sub="on repetitive workloads" />
            </div>
            <div className="flex flex-wrap gap-3">
              {['OpenAI SDK', 'Python', 'Node.js', 'curl', 'Any HTTP client'].map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2.5 py-1 rounded border border-[#192433] text-[#4a5a6d]">
                  {tag}
                </span>
              ))}
            </div>
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
                <span className="text-[#4a5a6d]"># Before (OpenAI direct){'\n'}</span>
                <span className="text-[#6e9bff]">from</span>
                <span className="text-white"> openai </span>
                <span className="text-[#6e9bff]">import</span>
                <span className="text-white"> OpenAI{'\n'}</span>
                <span className="text-white">client = OpenAI(api_key=</span>
                <span className="text-[#59f5a9]">&quot;sk-...&quot;</span>
                <span className="text-white">){'\n\n'}</span>
                <span className="text-[#4a5a6d]"># After (Tokenomicon — same SDK){'\n'}</span>
                <span className="text-[#6e9bff]">from</span>
                <span className="text-white"> openai </span>
                <span className="text-[#6e9bff]">import</span>
                <span className="text-white"> OpenAI{'\n'}</span>
                <span className="text-white">client = OpenAI({'\n'}</span>
                <span className="text-white">    api_key=</span>
                <span className="text-[#59f5a9]">&quot;tok-your-key&quot;</span>
                <span className="text-white">,{'\n'}</span>
                <span className="text-white">    base_url=</span>
                <span className="text-[#59f5a9]">&quot;https://tokenomicon.io/api/v1&quot;</span>
                <span className="text-white">{'\n'}){'\n'}</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel text="THE GAMES" />
              <h2 className="font-display text-2xl font-black text-white tracking-wide mt-2">
                Earn compute through skill.
              </h2>
            </div>
            <a href="/games" className="text-xs font-mono text-[#5ad8ff] hover:text-white transition-colors hidden sm:inline">
              Browse all →
            </a>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GameCard accent="#a78bfa" tag="Prediction"   name="Token Prophet"   desc="Forecast how many tokens the model outputs. Closer = more credits. Calibration is your edge." reward="Up to 200 cr" />
            <GameCard accent="#34d399" tag="Optimization" name="Prompt Golf"     desc="Shortest prompt that hits every required target. Every extra character costs you." reward="Up to 240 cr" />
            <GameCard accent="#f87171" tag="Debugging"    name="Bug Exorcist"    desc="Broken code. Three patches. Only one fixes the root cause. Tier up for nastier bugs." reward="Up to 100 cr" />
            <GameCard accent="#fbbf24" tag="Estimation"   name="Context Chicken" desc="Name the minimum context window. Too small = task fails. Too big = wasted. Nail it." reward="Up to 180 cr" />
            <GameCard accent="#38bdf8" tag="Intel"        name="Rate Roulette"   desc="Three providers. One prompt. Which responds first? Know your hardware — LPU vs GPU matters." reward="Up to 200 cr" />
            <GameCard accent="#fb923c" tag="Judgment"     name="Benchmark Brawl" desc="Three models tackle the same task. Read their outputs. Crown the winner." reward="Up to 200 cr" />
            <GameCard accent="#e879f9" tag="Detection"    name="Spot the AI"     desc="Four messages. Three human. One machine. Read carefully — the model is getting good at hiding." reward="Up to 200 cr" />
            <GameCard accent="#fb923c" tag="Timing"       name="Prompt Crash"    desc="Ride the multiplier. Cash out before the prompt crashes. Wait too long and you lose everything." reward="Up to 100×" />
            <GameCard accent="#5eead4" tag="Risk"         name="Token Mines"     desc="Reveal safe cells. Each pick multiplies your payout. One mine ends the run." reward="Up to 8×" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-[#080d14] border-y border-[#192433]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="CREDIT PACKS" />
            <h2 className="font-display text-2xl font-black text-white tracking-wide mt-2">Simple, transparent pricing.</h2>
            <p className="text-sm text-[#4a5a6d] font-mono mt-2">Plus 100 free arena credits every day — no purchase required.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PriceCard name="Starter" price="$10" credits={10000}  usdPer1k={1.00} detail="Try every model"   features={['10,000 compute credits','~3.3M gpt-4o-mini tokens','100 daily arena credits','1 API key','All models']} />
            <PriceCard name="Builder" price="$49" credits={55000}  usdPer1k={0.89} detail="Most popular"      features={['55,000 compute credits','~18M gpt-4o-mini tokens','100 daily arena credits','Unlimited API keys','All models']} highlight />
            <PriceCard name="Pro"     price="$99" credits={120000} usdPer1k={0.83} detail="Production ready"  features={['120,000 compute credits','~40M gpt-4o-mini tokens','100 daily arena credits','Unlimited API keys','All models']} />
            <PriceCard name="Teams"  price="$249" credits={350000} usdPer1k={0.71} detail="Best value / credit" features={['350,000 compute credits','~117M gpt-4o-mini tokens','100 daily arena credits','Unlimited API keys','Priority support']} />
          </div>

          <div className="mt-14">
            <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-2">MONTHLY PLANS</p>
            <p className="text-sm text-[#4a5a6d] font-mono mb-6">Fresh credits every billing cycle. Subscribe once, build forever.</p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <SubCard name="Dev" price="$15" credits={20000} perCredit="0.75" color="#5ad8ff"
                features={['20,000 credits/month','~6.6M gpt-4o-mini tokens','All models','Unlimited API keys','100 daily arena credits']} />
              <SubCard name="Pro" price="$49" credits={75000} perCredit="0.65" color="#59f5a9" highlight
                features={['75,000 credits/month','~25M gpt-4o-mini tokens','All models','Unlimited API keys','100 daily arena credits']} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #5ad8ff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-2xl mx-auto space-y-6">
          <h2 className="font-display text-4xl lg:text-6xl font-black text-white tracking-wide">Ready to play?</h2>
          <p className="text-[#6b7a8d] font-mono text-sm leading-relaxed">
            Sign up free. Get 100 daily arena credits. Win bonus compute.<br />
            Spend it on real AI calls. No crypto, no nonsense.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignInCtaPrimary label="ENTER THE ARCADE" />
            <a href="/docs" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors">Read the docs →</a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared footer (used by both variants)
// ---------------------------------------------------------------------------

export function LandingFooter() {
  return (
    <footer className="border-t border-[#192433] bg-[#080d14]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-md flex items-center justify-center">
                <span className="font-display text-[10px] font-black text-[#ff4d6d]">TK</span>
              </div>
              <span className="font-display text-sm font-black text-white tracking-[0.14em]">TOKENOMICON</span>
            </div>
            <p className="text-[11px] text-[#3a4a5a] font-mono leading-relaxed max-w-[200px]">
              One API key for every major AI model. Play skill games to earn bonus compute.
            </p>
            <div className="flex items-center gap-1.5 mt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
              <span className="text-[10px] font-mono text-[#2a5a3a]">Platform operational</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Product</p>
            <div className="space-y-2.5">
              {[['Games', '/games'],['Pricing', '/pricing'],['Models', '/models'],['Benchmarks', '/benchmarks'],['Playground', '/playground'],['Docs', '/docs']].map(([label, href]) => (
                <a key={href} href={href} className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors">{label}</a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Resources</p>
            <div className="space-y-2.5">
              {[['Help Center', '/help'],['About', '/about'],['Status', '/status'],['Leaderboard', '/leaderboard'],['Changelog', '/changelog']].map(([label, href]) => (
                <a key={href} href={href} className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors">{label}</a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Legal</p>
            <div className="space-y-2.5">
              {[['Terms of Service', '/terms'],['Privacy Policy', '/privacy']].map(([label, href]) => (
                <a key={href} href={href} className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors">{label}</a>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-3 uppercase">Contact</p>
              <p className="text-[11px] font-mono text-[#3a4a5a]">support@tokenomicon.io</p>
              <p className="text-[11px] font-mono text-[#3a4a5a] mt-1">security@tokenomicon.io</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#192433] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-[#2a3a4a] font-mono">© 2026 Tokenomicon · Credits have no cash value · Not financial advice</p>
          <p className="text-[10px] text-[#2a3a4a] font-mono">Provably fair · No crypto · No nonsense</p>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Local components
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a]">{text}</p>
}

function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono text-[#4a5a6d]">{label}</p>
    </div>
  )
}

function CacheStat({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#192433] bg-[#0c111a] p-3">
      <p className="font-display text-lg font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono text-[#a8b8cc] mt-0.5">{label}</p>
      <p className="text-[10px] font-mono text-[#3a4a5a]">{sub}</p>
    </div>
  )
}

function StepCard({ step, color, icon, title, desc }: {
  step: string; color: string; icon: React.ReactNode; title: string; desc: string
}) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center border"
          style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
          {icon}
        </div>
        <span className="font-display text-xs font-black" style={{ color, opacity: 0.4 }}>{step}</span>
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-white tracking-wider mb-2">{title}</h3>
        <p className="text-xs text-[#4a5a6d] font-mono leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function GameCard({ accent, tag, name, desc, reward }: {
  accent: string; tag: string; name: string; desc: string; reward: string
}) {
  return (
    <div className="rounded-xl border bg-[#0c111a] p-5 flex flex-col gap-3 hover:bg-[#0f1822] transition-all"
      style={{ borderColor: `${accent}25` }}>
      <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
      <div>
        <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: accent }}>{tag.toUpperCase()}</p>
        <h3 className="font-display text-sm font-bold text-white tracking-wider">{name}</h3>
      </div>
      <p className="text-xs text-[#4a5a6d] font-mono leading-relaxed flex-1">{desc}</p>
      <p className="text-[10px] font-mono font-bold" style={{ color: accent }}>{reward}</p>
    </div>
  )
}

function SubCard({ name, price, credits, perCredit, color, features, highlight }: {
  name: string; price: string; credits: number; perCredit: string; color: string; features: string[]; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-6 flex flex-col gap-5 ${highlight ? 'border-[#59f5a9]/30 bg-[#081a10]' : 'border-[#192433] bg-[#0c111a]'}`}>
      <div>
        {highlight && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#59f5a9]/30 text-[#59f5a9] bg-[#59f5a9]/5 tracking-wider">BEST VALUE</span>
        )}
        <p className="font-display text-xs font-bold text-[#a8b8cc] tracking-widest mt-2">{name.toUpperCase()} MONTHLY</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-3xl font-black text-white">{price}</span>
          <span className="text-xs text-[#4a5a6d] font-mono">/month</span>
        </div>
        <p className="text-xs font-mono mt-1" style={{ color }}>{credits.toLocaleString()} cr · ~${perCredit}/1K tokens</p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs font-mono text-[#6b7a8d]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke={color}><polyline points="20 6 9 17 4 12"/></svg>
            {f}
          </li>
        ))}
      </ul>
      <SignInCtaPrimary label="SUBSCRIBE" />
    </div>
  )
}

function PriceCard({ name, price, credits, usdPer1k, detail, features, highlight }: {
  name: string; price: string; credits: number; usdPer1k: number; detail: string; features: string[]; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-6 flex flex-col gap-5 ${highlight ? 'border-[#5ad8ff]/30 bg-[#0a1828]' : 'border-[#192433] bg-[#0c111a]'}`}>
      <div>
        {highlight && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#5ad8ff]/30 text-[#5ad8ff] bg-[#5ad8ff]/5 tracking-wider">MOST POPULAR</span>
        )}
        <p className="font-display text-xs font-bold text-[#a8b8cc] tracking-widest mt-2">{name.toUpperCase()}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-3xl font-black text-white">{price}</span>
          <span className="text-xs text-[#4a5a6d] font-mono">one-time</span>
        </div>
        <p className="text-xs font-mono text-[#4a5a6d] mt-1">{credits.toLocaleString()} cr · ~${usdPer1k.toFixed(2)}/1K tokens</p>
        {detail && <p className="text-xs text-[#59f5a9] font-mono mt-0.5">{detail}</p>}
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs font-mono text-[#6b7a8d]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {f}
          </li>
        ))}
      </ul>
      <SignInCtaPrimary label="GET STARTED" />
    </div>
  )
}
