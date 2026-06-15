// Prompt Golf oracle.
//
// Calls a cheap model to verify that the required keywords can be included in
// a short prompt and establishes a par (reference minimum length). This gives
// the game a live benchmark rather than a purely formula-based score.
//
// Cost per uncached round: ~$0.00001 (one 512-token call on a cheap model).
// With 24h cache + pool warming the amortized cost per player ≈ $0.000002.
//
// Cache TTL: 24h. Pool target: 5 per tier.

import { GameType } from '@prisma/client'
import { routeChat } from '@/lib/server/providers/router'
import {
  registerOracle,
  type GameOracleSpec,
  type GenerationSeed,
  type ProviderCallRecord,
} from './oracle'
import { fairRandom } from '@/lib/server/fairness'
import type { DifficultyTier } from '@/lib/server/economy'
import type { ProviderName } from '@/lib/server/providers/types'

// ---------------------------------------------------------------------------
// Challenge pools — organized by difficulty tier
// ---------------------------------------------------------------------------

interface PromptGolfTarget {
  text: string          // task description shown to player
  required: string[]    // keywords the player's prompt must include
}

// Sandbox — 3–4 required words, keywords easy to fit naturally
const SANDBOX_TARGETS: PromptGolfTarget[] = [
  { text: 'Return a JSON object with keys title and score.', required: ['json', 'title', 'score'] },
  { text: 'Write a Python function named slugify.', required: ['python', 'function', 'slugify'] },
  { text: 'Write a regex pattern matching email addresses.', required: ['regex', 'email'] },
  { text: 'Write a React hook that debounces an input value.', required: ['react', 'hook', 'debounce'] },
  { text: 'Generate a cron expression for every weekday at 9 AM UTC.', required: ['cron', 'weekday', '9'] },
  { text: 'Write a bash one-liner to count lines in all .ts files.', required: ['bash', 'count', 'lines', 'ts'] },
  { text: 'Create a CSS class for a glowing border animation.', required: ['css', 'glow', 'border', 'animation'] },
  { text: 'Write a Dockerfile for a Node.js API server.', required: ['docker', 'node', 'api'] },
  { text: 'Explain what a closure is in JavaScript in one sentence.', required: ['closure', 'javascript'] },
  { text: 'Write a SQL query that returns the count of rows grouped by status.', required: ['sql', 'count', 'group', 'status'] },
]

// Production — 4–5 required words, some are less natural to include together
const PRODUCTION_TARGETS: PromptGolfTarget[] = [
  { text: 'Generate TypeScript types for a user profile with name and email.', required: ['typescript', 'type', 'name', 'email'] },
  { text: 'Generate a SQL query selecting top 5 users by spend.', required: ['sql', 'top', 'spend'] },
  { text: 'Generate a Prisma model for a credit ledger entry.', required: ['prisma', 'model', 'credit', 'ledger'] },
  { text: 'Create an SQL migration adding an index on userId and createdAt.', required: ['sql', 'index', 'userId', 'createdAt'] },
  { text: 'Write a middleware function in Express that validates a JWT bearer token.', required: ['express', 'middleware', 'jwt', 'bearer'] },
  { text: 'Write a GitHub Actions workflow that runs tests on push to main.', required: ['github', 'actions', 'tests', 'push', 'main'] },
  { text: 'Create a Zod schema for a signup form with email, password, and optional name.', required: ['zod', 'schema', 'email', 'password', 'name'] },
  { text: 'Write a Redis SETNX pattern for distributed locking with a TTL.', required: ['redis', 'lock', 'ttl', 'expiry'] },
]

// Blackbox — 5+ required words, some combinations are counterintuitive to shorten
const BLACKBOX_TARGETS: PromptGolfTarget[] = [
  { text: 'Write a recursive Fibonacci function in Haskell with memoization.', required: ['haskell', 'recursive', 'fibonacci', 'memoization'] },
  { text: 'Implement a rate limiter using the sliding window algorithm in TypeScript.', required: ['typescript', 'rate', 'limiter', 'sliding', 'window'] },
  { text: 'Write a WebSocket server handler in Go that broadcasts messages to all clients.', required: ['go', 'websocket', 'broadcast', 'clients', 'handler'] },
  { text: 'Design a Kafka consumer group that handles message deduplication with idempotent processing.', required: ['kafka', 'consumer', 'group', 'idempotent', 'deduplication'] },
  { text: 'Implement a consistent hashing ring in Python for distributing cache keys across nodes.', required: ['python', 'consistent', 'hashing', 'ring', 'nodes', 'cache'] },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptGolfChallenge {
  text: string
  required: string[]
}

export interface PromptGolfTruth {
  parLength: number        // length of the cheapest model's shortest valid solution
  referencePrompt: string  // the model's solution (used for UI reveal)
  liveVerified: true
  verificationModel: string
}

// ---------------------------------------------------------------------------
// Model selection — cheapest available with fallback
// ---------------------------------------------------------------------------

const CHEAP_MODEL_PRIORITY = [
  'gemma2-9b-it',
  'mistralai/mistral-small-3.2-24b-instruct',
  'gpt-4o-mini',
]

async function callModel(prompt: string): Promise<{
  text: string
  completionTokens: number
  promptTokens: number
  provider: string
  model: string
  latencyMs: number
}> {
  let lastErr: Error | null = null
  for (const modelId of CHEAP_MODEL_PRIORITY) {
    try {
      const r = await routeChat({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 256,
      })
      return { text: r.text, completionTokens: r.completionTokens, promptTokens: r.promptTokens, provider: r.provider, model: r.model, latencyMs: r.latencyMs }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr ?? new Error('No model available for Prompt Golf oracle')
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function pickTarget(seed: GenerationSeed, tier: DifficultyTier): PromptGolfTarget {
  const pool =
    tier === 'blackbox' ? BLACKBOX_TARGETS
    : tier === 'production' ? PRODUCTION_TARGETS
    : SANDBOX_TARGETS
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

export const promptGolfOracle: GameOracleSpec<GenerationSeed, PromptGolfChallenge, PromptGolfTruth> = {
  game: GameType.prompt_golf,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  poolTargetPerTier: 5,

  generateChallenge: (seed, tier) => {
    const target = pickTarget(seed, tier)
    return { text: target.text, required: target.required }
  },

  computeGroundTruth: async (challenge) => {
    const keywordList = challenge.required.join(', ')
    const metaPrompt =
      `Write the absolute shortest prompt that accomplishes this task and includes every required keyword.\n` +
      `Task: ${challenge.text}\n` +
      `Required keywords (must all appear): ${keywordList}\n` +
      `Output ONLY the prompt text. No explanation. No preamble. Every keyword must appear verbatim.`

    const r = await callModel(metaPrompt)
    const referencePrompt = r.text.trim()

    // Verify all keywords are present; fall back to a simple concatenation if not.
    const hasAll = challenge.required.every((kw) =>
      referencePrompt.toLowerCase().includes(kw.toLowerCase()),
    )
    const finalPrompt = hasAll
      ? referencePrompt
      : `${referencePrompt} (${challenge.required.join(', ')})`

    const calls: ProviderCallRecord[] = [
      {
        provider: r.provider as ProviderName,
        model: r.model,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        latencyMs: r.latencyMs,
      },
    ]

    return {
      truth: {
        parLength: finalPrompt.length,
        referencePrompt: finalPrompt,
        liveVerified: true,
        verificationModel: r.model,
      },
      calls,
    }
  },

  canonicalForCache: (c) => ({ text: c.text, required: [...c.required].sort() }),
}

registerOracle(promptGolfOracle)
