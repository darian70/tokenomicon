import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'
import { resolveApiKey } from '@/lib/server/api-keys'
import { db } from '@/lib/server/db'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { routeChat, routeStream, ProviderError } from '@/lib/server/providers/router'
import { creditsForUsage, resolveModel, estimateMaxCost } from '@/lib/server/pricing'
import { debitForApiUsage, refundDebits, recordFailedAdjustment } from '@/lib/server/ledger'
import { checkAndTriggerAutoTopup } from '@/lib/server/auto-topup'
import { checkAndSendBudgetAlert } from '@/lib/server/budget-alert'
import { env } from '@/lib/server/env'
import { lookupSemanticCache, storeSemanticCache, recordCacheHit } from '@/lib/server/semantic-cache'

// ── Schema ──────────────────────────────────────────────────────────────────

const contentPartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({ url: z.string(), detail: z.enum(['auto', 'low', 'high']).optional() }),
  }),
])

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
})

const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('system'), content: z.string().min(1).max(100_000) }),
  z.object({
    role: z.literal('user'),
    content: z.union([
      z.string().min(1).max(100_000),
      z.array(contentPartSchema).min(1).max(20),
    ]),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().max(100_000).nullable().optional(),
    tool_calls: z.array(toolCallSchema).optional(),
  }),
  z.object({
    role: z.literal('tool'),
    tool_call_id: z.string(),
    content: z.string().max(100_000),
    name: z.string().optional(),
  }),
])

const toolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()),
  }),
})

const toolChoiceSchema = z.union([
  z.enum(['none', 'auto', 'required']),
  z.object({ type: z.literal('function'), function: z.object({ name: z.string() }) }),
])

const schema = z.object({
  model: z.string().min(1).max(128),
  messages: z.array(messageSchema).min(1).max(128),
  stream: z.boolean().optional().default(false),
  max_tokens: z.number().int().positive().optional(),
  tools: z.array(toolSchema).max(64).optional(),
  tool_choice: toolChoiceSchema.optional(),
})

// ── Helper ───────────────────────────────────────────────────────────────────

