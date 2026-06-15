import { ECONOMY } from '@/lib/server/economy'

export interface AttemptRecord {
  score: number
  createdAt: Date
}

/**
 * Computes the current win streak from a list of game attempts.
 *
 * A streak is the number of consecutive UTC calendar days on which the player
 * had at least one passing attempt (score >= 60). Multiple passes on the same
 * day count as a single day. A gap of more than one day resets the streak.
 */
export function computeStreak(attempts: AttemptRecord[]): number {
  // Deduplicate to one entry per UTC calendar day, newest-first.
  const passingDates: string[] = []
  const seen = new Set<string>()
  for (const attempt of attempts) {
    if (attempt.score < 60) continue
    const day = attempt.createdAt.toISOString().slice(0, 10)
    if (!seen.has(day)) {
      seen.add(day)
      passingDates.push(day)
    }
  }

  let streak = 0
  for (let i = 0; i < passingDates.length; i++) {
    if (i === 0) {
      streak = 1
      continue
    }
    const prev = new Date(passingDates[i - 1])
    const curr = new Date(passingDates[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return Math.min(streak, ECONOMY.MAX_STREAK)
}
