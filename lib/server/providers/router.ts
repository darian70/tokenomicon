import { resolveModel, getModelPrice } from '@/lib/server/pricing'
import { openaiAdapter } from './openai'
import { anthropicAdapter } from './anthropic'
import { groqAdapter } from './groq'
import { openrouterAdapter } from './openrouter'
import type {
  ProviderAdapter, ChatRequest, ChatResponse, StreamChunk, ProviderName,
  EmbeddingRequest, EmbeddingResponse,
} from './types'

const adapters: Record<ProviderName, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly statusCode: number = 502,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export async function routeChat(request: ChatRequest): Promise<ChatResponse> {
  const entry = resolveModel(request.model)
  if (!entry) {
    throw new ProviderError(`Model "${request.model}" is not available`, 'openai', 400)
  }

  const adapter = adapters[entry.provider]
  if (!adapter.isConfigured()) {
    if (entry.fallbackModel) {
      const fallback = getModelPrice(entry.fallbackModel)
      if (fallback) {
        const fallbackAdapter = adapters[fallback.provider]
        if (fallbackAdapter.isConfigured()) {
          return fallbackAdapter.chat({ ...request, model: fallback.modelId })
        }
      }
    }
    throw new ProviderError(`Provider ${entry.provider} is not configured`, entry.provider, 503)
  }

  try {
    return await adapter.chat({ ...request, model: entry.modelId })
  } catch (err) {
    if (entry.fallbackModel) {
      const fallback = getModelPrice(entry.fallbackModel)
      if (fallback) {
        const fallbackAdapter = adapters[fallback.provider]
        if (fallbackAdapter.isConfigured()) {
          try {
            return await fallbackAdapter.chat({ ...request, model: fallback.modelId })
          } catch {
            // fallback also failed, throw original
          }
        }
      }
    }
    if (err instanceof Error) {
      throw new ProviderError(err.message, entry.provider)
    }
    throw new ProviderError('Unknown provider error', entry.provider)
  }
}

export function routeStream(request: ChatRequest): { stream: ReadableStream<StreamChunk>; provider: ProviderName; model: string } {
  const entry = resolveModel(request.model)
  if (!entry) throw new ProviderError(`Model "${request.model}" is not available`, 'openai', 400)

  const tryStream = (providerName: ProviderName, modelId: string) => {
    const adapter = adapters[providerName]
    if (!adapter.isConfigured()) return null
    if (!adapter.streamChat) return null
    return { stream: adapter.streamChat({ ...request, model: modelId }), provider: providerName, model: modelId }
  }

  const primary = tryStream(entry.provider, entry.modelId)
  if (primary) return primary

  if (entry.fallbackModel) {
    const fallback = getModelPrice(entry.fallbackModel)
    if (fallback) {
      const fb = tryStream(fallback.provider, fallback.modelId)
      if (fb) return fb
    }
  }

  throw new ProviderError(`No streaming adapter available for ${request.model}`, entry.provider, 503)
}

export async function routeEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
  // Embeddings are currently only available via OpenAI
  if (!openaiAdapter.isConfigured() || !openaiAdapter.embed) {
    throw new ProviderError('Embeddings require an OpenAI API key', 'openai', 503)
  }
  try {
    return await openaiAdapter.embed(request)
  } catch (err) {
    if (err instanceof Error) throw new ProviderError(err.message, 'openai')
    throw new ProviderError('Embedding failed', 'openai')
  }
}

export async function checkProviderHealth(): Promise<Record<ProviderName, { ok: boolean; latencyMs: number }>> {
  const results = await Promise.all(
    Object.entries(adapters).map(async ([name, adapter]) => {
      if (!adapter.isConfigured()) return [name, { ok: false, latencyMs: 0 }] as const
      const result = await adapter.healthCheck()
      return [name, result] as const
    }),
  )
  return Object.fromEntries(results) as Record<ProviderName, { ok: boolean; latencyMs: number }>
}
