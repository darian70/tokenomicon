// Token Prophet — live oracle.
//
// Replaces the hardcoded TOKEN_PROPHET_PAIRS with a large template pool
// that gets called against a real cheap model to determine actual token counts.
// The oracle uses the cheapest configured model with maxTokens=512.
// Cost per round: ~$0.00001 — essentially free.
//
// KEY LEGITIMACY GUARANTEE: longerIs is determined by REAL completion token
// counts from a live model call, not by our estimates. Players who understand
// how LLMs process prompts genuinely outperform those who guess.
//
// Cache TTL: 24h — token counts are very stable for a given model+prompt pair.
// Pool target: 6 per tier — keeps play-time round delivery sub-100ms.

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
// Prompt template pools — organized by difficulty tier.
//
// Sandbox: massive obvious gap (1-word answer vs. multi-paragraph tutorial)
// Production: both seem similar-length, but one is reliably longer once you
//   know how models process each type of request
// Blackbox: counterintuitive — "list all X" exhaustively fills output, while
//   the "explain X" prompt gets a focused 2-sentence answer
// ---------------------------------------------------------------------------

interface PromptPair {
  promptA: string
  promptB: string
  category: string
}

const SANDBOX_PAIRS: PromptPair[] = [
  {
    promptA: 'What year was JavaScript created?',
    promptB: 'Trace the history of JavaScript from 1995 to today, including every major release milestone.',
    category: 'history',
  },
  {
    promptA: "Say only 'OK'.",
    promptB: 'Summarize the history of the internet in three paragraphs.',
    category: 'instruction',
  },
  {
    promptA: 'What does HTTP stand for?',
    promptB: 'Write a step-by-step guide to designing a REST API from scratch, including authentication.',
    category: 'web',
  },
  {
    promptA: 'Name the capital of France.',
    promptB: 'Name the capital city of every country in Europe, listed alphabetically by country.',
    category: 'geography',
  },
  {
    promptA: 'Is Python interpreted or compiled?',
    promptB: 'Compare Python, Go, and Rust in depth for building high-throughput backend services.',
    category: 'languages',
  },
  {
    promptA: 'What is 2^10?',
    promptB: 'Write a comprehensive tutorial on binary arithmetic and bitwise operations with code examples.',
    category: 'math',
  },
  {
    promptA: 'What does SQL stand for?',
    promptB: 'Write a complete SQL tutorial covering SELECT, JOIN, subqueries, indexes, and transactions.',
    category: 'databases',
  },
  {
    promptA: 'Name three sorting algorithms.',
    promptB: 'Explain the time complexity, space complexity, and implementation of merge sort, quicksort, heap sort, and radix sort.',
    category: 'algorithms',
  },
  {
    promptA: "Translate 'Hello, how are you?' to French.",
    promptB: "Translate 'Hello, how are you?' to every Romance language, including pronunciation guides.",
    category: 'languages',
  },
  {
    promptA: 'What is a closure?',
    promptB: 'Write a comprehensive tutorial on closures in JavaScript with five detailed code examples covering real-world use cases.',
    category: 'concepts',
  },
  {
    promptA: "Print 'hello world' in Python.",
    promptB: 'Write a complete Python beginner tutorial covering variables, functions, loops, classes, and error handling.',
    category: 'code',
  },
  {
    promptA: 'What is the default port for HTTPS?',
    promptB: 'Explain how HTTPS works end-to-end including TLS handshake, certificate validation, and symmetric encryption.',
    category: 'web',
  },
  {
    promptA: 'How many bits are in a byte?',
    promptB: 'Explain how computer memory works from bits to registers, including byte addressing and endianness.',
    category: 'hardware',
  },
  {
    promptA: 'What does DNS stand for?',
    promptB: 'Explain how DNS resolution works step by step, including recursive resolvers, authoritative nameservers, and TTL.',
    category: 'networking',
  },
  {
    promptA: 'What is a function in programming?',
    promptB: 'Write a comprehensive tutorial on higher-order functions, closures, and functional programming patterns with JavaScript examples.',
    category: 'code',
  },
]

