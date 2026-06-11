export type ArenaGameId = 'token_prophet' | 'prompt_golf' | 'bug_exorcist' | 'context_chicken' | 'rate_limit_roulette' | 'benchmark_brawl' | 'spot_deepfake' | 'prompt_crash' | 'token_mines'

export type DifficultyTier = 'sandbox' | 'production' | 'blackbox'

export type ArenaGameStatus = 'idle' | 'loading' | 'active' | 'submitting' | 'result'

export interface CreditBalances {
  purchased_compute: number
  bonus_compute: number
  arena_credits: number
}

export interface ApiKeyEntry {
  id: string
  name: string
  keyPrefix: string
  revokedAt: string | null
  createdAt: string
  lastUsedAt: string | null
}

export interface LedgerEntry {
  id: string
  bucket: string
  type: string
  amount: number
  createdAt: string
}

export interface GameStat {
  game: string
  bestScore: number
  avgScore: number
  attempts: number
}

export interface DashboardPayload {
  balances: CreditBalances
  keys: ApiKeyEntry[]
  recentLedger: LedgerEntry[]
  gameStats: GameStat[]
}

export interface GameSession {
  sessionId: string
  game: ArenaGameId
  challenge: Record<string, unknown>
  entryCost: number
  tier: DifficultyTier
  serverSeedHash: string | null
  expiresAt: string | null
}

export interface GameResult {
  game: ArenaGameId
  score: number
  rewardAmount: number
  flavorMessage: string
  challenge: Record<string, unknown>
  fairness: {
    serverSeed: string | null
    serverSeedHash: string | null
    clientSeed: string | null
  }
}

export interface LeaderboardEntry {
  rank: number
  displayName: string
  totalReward: number
  totalScore: number
  bestScore: number
  gamesPlayed: number
}

export interface LiveFeedEntry {
  displayName: string
  game: string
  score: number
  reward: number
  createdAt: string
}

export type CreditPackOneTime = 'starter' | 'builder' | 'pro' | 'teams'
export type SubscriptionPlan = 'dev_monthly' | 'pro_monthly'
export type CreditPack = CreditPackOneTime | SubscriptionPlan

export interface UserSubscription {
  id: string
  tier: SubscriptionPlan
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  monthlyCredits: number
  currentPeriodEnd: string | null
}

export interface PlayerProgression {
  xp: number
  rank: number
  totalGamesPlayed: number
  totalGamesWon: number
  currentStreak: number
  bestStreak: number
  xpToNextRank: number
  xpInCurrentRank: number
  rankProgress: number
}

export interface ProgressionUpdate {
  xpGained: number
  newXp: number
  newRank: number
  rankUp: boolean
  newStreak: number
  newAchievements: string[]
}
