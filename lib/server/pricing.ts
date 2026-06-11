import type { ProviderName } from './providers/types'

export type ModelTier = 'economy' | 'standard' | 'premium'
export type ModelFamily = 'chat' | 'embedding'

// 1 credit = $0.001 USD (1/10th of a cent).  1,000 credits = $1.
// Prices below represent what Tokenomicon charges users in credits per 1K tokens.
// providerInputCostUsdPer1M / providerOutputCostUsdPer1M = what we actually pay the provider.
// Markup = (userCredits * 0.001) / (providerUSD)  →  target 2×–3× margin.
export const CREDIT_USD = 0.001 // 1 credit = $0.001

export interface ModelPriceEntry {
  provider: ProviderName
  modelId: string
  displayName: string
  family: ModelFamily
  // What Tokenomicon charges users (credits per 1K tokens)
  inputCostPer1kCredits: number
  outputCostPer1kCredits: number
  // What Tokenomicon pays the provider (USD per 1M tokens) — for reconciliation
  providerInputCostUsdPer1M: number
  providerOutputCostUsdPer1M: number
  maxOutputTokens: number
  enabled: boolean
  fallbackModel: string | null
  tier: ModelTier
}

// Markup helper: user pays X credits, provider costs Y USD per 1M.
// Markup = (X * 0.001) / (Y / 1000)  =  (X * 1) / (Y)
export function markupRatio(entry: ModelPriceEntry): { input: number; output: number } {
  return {
    input: (entry.inputCostPer1kCredits * CREDIT_USD) / (entry.providerInputCostUsdPer1M / 1_000_000 * 1_000),
    output: (entry.outputCostPer1kCredits * CREDIT_USD) / (entry.providerOutputCostUsdPer1M / 1_000_000 * 1_000),
  }
}

// Cost in USD for a given usage (for reconciliation)
export function providerCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const entry = getModelPrice(model)
  if (!entry) return 0
  const inputUsd = (promptTokens / 1_000_000) * entry.providerInputCostUsdPer1M
  const outputUsd = (completionTokens / 1_000_000) * entry.providerOutputCostUsdPer1M
  return inputUsd + outputUsd
}