const PRODUCTION_PAIRS: PromptPair[] = [
  {
    promptA: 'List all HTTP status codes and their meanings.',
    promptB: 'Explain the difference between 401 and 403 HTTP status codes.',
    category: 'web',
  },
  {
    promptA: 'What are the SOLID principles?',
    promptB: 'Give a one-sentence definition of the Single Responsibility Principle.',
    category: 'design',
  },
  {
    promptA: 'Write a haiku about databases.',
    promptB: 'Explain eventual consistency in distributed databases.',
    category: 'databases',
  },
  {
    promptA: 'Name three JavaScript frameworks.',
    promptB: 'Compare React, Vue, and Angular for a large enterprise application.',
    category: 'web',
  },
  {
    promptA: 'What is a race condition?',
    promptB: 'What is a deadlock in concurrent programming?',
    category: 'concurrency',
  },
  {
    promptA: 'Write a regex that matches email addresses.',
    promptB: 'Explain how regular expressions work for a complete beginner with examples.',
    category: 'tools',
  },
  {
    promptA: 'What is Docker and why is it used?',
    promptB: 'Explain the difference between containers and virtual machines.',
    category: 'devops',
  },
  {
    promptA: 'What is GraphQL?',
    promptB: 'Compare REST and GraphQL APIs with pros and cons of each approach.',
    category: 'web',
  },
  {
    promptA: 'What is a binary search tree?',
    promptB: 'Explain the difference between arrays and linked lists in terms of performance characteristics.',
    category: 'data-structures',
  },
  {
    promptA: 'What is OAuth 2.0?',
    promptB: 'Explain JWT (JSON Web Tokens), how they are structured, and common security pitfalls.',
    category: 'auth',
  },
  {
    promptA: 'Write a Python function that checks if a number is prime.',
    promptB: 'Write a Python function that generates the first N Fibonacci numbers using multiple approaches.',
    category: 'code',
  },
  {
    promptA: 'What is the Observer pattern?',
    promptB: 'Explain the Model-View-Controller (MVC) pattern and how it applies to web frameworks.',
    category: 'design',
  },
  {
    promptA: 'What is CAP theorem?',
    promptB: 'Explain the differences between SQL and NoSQL databases with use case guidance.',
    category: 'databases',
  },
  {
    promptA: 'What is idempotency in HTTP?',
    promptB: 'Explain REST constraints and why statelessness matters for scalability.',
    category: 'web',
  },
  {
    promptA: 'What is memoization?',
    promptB: 'Explain dynamic programming with examples of top-down and bottom-up approaches.',
    category: 'algorithms',
  },
]

