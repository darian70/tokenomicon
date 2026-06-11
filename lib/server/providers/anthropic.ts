import { env } from '@/lib/server/env'
import type {
  ProviderAdapter, ChatRequest, ChatResponse, ChatMessage,
  ToolCall, ToolDefinition, ContentPart,
} from './types'
import { estimateContentTokens } from './types'

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

// Convert OpenAI-style tools to Anthropic format
function toAnthropicTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))
}

// Convert OpenAI tool_choice to Anthropic format
function toAnthropicToolChoice(tc: ChatRequest['tool_choice']) {
  if (!tc || tc === 'auto') return { type: 'auto' }
  if (tc === 'none') return { type: 'none' }
  if (tc === 'required') return { type: 'any' }
  if (typeof tc === 'object' && tc.type === 'function') {
    return { type: 'tool', name: tc.function.name }
  }
  return { type: 'auto' }
}

// Convert a user content string | ContentPart[] to Anthropic content blocks
function toAnthropicContent(content: string | ContentPart[]) {
  if (typeof content === 'string') return content
  return content.map((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text }
    if (part.type === 'image_url') {
      const url = part.image_url.url
      // Data URL: data:image/jpeg;base64,...
      if (url.startsWith('data:')) {
        const [header, data] = url.split(',')
        const mediaType = header.split(':')[1].split(';')[0]
        return {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data },
        }
      }
      // Regular URL
      return {
        type: 'image',
        source: { type: 'url', url },
      }
    }
    return { type: 'text', text: '' }
  })
}

// Convert OpenAI message list to Anthropic messages + system
function toAnthropicMessages(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (m as { role: 'system'; content: string }).content)
    .join('\n')

  const anthropicMessages: { role: 'user' | 'assistant'; content: unknown }[] = []

  for (const m of messages) {
    if (m.role === 'system') continue

    if (m.role === 'user') {
      anthropicMessages.push({ role: 'user', content: toAnthropicContent(m.content) })
    } else if (m.role === 'assistant') {
      const blocks: unknown[] = []
      if (m.content) blocks.push({ type: 'text', text: m.content })
      if (m.tool_calls) {
        for (const tc of m.tool_calls) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || '{}'),
          })
        }
      }
      anthropicMessages.push({ role: 'assistant', content: blocks.length > 0 ? blocks : '' })
    } else if (m.role === 'tool') {
      // Anthropic expects tool results as a user message with tool_result blocks
      const last = anthropicMessages[anthropicMessages.length - 1]
      const block = {
        type: 'tool_result',
        tool_use_id: m.tool_call_id,
        content: m.content,
      }
      if (last?.role === 'user' && Array.isArray(last.content)) {
        (last.content as unknown[]).push(block)
      } else {
        anthropicMessages.push({ role: 'user', content: [block] })
      }
    }
  }

  return { system: system || undefined, messages: anthropicMessages }
}

// Extract tool calls from Anthropic response content blocks
function extractToolCalls(content: { type: string; id?: string; name?: string; input?: unknown }[]): ToolCall[] {
  return content
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({
      id: b.id ?? '',
      type: 'function' as const,
      function: { name: b.name ?? '', arguments: JSON.stringify(b.input ?? {}) },
    }))
}

export const anthropicAdapter: ProviderAdapter = {
  name: 'anthropic',

  isConfigured() {
    return !!env.ANTHROPIC_API_KEY
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!env.ANTHROPIC_API_KEY) throw new Error('Anthropic not configured')

    const { system, messages } = toAnthropicMessages(request.messages)

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages,
      ...(system && { system }),
    }
    if (request.tools?.length) {
      body.tools = toAnthropicTools(request.tools)
      body.tool_choice = toAnthropicToolChoice(request.tool_choice)
    }

    const start = Date.now()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const latencyMs = Date.now() - start

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Anthropic ${res.status}: ${errBody}`)
    }

    const json = await res.json()
    const contentBlocks: { type: string; text?: string; id?: string; name?: string; input?: unknown }[] =
      json.content ?? []
    const text = contentBlocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
    const toolCalls = extractToolCalls(contentBlocks)
    const stopReason = json.stop_reason
    const finishReason =
      stopReason === 'tool_use' ? 'tool_calls'
      : stopReason === 'max_tokens' ? 'length'
      : 'stop'

    const usage = json.usage ?? {}
    const promptTokens = usage.input_tokens ?? estimateTokens(request.messages)
    const completionTokens = usage.output_tokens ?? Math.max(1, Math.ceil(text.length / 4))

    return {
      provider: 'anthropic',
      model: request.model,
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      raw: json,
    }
  },

  async healthCheck() {
    if (!env.ANTHROPIC_API_KEY) return { ok: false, latencyMs: 0 }
    try {
      const start = Date.now()
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(8000),
      })
      return { ok: res.ok, latencyMs: Date.now() - start }
    } catch {
      return { ok: false, latencyMs: 0 }
    }
  },
}
