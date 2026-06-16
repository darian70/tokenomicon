import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { toApiResponse } from '@/lib/server/api-error'

const createSchema = z.object({
  code: z.string().min(1).max(32).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, _ or -'),
  description: z.string().min(1).max(200),
  creditAmount: z.number().int().positive().max(1_000_000),
  bucket: z.enum(['purchased_compute', 'arena_credits', 'bonus_compute']).default('bonus_compute'),
  maxRedemptions: z.number().int().positive().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
})

export async function GET() {
  try {
    await requireAdminProfile()
    const codes = await db.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    })
    return NextResponse.json({ codes })
  } catch (error) {
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminProfile()
    const body = createSchema.parse(await req.json())

    const code = await db.promoCode.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description,
        creditAmount: body.creditAmount,
        bucket: body.bucket,
        maxRedemptions: body.maxRedemptions,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdByAdmin: admin.id,
      },
    })

    return NextResponse.json({ code }, { status: 201 })
  } catch (error) {
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
