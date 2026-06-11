// Rate Roulette — live oracle.
//
// Replaces the hardcoded PROVIDER_LATENCY_PROFILES with real parallel calls
// to OpenAI, Anthropic, Groq, and OpenRouter via the existing router.
// Records actual end-to-end latency per provider, picks the real winner.
//
// Cost discipline: each round = 3 small completions. With maxTokens=80 and
// cheap model tiers, blended cost is ~$0.0003/round, well under the
// $0.003/round target. Cache TTL keeps identical matchups dedup'd for 1h
// (latency drifts quickly enough that day-old data would be stale).

import { GameType } from '@prisma/client'
import { routeChat } from '@/lib/server/providers/router'
import { getModelPrice } from '@/lib/server/pricing'
import {
  registerOracle,
  type GameOracleSpec,
  type GenerationSeed,
  type ProviderCallRecord,
} from './oracle'
import { fairRandom } from '@/lib/server/fairness'

// ---------------------------------------------------------------------------
// Matchup catalog — built from REAL router model IDs in pricing.ts
// Each matchup pits 3 models against each other on the same prompt.
// Difficulty tier controls how close the expected race is.
// ---------------------------------------------------------------------------

interface MatchupTemplate {
  modelIds: [string, string, string]
  prompt: string
  insight: string
  tier: 'sandbox' | 'production' | 'blackbox'
}

