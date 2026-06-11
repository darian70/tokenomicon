import { env } from '@/lib/server/env'
import type {
  ProviderAdapter, ChatRequest, ChatResponse, ChatMessage,
  EmbeddingRequest, EmbeddingResponse,
} from './types'
import { estimateContentTokens } from './types'
import { makeOpenAICompatStream } from './stream-utils'

function estimateTokens(messages: ChatMessage[]) {
  return Math.max(
    1,
    messages.reduce((acc, m) => {
      if ('content' in m && m.content != null) {
        return acc + estimateContentTokens(m.content as string)
      }
      return acc + 4
    }, 0),
  )
}

function toOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.role === 'assistant') {
      return {
        role: 'assistant' as const,
        content: m.content ?? null,
        ...(m.tool_calls && { tool_calls: m.tool_calls }),
      }
    }
    if (m.role === 'tool') {
      return { role: 'tool' as const, tool_call_id: m.tool_call_id, content: m.content }
    }
    // system and user — content may be string or ContentPart[]
    return { role: m.role, content: m.content }
  })
}

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',

  isConfigured() {
    return !!env.OPENAI_API_KEY
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!env.OPENAI_API_KEY) throw new Error('OpenAI not configured')

    const start = Date.now()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: toOpenAIMessages(request.messages),
        ...(request.maxTokens && { max_tokens: request.maxTokens }),
        ...(request.tools?.length && { tools: request.tools }),
        ...(request.tools?.length && request.tool_choice !== undefined && { tool_choice: request.tool_choice }),
      }),
    })

    const latencyMs = Date.now() - start

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenAI ${res.status}: ${body}`)
    }

    const json = await res.json()
    const usage = json.usage ?? {}
    const choice = json.choices?.[0]
    const message = choice?.message ?? {}
    const text = message.content ?? ''
    const toolCalls = message.tool_calls
    const finishReason = choice?.finish_reason ?? 'stop'
    const promptTokens = usage.prompt_tokens ?? estimateTokens(request.messages)
    const completionTokens = usage.completion_tokens ?? Math.max(1, Math.ceil((text as string).length / 4))

    return {
      provider: 'openai',
      model: request.model,
      text: text as string,
      toolCalls,
      finishReason,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      raw: json,
    }
  },

  streamChat(request: ChatRequest) {
    if (!env.OPENAI_API_KEY) throw new Error('OpenAI not configured')
    const apiKey = env.OPENAI_API_KEY
    return makeOpenAICompatStream(() =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: request.model,
          messages: toOpenAIMessages(request.messages),
          stream: true,
          stream_options: { include_usage: true },
          ...(request.maxTokens && { max_tokens: request.maxTokens }),
          ...(request.tools?.length && { tools: request.tools }),
          ...(request.tools?.length && request.tool_choice !== undefined && { tool_choice: request.tool_choice }),
        }),
      })
    )
  },

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!env.OPENAI_API_KEY) throw new Error('OpenAI not configured')

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: request.model,
        input: request.input,
        encoding_format: request.encoding_format ?? 'float',
        ...(request.dimensions && { dimensions: request.dimensions }),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenAI ${res.status}: ${body}`)
    }

    const json = await res.json()
    const embeddings = (json.data as { embedding: number[] }[]).map((d) => d.embedding)
    const promptTokens = json.usage?.prompt_tokens ?? 0

    return { provider: 'openai', model: request.model, embeddings, promptTokens, raw: json }
  },

  async healthCheck() {
    if (!env.OPENAI_API_KEY) return { ok: false, latencyMs: 0 }
    try {
      const start = Date.now()
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      return { ok: res.ok, latencyMs: Date.now() - start }
    } catch {
      return { ok: false, latencyMs: 0 }
    }
  },
}
