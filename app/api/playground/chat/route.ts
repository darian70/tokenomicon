import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { routeChat, routeStream } from '@/lib/server/providers/router'
import { resolveModel, creditsForUsage, estimateMaxCost } from '@/lib/server/pricing'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'
import type { ChatMessage, ToolDefinition } from '@/lib/server/providers/types'

// ---------------------------------------------------------------------------
// Schema — accepts the full OpenAI-compatible message shape including tool
// calls and tool results, plus an optional tools array.
// ---------------------------------------------------------------------------

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
})

const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('system'), content: z.string() }),
  z.object({ role: z.literal('user'), content: z.string() }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().optional().nullable(),
    tool_calls: z.array(toolCallSchema).optional(),
  }),
  z.object({
    role: z.literal('tool'),
    tool_call_id: z.string(),
    content: z.string(),
    name: z.string().optional(),
  }),
])

const toolDefinitionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()),
  }),
})

const schema = z.object({
  model: z.string().min(1),
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional().default(false),
  tools: z.array(toolDefinitionSchema).optional(),
  tool_choice: z.union([z.literal('none'), z.literal('auto'), z.literal('required')]).optional(),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())

    const modelEntry = resolveModel(body.model)
    if (!modelEntry) {
      return NextResponse.json({ error: `Model "${body.model}" not found or disabled` }, { status: 400 })
    }

    const inputChars = body.messages.reduce((a, m) => {
      if ('content' in m && typeof m.content === 'string') return a + m.content.length
      return a + 20
    }, 0)
    const estimatedPromptTokens = Math.max(1, Math.ceil(inputChars / 4))
    const maxCost = estimateMaxCost(body.model, estimatedPromptTokens)

    const balances = await db.creditLedgerEntry.groupBy({
      by: ['bucket'],
      where: { userId: user.id },
      _sum: { amount: true },
    })

    const bonus = balances.find((b) => b.bucket === 'bonus_compute')?._sum.amount ?? 0
    const purchased = balances.find((b) => b.bucket === 'purchased_compute')?._sum.amount ?? 0
    const totalCompute = bonus + purchased

    if (totalCompute < maxCost) {
      return NextResponse.json({ error: `Insufficient credits (need ~${maxCost}, have ${totalCompute})` }, { status: 402 })
    }

    const requestId = `pg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const messages = body.messages as ChatMessage[]
    const tools = (body.tools ?? []) as ToolDefinition[]

    // ── Streaming path ──────────────────────────────────────────────────────
    if (body.stream) {
      const { stream: chunkStream, provider, model: resolvedModel } = routeStream({
        model: body.model,
        messages,
        maxTokens: 1024,
        ...(tools.length > 0 && { tools }),
        ...(tools.length > 0 && body.tool_choice && { tool_choice: body.tool_choice }),
      })
      const encoder = new TextEncoder()
      let completionTokens = 0

      const sseStream = new ReadableStream({
        async start(controller) {
          const reader = chunkStream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Live tool call argument streaming
              if (value.toolCallProgress?.length) {
                const chunk = JSON.stringify({
                  choices: [{ delta: { tool_call_progress: value.toolCallProgress }, finish_reason: null }],
                })
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
              }

              if (value.delta) {
                completionTokens++
                const chunk = JSON.stringify({
                  choices: [{ delta: { content: value.delta }, finish_reason: null }],
                })
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
              }

              if (value.done) {
                if (value.completionTokens) completionTokens = value.completionTokens

                // Emit finalized tool calls before DONE so client can act on them
                if (value.toolCalls?.length) {
                  const tcChunk = JSON.stringify({
                    choices: [{ delta: { tool_calls: value.toolCalls }, finish_reason: 'tool_calls' }],
                  })
                  controller.enqueue(encoder.encode(`data: ${tcChunk}\n\n`))
                }
                break
              }
            }
          } finally {
            reader.releaseLock()
          }

          const creditCost = creditsForUsage(body.model, estimatedPromptTokens, completionTokens)
          const debitBucket = bonus >= creditCost ? 'bonus_compute' : 'purchased_compute'
          Promise.all([
            addLedgerEntry({ userId: user.id, bucket: debitBucket, type: 'api_usage_debit', amount: -creditCost, metadata: { source: 'playground', model: modelEntry.displayName } }),
            db.providerUsage.create({ data: { userId: user.id, provider, model: resolvedModel, requestId, promptTokens: estimatedPromptTokens, completionTokens, totalTokens: estimatedPromptTokens + completionTokens, costInCredits: creditCost } }),
          ]).catch(() => {})

          const doneChunk = JSON.stringify({
            choices: [{ delta: {}, finish_reason: 'stop' }],
            usage: { prompt_tokens: estimatedPromptTokens, completion_tokens: completionTokens, cost_credits: creditCost },
          })
          controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(sseStream, {
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      })
    }

    // ── Non-streaming path ──────────────────────────────────────────────────
    const result = await routeChat({
      model: body.model,
      messages,
      maxTokens: 1024,
      ...(tools.length > 0 && { tools }),
    })

    const creditCost = creditsForUsage(body.model, result.promptTokens, result.completionTokens)
    const debitBucket = bonus >= creditCost ? 'bonus_compute' : 'purchased_compute'
    await addLedgerEntry({
      userId: user.id,
      bucket: debitBucket,
      type: 'api_usage_debit',
      amount: -creditCost,
      metadata: { source: 'playground', model: modelEntry.displayName },
    })

    await db.providerUsage.create({
      data: {
        userId: user.id,
        provider: result.provider,
        model: result.model,
        requestId,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        costInCredits: creditCost,
      },
    })

    return NextResponse.json({
      text: result.text,
      toolCalls: result.toolCalls ?? null,
      model: result.model,
      provider: result.provider,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      creditCost,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : message.includes('Insufficient') ? 402 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
