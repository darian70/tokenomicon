import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingShell from '@/components/layout/MarketingShell'

export const metadata: Metadata = {
  title: 'Models — Tokenomicon',
  description: 'Every major AI model accessible through one API key. GPT-4o, Claude Sonnet, Gemini, Llama, Mistral, DeepSeek and more.',
}

type Speed = 'Ultra-fast' | 'Very fast' | 'Fast' | 'Medium' | 'Slow'

interface ModelEntry {
  id: string
  name: string
  provider: string
  context: string
  speed: Speed
  crPer1kOut: number
  crPer1kIn: number
  tags: string[]
  flagship?: boolean
  new?: boolean
}

const SPEED_COLOR: Record<Speed, string> = {
  'Ultra-fast': '#59f5a9',
  'Very fast':  '#5ad8ff',
  'Fast':       '#6e9bff',
  'Medium':     '#ffd700',
  'Slow':       '#ff6b35',
}

const PROVIDERS: { name: string; color: string; description: string; models: ModelEntry[] }[] = [
  {
    name: 'OpenAI',
    color: '#a8b8cc',
    description: 'Industry-standard models. GPT-4o dominates coding and reasoning; GPT-4o mini is the best cheap-and-fast option.',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        context: '128K',
        speed: 'Fast',
        crPer1kIn: 2.5,
        crPer1kOut: 10,
        tags: ['Coding', 'Reasoning', 'Vision'],
        flagship: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        provider: 'OpenAI',
        context: '128K',
        speed: 'Very fast',
        crPer1kIn: 0.15,
        crPer1kOut: 0.60,
        tags: ['General', 'Fast', 'Cheap'],
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'OpenAI',
        context: '128K',
        speed: 'Medium',
        crPer1kIn: 1.10,
        crPer1kOut: 4.40,
        tags: ['Reasoning', 'Math', 'STEM'],
      },
    ],
  },
  {
    name: 'Anthropic',
    color: '#ff6b35',
    description: 'Claude excels at long-context reasoning, instruction-following, and producing clean structured output.',
    models: [
      {
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        provider: 'Anthropic',
        context: '200K',
        speed: 'Fast',
        crPer1kIn: 3,
        crPer1kOut: 15,
        tags: ['Coding', 'Analysis', 'Long context'],
        flagship: true,
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'Anthropic',
        context: '200K',
        speed: 'Very fast',
        crPer1kIn: 0.80,
        crPer1kOut: 4,
        tags: ['Fast', 'Cheap', 'Structured output'],
      },
    ],
  },
  {
    name: 'Google',
    color: '#5ad8ff',
    description: 'Gemini leads on context window size. Gemini 2.0 Flash is one of the fastest models available.',
    models: [
      {
        id: 'gemini-2-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        context: '1M',
        speed: 'Very fast',
        crPer1kIn: 0.10,
        crPer1kOut: 0.40,
        tags: ['Huge context', 'Fast', 'Vision'],
        flagship: true,
        new: true,
      },
      {
        id: 'gemini-1-5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google',
        context: '2M',
        speed: 'Medium',
        crPer1kIn: 1.25,
        crPer1kOut: 5,
        tags: ['Largest context', 'Reasoning', 'Multimodal'],
      },
    ],
  },
  {
    name: 'Groq',
    color: '#59f5a9',
    description: 'Groq runs open-source models on custom LPU hardware — the fastest inference on the planet.',
    models: [
      {
        id: 'llama-3-3-70b',
        name: 'Llama 3.3 70B',
        provider: 'Groq',
        context: '128K',
        speed: 'Ultra-fast',
        crPer1kIn: 0.59,
        crPer1kOut: 0.79,
        tags: ['Open source', 'Ultra-fast', 'Coding'],
        flagship: true,
      },
      {
        id: 'llama-4-scout',
        name: 'Llama 4 Scout',
        provider: 'Groq',
        context: '128K',
        speed: 'Ultra-fast',
        crPer1kIn: 0.11,
        crPer1kOut: 0.34,
        tags: ['Open source', 'Ultra-fast', 'New'],
        new: true,
      },
      {
        id: 'mixtral-8x7b',
        name: 'Mixtral 8×7B',
        provider: 'Groq',
        context: '32K',
        speed: 'Ultra-fast',
        crPer1kIn: 0.27,
        crPer1kOut: 0.27,
        tags: ['MoE', 'Fast', 'Efficient'],
      },
    ],
  },
  {
    name: 'Mistral',
    color: '#e879f9',
    description: 'European AI powerhouse. Mistral Large punches above its weight on instruction-following and code.',
    models: [
      {
        id: 'mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral',
        context: '128K',
        speed: 'Fast',
        crPer1kIn: 2,
        crPer1kOut: 6,
        tags: ['Coding', 'Reasoning', 'Multilingual'],
        flagship: true,
      },
      {
        id: 'mistral-small',
        name: 'Mistral Small 3.1',
        provider: 'Mistral',
        context: '128K',
        speed: 'Fast',
        crPer1kIn: 0.10,
        crPer1kOut: 0.30,
        tags: ['Fast', 'Cheap', 'Vision'],
        new: true,
      },
    ],
  },
  {
    name: 'DeepSeek',
    color: '#ffd700',
    description: 'Chinese frontier models that match or beat much larger models at a fraction of the cost.',
    models: [
      {
        id: 'deepseek-v3',
        name: 'DeepSeek V3',
        provider: 'DeepSeek',
        context: '64K',
        speed: 'Medium',
        crPer1kIn: 0.27,
        crPer1kOut: 1.10,
        tags: ['Coding', 'Cheap', 'MoE'],
        flagship: true,
      },
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'DeepSeek',
        context: '64K',
        speed: 'Slow',
        crPer1kIn: 0.55,
        crPer1kOut: 2.19,
        tags: ['Reasoning', 'Math', 'Chain-of-thought'],
      },
    ],
  },
]

