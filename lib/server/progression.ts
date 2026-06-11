import { Prisma } from '@prisma/client'
import { db } from '@/lib/server/db'

// ---------------------------------------------------------------------------
// Rank thresholds — XP required per rank
// ---------------------------------------------------------------------------

const RANK_THRESHOLDS = [
  0,      // Rank 1
  200,    // Rank 2
  500,    // Rank 3
  1000,   // Rank 4
  2000,   // Rank 5
  3500,   // Rank 6
  5500,   // Rank 7
  8000,   // Rank 8  — unlocks AI-judged games
  12000,  // Rank 9
  18000,  // Rank 10
]

export function rankForXp(xp: number): number {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function xpForNextRank(xp: number): { current: number; next: number; progress: number } {
  const rank = rankForXp(xp)
  if (rank >= RANK_THRESHOLDS.length) return { current: xp, next: xp, progress: 1 }
  const current = RANK_THRESHOLDS[rank - 1]
  const next = RANK_THRESHOLDS[rank]
  const progress = Math.min(1, (xp - current) / (next - current))
  return { current, next, progress }
}

// ---------------------------------------------------------------------------
// Achievement definitions
// ---------------------------------------------------------------------------

export interface AchievementDef {
  code: string
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'first_blood',   name: 'First Blood',   description: 'Complete your first game',           icon: '🩸' },
  { code: 'calibrated',    name: 'Calibrated',     description: 'Score 95+ on Token Prophet',         icon: '🎯' },
  { code: 'under_par',     name: 'Under Par',      description: 'Score 90+ on Prompt Golf',           icon: '⛳' },
  { code: 'bug_hunter',    name: 'Bug Hunter',     description: '10 perfect Bug Exorcist rounds',     icon: '🐛' },
  { code: 'chicken_dinner', name: 'Chicken Dinner', description: 'Score 100 on Context Chicken',      icon: '🍗' },
  { code: 'speed_demon',   name: 'Speed Demon',    description: 'Score 100 on Rate Roulette',         icon: '⚡' },
  { code: 'model_master',  name: 'Model Master',   description: 'Score 100 on Benchmark Brawl',       icon: '🧠' },
  { code: 'streak_3',      name: 'Hot Streak',     description: '3 wins in a row',                    icon: '🔥' },
  { code: 'streak_5',      name: 'The Streak',     description: '5 wins in a row',                    icon: '💫' },
  { code: 'streak_10',     name: 'Unstoppable',    description: '10 wins in a row',                   icon: '🌟' },
  { code: 'degen_hours',   name: 'Degen Hours',    description: 'Play 10 games in one session',       icon: '🌙' },
  { code: 'rank_5',        name: 'Promoted',       description: 'Reach Rank 5',                       icon: '⬆️' },
  { code: 'rank_10',       name: 'Champion',       description: 'Reach Rank 10',                      icon: '👑' },
  { code: 'all_games',     name: 'Completionist',  description: 'Play all 9 games at least once',     icon: '🏆' },
]

// ---------------------------------------------------------------------------
// Update progression after a game result
// ---------------------------------------------------------------------------

export async function updateProgression(params: {
  userId: string
  game: string
  score: number
  rewardAmount: number
  tx?: Prisma.TransactionClient
}) {
  const client = params.tx ?? db
  const { userId, game, score, rewardAmount } = params
  const won = rewardAmount > 0

  const profile = await client.userProfile.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      rank: true,
      totalGamesPlayed: true,
      totalGamesWon: true,
      currentStreak: true,
      bestStreak: true,
    },
  })
  if (!profile) return

  const xpGain = score
  const newXp = profile.xp + xpGain
  const newRank = rankForXp(newXp)
  const newStreak = won ? profile.currentStreak + 1 : 0
  const newBestStreak = Math.max(profile.bestStreak, newStreak)

  await client.userProfile.update({
    where: { id: userId },
    data: {
      xp: newXp,
      rank: newRank,
      totalGamesPlayed: profile.totalGamesPlayed + 1,
      totalGamesWon: profile.totalGamesWon + (won ? 1 : 0),
      currentStreak: newStreak,
      bestStreak: newBestStreak,
    },
  })

  // Check achievements
  const newAchievements: string[] = []

  if (profile.totalGamesPlayed === 0) newAchievements.push('first_blood')
  if (game === 'token_prophet' && score >= 95) newAchievements.push('calibrated')
  if (game === 'prompt_golf' && score >= 90) newAchievements.push('under_par')
  if (game === 'context_chicken' && score >= 100) newAchievements.push('chicken_dinner')
  if (game === 'rate_limit_roulette' && score >= 100) newAchievements.push('speed_demon')
  if (game === 'benchmark_brawl' && score >= 100) newAchievements.push('model_master')
  if (newStreak >= 3) newAchievements.push('streak_3')
  if (newStreak >= 5) newAchievements.push('streak_5')
  if (newStreak >= 10) newAchievements.push('streak_10')
  if (newRank >= 5 && profile.rank < 5) newAchievements.push('rank_5')
  if (newRank >= 10 && profile.rank < 10) newAchievements.push('rank_10')

  // degen_hours: 10+ games played in the last 3 hours in one sitting
  const sessionStart = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const recentCount = await client.gameAttempt.count({
    where: { userId, createdAt: { gte: sessionStart } },
  })
  if (recentCount >= 10) newAchievements.push('degen_hours')

  // bug_hunter: 10 perfect scores on bug_exorcist (score === 95 = correct fix)
  if (game === 'bug_exorcist' && score >= 95) {
    const perfectBugRounds = await client.gameAttempt.count({
      where: { userId, game: 'bug_exorcist', score: { gte: 95 } },
    })
    if (perfectBugRounds >= 10) newAchievements.push('bug_hunter')
  }

  // Check all_games achievement — all 9 games played at least once
  const playedGames = await client.gameAttempt.groupBy({
    by: ['game'],
    where: { userId },
  })
  if (playedGames.length >= 9) {
    const hasAllGames = await client.achievement.findFirst({
      where: { userId, code: 'all_games' },
    })
    if (!hasAllGames) newAchievements.push('all_games')
  }

  for (const code of newAchievements) {
    try {
      await client.achievement.create({
        data: { userId, code },
      })
    } catch {
      // Already unlocked — unique constraint prevents dupes
    }
  }

  return {
    xpGained: xpGain,
    newXp,
    newRank,
    rankUp: newRank > profile.rank,
    newStreak,
    newAchievements,
  }
}
