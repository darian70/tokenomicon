import type { ArenaGameId } from './types'

export type ActiveGameId = ArenaGameId

export interface GameCatalogEntry {
  id: ArenaGameId
  slug: string
  name: string
  tagline: string
  description: string
  longDescription: string
  rewardRange: string
  maxReward: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'prediction' | 'optimization' | 'identification' | 'timing'
  accent: string
  accentBg: string
  accentBorder: string
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: 'token_prophet',
    slug: 'token-prophet',
    name: 'Token Prophet',
    tagline: 'Calibration Challenge',
    description: 'Two prompts, head to head. Pick the one that makes the model generate MORE output tokens.',
    longDescription: 'You are shown two prompts side by side. Call which one produces more output tokens when answered by a model. Longer, more open-ended asks generate more tokens — calibration and prompt intuition are your edge. The token counts are revealed after you lock in your pick.',
    rewardRange: 'Up to 200 cr',
    maxReward: 200,
    difficulty: 'medium',
    category: 'prediction',
    accent: '#5ad8ff',
    accentBg: 'rgba(90,216,255,0.06)',
    accentBorder: 'rgba(90,216,255,0.2)',
  },
  {
    id: 'prompt_golf',
    slug: 'prompt-golf',
    name: 'Prompt Golf',
    tagline: 'Compression Game',
    description: 'Shortest prompt that hits all targets. Every character costs you.',
    longDescription: 'You are given a task and a list of required keywords. Build the shortest possible prompt that includes all of them. The fewer characters you use, the higher your score.',
    rewardRange: 'Up to 240 cr',
    maxReward: 240,
    difficulty: 'hard',
    category: 'optimization',
    accent: '#59f5a9',
    accentBg: 'rgba(89,245,169,0.06)',
    accentBorder: 'rgba(89,245,169,0.2)',
  },
  {
    id: 'bug_exorcist',
    slug: 'bug-exorcist',
    name: 'Bug Exorcist',
    tagline: 'Debug Raid',
    description: 'Spot the correct fix in broken code. One right answer, no hints.',
    longDescription: 'A broken code snippet is presented. Three potential patches are shown. Only one addresses the root cause correctly. Pick it and earn compute.',
    rewardRange: 'Up to 100 cr',
    maxReward: 100,
    difficulty: 'easy',
    category: 'identification',
    accent: '#ff4d6d',
    accentBg: 'rgba(255,77,109,0.06)',
    accentBorder: 'rgba(255,77,109,0.2)',
  },
  {
    id: 'context_chicken',
    slug: 'context-chicken',
    name: 'Context Chicken',
    tagline: 'Resource Bet',
    description: 'Estimate the minimum context window for a task. Bet too low and fail.',
    longDescription: 'Given a description of an AI task, pick the smallest context window that can successfully handle it. Go too small and the model fails. Go too large and you leave credits on the table.',
    rewardRange: 'Up to 180 cr',
    maxReward: 180,
    difficulty: 'medium',
    category: 'prediction',
    accent: '#ffd700',
    accentBg: 'rgba(255,215,0,0.06)',
    accentBorder: 'rgba(255,215,0,0.2)',
  },
  {
    id: 'rate_limit_roulette',
    slug: 'rate-roulette',
    name: 'Rate Roulette',
    tagline: 'Latency Bet',
    description: 'Which provider wins the latency race? Pick based on real hardware profiles — LPU vs GPU, model size, tier.',
    longDescription: 'Three AI providers are given the same prompt. Pick the one that finishes first. The race is simulated using real-world latency profiles and seeded jitter — outcomes are provably fair and skill-based. Groq LPU vs Anthropic Sonnet vs OpenAI GPT-4o is never a coin flip if you know your hardware.',
    rewardRange: 'Up to 200 cr',
    maxReward: 200,
    difficulty: 'hard',
    category: 'prediction',
    accent: '#6e9bff',
    accentBg: 'rgba(110,155,255,0.06)',
    accentBorder: 'rgba(110,155,255,0.2)',
  },
  {
    id: 'benchmark_brawl',
    slug: 'benchmark-brawl',
    name: 'Benchmark Brawl',
    tagline: 'Model Arena',
    description: 'Pick the model that produces the best output. Know your models.',
    longDescription: 'You are shown a coding or reasoning task and its evaluation criteria. Select which model — GPT-4, Claude, Gemini, or others — will produce the best output. Knowledge is your weapon.',
    rewardRange: 'Up to 200 cr',
    maxReward: 200,
    difficulty: 'hard',
    category: 'identification',
    accent: '#ff6b35',
    accentBg: 'rgba(255,107,53,0.06)',
    accentBorder: 'rgba(255,107,53,0.2)',
  },
  {
    id: 'spot_deepfake',
    slug: 'spot-the-ai',
    name: 'Spot the AI',
    tagline: 'Text Turing Test',
    description: 'Four messages. Three human. One machine. Read carefully — the model is getting good at hiding.',
    longDescription: 'You\'re shown four real-looking developer messages — Slack threads, code reviews, GitHub comments, Stack Overflow answers. Three were written by humans. One was written by an AI. Spot the imposter. At higher tiers, the AI writes like a senior engineer.',
    rewardRange: 'Up to 200 cr',
    maxReward: 200,
    difficulty: 'hard',
    category: 'identification',
    accent: '#e879f9',
    accentBg: 'rgba(232,121,249,0.06)',
    accentBorder: 'rgba(232,121,249,0.2)',
  },
  {
    id: 'prompt_crash',
    slug: 'prompt-crash',
    name: 'Prompt Crash',
    tagline: 'Cash-Out Multiplier',
    description: 'Ride the multiplier higher. Cash out before the prompt crashes.',
    longDescription: 'A live multiplier starts at 1.00× and climbs. You can cash out at any moment to lock in your wager × multiplier. Wait too long and the prompt crashes — you lose your entry. Provably-fair crash point committed at round start; revealed when you cash out.',
    rewardRange: 'Up to 100× wager',
    maxReward: 1000,
    difficulty: 'hard',
    category: 'timing',
    accent: '#fb923c',
    accentBg: 'rgba(251,146,60,0.06)',
    accentBorder: 'rgba(251,146,60,0.2)',
  },
  {
    id: 'token_mines',
    slug: 'token-mines',
    name: 'Token Mines',
    tagline: 'Pick Safe Tokens',
    description: 'Reveal safe tokens to climb the multiplier. Hit a mine and lose it all.',
    longDescription: 'A 5×5 grid hides mines among safe tokens. Each safe reveal compounds your multiplier. Cash out anytime — or keep digging for higher rewards. More mines = bigger payouts per pick, but higher risk. Provably-fair: mine positions hash-committed at round start, revealed on settle.',
    rewardRange: 'Up to 50× wager',
    maxReward: 1000,
    difficulty: 'hard',
    category: 'timing',
    accent: '#5eead4',
    accentBg: 'rgba(94,234,212,0.06)',
    accentBorder: 'rgba(94,234,212,0.2)',
  },
]

export const GAME_BY_SLUG: Record<string, GameCatalogEntry> = Object.fromEntries(
  GAME_CATALOG.map((g) => [g.slug, g])
)

export const GAME_BY_ID: Record<ArenaGameId, GameCatalogEntry> = Object.fromEntries(
  GAME_CATALOG.map((g) => [g.id, g])
) as Record<ArenaGameId, GameCatalogEntry>
