// GameRoundOracle — the unified primitive that makes every "live" game legit.
//
// What this does:
//   1. Per game, you register a `generateChallenge(seed)` (procedural) and a
//      `computeGroundTruth(challenge)` (live model calls or sandbox).
//   2. At play time, `dealRound(game, tier)` returns a ready-to-play round in
//      sub-100ms by consuming from the pre-warmed pool (or computing live as
//      a fallback when the pool is empty).
//   3. A background pre-warmer (`refillPool`) keeps N entries per game-tier
//      ready. Called from a cron / scheduled task.
//   4. Identical challenges across users share the same cached ground truth.
//   5. Every oracle invocation is logged with real provider cost for the
//      admin dashboard and revenue reconciliation.
//
// Why this matters: the MVP games were static quizzes wearing live-inference
// clothing. The oracle is the difference between "we claim to test models"
// and "we actually test models, here's the receipt."

import crypto from 'node:crypto'
import { GameType, Prisma } from '@prisma/client'
import { db } from '@/lib/server/db'
import { providerCostUsd } from '@/lib/server/pricing'
import type { ProviderName } from '@/lib/server/providers/types'
import type { DifficultyTier } from '@/lib/server/economy'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProviderCallRecord {
  provider: ProviderName
  model: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  requestId?: string
}

export interface OracleResult<TChallenge, TTruth> {
  challenge: TChallenge
  groundTruth: TTruth
  cacheKey: string
  source: 'pool_hit' | 'cache_hit' | 'live_compute'
  oracleCostUsd: number
  providerCalls: ProviderCallRecord[]
}

export interface GameOracleSpec<TSeed, TChallenge, TTruth> {
  game: GameType
  // Default TTL for cached ground truth. Longer = cheaper, but stale if
  // provider behavior changes. 24h is a good default for skill games.
  cacheTtlMs?: number
  // How many ready rounds the pool should hold per tier.
  poolTargetPerTier?: number
  // Procedural challenge generator (cheap, deterministic given seed).
  generateChallenge: (seed: GenerationSeed, tier: DifficultyTier) => TChallenge | Promise<TChallenge>
  // Live ground truth computation (expensive, may call models). Returns the
  // truth and the list of provider calls made (for cost tracking).
  computeGroundTruth: (challenge: TChallenge, tier: DifficultyTier) => Promise<{
    truth: TTruth
    calls: ProviderCallRecord[]
  }>
  // Canonicalize the challenge for cache-key hashing. Strips fields that
  // shouldn't affect identity (e.g. randomized display order).
  canonicalForCache?: (challenge: TChallenge) => unknown
}

export interface GenerationSeed {
  serverSeed: string
  clientSeed: string
  nonce: number
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY = new Map<GameType, GameOracleSpec<unknown, unknown, unknown>>()

export function registerOracle<TSeed, TChallenge, TTruth>(
  spec: GameOracleSpec<TSeed, TChallenge, TTruth>,
): void {
  REGISTRY.set(spec.game, spec as unknown as GameOracleSpec<unknown, unknown, unknown>)
}

export function getOracle(game: GameType): GameOracleSpec<unknown, unknown, unknown> | undefined {
  return REGISTRY.get(game)
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = canonicalize((value as Record<string, unknown>)[k])
    }
    return sorted
  }
  return value
}

function hashCanonical(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}

function defaultCacheKey(challenge: unknown): string {
  return hashCanonical(challenge)
}

// ---------------------------------------------------------------------------
// Deal a round (play-time entry point)
// ---------------------------------------------------------------------------

