import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireAdminProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'

const schema = z.object({
  clerkUserId: z.string().min(1),
  bucket: z.enum(['purchased_compute', 'arena_credits', 'bonus_compute']),
  amount: z.number().int().positive(),
  reason: z.string().min(3),
})

export async function POST(req: Request) {
  try {
    const admin = await requireAdminProfile()
    const body = schema.parse(await req.json())

    const target = await db.userProfile.findUnique({
      where: { clerkUserId: body.clerkUserId },
    })
    if (!target) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await addLedgerEntry({
        tx,
        userId: target.id,
        bucket: body.bucket,
        type: 'manual_grant',
        amount: body.amount,
        metadata: { reason: body.reason, grantedBy: admin.id },
      })

      await tx.adminCreditGrant.create({
        data: {
          adminUserId: admin.id,
          targetUserId: target.id,
          bucket: body.bucket,
          amount: body.amount,
          reason: body.reason,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