function estimateInputChars(messages: z.infer<typeof schema>['messages']): number {
  return messages.reduce((total, m) => {
    if ('content' in m && m.content) {
      if (typeof m.content === 'string') return total + m.content.length
      return total + m.content.reduce((s, p) => s + (p.type === 'text' ? p.text.length : 0), 0)
    }
    return total
  }, 0)
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!rawKey) return NextResponse.json({ error: 'Missing Bearer API key' }, { status: 401 })

    const key = await resolveApiKey(rawKey)
    if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const rl = await checkRateLimit(`chat:${key.userId}`, 30, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const body = schema.parse(await req.json())

    const modelEntry = resolveModel(body.model)
    if (!modelEntry) {
      return NextResponse.json(
        { error: `Model "${body.model}" is not available. Use GET /v1/models for the list.` },
        { status: 400 },
      )
    }

    // ── Streaming path ────────────────────────────────────────────────────
    if (body.stream) {
      const inputChars = estimateInputChars(body.messages)
      const estimatedPromptTokens = Math.max(1, Math.ceil(inputChars / 4))
      const maxCost = estimateMaxCost(body.model, estimatedPromptTokens)

      let preDebitBreakdown: Awaited<ReturnType<typeof debitForApiUsage>>
      try {
        preDebitBreakdown = await db.$transaction(async (tx: Prisma.TransactionClient) => {
          return debitForApiUsage({
            tx,
            userId: key.userId,
            amount: maxCost,
            metadata: { requestId, model: modelEntry.modelId, streaming: true, stage: 'pre_debit' },
          })
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        const status = msg.includes('Insufficient') ? 402 : 500
        return NextResponse.json({ error: msg, requestId }, { status })
      }

      const { stream: chunkStream, provider, model: resolvedModel } = routeStream({
        model: body.model,
        messages: body.messages,
        maxTokens: body.max_tokens,
        tools: body.tools,
        tool_choice: body.tool_choice,
      })

      const encoder = new TextEncoder()
      let completionTokens = 0

      const sseStream = new ReadableStream({
        async start(controller) {
          const reader = chunkStream.getReader()
          let finalToolCalls: unknown[] | undefined
          let finishReason = 'stop'

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value.delta) {
                completionTokens++
                const sseData = JSON.stringify({
                  id: requestId,
                  object: 'chat.completion.chunk',
                  model: resolvedModel,
                  choices: [{ index: 0, delta: { content: value.delta }, finish_reason: null }],
                })
                controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
              }
              if (value.done) {
                if (value.completionTokens) completionTokens = value.completionTokens
                if (value.toolCalls?.length) finalToolCalls = value.toolCalls
                if (value.finishReason) finishReason = value.finishReason
                break
              }
            }
          } finally {
            reader.releaseLock()
          }

          const promptTokens = estimatedPromptTokens
          const actualCost = creditsForUsage(body.model, promptTokens, completionTokens)

          try {
            await db.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.providerUsage.create({
                data: {
                  userId: key.userId, apiKeyId: key.id, provider, model: resolvedModel,
                  requestId, promptTokens, completionTokens,
                  totalTokens: promptTokens + completionTokens, costInCredits: actualCost,
                  metadata: { streaming: true, hasTools: !!finalToolCalls } as Prisma.InputJsonValue,
                },
              })
              if (maxCost > actualCost) {
                await refundDebits({
                  tx,
                  userId: key.userId,
                  originalDebits: preDebitBreakdown,
                  actualAmount: actualCost,
                  metadata: { requestId, reason: 'streaming_over_estimate_refund' },
                })
              }
            })
          } catch {
            if (maxCost > actualCost) {
              await recordFailedAdjustment({
                userId: key.userId,
                amount: maxCost - actualCost,
                reason: 'streaming_post_debit_refund_failed',
                metadata: { requestId, maxCost, actualCost, model: resolvedModel },
              })
            }
          }

          const doneData = JSON.stringify({
            id: requestId, object: 'chat.completion.chunk', model: resolvedModel,
            choices: [{
              index: 0,
              delta: finalToolCalls?.length ? { tool_calls: finalToolCalls } : {},
              finish_reason: finishReason,
            }],
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, cost_credits: actualCost },
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(sseStream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'x-request-id': requestId,
        },
      })
    }

    // ── Non-streaming path ────────────────────────────────────────────────

    // Semantic cache: check for a near-identical prompt before calling the
    // provider. Only applies to non-tool-use requests (tool calls are
    // stateful). Saves 30–70% on cost for repetitive AI app workloads.
    const canUseCache = !body.tools && !body.tool_choice
    if (canUseCache) {
      const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user')
      const promptText = lastUserMsg && typeof lastUserMsg.content === 'string'
        ? lastUserMsg.content
        : null

      if (promptText) {
        const cacheResult = await lookupSemanticCache(body.model, promptText)
        if (cacheResult.hit) {
          const costInCredits = creditsForUsage(
            body.model,
            cacheResult.promptTokens,
            cacheResult.completionTokens,
          )
          // Debit and record as a cache hit — still costs user credits but
          // no provider call made, so our margin is 100% on this request.
          await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await debitForApiUsage({
              tx,
              userId: key.userId,
              amount: costInCredits,
              metadata: {
                requestId,
                model: body.model,
                semanticCacheHit: true,
                similarity: cacheResult.similarity,
              },
            })
            await tx.providerUsage.create({
              data: {
                userId: key.userId,
                apiKeyId: key.id,
                provider: 'openai',  // proxy label for cache hits
                model: body.model,
                requestId,
                promptTokens: cacheResult.promptTokens,
                completionTokens: cacheResult.completionTokens,
                totalTokens: cacheResult.promptTokens + cacheResult.completionTokens,
                costInCredits,
                metadata: {
                  semanticCacheHit: true,
                  similarity: cacheResult.similarity,
                  entryId: cacheResult.entryId,
                } as Prisma.InputJsonValue,
              },
            })
          })

          recordCacheHit(cacheResult.entryId, costInCredits)

          return NextResponse.json({
            id: requestId,
            object: 'chat.completion',
            model: body.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: cacheResult.responseText },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: cacheResult.promptTokens,
              completion_tokens: cacheResult.completionTokens,
              total_tokens: cacheResult.promptTokens + cacheResult.completionTokens,
              cost_credits: costInCredits,
            },
            // Transparent to the caller — they can opt-out if they detect this
            x_cache: 'HIT',
          })
        }
      }
    }

    const providerResult = await routeChat({
      model: body.model,
      messages: body.messages,
      maxTokens: body.max_tokens,
      tools: body.tools,
      tool_choice: body.tool_choice,
    })
    const costInCredits = creditsForUsage(
      providerResult.model,
      providerResult.promptTokens,
      providerResult.completionTokens,
    )

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await debitForApiUsage({
        tx,
        userId: key.userId,
        amount: costInCredits,
        metadata: {
          requestId,
          model: providerResult.model,
          provider: providerResult.provider,
          latencyMs: providerResult.latencyMs,
        },
      })

      await tx.providerUsage.create({
        data: {
          userId: key.userId,
          apiKeyId: key.id,
          provider: providerResult.provider,
          model: providerResult.model,
          requestId,
          promptTokens: providerResult.promptTokens,
          completionTokens: providerResult.completionTokens,
          totalTokens: providerResult.totalTokens,
          costInCredits,
          metadata: {
            latencyMs: providerResult.latencyMs,
            hasTools: !!providerResult.toolCalls?.length,
          } as Prisma.InputJsonValue,
        },
      })
    })

    // Store response in semantic cache for future near-duplicate hits.
    // Only cache clean text responses (no tool calls) — fire and forget.
    if (canUseCache && providerResult.text && !providerResult.toolCalls?.length) {
      const lastUserMsg2 = [...body.messages].reverse().find(m => m.role === 'user')
      const promptText2 = lastUserMsg2 && typeof lastUserMsg2.content === 'string'
        ? lastUserMsg2.content
        : null
      if (promptText2) {
        storeSemanticCache(
          providerResult.model,
          promptText2,
          providerResult.text,
          providerResult.promptTokens,
          providerResult.completionTokens,
        )
      }
    }

    if (env.STRIPE_SECRET_KEY) {
      checkAndTriggerAutoTopup(key.userId, env.STRIPE_SECRET_KEY).catch(() => {})
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tokenomicon.io'
    checkAndSendBudgetAlert(key.userId, appUrl).catch(() => {})

    return NextResponse.json({
      id: requestId,
      object: 'chat.completion',
      model: providerResult.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: providerResult.text || null,
            ...(providerResult.toolCalls?.length && { tool_calls: providerResult.toolCalls }),
          },
          finish_reason: providerResult.finishReason,
        },
      ],
      usage: {
        prompt_tokens: providerResult.promptTokens,
        completion_tokens: providerResult.completionTokens,
        total_tokens: providerResult.totalTokens,
        cost_credits: costInCredits,
      },
    })
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message, requestId }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Insufficient compute credits') ? 402 : 400
    return NextResponse.json({ error: message, requestId }, { status })
  }
}
