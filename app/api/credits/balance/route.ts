import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ensureDailyArenaCredits, ensureWelcomeBonus, getBalances } from '@/lib/server/ledger'
import { rankForXp, xpForNextRank } from '@/lib/server/progression'

export async function GET() {
  try {
    const user = await requireUserProfile()
    await Promise.all([
      ensureDailyArenaCredits(user.id),
      ensureWelcomeBonus(user.id),
    ])
    const balances = await getBalances(user.id)
    const keys = await db.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, revokedAt: true, createdAt: true, lastUsedAt: true },
    })
    const recentLedger = await db.creditLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    const topScores = await db.gameAttempt.groupBy({
      by: ['game'],
      where: { userId: user.id },
      _max: { score: true },
      _avg: { score: true },
      _count: { _all: true },
    })

    const profile = await db.userProfile.findUnique({
      where: { id: user.id },
      select: { xp: true, rank: true, totalGamesPlayed: true, totalGamesWon: true, currentStreak: true, bestStreak: true, isAdmin: true },
    })

    const xp = profile?.xp ?? 0
    const xpProgress = xpForNextRank(xp)

    return NextResponse.json({
      balances,
      keys,
      isAdmin: profile?.isAdmin ?? false,
      recentLedger,
      gameStats: topScores.map((row) => ({
        game: row.game,
        bestScore: row._max.score ?? 0,
        avgScore: Math.round(row._avg.score ?? 0),
        attempts: row._count._all,
      })),
      progression: {
        xp,
        rank: profile?.rank ?? 1,
        totalGamesPlayed: profile?.totalGamesPlayed ?? 0,
        totalGamesWon: profile?.totalGamesWon ?? 0,
        currentStreak: profile?.currentStreak ?? 0,
        bestStreak: profile?.bestStreak ?? 0,
        xpToNextRank: xpProgress.next - xpProgress.current,
        xpInCurrentRank: xp - xpProgress.current,
        rankProgress: xpProgress.progress,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
