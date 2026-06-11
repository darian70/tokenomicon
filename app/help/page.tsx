import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center — Tokenomicon',
  description: 'Tokenomicon Help Center — FAQs, guides, and support',
}

const FAQ: { q: string; a: string }[] = [
  { q: 'What is Tokenomicon?', a: 'Tokenomicon is a compute credit platform. Buy API credits, play skill games to earn bonus compute, and use everything through a single API key that routes to OpenAI, Anthropic, Groq, and more.' },
  { q: 'How do credits work?', a: 'There are three types: Purchased Compute (bought via Stripe), Arena Credits (100 free daily), and Bonus Compute (earned through games). API calls debit bonus compute first, then purchased compute.' },
  { q: 'Do I need to buy credits to play games?', a: 'No. You receive 100 free arena credits every day. No purchase necessary to play games or earn bonus compute.' },
  { q: 'Can I cash out my credits?', a: 'No. Credits have no cash value and cannot be transferred or redeemed for money. They can only be used for API calls.' },
  { q: 'How does the API key work?', a: 'Your Tokenomicon API key works as a drop-in replacement for OpenAI-compatible endpoints. Point your code at our API, pick any supported model, and your credits are debited per-token.' },
  { q: 'What models are supported?', a: 'GPT-4o, GPT-4o Mini, o3-mini, Claude Sonnet 4, Claude 3.5 Haiku, Llama 3.3 70B, Gemma 2 9B, Mixtral 8x7B — and more being added.' },
  { q: 'Are games fair?', a: 'Yes. We use provably fair cryptographic commit-reveal schemes. Before each game, you receive a hash of the server seed. After the game, the seed is revealed so you can verify the challenge was generated fairly.' },
  { q: 'What are difficulty tiers?', a: 'Each game has three tiers: Sandbox (15 cr, beginner), Production (30 cr, intermediate), and Blackbox (60 cr, expert). Higher tiers cost more but offer much larger rewards.' },
  { q: 'What is the daily bonus cap?', a: 'You can earn up to 2,000 bonus compute credits per day through games. This resets at midnight UTC.' },
  { q: 'How do streak bonuses work?', a: 'Win consecutive games to build a streak (up to 5x). Each streak level adds 5% to your reward multiplier, up to a maximum 25% bonus.' },
  { q: 'What happens if my session expires?', a: 'Game sessions last 3-5 minutes depending on difficulty. If time runs out, you receive a 50% refund of your entry cost.' },
  { q: 'How do I get support?', a: 'Email support@tokenomicon.io or join our Discord community. We respond within 24 hours.' },
]

export default function HelpPage() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-black text-blood glow-red tracking-wide mb-2">HELP CENTER</h1>
      <p className="text-xs text-dim font-mono mb-10">Everything you need to know about Tokenomicon.</p>

      <section className="mb-12">
        <h2 className="font-display text-xs tracking-widest text-acid mb-6">FREQUENTLY ASKED QUESTIONS</h2>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <details key={i} className="group panel border border-border">
              <summary className="px-4 py-3 cursor-crosshair flex items-center justify-between text-sm font-mono text-text hover:text-cyan transition-colors">
                <span>{item.q}</span>
                <span className="text-dim group-open:rotate-90 transition-transform text-xs">▸</span>
              </summary>
              <div className="px-4 pb-4 text-xs text-dim font-mono leading-relaxed border-t border-border pt-3">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">QUICK START GUIDE</h2>
        <div className="space-y-3 text-sm text-dim font-mono leading-relaxed">
          <Step n="1" title="Create an account" desc="Sign up with your email. You'll receive 100 free arena credits immediately." />
          <Step n="2" title="Play a game" desc="Head to the Arena, pick a game and difficulty tier, and test your skills." />
          <Step n="3" title="Earn bonus compute" desc="Score well to earn bonus compute credits. Higher tiers and streaks multiply your rewards." />
          <Step n="4" title="Create an API key" desc="Go to the Wallet panel, create a key, and use it with any OpenAI-compatible client." />
          <Step n="5" title="Make API calls" desc="Point your code at tokenomicon.io/api/v1/chat/completions. Drop-in compatible with the OpenAI SDK — just change the base URL and your API key." />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">CONTACT SUPPORT</h2>
        <div className="panel border border-border p-4 text-sm text-dim font-mono space-y-2">
          <p>Email: <span className="text-cyan">support@tokenomicon.io</span></p>
          <p>Response time: &lt; 24 hours</p>
          <p>For security issues: <span className="text-blood">security@tokenomicon.io</span></p>
        </div>
      </section>

      <footer className="mt-16 pt-6 border-t border-border text-center">
        <a href="/" className="text-[10px] text-dim font-mono hover:text-cyan transition-colors">
          ← Back to Tokenomicon
        </a>
      </footer>
    </main>
  )
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="font-display text-xs text-cyan border border-cyan/30 w-6 h-6 flex items-center justify-center flex-shrink-0">{n}</span>
      <div>
        <p className="text-text text-xs font-display tracking-widest">{title.toUpperCase()}</p>
        <p className="text-dim text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
