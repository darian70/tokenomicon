import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'
import { resolveApiKey } from '@/lib/server/api-keys'
import { db } from '@/lib/server/db'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { routeEmbedding, ProviderError } from '@/lib/server/providers/router'
import { creditsForEmbedding, resolveModel } from '@/lib/server/pricing'
import { debitForApiUsage } from '@/lib/server/ledger'

const schema = z.object({
  model: z.string().min(1).max(128),
  input: z.union([
    z.string().min(1).max(100_000),
    z.array(z.string().min(1).max(100_000)).min(1).max(2048),
  ]),
  encoding_format: z.enum(['float', 'base64']).optional().default('float'),
  dimensions: z.number().int().positive().max(3072).optional(),
  user: z.string().optional(),
})

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!rawKey) return NextResponse.json({ error: 'Missing Bearer API key' }, { status: 401 })

    const key = await resolveApiKey(rawKey)
    if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const rl = await checkRateLimit(`embed:${key.userId}`, 60, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const body = schema.parse(await req.json())

    const modelEntry = resolveModel(body.model)
    if (!modelEntry || modelEntry.family !== 'embedding') {
      return NextResponse.json(
        {
          error: `Model "${body.model}" is not an embedding model. Available: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002`,
        },
        { status: 400 },
      )
    }

    const inputs = Array.isArray(body.input) ? body.input : [body.input]

    const result = await routeEmbedding({
      model: modelEntry.modelId,
      input: body.input,
      encoding_format: body.encoding_format,
      dimensions: body.dimensions,
    })

    const costInCredits = creditsForEmbedding(result.model, result.promptTokens)

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await debitForApiUsage({
        tx,
        userId: key.userId,
        amount: costInCredits,
        metadata: { requestId, model: result.model, provider: result.provider, inputCount: inputs.length },
      })

      await tx.providerUsage.create({
        data: {
          userId: key.userId,
          apiKeyId: key.id,
          provider: result.provider,
          model: result.model,
          requestId,
          promptTokens: result.promptTokens,
          completionTokens: 0,
          totalTokens: result.promptTokens,
          costInCredits,
          metadata: { embedding: true, inputCount: inputs.length } as Prisma.InputJsonValue,
        },
      })
    })

    return NextResponse.json({
      object: 'list',
      data: result.embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model: result.model,
      usage: {
        prompt_tokens: result.promptTokens,
        total_tokens: result.promptTokens,
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
