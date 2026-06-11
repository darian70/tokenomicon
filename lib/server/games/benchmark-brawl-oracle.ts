// Benchmark Brawl — live oracle.
//
// Runs a real coding/explanation task against 3 real models in parallel,
// then uses a cheap judge model to determine which output is best.
// Supersedes the hardcoded BRAWL_SCENARIOS with live inference.
//
// Cost discipline:
//   - 3 model calls @ 400 max tokens each
//   - 1 judge call @ 100 max tokens
//   - Blended cost: ~$0.003–0.005 per uncached round
//   - With 24h cache + pool reuse: amortized to ~$0.0003/player
//
// Cache TTL: 24h — model outputs for the same task are stable day-to-day.
// Pool target: 3 per tier — lower than Rate Roulette because each round is
//   more expensive to generate; cache deduplication covers the gap.

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
import type { ProviderName } from '@/lib/server/providers/types'

// ---------------------------------------------------------------------------
// Scenario pool
// ---------------------------------------------------------------------------

interface BrawlScenarioTemplate {
  task: string
  criteria: string
  modelIds: [string, string, string]  // real router model IDs from pricing.ts
  tier: 'sandbox' | 'production' | 'blackbox'
}

// Models used — all exist in pricing.ts and have real API backing.
// Tier assignment reflects real cost/quality tradeoffs:
//   sandbox:    cheap/fast models — clear quality differences are expected
//   production: flagship models — much tighter race, judging is genuinely hard
//   blackbox:   reasoning models in the mix — surprising results expected

