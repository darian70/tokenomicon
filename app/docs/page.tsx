import type { Metadata } from 'next'
import DocsApiKey from '@/components/docs/DocsApiKey'

export const metadata: Metadata = {
  title: 'API Documentation — Tokenomicon',
  description: 'OpenAI-compatible API for chat, embeddings, vision, and function calling. Drop-in replacement — 2 lines to switch.',
}

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tokenomicon.io'
  return (
    <main className="min-h-screen px-6 py-16 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-black text-blood glow-red tracking-wide mb-2">API DOCUMENTATION</h1>
      <p className="text-xs text-dim font-mono mb-2">OpenAI-compatible API. One key, every model.</p>
      <div className="flex flex-wrap gap-2 mb-10">
        {['Chat Completions', 'Streaming', 'Function Calling', 'Vision', 'Embeddings'].map((cap) => (
          <span key={cap} className="text-[10px] font-mono px-2 py-0.5 border border-acid/30 text-acid bg-acid/5">
            {cap}
          </span>
        ))}
      </div>

      {/* Client component: migration guide, quickstart, all code examples with live key injection */}
      <div className="mb-10 space-y-10">
        <DocsApiKey baseUrl={baseUrl} />
      </div>

      {/* BASE URL */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">BASE URL</h2>
        <div className="panel border border-border p-4">
          <code className="text-sm font-mono text-gold">{baseUrl}/api/v1</code>
          <p className="text-xs text-dim font-mono mt-2">
            All endpoints follow the OpenAI API specification. Drop-in compatible with any OpenAI SDK.
          </p>
        </div>
      </section>

      {/* ENDPOINTS */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">ENDPOINTS</h2>

        <Endpoint
          method="POST"
          path="/v1/chat/completions"
          description="Create a chat completion. Supports streaming, function calling, vision (image_url), and multi-turn tool use."
          body={`{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "You are helpful." },
    { "role": "user",   "content": "Hello!" }
  ],
  "stream": false,
  "max_tokens": 1024,
  "tools": [...],          // optional
  "tool_choice": "auto"    // optional
}`}
          response={`{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello!",
      "tool_calls": [...]    // present when model calls a tool
    },
    "finish_reason": "stop"  // or "tool_calls"
  }],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 5,
    "total_tokens": 17,
    "cost_credits": 1        // Tokenomicon-specific
  }
}`}
        />

        <Endpoint
          method="POST"
          path="/v1/embeddings"
          description="Create vector embeddings. Accepts a single string or a batch of up to 2048 strings. Use for RAG, semantic search, and similarity."
          body={`{
  "model": "text-embedding-3-small",
  "input": "text to embed",          // or string[]
  "encoding_format": "float",        // "float" | "base64"
  "dimensions": 512                  // optional, for text-embedding-3-*
}`}
          response={`{
  "object": "list",
  "data": [
    { "object": "embedding", "index": 0, "embedding": [0.021, -0.003, ...] }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8,
    "cost_credits": 1
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/v1/models"
          description="List all available models with pricing, tier, and capability flags (vision, tool_use, embedding family)."
          response={`{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o-mini",
      "object": "model",
      "provider": "openai",
      "tier": "standard",
      "family": "chat",
      "capabilities": {
        "chat": true,
        "embedding": false,
        "vision": true,
        "tool_use": true
      },
      "pricing": {
        "input_credits_per_1k_tokens": 1,
        "output_credits_per_1k_tokens": 3
      }
    }
  ]
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/usage"
          description="Fetch your usage history. Supports ?days=7|30|90 and ?keyId= for per-key breakdown."
          response={`{
  "days": 7,
  "daily": [{ "date": "2025-05-22", "requests": 14, "tokens": 8420, "cost": 23 }],
  "summary": { "requests": 14, "tokens": 8420, "cost": 23, "avgCostPerRequest": 1.6 },
  "byModel": [{ "model": "gpt-4o-mini", "requests": 12, "cost": 18 }],
  "byKey": [{ "name": "prod", "prefix": "tk_prod_", "requests": 12, "cost": 18 }],
  "recent": [{ "model": "gpt-4o-mini", "promptTokens": 10, "completionTokens": 22, "cost": 1 }]
}`}
        />
      </section>

      {/* MODELS TABLE */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">SUPPORTED MODELS</h2>

        <p className="text-[10px] font-mono text-dim mb-3">Chat models</p>
        <div className="panel border border-border overflow-x-auto mb-4">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-dim text-left">
                <th className="p-3">Model ID</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Tier</th>
                <th className="p-3">In / 1K</th>
                <th className="p-3">Out / 1K</th>
                <th className="p-3">Caps</th>
              </tr>
            </thead>
            <tbody className="text-text">
              <ModelRow model="gpt-4o"                            provider="OpenAI"     tier="premium"  input={3}  output={12} caps="vision, tools" />
              <ModelRow model="gpt-4o-mini"                       provider="OpenAI"     tier="standard" input={1}  output={3}  caps="vision, tools" />
              <ModelRow model="o3-mini"                           provider="OpenAI"     tier="premium"  input={6}  output={24} caps="tools" />
              <ModelRow model="claude-sonnet-4-20250514"          provider="Anthropic"  tier="premium"  input={4}  output={16} caps="vision, tools" />
              <ModelRow model="claude-3-5-haiku-20241022"         provider="Anthropic"  tier="standard" input={2}  output={7}  caps="tools" />
              <ModelRow model="llama-3.3-70b-versatile"           provider="Groq"       tier="economy"  input={1}  output={1}  caps="tools" />
              <ModelRow model="gemma2-9b-it"                      provider="Groq"       tier="economy"  input={1}  output={1}  caps="" />
              <ModelRow model="mixtral-8x7b-32768"                provider="Groq"       tier="economy"  input={1}  output={1}  caps="tools" />
              <ModelRow model="deepseek/deepseek-chat-v3-0324"    provider="OpenRouter" tier="standard" input={1}  output={2}  caps="tools" />
              <ModelRow model="deepseek/deepseek-r1"              provider="OpenRouter" tier="premium"  input={2}  output={8}  caps="tools" />
              <ModelRow model="google/gemini-2.5-flash-preview"   provider="OpenRouter" tier="standard" input={1}  output={2}  caps="vision, tools" />
              <ModelRow model="google/gemini-2.5-pro-preview"     provider="OpenRouter" tier="premium"  input={3}  output={12} caps="vision, tools" />
              <ModelRow model="mistralai/mistral-small-3.2-24b-instruct" provider="OpenRouter" tier="economy" input={1} output={1} caps="tools" />
              <ModelRow model="meta-llama/llama-4-maverick"       provider="OpenRouter" tier="standard" input={1}  output={3}  caps="vision, tools" />
              <ModelRow model="qwen/qwen3-235b-a22b"              provider="OpenRouter" tier="standard" input={1}  output={3}  caps="tools" />
            </tbody>
          </table>
        </div>

        <p className="text-[10px] font-mono text-dim mb-3">Embedding models</p>
        <div className="panel border border-border overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-dim text-left">
                <th className="p-3">Model ID</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Credits / 1K tokens</th>
                <th className="p-3">Max dimensions</th>
              </tr>
            </thead>
            <tbody className="text-text">
              <tr className="border-b border-border">
                <td className="p-3 text-cyan">text-embedding-3-small</td>
                <td className="p-3 text-dim">OpenAI</td>
                <td className="p-3">1 cr</td>
                <td className="p-3 text-dim">1536 (default), up to 1536</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3 text-cyan">text-embedding-3-large</td>
                <td className="p-3 text-dim">OpenAI</td>
                <td className="p-3">2 cr</td>
                <td className="p-3 text-dim">3072 (default), reducible</td>
              </tr>
              <tr>
                <td className="p-3 text-cyan">text-embedding-ada-002</td>
                <td className="p-3 text-dim">OpenAI</td>
                <td className="p-3">1 cr</td>
                <td className="p-3 text-dim">1536 (fixed)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] font-mono text-dim mt-2">1 credit = $0.001. Embedding costs apply to input tokens only.</p>
      </section>

      {/* RATE LIMITS */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">RATE LIMITS</h2>
        <div className="panel border border-border p-4 text-xs font-mono text-dim space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-text mb-1">Chat completions</p>
              <p>30 requests / 60 seconds per key</p>
            </div>
            <div>
              <p className="text-text mb-1">Embeddings</p>
              <p>60 requests / 60 seconds per key</p>
            </div>
          </div>
          <p className="pt-2 border-t border-border">
            When rate limited you receive a <code className="text-blood">429</code> with a{' '}
            <code className="text-cyan">Retry-After: 60</code> header. Contact us for higher limits.
          </p>
        </div>
      </section>

      {/* CREDIT SYSTEM */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">CREDIT SYSTEM</h2>
        <div className="panel border border-border p-4 text-xs font-mono space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border p-3">
              <p className="text-acid mb-1">purchased_compute</p>
              <p className="text-dim text-[10px]">Bought credits. Used first. Never expire.</p>
            </div>
            <div className="border border-border p-3">
              <p className="text-gold mb-1">bonus_compute</p>
              <p className="text-dim text-[10px]">Referral / promo credits. Used second.</p>
            </div>
            <div className="border border-border p-3">
              <p className="text-cyan mb-1">arena_credits</p>
              <p className="text-dim text-[10px]">Won from games. Used last.</p>
            </div>
          </div>
          <p className="text-dim text-[10px]">
            All API calls debit from your credit pool in the order above. Enable auto-topup in the{' '}
            <a href="/wallet" className="text-acid hover:underline">Wallet</a> to recharge automatically when balance drops below a threshold.
          </p>
        </div>
      </section>

      {/* ERROR CODES */}
      <section className="mb-10">
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">ERROR CODES</h2>
        <div className="panel border border-border overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-dim text-left">
                <th className="p-3">Code</th>
                <th className="p-3">Meaning</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-text">
              <ErrorRow code="400" meaning="Invalid request" action="Check model name, message format, or tool schema" />
              <ErrorRow code="401" meaning="Invalid or missing API key" action="Verify Authorization: Bearer <key> header" />
              <ErrorRow code="402" meaning="Insufficient credits" action="Top up at /wallet or enable auto-topup" />
              <ErrorRow code="429" meaning="Rate limit exceeded" action="Retry after Retry-After header value (seconds)" />
              <ErrorRow code="502" meaning="Upstream provider error" action="Retry or specify a fallback model" />
              <ErrorRow code="503" meaning="Provider not configured" action="Use a different model or contact support" last />
            </tbody>
          </table>
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

function Endpoint({ method, path, description, body, response }: {
  method: string; path: string; description: string; body?: string; response: string
}) {
  return (
    <div className="panel border border-border mb-4">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <span className={`font-display text-[10px] tracking-widest px-2 py-0.5 ${method === 'GET' ? 'bg-acid/10 text-acid border border-acid/30' : 'bg-gold/10 text-gold border border-gold/30'}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-text">{path}</code>
      </div>
      <div className="p-4 text-xs text-dim font-mono space-y-3">
        <p>{description}</p>
        {body && (
          <div>
            <p className="text-[10px] text-dim mb-1">REQUEST BODY</p>
            <pre className="bg-void border border-border p-3 text-cyan overflow-x-auto whitespace-pre">{body}</pre>
          </div>
        )}
        <div>
          <p className="text-[10px] text-dim mb-1">RESPONSE</p>
          <pre className="bg-void border border-border p-3 text-acid overflow-x-auto whitespace-pre">{response}</pre>
        </div>
      </div>
    </div>
  )
}

function ModelRow({ model, provider, tier, input, output, caps }: {
  model: string; provider: string; tier: string; input: number; output: number; caps: string
}) {
  const tierColor = tier === 'premium' ? 'text-gold' : tier === 'standard' ? 'text-cyan' : 'text-acid'
  return (
    <tr className="border-b border-border">
      <td className="p-3 text-cyan text-[10px]">{model}</td>
      <td className="p-3 text-dim">{provider}</td>
      <td className={`p-3 ${tierColor}`}>{tier}</td>
      <td className="p-3">{input} cr</td>
      <td className="p-3">{output} cr</td>
      <td className="p-3 text-dim text-[10px]">{caps || '—'}</td>
    </tr>
  )
}

function ErrorRow({ code, meaning, action, last }: {
  code: string; meaning: string; action: string; last?: boolean
}) {
  return (
    <tr className={last ? '' : 'border-b border-border'}>
      <td className="p-3 text-blood">{code}</td>
      <td className="p-3 text-dim">{meaning}</td>
      <td className="p-3 text-[10px] text-dim">{action}</td>
    </tr>
  )
}
