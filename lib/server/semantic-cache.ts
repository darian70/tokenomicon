// Semantic Cache — near-duplicate response reuse for the API proxy.
//
// How it works:
//   1. Embed the user's prompt using text-embedding-3-small.
//   2. Exact-match check (SHA-256) — instant if prompt is byte-identical.
//   3. Similarity scan: cosine distance over all non-expired entries for
//      the same model. If best similarity ≥ 0.97, return cached response.
//   4. On cache miss: call provider, store embedding + response for reuse.
//
// Why 0.97: this threshold catches rephrasings ("What is X?" vs "Tell me about X?")
// while being conservative enough to avoid wrong answers. For an inference
// proxy, false positives (wrong cached answer) are worse than false negatives.
//
// Scaling note: similarity search is O(n) over active entries per model.
// Acceptable up to ~10K entries/model in Node.js. Add pgvector at 100K+.
//
// Only enabled for non-streaming, non-tool-use requests. Streaming users
// expect real-time output; tool calls are stateful and cannot be cached.

import crypto from 'node:crypto'
import { db } from '@/lib/server/db'
import { routeEmbedding } from '@/lib/server/providers/router'
import { creditsForUsage } from '@/lib/server/pricing'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.97   // minimum cosine similarity to count as a hit
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

// Limit the similarity scan to prevent excessive DB reads for popular models.
// At 1K entries and 1536 floats each: ~6MB of data — fine in memory.
const MAX_SCAN_ENTRIES = 1_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheHitResult {
  hit: true
  responseText: string
  promptTokens: number
  completionTokens: number
  entryId: string
  similarity: number
}

export interface CacheMissResult {
  hit: false
}

export type CacheLookupResult = CacheHitResult | CacheMissResult

// ---------------------------------------------------------------------------
// Vector math
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function embedText(text: string): Promise<number[] | null> {
  try {
    const result = await routeEmbedding({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),  // cap input length
    })
    // EmbeddingResponse.embeddings is number[][] (one vector per input).
    // We always pass a single string, so the embedding is at index 0.
    return result.embeddings[0] ?? null
  } catch {
    // OpenAI not configured, or embedding failed — semantic cache disabled
    return null
  }
}

function hashPrompt(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export async function lookupSemanticCache(
  model: string,
  promptText: string,
): Promise<CacheLookupResult> {
  const now = new Date()
  const promptHash = hashPrompt(promptText)

  // 1. Exact match — O(1), no embedding needed
  const exact = await db.semanticCacheEntry.findUnique({
    where: { model_promptHash: { model, promptHash } },
  })
  if (exact && exact.expiresAt > now) {
    return {
      hit: true,
      responseText: exact.responseText,
      promptTokens: exact.promptTokens,
      completionTokens: exact.completionTokens,
      entryId: exact.id,
      similarity: 1.0,
    }
  }

  // 2. Embed the prompt for similarity search
  const embedding = await embedText(promptText)
  if (!embedding) return { hit: false }

  // 3. Pull recent active entries for this model and scan for similarity
  const candidates = await db.semanticCacheEntry.findMany({
    where: { model, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    take: MAX_SCAN_ENTRIES,
    select: {
      id: true,
      embedding: true,
      responseText: true,
      promptTokens: true,
      completionTokens: true,
    },
  })

  let bestId: string | null = null
  let bestSim = 0
  let bestResponse = ''
  let bestPromptTokens = 0
  let bestCompletionTokens = 0

  for (const c of candidates) {
    const storedEmb = c.embedding as number[]
    const sim = cosineSimilarity(embedding, storedEmb)
    if (sim > bestSim) {
      bestSim = sim
      bestId = c.id
      bestResponse = c.responseText
      bestPromptTokens = c.promptTokens
      bestCompletionTokens = c.completionTokens
    }
  }

  if (bestSim >= SIMILARITY_THRESHOLD && bestId) {
    return {
      hit: true,
      responseText: bestResponse,
      promptTokens: bestPromptTokens,
      completionTokens: bestCompletionTokens,
      entryId: bestId,
      similarity: bestSim,
    }
  }

  return { hit: false }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export async function storeSemanticCache(
  model: string,
  promptText: string,
  responseText: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  // Never block the response on cache storage. Fire and forget.
  setImmediate(async () => {
    try {
      const embedding = await embedText(promptText)
      if (!embedding) return  // OpenAI not configured

      const promptHash = hashPrompt(promptText)
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS)

      await db.semanticCacheEntry.upsert({
        where: { model_promptHash: { model, promptHash } },
        create: {
          model,
          promptHash,
          promptText: promptText.slice(0, 50_000),
          embedding: embedding as unknown as import('@prisma/client').Prisma.InputJsonValue,
          responseText: responseText.slice(0, 50_000),
          promptTokens,
          completionTokens,
          expiresAt,
        },
        update: {
          // Keep the most recent response; update TTL on re-use
          responseText: responseText.slice(0, 50_000),
          promptTokens,
          completionTokens,
          expiresAt,
          embedding: embedding as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      })
    } catch {
      // Cache storage failure must never affect the user response
    }
  })
}

// ---------------------------------------------------------------------------
// Hit accounting — called after serving a cached response
// ---------------------------------------------------------------------------

export function recordCacheHit(entryId: string, creditsForUsage_: number): void {
  setImmediate(async () => {
    try {
      await db.semanticCacheEntry.update({
        where: { id: entryId },
        data: {
          cacheHits: { increment: 1 },
          savedCreditsTotal: { increment: creditsForUsage_ },
        },
      })
    } catch {
      // Non-critical accounting — swallow errors
    }
  })
}

// ---------------------------------------------------------------------------
// Admin stats — for the usage dashboard
// ---------------------------------------------------------------------------

export async function getSemanticCacheStats(): Promise<{
  totalEntries: number
  totalHits: number
  totalSavedCredits: number
  topModels: { model: string; entries: number; hits: number }[]
}> {
  const [aggregate, byModel] = await Promise.all([
    db.semanticCacheEntry.aggregate({
      where: { expiresAt: { gt: new Date() } },
      _count: { id: true },
      _sum: { cacheHits: true, savedCreditsTotal: true },
    }),
    db.semanticCacheEntry.groupBy({
      by: ['model'],
      where: { expiresAt: { gt: new Date() } },
      _count: { id: true },
      _sum: { cacheHits: true },
      orderBy: { _sum: { cacheHits: 'desc' } },
      take: 5,
    }),
  ])

  return {
    totalEntries: aggregate._count.id,
    totalHits: aggregate._sum.cacheHits ?? 0,
    totalSavedCredits: aggregate._sum.savedCreditsTotal ?? 0,
    topModels: byModel.map(r => ({
      model: r.model,
      entries: r._count.id,
      hits: r._sum.cacheHits ?? 0,
    })),
  }
}