const SCENARIOS: BrawlScenarioTemplate[] = [
  // ── SANDBOX: clear quality signal expected ───────────────────────────────
  {
    task: 'Write a Python function to check if a string is a palindrome. Handle spaces, punctuation, and case differences.',
    criteria: 'correctness and edge case handling',
    modelIds: ['gpt-4o-mini', 'gemma2-9b-it', 'mistralai/mistral-small-3.2-24b-instruct'],
    tier: 'sandbox',
  },
  {
    task: 'Explain the difference between TCP and UDP for a junior developer. Include when to use each.',
    criteria: 'clarity, accuracy, and practical guidance',
    modelIds: ['claude-3-5-haiku-20241022', 'gpt-4o-mini', 'google/gemini-2.5-flash-preview'],
    tier: 'sandbox',
  },
  {
    task: 'Write a SQL query to find the second-highest salary in an employees table. Handle the case where multiple employees share the highest salary.',
    criteria: 'correctness, edge case handling, and use of appropriate SQL features',
    modelIds: ['gpt-4o-mini', 'claude-3-5-haiku-20241022', 'gemma2-9b-it'],
    tier: 'sandbox',
  },
  {
    task: 'Explain recursion to a 10-year-old using a concrete, relatable analogy.',
    criteria: 'simplicity, accuracy, and clarity of the analogy',
    modelIds: ['gpt-4o-mini', 'google/gemini-2.5-flash-preview', 'mistralai/mistral-small-3.2-24b-instruct'],
    tier: 'sandbox',
  },
  {
    task: 'Write a JavaScript function that deep-clones an object, handling circular references.',
    criteria: 'correctness, circular reference handling, and code quality',
    modelIds: ['claude-3-5-haiku-20241022', 'gpt-4o-mini', 'gemma2-9b-it'],
    tier: 'sandbox',
  },

  // ── PRODUCTION: flagship models, tight race ───────────────────────────────
  {
    task: 'Design a rate limiter using the token bucket algorithm. Implement it in TypeScript with proper handling of distributed environments (multiple server instances).',
    criteria: 'architecture quality, correctness in distributed context, and code clarity',
    modelIds: ['gpt-4o', 'claude-sonnet-4-20250514', 'deepseek/deepseek-chat-v3-0324'],
    tier: 'production',
  },
  {
    task: 'Refactor deeply nested callbacks into async/await. Optimize for parallel execution where operations are independent.',
    criteria: 'code quality, parallelization correctness, and readability',
    modelIds: ['claude-sonnet-4-20250514', 'gpt-4o', 'google/gemini-2.5-flash-preview'],
    tier: 'production',
  },
  {
    task: 'Write a production-ready Dockerfile for a Node.js API service. Apply security hardening, multi-stage builds, and proper layer caching.',
    criteria: 'security, efficiency, layer ordering, and adherence to Docker best practices',
    modelIds: ['gpt-4o', 'claude-sonnet-4-20250514', 'deepseek/deepseek-chat-v3-0324'],
    tier: 'production',
  },
  {
    task: "Summarize 'Attention Is All You Need' (the Transformer paper). Focus on multi-head attention, positional encodings, and why the architecture enables parallel training.",
    criteria: 'technical accuracy, depth, and clarity for a machine learning practitioner',
    modelIds: ['claude-sonnet-4-20250514', 'gpt-4o', 'google/gemini-2.5-pro-preview'],
    tier: 'production',
  },
  {
    task: 'Create a regex to validate email addresses. Follow RFC 5321 practical constraints, add inline comments explaining each part.',
    criteria: 'RFC compliance, robustness, and code clarity',
    modelIds: ['gpt-4o', 'claude-sonnet-4-20250514', 'deepseek/deepseek-chat-v3-0324'],
    tier: 'production',
  },
  {
    task: 'Design the data model and API contract for a credit ledger system. Requirements: multiple balance buckets, immutable audit trail, atomic debits/credits, and idempotent operations.',
    criteria: 'correctness, immutability design, idempotency handling, and completeness',
    modelIds: ['claude-sonnet-4-20250514', 'gpt-4o', 'google/gemini-2.5-pro-preview'],
    tier: 'production',
  },

  // ── BLACKBOX: reasoning models — surprising outcomes expected ─────────────
  {
    task: "Prove why the halting problem is undecidable. Present Turing's diagonalization argument clearly.",
    criteria: 'mathematical rigor, correctness of the diagonalization argument, and clarity',
    modelIds: ['deepseek/deepseek-r1', 'gpt-4o', 'claude-sonnet-4-20250514'],
    tier: 'blackbox',
  },
  {
    task: 'Design a consistent hashing algorithm for distributing load across N servers. Handle server addition and removal with minimal key remapping.',
    criteria: 'correctness, minimal remapping guarantee, and explanatory quality',
    modelIds: ['deepseek/deepseek-r1', 'claude-sonnet-4-20250514', 'gpt-4o'],
    tier: 'blackbox',
  },
  {
    task: 'Convert a REST API to GraphQL. Include schema design, DataLoader for N+1 prevention, and mutation design with proper error handling.',
    criteria: 'GraphQL best practices, N+1 handling correctness, and schema design quality',
    modelIds: ['gpt-4o', 'deepseek/deepseek-r1', 'qwen/qwen3-235b-a22b'],
    tier: 'blackbox',
  },
  {
    task: 'Implement a lock-free stack data structure in Python using compare-and-swap semantics. Explain the ABA problem and whether your implementation handles it.',
    criteria: 'correctness, ABA problem awareness, and code quality',
    modelIds: ['deepseek/deepseek-r1', 'gpt-4o', 'claude-sonnet-4-20250514'],
    tier: 'blackbox',
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchmarkBrawlChallenge {
  task: string
  criteria: string
  models: string[]  // display names — compatible with legacy scorer and UI
}

export interface BenchmarkBrawlTruth {
  outputs: Record<string, string>  // displayName → response text
  bestModel: string                // display name — legacy scorer compat
  bestModelId: string              // real model ID
  judgeModel: string               // display name of the judge
  liveEvaluated: true
}

// ---------------------------------------------------------------------------
// Judge — picks cheapest available fast model
// ---------------------------------------------------------------------------

const JUDGE_MODEL_PRIORITY = [
  'gemma2-9b-it',                              // Groq: fastest, cheapest
  'llama-3.3-70b-versatile',                   // Groq: larger fallback
  'gpt-4o-mini',                               // OpenAI fallback
  'mistralai/mistral-small-3.2-24b-instruct',  // OpenRouter fallback
]

async function runJudge(
  task: string,
  criteria: string,
  candidates: { displayName: string; text: string }[],
): Promise<{ winner: string; model: string }> {
  const judgePrompt = [
    `You are a strict technical evaluator. Your task: pick the BEST model output for the given task.`,
    ``,
    `TASK: ${task}`,
    `JUDGING CRITERIA: ${criteria}`,
    ``,
    ...candidates.map(c => `## ${c.displayName}\n${c.text}`),
    ``,
    `Which model produced the best output judged strictly by "${criteria}"?`,
    `Reply with ONLY the exact model name from the list above — nothing else. No explanation.`,
    `Choose from: ${candidates.map(c => c.displayName).join(', ')}`,
  ].join('\n')

  let lastErr: Error | null = null
  for (const modelId of JUDGE_MODEL_PRIORITY) {
    try {
      const r = await routeChat({
        model: modelId,
        messages: [{ role: 'user', content: judgePrompt }],
        maxTokens: 80,
      })
      const raw = r.text.trim()
      // Find the candidate whose name appears in the judge's reply
      const match = candidates.find(c => raw.includes(c.displayName))
      if (match) return { winner: match.displayName, model: r.model }
      // Fallback: judge produced something unexpected, pick first candidate
      return { winner: candidates[0].displayName, model: r.model }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr ?? new Error('No judge model available for Benchmark Brawl oracle')
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function pickScenario(seed: GenerationSeed, tier: 'sandbox' | 'production' | 'blackbox'): BrawlScenarioTemplate {
  const pool = SCENARIOS.filter(s => s.tier === tier)
  if (pool.length === 0) return SCENARIOS[0]
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

export const benchmarkBrawlOracle: GameOracleSpec<GenerationSeed, BenchmarkBrawlChallenge, BenchmarkBrawlTruth> = {
  game: GameType.benchmark_brawl,
  cacheTtlMs: 24 * 60 * 60 * 1000,  // 24h — model outputs are stable
  poolTargetPerTier: 3,               // smaller pool; each entry is expensive to compute

  generateChallenge: (seed, tier) => {
    const scenario = pickScenario(seed, tier)
    const models = scenario.modelIds.map(id => {
      const entry = getModelPrice(id)
      return entry?.displayName ?? id
    })
    return {
      task: scenario.task,
      criteria: scenario.criteria,
      models,
    }
  },

  computeGroundTruth: async (challenge, _tier) => {
    // We need the real model IDs to call routeChat. We cross-reference the
    // display names back to model IDs by scanning the scenario pool, then
    // fall back to the display name itself (which routeChat will reject with
    // a clear error if it's not a registered model).
    const modelIdMap: Record<string, string> = {}
    for (const s of SCENARIOS) {
      for (const id of s.modelIds) {
        const entry = getModelPrice(id)
        if (entry) modelIdMap[entry.displayName] = id
      }
    }

    const calls: ProviderCallRecord[] = []
    const outputs: Record<string, string> = {}

    // Fire all models in parallel — settle all so one failure doesn't kill the round
    const settled = await Promise.allSettled(
      challenge.models.map(async (displayName) => {
        const modelId = modelIdMap[displayName] ?? displayName
        const r = await routeChat({
          model: modelId,
          messages: [{ role: 'user', content: challenge.task }],
          maxTokens: 400,
        })
        return { displayName, modelId, r }
      }),
    )

    const successful: { displayName: string; text: string }[] = []

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { displayName, r } = result.value
        outputs[displayName] = r.text.slice(0, 3000)  // cap for storage
        successful.push({ displayName, text: outputs[displayName] })
        calls.push({
          provider: r.provider as ProviderName,
          model: r.model,
          promptTokens: r.promptTokens,
          completionTokens: r.completionTokens,
          latencyMs: r.latencyMs,
        })
      } else {
        // Model failed — record a placeholder
        const displayName = challenge.models[settled.indexOf(result)] ?? 'unknown'
        outputs[displayName] = '[Provider error — model did not respond]'
      }
    }

    if (successful.length < 2) {
      throw new Error('Benchmark Brawl oracle: fewer than 2 models responded — cannot judge')
    }

    // Run the judge
    const { winner, model: judgeModelRaw } = await runJudge(
      challenge.task,
      challenge.criteria,
      successful,
    )
    const judgeEntry = getModelPrice(judgeModelRaw)
    const bestModelId = modelIdMap[winner] ?? winner

    if (judgeEntry) {
      calls.push({
        provider: judgeEntry.provider as ProviderName,
        model: judgeModelRaw,
        promptTokens: 0,  // judge tokens not individually tracked here
        completionTokens: 0,
        latencyMs: 0,
      })
    }

    return {
      truth: {
        outputs,
        bestModel: winner,
        bestModelId,
        judgeModel: judgeEntry?.displayName ?? judgeModelRaw,
        liveEvaluated: true,
      },
      calls,
    }
  },

  canonicalForCache: (c) => ({ task: c.task, criteria: c.criteria, models: [...c.models].sort() }),
}

// Auto-register on import
registerOracle(benchmarkBrawlOracle)