// Revenue in USD for a given credit charge
export function revenueUsd(creditAmount: number): number {
  return creditAmount * CREDIT_USD
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL PRICE TABLE
// User charges: credits per 1K tokens (1 credit = $0.001)
// Provider costs: USD per 1M tokens (public rack rates as of 2025-05)
// Target markup: ~2.5× on input, ~2.5× on output
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_PRICES: Record<string, ModelPriceEntry> = {
  // ── OpenAI Chat ───────────────────────────────────────────────────────────
  'gpt-4o': {
    provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'chat',
    inputCostPer1kCredits: 3, outputCostPer1kCredits: 12,
    providerInputCostUsdPer1M: 2.50, providerOutputCostUsdPer1M: 10.00,
    maxOutputTokens: 4096, enabled: true, fallbackModel: 'gpt-4o-mini', tier: 'premium',
  },
  'gpt-4o-mini': {
    provider: 'openai', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 3,
    providerInputCostUsdPer1M: 0.15, providerOutputCostUsdPer1M: 0.60,
    maxOutputTokens: 4096, enabled: true, fallbackModel: null, tier: 'standard',
  },
  'o3-mini': {
    provider: 'openai', modelId: 'o3-mini', displayName: 'o3-mini', family: 'chat',
    inputCostPer1kCredits: 6, outputCostPer1kCredits: 24,
    providerInputCostUsdPer1M: 1.10, providerOutputCostUsdPer1M: 4.40,
    maxOutputTokens: 4096, enabled: true, fallbackModel: 'gpt-4o', tier: 'premium',
  },
  // ── OpenAI Embeddings ─────────────────────────────────────────────────────
  'text-embedding-3-small': {
    provider: 'openai', modelId: 'text-embedding-3-small', displayName: 'Embedding 3 Small', family: 'embedding',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 0,
    providerInputCostUsdPer1M: 0.02, providerOutputCostUsdPer1M: 0,
    maxOutputTokens: 0, enabled: true, fallbackModel: null, tier: 'economy',
  },
  'text-embedding-3-large': {
    provider: 'openai', modelId: 'text-embedding-3-large', displayName: 'Embedding 3 Large', family: 'embedding',
    inputCostPer1kCredits: 2, outputCostPer1kCredits: 0,
    providerInputCostUsdPer1M: 0.13, providerOutputCostUsdPer1M: 0,
    maxOutputTokens: 0, enabled: true, fallbackModel: 'text-embedding-3-small', tier: 'standard',
  },
  'text-embedding-ada-002': {
    provider: 'openai', modelId: 'text-embedding-ada-002', displayName: 'Embedding Ada 002', family: 'embedding',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 0,
    providerInputCostUsdPer1M: 0.10, providerOutputCostUsdPer1M: 0,
    maxOutputTokens: 0, enabled: true, fallbackModel: 'text-embedding-3-small', tier: 'economy',
  },
  // ── Anthropic ─────────────────────────────────────────────────────────────
  'claude-sonnet-4-20250514': {
    provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', family: 'chat',
    inputCostPer1kCredits: 4, outputCostPer1kCredits: 16,
    providerInputCostUsdPer1M: 3.00, providerOutputCostUsdPer1M: 15.00,
    maxOutputTokens: 4096, enabled: true, fallbackModel: 'claude-3-5-haiku-20241022', tier: 'premium',
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic', modelId: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', family: 'chat',
    inputCostPer1kCredits: 2, outputCostPer1kCredits: 7,
    providerInputCostUsdPer1M: 0.80, providerOutputCostUsdPer1M: 4.00,
    maxOutputTokens: 4096, enabled: true, fallbackModel: null, tier: 'standard',
  },
  // ── Groq ──────────────────────────────────────────────────────────────────
  'llama-3.3-70b-versatile': {
    provider: 'groq', modelId: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 1,
    providerInputCostUsdPer1M: 0.59, providerOutputCostUsdPer1M: 0.79,
    maxOutputTokens: 4096, enabled: true, fallbackModel: 'gemma2-9b-it', tier: 'economy',
  },
  'gemma2-9b-it': {
    provider: 'groq', modelId: 'gemma2-9b-it', displayName: 'Gemma 2 9B', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 1,
    providerInputCostUsdPer1M: 0.20, providerOutputCostUsdPer1M: 0.20,
    maxOutputTokens: 4096, enabled: true, fallbackModel: null, tier: 'economy',
  },
  'mixtral-8x7b-32768': {
    provider: 'groq', modelId: 'mixtral-8x7b-32768', displayName: 'Mixtral 8x7B', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 1,
    providerInputCostUsdPer1M: 0.24, providerOutputCostUsdPer1M: 0.24,
    maxOutputTokens: 4096, enabled: true, fallbackModel: null, tier: 'economy',
  },
  // ── OpenRouter ────────────────────────────────────────────────────────────
  'deepseek/deepseek-chat-v3-0324': {
    provider: 'openrouter', modelId: 'deepseek/deepseek-chat-v3-0324', displayName: 'DeepSeek V3', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 2,
    providerInputCostUsdPer1M: 0.27, providerOutputCostUsdPer1M: 1.10,
    maxOutputTokens: 8192, enabled: true, fallbackModel: 'gpt-4o-mini', tier: 'standard',
  },
  'deepseek/deepseek-r1': {
    provider: 'openrouter', modelId: 'deepseek/deepseek-r1', displayName: 'DeepSeek R1', family: 'chat',
    inputCostPer1kCredits: 2, outputCostPer1kCredits: 8,
    providerInputCostUsdPer1M: 0.55, providerOutputCostUsdPer1M: 2.19,
    maxOutputTokens: 8192, enabled: true, fallbackModel: 'deepseek/deepseek-chat-v3-0324', tier: 'premium',
  },
  'google/gemini-2.5-flash-preview': {
    provider: 'openrouter', modelId: 'google/gemini-2.5-flash-preview', displayName: 'Gemini 2.5 Flash', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 2,
    providerInputCostUsdPer1M: 0.15, providerOutputCostUsdPer1M: 0.60,
    maxOutputTokens: 8192, enabled: true, fallbackModel: 'gpt-4o-mini', tier: 'standard',
  },
  'google/gemini-2.5-pro-preview': {
    provider: 'openrouter', modelId: 'google/gemini-2.5-pro-preview', displayName: 'Gemini 2.5 Pro', family: 'chat',
    inputCostPer1kCredits: 3, outputCostPer1kCredits: 12,
    providerInputCostUsdPer1M: 1.25, providerOutputCostUsdPer1M: 10.00,
    maxOutputTokens: 8192, enabled: true, fallbackModel: 'google/gemini-2.5-flash-preview', tier: 'premium',
  },
  'mistralai/mistral-small-3.2-24b-instruct': {
    provider: 'openrouter', modelId: 'mistralai/mistral-small-3.2-24b-instruct', displayName: 'Mistral Small 3.2', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 1,
    providerInputCostUsdPer1M: 0.10, providerOutputCostUsdPer1M: 0.30,
    maxOutputTokens: 4096, enabled: true, fallbackModel: null, tier: 'economy',
  },
  'meta-llama/llama-4-maverick': {
    provider: 'openrouter', modelId: 'meta-llama/llama-4-maverick', displayName: 'Llama 4 Maverick', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 3,
    providerInputCostUsdPer1M: 0.22, providerOutputCostUsdPer1M: 0.88,
    maxOutputTokens: 8192, enabled: true, fallbackModel: 'mistralai/mistral-small-3.2-24b-instruct', tier: 'standard',
  },
  'qwen/qwen3-235b-a22b': {
    provider: 'openrouter', modelId: 'qwen/qwen3-235b-a22b', displayName: 'Qwen 3 235B', family: 'chat',
    inputCostPer1kCredits: 1, outputCostPer1kCredits: 3,
    providerInputCostUsdPer1M: 0.14, providerOutputCostUsdPer1M: 0.60,
    maxOutputTokens: 8192, enabled: true, fallbackModel: null, tier: 'standard',
  },
}

export function getModelPrice(model: string): ModelPriceEntry | null {
  return MODEL_PRICES[model] ?? null
}

export function resolveModel(model: string): ModelPriceEntry | null {
  const entry = getModelPrice(model)
  if (entry && entry.enabled) return entry
  if (entry && !entry.enabled && entry.fallbackModel) {
    return getModelPrice(entry.fallbackModel)
  }
  return null
}

export function creditsForUsage(model: string, promptTokens: number, completionTokens: number): number {
  const entry = getModelPrice(model)
  if (!entry) {
    return Math.max(1, Math.ceil((promptTokens + completionTokens) / 10))
  }
  const inputCost = Math.ceil((promptTokens * entry.inputCostPer1kCredits) / 1000)
  const outputCost = Math.ceil((completionTokens * entry.outputCostPer1kCredits) / 1000)
  return Math.max(1, inputCost + outputCost)
}

export function creditsForEmbedding(model: string, tokens: number): number {
  const entry = getModelPrice(model)
  if (!entry) return Math.max(1, Math.ceil(tokens / 1000))
  return Math.max(1, Math.ceil((tokens * entry.inputCostPer1kCredits) / 1000))
}

export function estimateMaxCost(model: string, promptTokens: number): number {
  const entry = getModelPrice(model)
  if (!entry) return Math.max(1, Math.ceil(promptTokens / 5))
  const inputCost = Math.ceil((promptTokens * entry.inputCostPer1kCredits) / 1000)
  const outputCost = Math.ceil((entry.maxOutputTokens * entry.outputCostPer1kCredits) / 1000)
  return Math.max(1, inputCost + outputCost)
}

export function listEnabledModels(): (ModelPriceEntry & { model: string })[] {
  return Object.entries(MODEL_PRICES)
    .filter(([, entry]) => entry.enabled)
    .map(([model, entry]) => ({ ...entry, model }))
}
