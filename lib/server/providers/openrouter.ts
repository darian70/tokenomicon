import { env } from '@/lib/server/env'
import type { ProviderAdapter, ChatRequest, ChatResponse, ChatMessage, ContentPart } from './types'
import { estimateContentTokens } from './types'
import { makeOpenAICompatStream } from './stream-utils'

const HEADERS_BASE = {
  'content-type': 'application/json',
  'x-title': 'Tokenomicon',
  'http-referer': 'https://tokenomicon.io',
} as const

function estimateTokens(messages: ChatMessage[]) {
  return Math.max(
    1,
    messages.reduce((acc, m) => {
      if ('content' in m && m.content != null) {
        return acc + estimateContentTokens(m.content as string | ContentPart[])
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
    return { role: m.role, content: m.content }
  })
}

export const openrouterAdapter: ProviderAdapter = {
  name: 'openrouter',

  isConfigured() {
    return !!env.OPENROUTER_API_KEY
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!env.OPENROUTER_API_KEY) throw new Error('OpenRouter not configured')

    const start = Date.now()
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { ...HEADERS_BASE, authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
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
      throw new Error(`OpenRouter ${res.status}: ${body}`)
    }

    const json = await res.json()
    const usage = json.usage ?? {}
    const choice = json.choices?.[0]
    const message = choice?.message ?? {}
    const text = message.content ?? ''
    const toolCalls = message.tool_calls
    const finishReason = choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop'
    const promptTokens = usage.prompt_tokens ?? estimateTokens(request.messages)
    const completionTokens = usage.completion_tokens ?? Math.max(1, Math.ceil((text as string).length / 4))

    return {
      provider: 'openrouter',
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
    if (!env.OPENROUTER_API_KEY) throw new Error('OpenRouter not configured')
    const apiKey = env.OPENROUTER_API_KEY
    return makeOpenAICompatStream(() =>
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { ...HEADERS_BASE, authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: request.model,
          messages: toOpenAIMessages(request.messages),
          stream: true,
          ...(request.maxTokens && { max_tokens: request.maxTokens }),
          ...(request.tools?.length && { tools: request.tools }),
          ...(request.tools?.length && request.tool_choice !== undefined && { tool_choice: request.tool_choice }),
        }),
      })
    )
  },

  async healthCheck() {
    if (!env.OPENROUTER_API_KEY) return { ok: false, latencyMs: 0 }
    try {
      const start = Date.now()
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { ...HEADERS_BASE, authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      return { ok: res.ok, latencyMs: Date.now() - start }
    } catch {
      return { ok: false, latencyMs: 0 }
    }
  },
}
