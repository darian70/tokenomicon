import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { fireWebhook } from '@/lib/server/webhooks'

const VALID_EVENTS = [
  'credit.low',
  'credit.topup',
  'game.result',
  'daily.grant',
  'api.usage',
  'referral.redeemed',
] as const

const updateSchema = z.object({
  url: z.string().url().startsWith('https').optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  description: z.string().max(200).nullable().optional(),
  enabled: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

// PATCH — update endpoint
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = await requireUserProfile()
    const { id } = await ctx.params
    const body = updateSchema.parse(await req.json())

    const endpoint = await db.webhookEndpoint.findFirst({
      where: { id, userId: user.id },
    })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.webhookEndpoint.update({
      where: { id },
      data: {
        ...(body.url !== undefined && { url: body.url }),
        ...(body.events !== undefined && { events: body.events }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      },
    })

    return NextResponse.json({ endpoint: { ...updated, secret: `${updated.secret.slice(0, 8)}…` } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 400 })
  }
}

// DELETE — remove endpoint
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const user = await requireUserProfile()
    const { id } = await ctx.params

    const endpoint = await db.webhookEndpoint.findFirst({
      where: { id, userId: user.id },
    })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.webhookEndpoint.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 400 })
  }
}
