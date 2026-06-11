export type ProviderName = 'openai' | 'anthropic' | 'groq' | 'openrouter'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ToolDefinition = {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

export type ToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } }

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content?: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string; name?: string }

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  maxTokens?: number
  tools?: ToolDefinition[]
  tool_choice?: ToolChoice
}

export interface ChatResponse {
  provider: ProviderName
  model: string
  text: string
  toolCalls?: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  raw: unknown
}

export interface ToolCallProgress {
  index: number
  id: string
  name: string
  argumentsSoFar: string
}

export interface StreamChunk {
  delta: string
  done: boolean
  promptTokens?: number
  completionTokens?: number
  toolCalls?: ToolCall[]
  toolCallProgress?: ToolCallProgress[]
  finishReason?: string
}

export interface EmbeddingRequest {
  model: string
  input: string | string[]
  encoding_format?: 'float' | 'base64'
  dimensions?: number
}

export interface EmbeddingResponse {
  provider: ProviderName
  model: string
  embeddings: number[][]
  promptTokens: number
  raw: unknown
}

export interface ProviderAdapter {
  name: ProviderName
  chat(request: ChatRequest): Promise<ChatResponse>
  streamChat?(request: ChatRequest): ReadableStream<StreamChunk>
  embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>
  isConfigured(): boolean
}

export function extractTextContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content
  return content
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

export function estimateContentTokens(content: string | ContentPart[]): number {
  const text = extractTextContent(content)
  const chars = text.length
  // Add ~85 tokens per image (low-detail estimate)
  const images = typeof content === 'string' ? 0 :
    content.filter((p) => p.type === 'image_url').length
  return Math.max(1, Math.ceil(chars / 4) + images * 85)
}
