'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelInfo {
  model: string
  displayName: string
  provider: string
  tier: string
  inputCostPer1kCredits: number
  outputCostPer1kCredits: number
}

interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface ToolCallInProgress {
  index: number
  id: string
  name: string
  argumentsSoFar: string
}

type PlaygroundMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string }

// ---------------------------------------------------------------------------
// Built-in demo tools
// ---------------------------------------------------------------------------

const DEMO_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'calculator',
      description: 'Evaluates a safe mathematical expression and returns the numeric result.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression, e.g. "12 * (3 + 4)"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'word_count',
      description: 'Counts words, characters, and sentences in a block of text.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to analyze' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_current_time',
      description: 'Returns the current UTC date and time.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reverse_string',
      description: 'Reverses a string character by character.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The string to reverse' },
        },
        required: ['text'],
      },
    },
  },
]

function executeTool(name: string, rawArgs: string): string {
  try {
    const args = JSON.parse(rawArgs || '{}') as Record<string, unknown>
    switch (name) {
      case 'calculator': {
        const expr = String(args.expression ?? '').trim()
        if (!/^[0-9+\-*/().,% \t]+$/.test(expr)) return 'Error: expression contains unsafe characters'
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${expr})`)()
        return String(result)
      }
      case 'word_count': {
        const text = String(args.text ?? '')
        const words = text.trim() ? text.trim().split(/\s+/).length : 0
        const sentences = text.split(/[.!?]+\s/).filter(Boolean).length
        return JSON.stringify({ words, characters: text.length, sentences })
      }
      case 'get_current_time': {
        return new Date().toUTCString()
      }
      case 'reverse_string': {
        return String(args.text ?? '').split('').reverse().join('')
      }
      default:
        return `Error: unknown tool "${name}"`
    }
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  economy: '#a8e063',
  standard: '#5ad8ff',
  premium: '#ffd700',
}

function ToolCallBlock({
  call,
  result,
  inProgress,
}: {
  call?: ToolCall
  result?: string
  inProgress?: ToolCallInProgress
}) {
  const name = call?.function.name ?? inProgress?.name ?? '…'
  const rawArgs = call?.function.arguments ?? inProgress?.argumentsSoFar ?? ''
  let prettyArgs = rawArgs
  try {
    prettyArgs = JSON.stringify(JSON.parse(rawArgs), null, 2)
  } catch { /* keep raw */ }
  const isLive = !call && !!inProgress

  return (
    <div className="rounded-lg border border-[#2a3a1a] bg-[#0a1508] overflow-hidden text-xs font-mono">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a2a10] bg-[#0c1a08]">
        <span className="text-[#a8e063]">⚡</span>
        <span className="font-bold text-[#a8e063]">{name}</span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1 text-[#4a6a3a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a8e063] animate-pulse" />
            streaming
          </span>
        )}
        {!isLive && result !== undefined && (
          <span className="ml-auto text-[#4a6a3a]">done</span>
        )}
      </div>
      <div className="px-3 py-2 space-y-2">
        <div>
          <p className="text-[10px] text-[#4a6a3a] mb-1">ARGS</p>
          <pre className="text-[#a8b8cc] whitespace-pre-wrap break-all leading-relaxed">
            {prettyArgs || '{}'}
            {isLive && <span className="animate-pulse text-[#a8e063]">▌</span>}
          </pre>
        </div>
        {result !== undefined && (
          <div>
            <p className="text-[10px] text-[#4a6a3a] mb-1">RESULT</p>
            <p className="text-[#59f5a9] whitespace-pre-wrap break-all">{result}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  modelName,
  toolResults,
  liveToolCalls,
}: {
  msg: PlaygroundMessage
  modelName: string
  toolResults: Map<string, string>
  liveToolCalls: ToolCallInProgress[]
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] border border-[#5ad8ff]/30 bg-[#5ad8ff]/5 p-3 rounded-xl">
          <p className="text-[9px] font-display tracking-widest text-[#4a5a6d] mb-1">YOU</p>
          <p className="text-sm font-mono text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
      </div>
    )
  }

  if (msg.role === 'tool') {
    // Tool results are shown inside the assistant ToolCallBlock, not as separate bubbles
    return null
  }

  if (msg.role === 'assistant') {
    const hasCalls = msg.tool_calls && msg.tool_calls.length > 0
    const hasContent = msg.content.trim().length > 0
    const showLive = liveToolCalls.length > 0

    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          <p className="text-[9px] font-display tracking-widest text-[#4a5a6d] px-1">
            {modelName.toUpperCase()}
          </p>
          {hasContent && (
            <div className="border border-[#a8e063]/20 bg-[#a8e063]/5 p-3 rounded-xl">
              <p className="text-sm font-mono text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          )}
          {hasCalls && msg.tool_calls!.map((tc) => (
            <ToolCallBlock
              key={tc.id}
              call={tc}
              result={toolResults.get(tc.id)}
            />
          ))}
          {showLive && liveToolCalls.map((tc) => (
            <ToolCallBlock key={tc.index} inProgress={tc} />
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlaygroundPage() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [input, setInput] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<{
    promptTokens: number; completionTokens: number; cost: number; latencyMs: number
  } | null>(null)
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set())
  const [toolResults, setToolResults] = useState<Map<string, string>>(new Map())
  const [liveToolCalls, setLiveToolCalls] = useState<ToolCallInProgress[]>([])
  const [sidebarTab, setSidebarTab] = useState<'model' | 'tools'>('model')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/v1/models')
      .then((r) => r.json())
      .then((data) => {
        const list = (data.data ?? []).map((m: Record<string, unknown>) => ({
          model: m.id as string,
          displayName: m.displayName as string ?? m.id,
          provider: m.provider as string ?? '',
          tier: m.tier as string ?? '',
          inputCostPer1kCredits: m.inputCostPer1kCredits as number ?? 0,
          outputCostPer1kCredits: m.outputCostPer1kCredits as number ?? 0,
        }))
        setModels(list)
        if (list.length > 0) setSelectedModel(list[0].model)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveToolCalls])

  const currentModel = models.find((m) => m.model === selectedModel)
  const selectedTools = DEMO_TOOLS.filter((t) => enabledTools.has(t.function.name))

  // Core send function — builds the SSE request and handles the streaming loop.
  // accResults carries tool results accumulated across recursive continuation turns
  // so the function never reads from stale state.
  const sendRequest = useCallback(async (msgs: PlaygroundMessage[], accResults: Map<string, string> = new Map()) => {
    const start = Date.now()
    setError(null)
    setLiveToolCalls([])

    const apiMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...msgs,
    ]

    try {
      const res = await fetch('/api/playground/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
          ...(selectedTools.length > 0 && { tools: selectedTools }),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let accumulated = ''
      let finalToolCalls: ToolCall[] | null = null
      let currentLive: ToolCallInProgress[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') break

          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta
            const usage = json.usage

            if (delta?.content) {
              accumulated += delta.content
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: accumulated },
              ])
            }

            if (delta?.tool_call_progress) {
              currentLive = delta.tool_call_progress as ToolCallInProgress[]
              setLiveToolCalls([...currentLive])
              // Ensure there's an empty assistant message placeholder in thread
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') return prev
                return [...prev, { role: 'assistant', content: '' }]
              })
            }

            if (delta?.tool_calls) {
              finalToolCalls = delta.tool_calls as ToolCall[]
            }

            if (usage) {
              setLastUsage({
                promptTokens: usage.prompt_tokens ?? 0,
                completionTokens: usage.completion_tokens ?? 0,
                cost: usage.cost_credits ?? 0,
                latencyMs: Date.now() - start,
              })
            }
          } catch { /* skip malformed */ }
        }
      }

      setLiveToolCalls([])

      // If the model made tool calls, execute them and loop
      if (finalToolCalls && finalToolCalls.length > 0) {
        // Finalize the assistant message with its tool_calls
        const assistantWithCalls: PlaygroundMessage = {
          role: 'assistant',
          content: accumulated,
          tool_calls: finalToolCalls,
        }
        const newResults = new Map(accResults)
        const toolMsgs: PlaygroundMessage[] = []

        for (const tc of finalToolCalls) {
          const result = executeTool(tc.function.name, tc.function.arguments)
          newResults.set(tc.id, result)
          toolMsgs.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function.name,
            content: result,
          })
        }

        setToolResults(newResults)
        // Append assistant-with-calls + tool results to the conversation
        const continuationMsgs: PlaygroundMessage[] = [...msgs, assistantWithCalls, ...toolMsgs]
        // Swap streaming placeholder for the finalized assistant message
        setMessages((prev) => [
          ...prev.slice(0, -1),
          assistantWithCalls,
        ])
        // Add a fresh placeholder for the continuation response
        setMessages((prev) => [...prev, { role: 'assistant' as const, content: '' }])
        await sendRequest(continuationMsgs, newResults)
      }
    } catch (e) {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return last?.role === 'assistant' && !last.content && !last.tool_calls
          ? prev.slice(0, -1)
          : prev
      })
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
      setLiveToolCalls([])
    }
  }, [selectedModel, systemPrompt, selectedTools])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: PlaygroundMessage = { role: 'user', content: input.trim() }
    const nextMsgs: PlaygroundMessage[] = [...messages, userMsg]
    setMessages([...nextMsgs, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)
    await sendRequest(nextMsgs)
  }

  function handleClear() {
    setMessages([])
    setLastUsage(null)
    setError(null)
    setToolResults(new Map())
    setLiveToolCalls([])
  }

  function toggleTool(name: string) {
    setEnabledTools((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <div className="flex h-[calc(100vh-2.75rem)] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-72 border-r border-[#192433] flex flex-col overflow-hidden bg-[#070a10]">

        {/* Tab switcher */}
        <div className="flex border-b border-[#192433]">
          {(['model', 'tools'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-2.5 text-[10px] font-display tracking-widest transition-colors ${
                sidebarTab === tab
                  ? 'text-[#5ad8ff] border-b-2 border-[#5ad8ff]'
                  : 'text-[#4a5a6d] hover:text-[#a8b8cc]'
              }`}
            >
              {tab.toUpperCase()}
              {tab === 'tools' && enabledTools.size > 0 && (
                <span className="ml-1 px-1 rounded-full bg-[#a8e063]/20 text-[#a8e063] text-[9px]">
                  {enabledTools.size}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'model' && (
            <>
              {/* Model list */}
              <div className="p-4 border-b border-[#192433]">
                <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-3">SELECT MODEL</p>
                <div className="flex flex-col gap-1">
                  {models.map((m) => (
                    <button
                      key={m.model}
                      onClick={() => setSelectedModel(m.model)}
                      className={`text-left border p-2 rounded-lg transition-all ${
                        m.model === selectedModel
                          ? 'border-[#a8e063]/40 bg-[#a8e063]/5'
                          : 'border-[#192433] hover:border-[#5ad8ff]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-white">{m.displayName}</span>
                        <span
                          className="text-[9px] font-display tracking-wider"
                          style={{ color: TIER_COLORS[m.tier] ?? '#4a5a6d' }}
                        >
                          {m.tier?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] font-mono text-[#4a5a6d]">{m.provider}</span>
                        <span className="text-[9px] font-mono text-[#4a5a6d]">
                          {m.inputCostPer1kCredits}/{m.outputCostPer1kCredits} cr/1K
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* System prompt */}
              <div className="p-4 border-b border-[#192433]">
                <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-2">SYSTEM PROMPT</p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  className="w-full h-24 bg-[#0c111a] border border-[#192433] rounded-lg p-2 text-xs font-mono text-white resize-none focus:outline-none focus:border-[#5ad8ff]/40 placeholder:text-[#3a4a5a]"
                />
              </div>

              {/* Usage stats */}
              {lastUsage && (
                <div className="p-4">
                  <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-2">LAST REQUEST</p>
                  <div className="text-[10px] font-mono space-y-1">
                    <p>Prompt: <span className="text-[#5ad8ff]">{lastUsage.promptTokens} tokens</span></p>
                    <p>Completion: <span className="text-[#5ad8ff]">{lastUsage.completionTokens} tokens</span></p>
                    <p>Cost: <span className="text-[#ffd700]">{lastUsage.cost} credits</span></p>
                    <p>Latency: <span className="text-[#a8e063]">{lastUsage.latencyMs}ms</span></p>
                  </div>
                </div>
              )}
            </>
          )}

          {sidebarTab === 'tools' && (
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d]">BUILT-IN TOOLS</p>
              <p className="text-[10px] font-mono text-[#3a4a5a] leading-relaxed">
                Enable tools for the model to call. Results execute client-side — no server round-trip.
              </p>
              {DEMO_TOOLS.map((tool) => {
                const on = enabledTools.has(tool.function.name)
                return (
                  <button
                    key={tool.function.name}
                    onClick={() => toggleTool(tool.function.name)}
                    className={`w-full text-left border rounded-lg p-3 transition-all ${
                      on
                        ? 'border-[#a8e063]/40 bg-[#a8e063]/5'
                        : 'border-[#192433] hover:border-[#a8e063]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-[#a8e063]">
                        {tool.function.name}
                      </span>
                      <span
                        className={`w-3 h-3 rounded-full border transition-colors ${
                          on ? 'bg-[#a8e063] border-[#a8e063]' : 'bg-transparent border-[#4a5a6d]'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-[#4a5a6d] leading-relaxed">
                      {tool.function.description}
                    </p>
                  </button>
                )
              })}

              {enabledTools.size > 0 && (
                <div className="rounded-lg border border-[#1a2a10] bg-[#0a1508] p-3 text-[10px] font-mono text-[#4a6a3a] space-y-1">
                  <p className="text-[#a8e063]">Active tools will be injected into every request.</p>
                  <p>The model decides when to call them. Results are executed here in your browser and returned automatically.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && liveToolCalls.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-4xl">🧪</p>
              <h2 className="font-display text-lg text-[#a8e063] tracking-wider">Playground</h2>
              <p className="text-xs text-[#4a5a6d] font-mono max-w-sm">
                Chat with any model. Enable tools from the Tools tab to see live streaming function calls.
              </p>
              <div className="flex gap-2 flex-wrap justify-center text-[10px] font-mono text-[#4a5a6d]">
                <span className="border border-[#192433] px-2 py-1 rounded">economy = cheapest</span>
                <span className="border border-[#192433] px-2 py-1 rounded">standard = balanced</span>
                <span className="border border-[#192433] px-2 py-1 rounded">premium = best</span>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            // For tool messages, find the prior assistant message to merge display
            if (msg.role === 'tool') return null
            // For assistant placeholder that has a live tool call streaming, skip — shown via liveToolCalls
            return (
              <MessageBubble
                key={i}
                msg={msg}
                modelName={currentModel?.displayName ?? 'assistant'}
                toolResults={toolResults}
                // Only show live tool calls on the LAST assistant message
                liveToolCalls={
                  i === messages.length - 1 && msg.role === 'assistant'
                    ? liveToolCalls
                    : []
                }
              />
            )
          })}

          {/* Typing dots — only when loading with no content yet */}
          {loading && liveToolCalls.length === 0 && messages[messages.length - 1]?.role === 'assistant' && !(messages[messages.length - 1] as { content: string }).content && (
            <div className="flex justify-start">
              <div className="border border-[#a8e063]/30 bg-[#a8e063]/5 p-3 rounded-xl">
                <p className="text-[9px] font-display tracking-widest text-[#4a5a6d] mb-1">
                  {currentModel?.displayName?.toUpperCase() ?? 'ASSISTANT'}
                </p>
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 bg-[#a8e063]/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 border border-red-800/40 bg-red-900/10 px-3 py-2 text-xs text-red-400 font-mono rounded-lg">
            {error}
          </div>
        )}

        <div className="border-t border-[#192433] p-4">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-2 border border-[#192433] rounded-lg text-[10px] font-display tracking-widest text-[#4a5a6d] hover:text-red-400 hover:border-red-800/40 transition-colors"
            >
              CLEAR
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={enabledTools.size > 0 ? `Message (${enabledTools.size} tool${enabledTools.size > 1 ? 's' : ''} active)…` : 'Type a message…'}
              disabled={loading}
              className="flex-1 bg-[#0c111a] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#5ad8ff]/40 placeholder:text-[#3a4a5a] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-[#a8e063] text-[#070a10] rounded-lg font-display text-[11px] tracking-widest hover:bg-[#a8e063]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '…' : 'SEND'}
            </button>
          </div>
          <p className="text-[9px] text-[#3a4a5a] font-mono mt-2">
            Credits debited per request · Switch models anytime
            {enabledTools.size > 0 && ` · ${enabledTools.size} tool${enabledTools.size > 1 ? 's' : ''} enabled`}
          </p>
        </div>
      </main>
    </div>
  )
}
