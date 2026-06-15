export type DifficultyTier = 'sandbox' | 'production' | 'blackbox'

export interface TierConfig {
  entryCost: number
  baseReward: number
  rewardMultiplier: number
  timeLimitSeconds: number
}

export const ECONOMY = {
  DAILY_ARENA_GRANT: 100,
  DAILY_BONUS_CAP: 2000,
  REWARD_CURVE_EXPONENT: 1.6,
  RAKE_BPS: 200,
  STREAK_BONUS_PER_LEVEL: 0.05,
  MAX_STREAK_BONUS: 0.25,
  MAX_STREAK: 5,
  PERFECT_SCORE_BONUS: 500,
  SESSION_EXPIRY_SECONDS: 300,
  MAX_ACTIVE_SESSIONS_PER_WINDOW: 3,
  SESSION_WINDOW_SECONDS: 300,
  EXPIRED_SESSION_REFUND_RATIO: 0.5,
  // Max times a user can receive an expiry refund per day. Defensive cap against
  // any cycle-and-expire pattern. Matches the per-window session limit × 4.
  MAX_DAILY_EXPIRY_REFUNDS: 12,
} as const

// Daily arena grant multipliers per subscription tier.
// Wallet page advertises 2x for dev_monthly and 5x for pro_monthly.
export const SUBSCRIPTION_DAILY_GRANT_MULTIPLIER: Record<string, number> = {
  dev_monthly: 2,
  pro_monthly: 5,
}

// Tiers that require a specific subscription plan to unlock.
// blackbox is a pro_monthly-exclusive feature.
export const TIER_SUBSCRIPTION_REQUIREMENT: Partial<Record<DifficultyTier, string>> = {
  blackbox: 'pro_monthly',
}

// Chance/luck-based arcade games. These are entered only with free arena_credits
// and pay out non-cashable bonus_compute (see BUSINESS_STRUCTURE.md §8), but some
// US jurisdictions regulate chance games more broadly. ARCADE_CHANCE_GAMES_ENABLED
// acts as a deploy-time kill-switch so these can be disabled where needed while the
// skill games and API product stay available everywhere.
export const CHANCE_GAMES = ['token_mines', 'prompt_crash'] as const

export function isChanceGame(game: string): boolean {
  return (CHANCE_GAMES as readonly string[]).includes(game)
}

export function chanceGamesEnabled(): boolean {
  // Default ON. Set ARCADE_CHANCE_GAMES_ENABLED="false" to disable globally.
  return process.env.ARCADE_CHANCE_GAMES_ENABLED !== 'false'
}

export const TIER_CONFIGS: Record<DifficultyTier, TierConfig> = {
  sandbox: {
    entryCost: 15,
    baseReward: 60,
    rewardMultiplier: 1.0,
    timeLimitSeconds: 300,
  },
  production: {
    entryCost: 30,
    baseReward: 140,
    rewardMultiplier: 2.2,
    timeLimitSeconds: 240,
  },
  blackbox: {
    entryCost: 60,
    baseReward: 300,
    rewardMultiplier: 4.5,
    timeLimitSeconds: 180,
  },
}

export function calculateReward(input: {
  score: number
  tier: DifficultyTier
  streak: number
  dailyEarned: number
}): { reward: number; rake: number; capped: boolean } {
  const tierConfig = TIER_CONFIGS[input.tier]
  const scoreFactor = Math.pow(Math.max(0, Math.min(100, input.score)) / 100, ECONOMY.REWARD_CURVE_EXPONENT)
  const streakFactor = 1 + Math.min(input.streak * ECONOMY.STREAK_BONUS_PER_LEVEL, ECONOMY.MAX_STREAK_BONUS)

  let rawReward = Math.floor(tierConfig.baseReward * scoreFactor * streakFactor)

  if (input.score >= 100) {
    rawReward += ECONOMY.PERFECT_SCORE_BONUS
  }

  const rake = Math.floor(rawReward * ECONOMY.RAKE_BPS / 10000)
  let netReward = rawReward - rake

  const remaining = Math.max(0, ECONOMY.DAILY_BONUS_CAP - input.dailyEarned)
  const capped = netReward > remaining
  netReward = Math.min(netReward, remaining)

  return { reward: Math.max(0, netReward), rake, capped }
}

export function getFlavorMessage(score: number): string {
  if (score >= 95) return 'FLAWLESS. The compute gods smile upon you.'
  if (score >= 80) return 'Solid. Your credits are multiplying.'
  if (score >= 60) return 'Passable. Room for improvement.'
  if (score >= 40) return 'Mediocre. The model is unimpressed.'
  if (score >= 20) return 'Rough. Your arena credits died for this.'
  return 'Catastrophic. We\'re not mad, just disappointed.'
}
