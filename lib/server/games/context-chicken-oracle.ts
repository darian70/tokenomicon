// Context Chicken oracle.
//
// The "ground truth" (minimum context window) comes from curated scenario data,
// not a live model call. Cost per round: $0. The oracle infrastructure still
// earns its keep by warming pools in the background so challenge delivery is
// sub-100ms even for new users, and by enabling the shared cache so identical
// descriptions always map to the same correct answer.
//
// Pool target: 4 per tier. Cache TTL: 72h (scenarios are stable).

import { GameType } from '@prisma/client'
import { registerOracle, type GameOracleSpec, type GenerationSeed } from './oracle'
import { fairRandom } from '@/lib/server/fairness'
import type { DifficultyTier } from '@/lib/server/economy'

interface ContextChickenScenario {
  description: string
  minContext: number
  unit: string
  explanation: string
}

// Sandbox — large, obvious context spread. Players should be able to calibrate.
const SANDBOX_SCENARIOS: ContextChickenScenario[] = [
  {
    description: 'Translate a short product update email from English to Spanish.',
    minContext: 1024,
    unit: 'tokens',
    explanation: 'Short emails rarely exceed 200 tokens. 1 024 is plenty.',
  },
  {
    description: 'Summarize a 500-word blog post about API rate limiting.',
    minContext: 2048,
    unit: 'tokens',
    explanation: '500 words ≈ 750 tokens. 2 048 gives room for instructions plus the full text.',
  },
  {
    description: 'Debug a stack trace with 15 frames and suggest a fix.',
    minContext: 2048,
    unit: 'tokens',
    explanation: 'A 15-frame trace is typically 300–600 tokens. 2 048 covers surrounding context.',
  },
  {
    description: 'Write a changelog entry from a git diff of 50 lines.',
    minContext: 2048,
    unit: 'tokens',
    explanation: '50 diff lines ≈ 400 tokens plus instruction overhead. 2 048 is safe.',
  },
  {
    description: 'Convert a 40-row CSV into a markdown table with headers.',
    minContext: 2048,
    unit: 'tokens',
    explanation: '40 rows × average 5 cells ≈ 800 tokens. 2 048 handles it comfortably.',
  },
  {
    description: 'Generate unit tests for a 200-line TypeScript module.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '200 lines of TypeScript ≈ 1 500–2 000 tokens. 4 096 fits the code plus test scaffolding.',
  },
  {
    description: 'Analyze a 3-page legal contract for key obligations and risks.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '3 pages ≈ 1 800 tokens. 4 096 accommodates the full document plus reasoning.',
  },
  {
    description: 'Rewrite a 1 500-word technical README for a new audience.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '1 500 words ≈ 2 000 tokens. 4 096 fits source text plus the rewritten output.',
  },
  {
    description: 'Classify customer support tickets from a batch of 20 messages.',
    minContext: 8192,
    unit: 'tokens',
    explanation: '20 tickets × ~200 tokens each = 4 000 tokens. 8 192 leaves room for labels and reasoning.',
  },
  {
    description: 'Summarize the key findings from a 10-page research paper abstract and intro.',
    minContext: 8192,
    unit: 'tokens',
    explanation: '10 pages ≈ 5 000 tokens. 8 192 handles the full text with summary instructions.',
  },
]

