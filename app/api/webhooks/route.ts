import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { generateWebhookSecret } from '@/lib/server/webhooks'

const VALID_EVENTS = [
  'credit.low',
  'credit.topup',
  'game.result',
  'daily.grant',
  'api.usage',
  'referral.redeemed',
] as const

const createSchema = z.object({
  url: z.string().url().startsWith('https', { message: 'URL must use HTTPS' }),
  events: z.array(z.enum(VALID_EVENTS)).min(1, 'Select at least one event'),
  description: z.string().max(200).optional(),
})

// GET — list endpoints + recent deliveries for each
export async function GET() {
  try {
    const user = await requireUserProfile()
    const endpoints = await db.webhookEndpoint.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            event: true,
            statusCode: true,
            success: true,
            durationMs: true,
            createdAt: true,
            error: true,
          },
        },
      },
    })
    return NextResponse.json({
      endpoints: endpoints.map((ep) => ({
        ...ep,
        secret: `${ep.secret.slice(0, 8)}…`, // never expose full secret
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 })
  }
}

// POST — create endpoint
export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = createSchema.parse(await req.json())

    const count = await db.webhookEndpoint.count({ where: { userId: user.id } })
    if (count >= 10) {
      return NextResponse.json({ error: 'Maximum 10 webhook endpoints per account' }, { status: 400 })
    }

    const endpoint = await db.webhookEndpoint.create({
      data: {
        userId: user.id,
        url: body.url,
        secret: generateWebhookSecret(),
        events: body.events,
        description: body.description ?? null,
      },
    })

    return NextResponse.json({ endpoint }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 400 })
  }
}
