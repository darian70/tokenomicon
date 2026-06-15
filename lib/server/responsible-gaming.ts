import { db } from '@/lib/server/db'
import { ECONOMY } from '@/lib/server/economy'

export interface ResponsibleGamingCheck {
  allowed: boolean
  reason?: string
  cooldownEndsAt?: Date
}

const MAX_DAILY_SESSIONS = 50

// Self-exclusion durations available to users (in days).
export const SELF_EXCLUSION_OPTIONS = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '6 months', days: 180 },
] as const

export async function checkResponsibleGaming(userId: string): Promise<ResponsibleGamingCheck> {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setUTCHours(0, 0, 0, 0)

  const windowStart = new Date(now.getTime() - ECONOMY.SESSION_WINDOW_SECONDS * 1000)

  const [profile, dailySessions, recentSessions] = await Promise.all([
    db.userProfile.findUnique({
      where: { id: userId },
      select: { selfExcludedUntil: true },
    }),
    db.gameSession.count({
      where: { userId, createdAt: { gte: dayStart } },
    }),
    db.gameSession.count({
      where: { userId, createdAt: { gte: windowStart } },
    }),
  ])

  if (profile?.selfExcludedUntil && profile.selfExcludedUntil > now) {
    return {
      allowed: false,
      reason: 'You have self-excluded from play. This helps you stay in control.',
      cooldownEndsAt: profile.selfExcludedUntil,
    }
  }

  if (recentSessions >= ECONOMY.MAX_ACTIVE_SESSIONS_PER_WINDOW) {
    const cooldownEndsAt = new Date(now.getTime() + ECONOMY.SESSION_WINDOW_SECONDS * 1000)
    return {
      allowed: false,
      reason: `Cooling off: max ${ECONOMY.MAX_ACTIVE_SESSIONS_PER_WINDOW} games per ${Math.floor(ECONOMY.SESSION_WINDOW_SECONDS / 60)} minutes. Try again soon.`,
      cooldownEndsAt,
    }
  }

  if (dailySessions >= MAX_DAILY_SESSIONS) {
    return {
      allowed: false,
      reason: `Daily session limit reached (${MAX_DAILY_SESSIONS} games/day). Take a break — your arena credits will refresh tomorrow.`,
    }
  }

  return { allowed: true }
}

export async function selfExclude(userId: string, days: number): Promise<Date> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await db.userProfile.update({
    where: { id: userId },
    data: { selfExcludedUntil: until },
  })
  return until
}

export async function getSelfExclusionStatus(
  userId: string,
): Promise<{ excluded: boolean; until: Date | null }> {
  const profile = await db.userProfile.findUnique({
    where: { id: userId },
    select: { selfExcludedUntil: true },
  })
  const until = profile?.selfExcludedUntil ?? null
  return { excluded: until !== null && until > new Date(), until }
}

export function getResponsibleGamingNotice(): string {
  return 'Play responsibly. Credits have no cash value. Set personal limits. Take breaks.'
}
