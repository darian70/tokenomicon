import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'

export async function GET() {
  try {
    const topPlayers = await db.gameAttempt.groupBy({
      by: ['userId'],
      _sum: { rewardAmount: true, score: true },
      _count: { id: true },
      _max: { score: true },
      orderBy: { _sum: { rewardAmount: 'desc' } },
      take: 20,
    })

    const userIds = topPlayers.map((p) => p.userId)
    const users = await db.userProfile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const leaderboard = topPlayers.map((p, idx) => {
      const user = userMap.get(p.userId)
      const email = user?.email ?? 'anonymous'
      const displayName = email.includes('@') ? email.split('@')[0] : email
      return {
        rank: idx + 1,
        displayName,
        totalReward: p._sum.rewardAmount ?? 0,
        totalScore: p._sum.score ?? 0,
        bestScore: p._max.score ?? 0,
        gamesPlayed: p._count.id,
      }
    })

    const recentWins = await db.gameAttempt.findMany({
      where: { rewardAmount: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { email: true } } },
    })

    const liveFeed = recentWins.map((w) => {
      const email = w.user?.email ?? 'anonymous'
      const displayName = email.includes('@') ? email.split('@')[0] : email
      return {
        displayName,
        game: w.game,
        score: w.score,
        reward: w.rewardAmount,
        createdAt: w.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ leaderboard, liveFeed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
