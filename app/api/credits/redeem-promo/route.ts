import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ApiError, toApiResponse } from '@/lib/server/api-error'

const schema = z.object({
  code: z.string().min(1).max(64),
})

// Bucket → CreditBalance column name
const BUCKET_COL: Record<string, 'purchasedCompute' | 'arenaCredits' | 'bonusCompute'> = {
  purchased_compute: 'purchasedCompute',
  arena_credits: 'arenaCredits',
  bonus_compute: 'bonusCompute',
}

export async function POST(req: Request) {
  try {
    const profile = await requireUserProfile()
    const { code } = schema.parse(await req.json())
    const normalised = code.trim().toUpperCase()

    const promo = await db.promoCode.findUnique({ where: { code: normalised } })

    if (!promo) throw new ApiError('Invalid promo code.', 400)
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new ApiError('This promo code has expired.', 410)
    if (promo.maxRedemptions !== null && promo.totalRedeemed >= promo.maxRedemptions) {
      throw new ApiError('This promo code has reached its redemption limit.', 410)
    }

    const col = BUCKET_COL[promo.bucket] ?? 'bonusCompute'

    // Batch transaction — compatible with pgBouncer transaction mode.
    // Unique constraint on PromoCodeRedemption(codeId, userId) prevents double-redemption.
    await db.$transaction([
      db.promoCodeRedemption.create({
        data: { codeId: promo.id, userId: profile.id },
      }),
      db.creditLedgerEntry.create({
        data: {
          userId: profile.id,
          bucket: promo.bucket,
          type: 'promo_code_redemption',
          amount: promo.creditAmount,
          metadata: { promoCodeId: promo.id, code: promo.code },
        },
      }),
      db.creditBalance.upsert({
        where: { userId: profile.id },
        create: { userId: profile.id, [col]: promo.creditAmount },
        update: { [col]: { increment: promo.creditAmount } },
      }),
      db.promoCode.update({
        where: { id: promo.id },
        data: { totalRedeemed: { increment: 1 } },
      }),
    ])

    return NextResponse.json({
      success: true,
      credits: promo.creditAmount,
      bucket: promo.bucket,
      description: promo.description,
    })
  } catch (error) {
    // Unique constraint violation = already redeemed
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'You have already redeemed this code.' }, { status: 409 })
    }
    const detail = error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)
    console.error('[redeem-promo]', detail)
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: detail }, { status })
  }
}
