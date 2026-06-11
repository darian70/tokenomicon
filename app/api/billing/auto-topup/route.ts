import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { TOPUP_PACKS } from '@/lib/server/auto-topup'

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  thresholdCredits: z.number().int().min(100).max(100_000).optional(),
  topupPackId: z.enum(['starter', 'builder', 'pro', 'teams']).optional(),
})

/** GET — return current auto-topup config (or null if not set up) */
export async function GET() {
  try {
    const user = await requireUserProfile()
    const config = await db.autoTopupConfig.findUnique({
      where: { userId: user.id },
      select: {
        enabled: true,
        thresholdCredits: true,
        topupPackId: true,
        lastTopupAt: true,
        lastFailedAt: true,
        failureReason: true,
        createdAt: true,
      },
    })

    if (!config) return NextResponse.json({ config: null })

    // Enrich with pack details for the UI
    const pack = TOPUP_PACKS[config.topupPackId as keyof typeof TOPUP_PACKS] ?? null

    return NextResponse.json({
      config: {
        ...config,
        pack,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}

/** POST — update threshold / pack / enabled flag */
export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = updateSchema.parse(await req.json())

    const existing = await db.autoTopupConfig.findUnique({ where: { userId: user.id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Auto-topup not set up. Add a payment method first.' },
        { status: 400 },
      )
    }

    const updated = await db.autoTopupConfig.update({
      where: { userId: user.id },
      data: {
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.thresholdCredits !== undefined && { thresholdCredits: body.thresholdCredits }),
        ...(body.topupPackId !== undefined && { topupPackId: body.topupPackId }),
      },
      select: {
        enabled: true,
        thresholdCredits: true,
        topupPackId: true,
        lastTopupAt: true,
      },
    })

    return NextResponse.json({ config: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
