import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'
import { ApiError, toApiResponse } from '@/lib/server/api-error'

const schema = z.object({
  code: z.string().min(1).max(64),
})

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

    // Atomic: create redemption record + ledger entry + increment counter
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Unique constraint (codeId, userId) prevents double-redemption
      await tx.promoCodeRedemption.create({
        data: { codeId: promo.id, userId: profile.id },
      })

      await addLedgerEntry({
        tx,
        userId: profile.id,
        bucket: promo.bucket,
        type: 'promo_code_redemption',
        amount: promo.creditAmount,
        metadata: { promoCodeId: promo.id, code: promo.code },
      })

      await tx.promoCode.update({
        where: { id: promo.id },
        data: { totalRedeemed: { increment: 1 } },
      })
    })

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
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
