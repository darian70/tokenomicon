import { env } from './env'

export interface ProviderBalance {
  provider: string
  balanceUsd: number | null
  error: string | null
  fetchedAt: string
}

// ── OpenRouter ───────────────────────────────────────────────────────────────
// GET https://openrouter.ai/api/v1/auth/key → { data: { limit_remaining, usage, ... } }
async function fetchOpenRouterBalance(): Promise<ProviderBalance> {
  if (!env.OPENROUTER_API_KEY) return { provider: 'openrouter', balanceUsd: null, error: 'Not configured', fetchedAt: new Date().toISOString() }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    // limit_remaining is in USD credits
    const balanceUsd = (json.data?.limit_remaining as number) ?? null
    return { provider: 'openrouter', balanceUsd, error: null, fetchedAt: new Date().toISOString() }
  } catch (e) {
    return { provider: 'openrouter', balanceUsd: null, error: String(e), fetchedAt: new Date().toISOString() }
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
// OpenAI does not expose a simple balance endpoint on pay-as-you-go.
// We use the billing subscription endpoint which gives soft_limit_usd / hard_limit_usd
// and then compare to usage. On project-based orgs this may 401 — we handle gracefully.
async function fetchOpenAIBalance(): Promise<ProviderBalance> {
  if (!env.OPENAI_API_KEY) return { provider: 'openai', balanceUsd: null, error: 'Not configured', fetchedAt: new Date().toISOString() }
  try {
    // Try the newer /dashboard/billing/subscription endpoint
    const res = await fetch('https://api.openai.com/dashboard/billing/subscription', {
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) {
      // Org/project key — can't read balance this way
      return { provider: 'openai', balanceUsd: null, error: 'Balance unavailable for project keys (check OpenAI dashboard)', fetchedAt: new Date().toISOString() }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const hardLimit = (json.hard_limit_usd as number) ?? null
    return { provider: 'openai', balanceUsd: hardLimit, error: null, fetchedAt: new Date().toISOString() }
  } catch (e) {
    return { provider: 'openai', balanceUsd: null, error: String(e), fetchedAt: new Date().toISOString() }
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────
// Anthropic has no public balance API — pay-as-you-go with credit card.
// We return a static note.
async function fetchAnthropicBalance(): Promise<ProviderBalance> {
  if (!env.ANTHROPIC_API_KEY) return { provider: 'anthropic', balanceUsd: null, error: 'Not configured', fetchedAt: new Date().toISOString() }
  return {
    provider: 'anthropic',
    balanceUsd: null,
    error: 'Anthropic is pay-as-you-go — monitor at console.anthropic.com',
    fetchedAt: new Date().toISOString(),
  }
}

// ── Groq ─────────────────────────────────────────────────────────────────────
// Groq free tier has no balance; paid plans are invoice-based.
async function fetchGroqBalance(): Promise<ProviderBalance> {
  if (!env.GROQ_API_KEY) return { provider: 'groq', balanceUsd: null, error: 'Not configured', fetchedAt: new Date().toISOString() }
  return {
    provider: 'groq',
    balanceUsd: null,
    error: 'Groq is invoice/prepaid — monitor at console.groq.com',
    fetchedAt: new Date().toISOString(),
  }
}

export async function fetchAllProviderBalances(): Promise<ProviderBalance[]> {
  const results = await Promise.allSettled([
    fetchOpenRouterBalance(),
    fetchOpenAIBalance(),
    fetchAnthropicBalance(),
    fetchGroqBalance(),
  ])
  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { provider: 'unknown', balanceUsd: null, error: String(r.reason), fetchedAt: new Date().toISOString() }
  )
}

// Low-balance threshold: warn if below $10 for any provider
export const LOW_BALANCE_THRESHOLD_USD = 10

export function checkLowBalances(balances: ProviderBalance[]): string[] {
  return balances
    .filter((b) => b.balanceUsd !== null && b.balanceUsd < LOW_BALANCE_THRESHOLD_USD)
    .map((b) => `${b.provider}: $${b.balanceUsd?.toFixed(2)} remaining (below $${LOW_BALANCE_THRESHOLD_USD} threshold)`)
}
