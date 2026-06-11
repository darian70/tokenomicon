import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/server/db'

const patchSchema = z.object({
  email: z.string().email().optional(),
  thresholdCredits: z.number().int().min(100).max(1_000_000).optional(),
  enabled: z.boolean().optional(),
})

export async function GET() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.userProfile.findUnique({ where: { clerkUserId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const config = await db.budgetAlertConfig.findUnique({ where: { userId: user.id } })
  return NextResponse.json({ config })
}

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.userProfile.findUnique({ where: { clerkUserId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = patchSchema.parse(await req.json())

  const existing = await db.budgetAlertConfig.findUnique({ where: { userId: user.id } })

  if (!existing) {
    if (!body.email) return NextResponse.json({ error: 'email required for first setup' }, { status: 400 })
    const config = await db.budgetAlertConfig.create({
      data: {
        userId: user.id,
        email: body.email,
        thresholdCredits: body.thresholdCredits ?? 1000,
        enabled: body.enabled ?? true,
      },
    })
    return NextResponse.json({ config })
  }

  const config = await db.budgetAlertConfig.update({
    where: { userId: user.id },
    data: {
      ...(body.email !== undefined && { email: body.email }),
      ...(body.thresholdCredits !== undefined && { thresholdCredits: body.thresholdCredits }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
    },
  })
  return NextResponse.json({ config })
}

export async function DELETE() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.userProfile.findUnique({ where: { clerkUserId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await db.budgetAlertConfig.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ ok: true })
}
