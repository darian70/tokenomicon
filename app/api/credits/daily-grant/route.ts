import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'
import { ECONOMY, SUBSCRIPTION_DAILY_GRANT_MULTIPLIER } from '@/lib/server/economy'
import { fireWebhook } from '@/lib/server/webhooks'
import { Prisma } from '@prisma/client'

export async function POST() {
  try {
    const user = await requireUserProfile()

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if already claimed today (UTC midnight window)
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)

      const alreadyClaimed = await tx.creditLedgerEntry.findFirst({
        where: {
          userId: user.id,
          type: 'daily_arena_grant',
          createdAt: { gte: startOfDay },
        },
      })

      if (alreadyClaimed) {
        const nextAt = new Date(startOfDay)
        nextAt.setUTCDate(nextAt.getUTCDate() + 1)
        return NextResponse.json(
          { error: 'Already claimed today', nextClaimAt: nextAt.toISOString() },
          { status: 400 },
        )
      }

      // Calculate grant amount (base × subscription multiplier)
      const sub = await tx.userSubscription.findUnique({
        where: { userId: user.id },
        select: { tier: true, status: true },
      })

      const multiplier =
        sub?.status === 'active' && sub.tier
          ? (SUBSCRIPTION_DAILY_GRANT_MULTIPLIER[sub.tier] ?? 1)
          : 1

      const grantAmount = ECONOMY.DAILY_ARENA_GRANT * multiplier

      await addLedgerEntry({
        tx,
        userId: user.id,
        bucket: 'arena_credits',
        type: 'daily_arena_grant',
        amount: grantAmount,
        metadata: { multiplier, subscriptionTier: sub?.tier ?? null },
      })

      const nextAt = new Date(startOfDay)
      nextAt.setUTCDate(nextAt.getUTCDate() + 1)

      fireWebhook(user.id, { event: 'daily.grant', amount: grantAmount, multiplier })

      return NextResponse.json({
        granted: grantAmount,
        multiplier,
        nextClaimAt: nextAt.toISOString(),
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}

export async function GET() {
  try {
    const user = await requireUserProfile()

    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)

    const claimed = await db.creditLedgerEntry.findFirst({
      where: {
        userId: user.id,
        type: 'daily_arena_grant',
        createdAt: { gte: startOfDay },
      },
      select: { amount: true, createdAt: true },
    })

    const sub = await db.userSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true, status: true },
    })

    const multiplier =
      sub?.status === 'active' && sub?.tier
        ? (SUBSCRIPTION_DAILY_GRANT_MULTIPLIER[sub.tier] ?? 1)
        : 1

    const nextAt = new Date(startOfDay)
    nextAt.setUTCDate(nextAt.getUTCDate() + 1)

    return NextResponse.json({
      claimed: !!claimed,
      claimedAmount: claimed?.amount ?? null,
      claimedAt: claimed?.createdAt?.toISOString() ?? null,
      nextClaimAt: nextAt.toISOString(),
      available: ECONOMY.DAILY_ARENA_GRANT * multiplier,
      multiplier,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