export default function ModelsPage() {
  const totalModels = PROVIDERS.reduce((n, p) => n + p.models.length, 0)

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="pt-16 pb-12 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #5ad8ff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative max-w-4xl mx-auto">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-4">MODEL CATALOG</p>
          <h1 className="font-display text-5xl lg:text-7xl font-black text-white tracking-wide mb-4">
            Every major model.<br />
            <span className="text-[#5ad8ff]">One API key.</span>
          </h1>
          <p className="text-[#6b7a8d] font-mono text-base leading-relaxed max-w-2xl">
            {totalModels} models across {PROVIDERS.length} providers — all OpenAI-compatible.
            Switch models by changing a single string. No new accounts, no new keys.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Pill label={`${totalModels} models`} color="#5ad8ff" />
            <Pill label={`${PROVIDERS.length} providers`} color="#59f5a9" />
            <Pill label="OpenAI-compatible API" color="#6e9bff" />
            <Pill label="Single endpoint" color="#ffd700" />
          </div>
        </div>
      </section>

      {/* Code snippet */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <div className="rounded-xl border border-[#192433] bg-[#080d14] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#192433]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-[10px] font-mono text-[#3a4a5a]">Switch models in one line</span>
          </div>
          <pre className="p-5 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>
              <span className="text-[#4a5a6d]"># Works with any OpenAI-compatible client{'\n'}</span>
              <span className="text-[#6e9bff]">client</span>
              <span className="text-[#a8b8cc]"> = OpenAI({'\n'}</span>
              <span className="text-[#a8b8cc]">    </span>
              <span className="text-[#59f5a9]">base_url</span>
              <span className="text-[#a8b8cc]">=</span>
              <span className="text-[#ffd700]">&quot;https://tokenomicon.io/api/v1&quot;</span>
              <span className="text-[#a8b8cc]">,{'\n'}</span>
              <span className="text-[#a8b8cc]">    </span>
              <span className="text-[#59f5a9]">api_key</span>
              <span className="text-[#a8b8cc]">=</span>
              <span className="text-[#ffd700]">&quot;tok_your_key_here&quot;</span>
              <span className="text-[#a8b8cc]">,{'\n'}){'\n\n'}</span>
              <span className="text-[#4a5a6d]"># Change this one string to switch providers instantly{'\n'}</span>
              <span className="text-[#6e9bff]">model</span>
              <span className="text-[#a8b8cc]"> = </span>
              <span className="text-[#ffd700]">&quot;gpt-4o&quot;           </span>
              <span className="text-[#4a5a6d]">  # → switch to &quot;claude-sonnet-4&quot;, &quot;llama-3.3-70b&quot;, ...</span>
            </code>
          </pre>
        </div>
      </section>

      {/* Provider sections */}
      <section className="px-6 pb-24 max-w-6xl mx-auto space-y-16">
        {PROVIDERS.map((provider) => (
          <div key={provider.name}>
            {/* Provider header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-1 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: provider.color, height: '40px' }}
              />
              <div>
                <h2 className="font-display text-lg font-black text-white tracking-wider"
                  style={{ color: provider.color }}
                >
                  {provider.name}
                </h2>
                <p className="text-xs text-[#4a5a6d] font-mono mt-1 max-w-xl">{provider.description}</p>
              </div>
            </div>

            {/* Models table */}
            <div className="rounded-xl border border-[#192433] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#192433] bg-[#0c111a]">
                      <th className="text-left px-5 py-3 text-[#3a4a5a] font-normal tracking-wider">Model</th>
                      <th className="text-left px-4 py-3 text-[#3a4a5a] font-normal tracking-wider">Context</th>
                      <th className="text-left px-4 py-3 text-[#3a4a5a] font-normal tracking-wider">Speed</th>
                      <th className="text-right px-4 py-3 text-[#3a4a5a] font-normal tracking-wider">Input / 1M tokens</th>
                      <th className="text-right px-5 py-3 text-[#3a4a5a] font-normal tracking-wider">Output / 1M tokens</th>
                      <th className="text-left px-5 py-3 text-[#3a4a5a] font-normal tracking-wider">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provider.models.map((model, i) => (
                      <tr
                        key={model.id}
                        className={`border-b border-[#0f1520] last:border-0 ${
                          i % 2 === 0 ? 'bg-[#080d14]' : 'bg-[#0a1018]'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[#a8b8cc] font-medium">{model.name}</span>
                            {model.flagship && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#ffd700]/30 text-[#ffd700] bg-[#ffd700]/5">
                                FLAGSHIP
                              </span>
                            )}
                            {model.new && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#59f5a9]/30 text-[#59f5a9] bg-[#59f5a9]/5">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#3a4a5a] mt-0.5">{model.id}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[#6b7a8d]">{model.context}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              color: SPEED_COLOR[model.speed],
                              backgroundColor: `${SPEED_COLOR[model.speed]}15`,
                            }}
                          >
                            {model.speed}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[#6b7a8d]">
                          {model.crPer1kIn.toFixed(2)} cr
                        </td>
                        <td className="px-5 py-3.5 text-right" style={{ color: provider.color }}>
                          {model.crPer1kOut.toFixed(2)} cr
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {model.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-[#0f1822] text-[#4a5a6d] border border-[#192433]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Credit conversion explainer */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-[#192433] bg-[#0c111a] p-8">
          <h3 className="font-display text-sm font-black text-white tracking-widest mb-2">HOW CREDITS MAP TO TOKENS</h3>
          <p className="text-xs text-[#4a5a6d] font-mono leading-relaxed mb-6">
            Credits scale with the real cost of each model. The cheapest models cost well under 1 credit per 1,000 tokens.
            Frontier models cost more — but you earn bonus compute through games every day.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'GPT-4o mini (output)', cost: '0.60 cr', per: '1K tokens', example: '~166K tokens per 100 cr', color: '#a8b8cc' },
              { label: 'GPT-4o (output)', cost: '10 cr', per: '1K tokens', example: '~10K tokens per 100 cr', color: '#6e9bff' },
              { label: 'Claude Sonnet 4 (output)', cost: '15 cr', per: '1K tokens', example: '~6.7K tokens per 100 cr', color: '#ff6b35' },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-[#080d14] border border-[#192433] p-4">
                <p className="text-[10px] font-mono text-[#4a5a6d] mb-2">{row.label}</p>
                <p className="font-display text-lg font-black" style={{ color: row.color }}>{row.cost}</p>
                <p className="text-[10px] font-mono text-[#3a4a5a]">per {row.per}</p>
                <p className="text-[10px] font-mono text-[#4a5a6d] mt-2 border-t border-[#192433] pt-2">{row.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-8 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="font-display text-3xl font-black text-white tracking-wide">Access all of these today.</h2>
          <p className="text-xs text-[#4a5a6d] font-mono">One key. Every model. 100 free credits to start.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/arena"
              className="px-8 py-4 bg-[#5ad8ff] text-[#070a10] font-display text-sm tracking-[0.15em] rounded-xl hover:bg-white hover:shadow-[0_0_30px_rgba(90,216,255,0.4)] transition-all font-black"
            >
              GET YOUR API KEY
            </Link>
            <Link href="/pricing" className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors">
              View pricing →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08`, color }}
    >
      {label}
    </div>
  )
}