export async function dealRound<TChallenge, TTruth>(
  game: GameType,
  tier: DifficultyTier,
  seed: GenerationSeed,
): Promise<OracleResult<TChallenge, TTruth>> {
  const spec = REGISTRY.get(game)
  if (!spec) throw new Error(`No oracle registered for game ${game}`)

  const start = Date.now()

  // 1. Try the pre-warmed pool first — fastest path, ~10ms.
  const pooled = await reservePoolEntry(game, tier)
  if (pooled) {
    await logCall(game, tier, 'pool_hit', 0, 0, Date.now() - start, pooled.cacheKey)
    return {
      challenge: pooled.challenge as TChallenge,
      groundTruth: pooled.groundTruth as TTruth,
      cacheKey: pooled.cacheKey,
      source: 'pool_hit',
      oracleCostUsd: 0, // cost already accounted at pool-fill time
      providerCalls: [],
    }
  }

  // 2. Pool miss: generate a fresh challenge, then check cache.
  const challenge = await Promise.resolve(spec.generateChallenge(seed, tier))
  const canon = spec.canonicalForCache ? spec.canonicalForCache(challenge) : challenge
  const cacheKey = defaultCacheKey(canon)

  const cached = await db.oracleCacheEntry.findUnique({
    where: { game_cacheKey: { game, cacheKey } },
  })
  if (cached && cached.expiresAt > new Date()) {
    await db.oracleCacheEntry.update({
      where: { id: cached.id },
      data: { hits: { increment: 1 } },
    })
    await logCall(game, tier, 'cache_hit', 0, 0, Date.now() - start, cacheKey)
    return {
      challenge: cached.challenge as TChallenge,
      groundTruth: cached.groundTruth as TTruth,
      cacheKey,
      source: 'cache_hit',
      oracleCostUsd: 0,
      providerCalls: [],
    }
  }

  // 3. Cache miss: compute live.
  try {
    const { truth, calls } = await spec.computeGroundTruth(challenge, tier)
    const cost = sumCallsCost(calls)
    const ttlMs = spec.cacheTtlMs ?? 24 * 60 * 60 * 1000

    await db.oracleCacheEntry.upsert({
      where: { game_cacheKey: { game, cacheKey } },
      create: {
        game,
        cacheKey,
        challenge: challenge as Prisma.InputJsonValue,
        groundTruth: truth as Prisma.InputJsonValue,
        oracleCostUsd: cost,
        providerCalls: calls as unknown as Prisma.InputJsonValue,
        hits: 1,
        expiresAt: new Date(Date.now() + ttlMs),
      },
      update: {
        groundTruth: truth as Prisma.InputJsonValue,
        oracleCostUsd: cost,
        providerCalls: calls as unknown as Prisma.InputJsonValue,
        hits: { increment: 1 },
        expiresAt: new Date(Date.now() + ttlMs),
      },
    })
    await logCall(game, tier, 'live_compute', cost, calls.length, Date.now() - start, cacheKey)
    return {
      challenge: challenge as TChallenge,
      groundTruth: truth as TTruth,
      cacheKey,
      source: 'live_compute',
      oracleCostUsd: cost,
      providerCalls: calls,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logCall(game, tier, 'error', 0, 0, Date.now() - start, cacheKey, msg)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Pool management (called by cron / scheduled task)
// ---------------------------------------------------------------------------

const TIERS: DifficultyTier[] = ['sandbox', 'production', 'blackbox']

// Stable 32-bit integer derived from a game name string, used as a Postgres
// advisory lock key. djb2 hash — fast, collision-free for our small game set.
function gameLockId(game: GameType): bigint {
  let h = 5381
  for (let i = 0; i < game.length; i++) h = (Math.imul(h, 33) ^ game.charCodeAt(i)) >>> 0
  return BigInt(h)
}

export async function refillPool(game: GameType): Promise<{ added: number; cost: number }> {
  const spec = REGISTRY.get(game)
  if (!spec) throw new Error(`No oracle registered for game ${game}`)

  // Acquire a session-level advisory lock so concurrent cron firings skip rather
  // than each independently firing the same set of expensive model calls.
  const lockId = gameLockId(game)
  const [lockRow] = await db.$queryRaw<[{ acquired: boolean }]>`
    SELECT pg_try_advisory_lock(${lockId}::bigint) AS acquired
  `
  if (!lockRow.acquired) {
    // Another invocation is already refilling this game — skip.
    return { added: 0, cost: 0 }
  }

  const target = spec.poolTargetPerTier ?? 5
  let added = 0
  let totalCost = 0

  try {
  for (const tier of TIERS) {
    const ready = await db.oraclePoolEntry.count({
      where: { game, tier, servedAt: null, reservedAt: null },
    })
    const need = Math.max(0, target - ready)
    for (let i = 0; i < need; i++) {
      try {
        const seed = randomGenerationSeed()
        const challenge = await Promise.resolve(spec.generateChallenge(seed, tier))
        const canon = spec.canonicalForCache ? spec.canonicalForCache(challenge) : challenge
        const cacheKey = defaultCacheKey(canon)

        // Reuse a cached truth if we already have one for an identical challenge.
        const cached = await db.oracleCacheEntry.findUnique({
          where: { game_cacheKey: { game, cacheKey } },
        })
        let truth: unknown
        let calls: ProviderCallRecord[] = []
        let costUsd = 0
        if (cached && cached.expiresAt > new Date()) {
          truth = cached.groundTruth
        } else {
          const result = await spec.computeGroundTruth(challenge, tier)
          truth = result.truth
          calls = result.calls
          costUsd = sumCallsCost(calls)
          const ttlMs = spec.cacheTtlMs ?? 24 * 60 * 60 * 1000
          await db.oracleCacheEntry.upsert({
            where: { game_cacheKey: { game, cacheKey } },
            create: {
              game, cacheKey,
              challenge: challenge as Prisma.InputJsonValue,
              groundTruth: truth as Prisma.InputJsonValue,
              oracleCostUsd: costUsd,
              providerCalls: calls as unknown as Prisma.InputJsonValue,
              hits: 0,
              expiresAt: new Date(Date.now() + ttlMs),
            },
            update: {
              groundTruth: truth as Prisma.InputJsonValue,
              oracleCostUsd: costUsd,
              providerCalls: calls as unknown as Prisma.InputJsonValue,
              expiresAt: new Date(Date.now() + ttlMs),
            },
          })
          totalCost += costUsd
        }

        await db.oraclePoolEntry.create({
          data: {
            game, tier, cacheKey,
            challenge: challenge as Prisma.InputJsonValue,
            groundTruth: truth as Prisma.InputJsonValue,
          },
        })
        added++
      } catch (err) {
        // Don't let one bad challenge break the refill loop. Log and move on.
        const msg = err instanceof Error ? err.message : String(err)
        await logCall(game, tier, 'error', 0, 0, 0, null, `refill: ${msg}`)
      }
    }
  }

  return { added, cost: totalCost }
  } finally {
    await db.$executeRaw`SELECT pg_advisory_unlock(${lockId}::bigint)`
  }
}

async function reservePoolEntry(game: GameType, tier: DifficultyTier) {
  // Atomic reserve: pick the oldest unreserved, unserved entry and mark it.
  // Postgres SKIP LOCKED would be ideal; for now we use a guarded update.
  return db.$transaction(async (tx) => {
    const candidate = await tx.oraclePoolEntry.findFirst({
      where: { game, tier, servedAt: null, reservedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    if (!candidate) return null
    const now = new Date()
    const updated = await tx.oraclePoolEntry.updateMany({
      where: { id: candidate.id, servedAt: null, reservedAt: null },
      data: { reservedAt: now, servedAt: now },
    })
    if (updated.count === 0) return null // raced; let caller fall through to live compute
    return candidate
  })
}

function randomGenerationSeed(): GenerationSeed {
  return {
    serverSeed: crypto.randomBytes(32).toString('hex'),
    clientSeed: crypto.randomBytes(16).toString('hex'),
    nonce: Math.floor(Math.random() * 1_000_000),
  }
}

// ---------------------------------------------------------------------------
// Cost accounting
// ---------------------------------------------------------------------------

function sumCallsCost(calls: ProviderCallRecord[]): number {
  let total = 0
  for (const c of calls) {
    total += providerCostUsd(c.model, c.promptTokens, c.completionTokens)
  }
  return total
}

async function logCall(
  game: GameType,
  tier: DifficultyTier,
  outcome: 'pool_hit' | 'cache_hit' | 'live_compute' | 'error',
  costUsd: number,
  providerCalls: number,
  durationMs: number,
  cacheKey: string | null,
  error?: string,
): Promise<void> {
  try {
    await db.oracleCallLog.create({
      data: {
        game, tier, outcome,
        oracleCostUsd: costUsd,
        providerCalls,
        durationMs,
        cacheKey,
        error,
      },
    })
  } catch {
    // Logging must never block gameplay.
  }
}

// ---------------------------------------------------------------------------
// Admin / diagnostic helpers
// ---------------------------------------------------------------------------

export interface OracleHealthSnapshot {
  game: GameType
  poolReady: Record<DifficultyTier, number>
  cacheSize: number
  cost24h: number
  callsByOutcome24h: Record<string, number>
}

export async function getHealthSnapshot(game: GameType): Promise<OracleHealthSnapshot> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [pool, cache, costRow, byOutcome] = await Promise.all([
    db.oraclePoolEntry.groupBy({
      by: ['tier'],
      where: { game, servedAt: null, reservedAt: null },
      _count: true,
    }),
    db.oracleCacheEntry.count({ where: { game, expiresAt: { gt: new Date() } } }),
    db.oracleCallLog.aggregate({
      where: { game, createdAt: { gte: since } },
      _sum: { oracleCostUsd: true },
    }),
    db.oracleCallLog.groupBy({
      by: ['outcome'],
      where: { game, createdAt: { gte: since } },
      _count: true,
    }),
  ])

  const poolReady: Record<DifficultyTier, number> = { sandbox: 0, production: 0, blackbox: 0 }
  for (const row of pool) poolReady[row.tier as DifficultyTier] = row._count
  const callsByOutcome24h: Record<string, number> = {}
  for (const row of byOutcome) callsByOutcome24h[row.outcome] = row._count

  return {
    game,
    poolReady,
    cacheSize: cache,
    cost24h: costRow._sum.oracleCostUsd ?? 0,
    callsByOutcome24h,
  }
}
