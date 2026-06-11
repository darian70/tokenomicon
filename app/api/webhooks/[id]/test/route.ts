import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { fireWebhook } from '@/lib/server/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

// POST — send a test ping to the endpoint
export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const user = await requireUserProfile()
    const { id } = await ctx.params

    const endpoint = await db.webhookEndpoint.findFirst({
      where: { id, userId: user.id },
      select: { id: true, events: true },
    })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Pick the first subscribed event type for the test ping
    const event = (endpoint.events[0] ?? 'game.result') as string

    // Build a representative test payload for the event type
    const testPayloads: Record<string, object> = {
      'credit.low':        { event: 'credit.low',        balance: 250, threshold: 500 },
      'credit.topup':      { event: 'credit.topup',       amount: 5000, pack: 'starter', newBalance: 5250 },
      'game.result':       { event: 'game.result',        game: 'prompt_golf', score: 87, reward: 420, sessionId: 'test_session' },
      'daily.grant':       { event: 'daily.grant',        amount: 100, multiplier: 1 },
      'api.usage':         { event: 'api.usage',          model: 'gpt-4o', cost: 72, requestId: 'test_req' },
      'referral.redeemed': { event: 'referral.redeemed',  recipientEmail: 'new_user@example.com' },
    }

    const payload = (testPayloads[event] ?? testPayloads['game.result']) as Parameters<typeof fireWebhook>[1]

    // Fire directly so we can wait for the delivery and return its result
    const endpointRecord = await db.webhookEndpoint.findUnique({
      where: { id },
      select: { url: true, secret: true },
    })
    if (!endpointRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Deliver synchronously for the test so we can report success/failure immediately
    const timestamp = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ ...payload, timestamp })
    const { createHmac } = await import('crypto')
    const signature = createHmac('sha256', endpointRecord.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')

    let statusCode: number | undefined
    let success = false
    let error: string | undefined
    const start = Date.now()

    try {
      const res = await fetch(endpointRecord.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tokenomicon-event': event,
          'x-tokenomicon-signature': `sha256=${signature}`,
          'x-tokenomicon-timestamp': String(timestamp),
          'user-agent': 'Tokenomicon-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      statusCode = res.status
      success = res.status >= 200 && res.status < 300
      if (!success) error = `HTTP ${res.status}`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Delivery failed'
    }

    const durationMs = Date.now() - start

    await db.webhookDelivery.create({
      data: { endpointId: id, event, payload: payload as object, statusCode, success, error, durationMs },
    }).catch(() => {})

    return NextResponse.json({ success, statusCode, durationMs, error: error ?? null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 400 })
  }
}