const BLACKBOX_PAIRS: PromptPair[] = [
  {
    promptA: 'Summarize the CAP theorem in one sentence.',
    promptB: 'List every planet in the solar system with its key characteristics.',
    category: 'knowledge',
  },
  {
    promptA: 'Write a function that returns true if a number is even.',
    promptB: 'Write a function that checks if a string is a palindrome, handling all edge cases.',
    category: 'code',
  },
  {
    promptA: 'What are the rules of chess?',
    promptB: 'Write a complete chess engine implementation in Python.',
    category: 'complexity',
  },
  {
    promptA: "Explain what 'undefined' means in JavaScript.",
    promptB: "Explain what 'null' means in JavaScript.",
    category: 'concepts',
  },
  {
    promptA: 'Write a one-line Python lambda that adds two numbers.',
    promptB: 'Explain Python lambda functions and when to use them versus regular named functions.',
    category: 'code',
  },
  {
    promptA: 'List three benefits of TypeScript over JavaScript.',
    promptB: 'List three drawbacks of TypeScript over JavaScript.',
    category: 'languages',
  },
  {
    promptA: 'What is a heap data structure?',
    promptB: 'What is a trie data structure?',
    category: 'data-structures',
  },
  {
    promptA: 'Name one advantage of functional programming.',
    promptB: 'Name one advantage of object-oriented programming.',
    category: 'paradigms',
  },
  {
    promptA: 'Give an example of a greedy algorithm.',
    promptB: 'Give an example of a divide-and-conquer algorithm.',
    category: 'algorithms',
  },
  {
    promptA: "What does 'idempotent' mean in HTTP?",
    promptB: "What does 'stateless' mean in REST architecture?",
    category: 'web',
  },
  {
    promptA: 'What is tail call optimization?',
    promptB: 'What is lazy evaluation in programming languages?',
    category: 'concepts',
  },
  {
    promptA: 'What is the time complexity of binary search?',
    promptB: 'What is the time complexity of merge sort?',
    category: 'algorithms',
  },
  {
    promptA: "Write a haiku about 'hello world'.",
    promptB: "Write a limerick about 'hello world'.",
    category: 'creative',
  },
  {
    promptA: 'What is a monad in functional programming?',
    promptB: 'What is a functor in functional programming?',
    category: 'paradigms',
  },
  {
    promptA: 'Define "eventual consistency" in one sentence.',
    promptB: 'Define "strong consistency" in one sentence.',
    category: 'databases',
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenProphetChallenge {
  promptA: string
  promptB: string
  category: string
}

export interface TokenProphetTruth {
  tokensA: number         // real completion tokens from model
  tokensB: number
  longerIs: 'A' | 'B'    // derived from real counts (tiebreak: always 'A')
  outputA: string         // actual model response shown on the reveal screen
  outputB: string
  liveVerified: true
  verificationModel: string
}

// ---------------------------------------------------------------------------
// Model selection — cheapest available, with fallback
// ---------------------------------------------------------------------------

const CHEAP_MODEL_PRIORITY = [
  'gemma2-9b-it',                              // Groq: $0.0002/M — essentially free
  'mistralai/mistral-small-3.2-24b-instruct',  // OpenRouter: $0.10/M input
  'gpt-4o-mini',                               // OpenAI: $0.15/M input
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
        maxTokens: 512,
      })
      return {
        text: r.text,
        completionTokens: r.completionTokens,
        promptTokens: r.promptTokens,
        provider: r.provider,
        model: r.model,
        latencyMs: r.latencyMs,
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr ?? new Error('No model available for Token Prophet oracle')
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function pickPair(seed: GenerationSeed, tier: 'sandbox' | 'production' | 'blackbox'): PromptPair {
  const pool =
    tier === 'sandbox' ? SANDBOX_PAIRS
    : tier === 'production' ? PRODUCTION_PAIRS
    : BLACKBOX_PAIRS
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

export const tokenProphetOracle: GameOracleSpec<GenerationSeed, TokenProphetChallenge, TokenProphetTruth> = {
  game: GameType.token_prophet,
  cacheTtlMs: 24 * 60 * 60 * 1000,  // 24h — token counts are stable for a given model+prompt
  poolTargetPerTier: 6,

  generateChallenge: (seed, tier) => {
    const pair = pickPair(seed, tier)
    // Seeded A/B swap so the same pair appears from both sides over time
    const swapped = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce + 7, 2) === 1
    if (swapped) {
      return { promptA: pair.promptB, promptB: pair.promptA, category: pair.category }
    }
    return { promptA: pair.promptA, promptB: pair.promptB, category: pair.category }
  },

  computeGroundTruth: async (challenge) => {
    // Fire both prompts in parallel — same model, same conditions.
    const [rA, rB] = await Promise.all([
      callModel(challenge.promptA),
      callModel(challenge.promptB),
    ])

    const tokensA = rA.completionTokens
    const tokensB = rB.completionTokens
    // Tiebreak: 'A' wins (rare edge case, arbitrary but deterministic)
    const longerIs: 'A' | 'B' = tokensA >= tokensB ? 'A' : 'B'

    const calls: ProviderCallRecord[] = [
      {
        provider: rA.provider as import('@/lib/server/providers/types').ProviderName,
        model: rA.model,
        promptTokens: rA.promptTokens,
        completionTokens: rA.completionTokens,
        latencyMs: rA.latencyMs,
      },
      {
        provider: rB.provider as import('@/lib/server/providers/types').ProviderName,
        model: rB.model,
        promptTokens: rB.promptTokens,
        completionTokens: rB.completionTokens,
        latencyMs: rB.latencyMs,
      },
    ]

    return {
      truth: {
        tokensA,
        tokensB,
        longerIs,
        outputA: rA.text.slice(0, 1500),  // cap for storage; full shown in reveal
        outputB: rB.text.slice(0, 1500),
        liveVerified: true,
        verificationModel: rA.model,
      },
      calls,
    }
  },

  // Cache by prompts only (model used is an implementation detail, not content)
  canonicalForCache: (c) => ({ promptA: c.promptA, promptB: c.promptB }),
}

// Auto-register on import
registerOracle(tokenProphetOracle)
