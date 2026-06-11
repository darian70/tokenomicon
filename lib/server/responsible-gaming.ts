import { db } from '@/lib/server/db'
import { ECONOMY } from '@/lib/server/economy'

export interface ResponsibleGamingCheck {
  allowed: boolean
  reason?: string
  cooldownEndsAt?: Date
}

export async function checkResponsibleGaming(userId: string): Promise<ResponsibleGamingCheck> {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setUTCHours(0, 0, 0, 0)

  const windowStart = new Date(now.getTime() - ECONOMY.SESSION_WINDOW_SECONDS * 1000)

  const [dailySessions, recentSessions] = await Promise.all([
    db.gameSession.count({
      where: { userId, createdAt: { gte: dayStart } },
    }),
    db.gameSession.count({
      where: { userId, createdAt: { gte: windowStart } },
    }),
  ])

  if (recentSessions >= ECONOMY.MAX_ACTIVE_SESSIONS_PER_WINDOW) {
    const cooldownEndsAt = new Date(now.getTime() + ECONOMY.SESSION_WINDOW_SECONDS * 1000)
    return {
      allowed: false,
      reason: `Cooling off: max ${ECONOMY.MAX_ACTIVE_SESSIONS_PER_WINDOW} games per ${Math.floor(ECONOMY.SESSION_WINDOW_SECONDS / 60)} minutes. Try again soon.`,
      cooldownEndsAt,
    }
  }

  const MAX_DAILY_SESSIONS = 50
  if (dailySessions >= MAX_DAILY_SESSIONS) {
    return {
      allowed: false,
      reason: `Daily session limit reached (${MAX_DAILY_SESSIONS} games/day). Take a break — your arena credits will refresh tomorrow.`,
    }
  }

  return { allowed: true }
}

export function getResponsibleGamingNotice(): string {
  return 'Play responsibly. Credits have no cash value. Set personal limits. Take breaks.'
}