// Production — tighter spread, requires real knowledge of token-per-task ratios.
const PRODUCTION_SCENARIOS: ContextChickenScenario[] = [
  {
    description: 'Write a one-line bash command to rename all .jpeg files to .jpg.',
    minContext: 512,
    unit: 'tokens',
    explanation: 'This is a tiny, self-contained command. 512 tokens is overkill but the minimum valid window.',
  },
  {
    description: 'Generate a SQL query selecting the top 5 users by total spend in the last 30 days.',
    minContext: 1024,
    unit: 'tokens',
    explanation: 'Short precise ask with known schema. 1 024 covers schema description plus query output.',
  },
  {
    description: 'Extract all named entities from a 600-word news article.',
    minContext: 2048,
    unit: 'tokens',
    explanation: '600 words ≈ 900 tokens. 2 048 fits the article plus a structured entity list.',
  },
  {
    description: 'Review a 300-line Python module for PEP 8 violations and suggest fixes.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '300 lines ≈ 2 000 tokens. 4 096 holds the full source plus inline corrections.',
  },
  {
    description: 'Translate a 2 000-word developer documentation page from English to German.',
    minContext: 8192,
    unit: 'tokens',
    explanation: '2 000 words ≈ 3 000 tokens input; the translated output is similar length. 8 192 fits both.',
  },
  {
    description: 'Compare two 100-line configuration files and output a structured diff report.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '200 lines total ≈ 1 500 tokens. 4 096 handles both files plus the diff analysis.',
  },
  {
    description: 'Write a docstring for each function in a 150-line utility module.',
    minContext: 4096,
    unit: 'tokens',
    explanation: '150 lines ≈ 1 000 tokens. 4 096 accommodates source plus generated docstrings.',
  },
  {
    description: 'Summarize 30 GitHub PR descriptions into a sprint release note.',
    minContext: 8192,
    unit: 'tokens',
    explanation: '30 PR descriptions × ~150 tokens each = 4 500 tokens. 8 192 is the safe minimum.',
  },
]

// Blackbox — counterintuitive cases where naive guesses fail.
const BLACKBOX_SCENARIOS: ContextChickenScenario[] = [
  {
    description: 'List every capital city in the world alphabetically.',
    minContext: 2048,
    unit: 'tokens',
    explanation: '~195 capitals × 10 tokens each ≈ 2 000 tokens of output. The question is short but the answer fills a 2 048-token window.',
  },
  {
    description: "Write a haiku about the concept of 'undefined behavior' in C.",
    minContext: 512,
    unit: 'tokens',
    explanation: "A haiku is 17 syllables — the entire response is under 50 tokens. 512 is overkill and a common overestimate.",
  },
  {
    description: 'Enumerate every AWS service and its primary use case.',
    minContext: 16384,
    unit: 'tokens',
    explanation: 'AWS has 200+ services. Listing each with a use case runs to 8 000–12 000 tokens. Most underestimate this.',
  },
  {
    description: 'What is the difference between == and === in JavaScript? Give one example.',
    minContext: 512,
    unit: 'tokens',
    explanation: 'A focused answer with one example is under 150 tokens. Players routinely overestimate knowledge questions.',
  },
  {
    description: 'Generate a full REST API spec in OpenAPI 3.0 for a 10-endpoint e-commerce service.',
    minContext: 16384,
    unit: 'tokens',
    explanation: 'A 10-endpoint OpenAPI spec with schemas, examples, and error responses easily exceeds 8 000 tokens.',
  },
  {
    description: 'Explain what a monad is in functional programming, briefly.',
    minContext: 512,
    unit: 'tokens',
    explanation: '"Briefly" is the key word. A concise monad explanation is under 200 tokens.',
  },
]

export interface ContextChickenChallenge {
  description: string
  unit: string
  minContext: number    // kept in challenge object; stripped by sanitizeChallengeForClient
  explanation: string  // shown on result screen; also stripped until reveal
}

export interface ContextChickenTruth {
  minContext: number
  explanation: string
}

function pickScenario(seed: GenerationSeed, tier: DifficultyTier): ContextChickenScenario {
  const pool =
    tier === 'blackbox' ? BLACKBOX_SCENARIOS
    : tier === 'production' ? PRODUCTION_SCENARIOS
    : SANDBOX_SCENARIOS
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

export const contextChickenOracle: GameOracleSpec<GenerationSeed, ContextChickenChallenge, ContextChickenTruth> = {
  game: GameType.context_chicken,
  cacheTtlMs: 72 * 60 * 60 * 1000,
  poolTargetPerTier: 4,

  generateChallenge: (seed, tier) => {
    const s = pickScenario(seed, tier)
    return { description: s.description, unit: s.unit, minContext: s.minContext, explanation: s.explanation }
  },

  // Ground truth is embedded in the challenge (curated dataset). No model call needed.
  computeGroundTruth: async (challenge) => ({
    truth: { minContext: challenge.minContext, explanation: challenge.explanation },
    calls: [],
  }),

  // Cache by description only — minContext is deterministic given description.
  canonicalForCache: (c) => ({ description: c.description }),
}

registerOracle(contextChickenOracle)
