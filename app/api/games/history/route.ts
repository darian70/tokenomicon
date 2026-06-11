import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'

const PAGE_SIZE = 20

export async function GET(req: Request) {
  try {
    const user = await requireUserProfile()
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor') ?? undefined
    const game = searchParams.get('game') ?? undefined

    const attempts = await db.gameAttempt.findMany({
      where: {
        userId: user.id,
        ...(game ? { game: game as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        game: true,
        score: true,
        rewardAmount: true,
        createdAt: true,
        session: {
          select: {
            id: true,
            clientSeed: true,
            serverSeed: true,
            serverSeedHash: true,
            nonce: true,
            challenge: true,
          },
        },
      },
    })

    const hasMore = attempts.length > PAGE_SIZE
    const page = hasMore ? attempts.slice(0, PAGE_SIZE) : attempts
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return NextResponse.json({
      attempts: page.map((a) => ({
        id: a.id,
        game: a.game,
        score: a.score,
        rewardAmount: a.rewardAmount,
        createdAt: a.createdAt.toISOString(),
        fairness: {
          sessionId: a.session.id,
          clientSeed: a.session.clientSeed,
          serverSeed: a.session.serverSeed,
          serverSeedHash: a.session.serverSeedHash,
          nonce: a.session.nonce?.toString() ?? null,
        },
      })),
      nextCursor,
      hasMore,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