const MATCHUPS: MatchupTemplate[] = [
  // SANDBOX — obvious winners (Groq LPU vs anything else)
  {
    modelIds: ['llama-3.3-70b-versatile', 'gpt-4o', 'claude-sonnet-4-20250514'],
    prompt: 'Explain recursion in one sentence.',
    insight: 'Groq LPU vs two GPU-backed flagships. The LPU normally dominates on short prompts.',
    tier: 'sandbox',
  },
  {
    modelIds: ['mixtral-8x7b-32768', 'gpt-4o', 'google/gemini-2.5-pro-preview'],
    prompt: 'List 3 HTTP status codes that indicate errors.',
    insight: 'Groq runs Mixtral on custom silicon. The Pro tiers prioritize quality over latency.',
    tier: 'sandbox',
  },
  {
    modelIds: ['gemma2-9b-it', 'claude-sonnet-4-20250514', 'google/gemini-2.5-pro-preview'],
    prompt: 'What is a closure in JavaScript?',
    insight: 'A small Groq model vs two large quality-tier models. Speed should win on a short answer.',
    tier: 'sandbox',
  },

  // PRODUCTION — closer races, mostly within the same speed tier
  {
    modelIds: ['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'google/gemini-2.5-flash-preview'],
    prompt: 'Define idempotency in REST APIs.',
    insight: 'Three "fast tier" models from three providers. The race is real — provider load decides.',
    tier: 'production',
  },
  {
    modelIds: ['gpt-4o-mini', 'mistralai/mistral-small-3.2-24b-instruct', 'deepseek/deepseek-chat-v3-0324'],
    prompt: 'Write a regex matching an IPv4 address.',
    insight: 'OpenRouter routes Mistral/DeepSeek through partner GPU clouds — latency varies by host.',
    tier: 'production',
  },
  {
    modelIds: ['claude-3-5-haiku-20241022', 'meta-llama/llama-4-maverick', 'qwen/qwen3-235b-a22b'],
    prompt: 'Name three sorting algorithms.',
    insight: 'Haiku is Anthropic\'s speed tier. Maverick is MoE. Qwen 235B is huge but well-optimized.',
    tier: 'production',
  },

  // BLACKBOX — reasoning models in the mix; surprise winners possible
  {
    modelIds: ['o3-mini', 'deepseek/deepseek-r1', 'google/gemini-2.5-flash-preview'],
    prompt: 'What is eventual consistency in distributed databases?',
    insight: 'Two reasoning models (chain-of-thought = slow) vs Flash. Flash should win every time — but by how much?',
    tier: 'blackbox',
  },
  {
    modelIds: ['gpt-4o', 'deepseek/deepseek-r1', 'qwen/qwen3-235b-a22b'],
    prompt: 'Explain the CAP theorem briefly.',
    insight: 'R1 thinks before writing. GPT-4o vs Qwen-235B depends on prompt length and OpenRouter host.',
    tier: 'blackbox',
  },
  {
    modelIds: ['claude-sonnet-4-20250514', 'meta-llama/llama-4-maverick', 'google/gemini-2.5-pro-preview'],
    prompt: 'What is backpressure in streaming systems?',
    insight: 'Three top-tier models. Sonnet 4 is usually mid-pack on latency, but quality is uniform here.',
    tier: 'blackbox',
  },
]

// ---------------------------------------------------------------------------
// Types exposed in challenge / truth payloads
// ---------------------------------------------------------------------------

export interface RateRouletteChallenge {
  matchupId: string                // stable hash of {modelIds, prompt}
  models: { modelId: string; displayName: string; provider: string }[]
  prompt: string
  insight: string
}

export interface RateRouletteTruth {
  // ── New shape (used by /benchmarks dashboard) ──
  modelLatencies: {
    modelId: string
    displayName: string
    totalMs: number
    completionTokens: number
    error?: string
  }[]
  fastestModelId: string
  racedAt: string                  // ISO timestamp
  // ── Legacy shape (consumed by existing GameArea.tsx renderer) ──
  providers: string[]              // display names, ordered as raced
  fastest: string                  // display name of winner
  latencies: { provider: string; latencyMs: number | null; ok: boolean }[]
  liveRaced: true
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function pickMatchup(seed: GenerationSeed, tier: 'sandbox' | 'production' | 'blackbox'): MatchupTemplate {
  const pool = MATCHUPS.filter(m => m.tier === tier)
  if (pool.length === 0) return MATCHUPS[0]
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

function buildChallenge(matchup: MatchupTemplate): RateRouletteChallenge {
  const models = matchup.modelIds.map(id => {
    const entry = getModelPrice(id)
    return {
      modelId: id,
      displayName: entry?.displayName ?? id,
      provider: entry?.provider ?? 'unknown',
    }
  })
  return {
    matchupId: matchup.modelIds.join('|'),
    models,
    prompt: matchup.prompt,
    insight: matchup.insight,
  }
}

async function raceModels(
  challenge: RateRouletteChallenge,
): Promise<{ truth: RateRouletteTruth; calls: ProviderCallRecord[] }> {
  const racedAt = new Date().toISOString()

  // Fire all three in parallel. Settle every promise so a single provider
  // failure doesn't kill the round — we just record it as an error and
  // exclude from "fastest" consideration.
  const results = await Promise.allSettled(
    challenge.models.map(async (m) => {
      const start = Date.now()
      const resp = await routeChat({
        model: m.modelId,
        messages: [{ role: 'user', content: challenge.prompt }],
        maxTokens: 80,
      })
      // router's latencyMs is provider-reported; fall back to wall-clock.
      const totalMs = resp.latencyMs > 0 ? resp.latencyMs : Date.now() - start
      return { model: m, resp, totalMs }
    }),
  )

  const modelLatencies: RateRouletteTruth['modelLatencies'] = []
  const calls: ProviderCallRecord[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const m = challenge.models[i]
    if (r.status === 'fulfilled') {
      modelLatencies.push({
        modelId: m.modelId,
        displayName: m.displayName,
        totalMs: r.value.totalMs,
        completionTokens: r.value.resp.completionTokens,
      })
      calls.push({
        provider: r.value.resp.provider,
        model: r.value.resp.model,
        promptTokens: r.value.resp.promptTokens,
        completionTokens: r.value.resp.completionTokens,
        latencyMs: r.value.totalMs,
      })
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason)
      modelLatencies.push({
        modelId: m.modelId,
        displayName: m.displayName,
        totalMs: Number.POSITIVE_INFINITY,
        completionTokens: 0,
        error: msg.slice(0, 200),
      })
    }
  }

  // Fastest = lowest totalMs among non-errored entries.
  const ranked = [...modelLatencies]
    .filter(l => !l.error && Number.isFinite(l.totalMs))
    .sort((a, b) => a.totalMs - b.totalMs)

  if (ranked.length === 0) {
    throw new Error('All providers failed to respond in Rate Roulette race')
  }

  // Build the legacy-compatible payload alongside the new shape so existing
  // GameArea.tsx renders without modification.
  const providers = modelLatencies.map(l => l.displayName)
  const legacyLatencies = modelLatencies.map(l => ({
    provider: l.displayName,
    latencyMs: !l.error && Number.isFinite(l.totalMs) ? l.totalMs : null,
    ok: !l.error && Number.isFinite(l.totalMs),
  }))
  const winnerLatency = modelLatencies.find(l => l.modelId === ranked[0].modelId)!
  const fastest = winnerLatency.displayName

  return {
    truth: {
      modelLatencies: modelLatencies.map(l => ({
        ...l,
        totalMs: Number.isFinite(l.totalMs) ? l.totalMs : -1,
      })),
      fastestModelId: ranked[0].modelId,
      racedAt,
      providers,
      fastest,
      latencies: legacyLatencies,
      liveRaced: true,
    },
    calls,
  }
}

export const rateRouletteOracle: GameOracleSpec<GenerationSeed, RateRouletteChallenge, RateRouletteTruth> = {
  game: GameType.rate_limit_roulette,
  // Latency drifts hourly; keep cache short. Pool refill handles burst load.
  cacheTtlMs: 60 * 60 * 1000,
  poolTargetPerTier: 8,
  generateChallenge: (seed, tier) => buildChallenge(pickMatchup(seed, tier)),
  computeGroundTruth: (challenge) => raceModels(challenge),
  // matchupId fully identifies the race; insight is cosmetic.
  canonicalForCache: (c) => ({ matchupId: c.matchupId, prompt: c.prompt }),
}

// Auto-register on import so the route handler that imports this file
// (or a centralized "register all oracles" bootstrap) wires it up.
registerOracle(rateRouletteOracle)
