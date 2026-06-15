/**
 * Webhook delivery engine.
 *
 * Payloads are signed with HMAC-SHA256 so recipients can verify authenticity:
 *   X-Tokenomicon-Signature: sha256=<hex>
 *   X-Tokenomicon-Event: <event>
 *   X-Tokenomicon-Delivery: <deliveryId>
 *   X-Tokenomicon-Timestamp: <unix-seconds>
 *
 * Signature covers: `${timestamp}.${JSON.stringify(payload)}`
 * Recipients should verify: HMAC-SHA256(secret, `${timestamp}.${body}`) === signature
 *
 * All deliveries are fire-and-forget — never blocks the caller.
 * Failures are recorded in WebhookDelivery but do NOT throw.
 */

import crypto from 'crypto'
import { db } from '@/lib/server/db'
import { validateWebhookUrl, SsrfBlockedError } from '@/lib/server/webhook-url-validator'

// ---------------------------------------------------------------------------
// Event catalogue
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | 'credit.low'        // compute balance dropped below threshold
  | 'credit.topup'      // auto-topup fired successfully
  | 'game.result'       // game session submitted and scored
  | 'daily.grant'       // daily arena credit grant claimed
  | 'api.usage'         // single API call cost more than 50 credits
  | 'referral.redeemed' // someone used this user's referral code

export type WebhookPayload =
  | { event: 'credit.low';        balance: number; threshold: number }
  | { event: 'credit.topup';      amount: number; pack: string; newBalance: number }
  | { event: 'game.result';       game: string; score: number; reward: number; sessionId: string }
  | { event: 'daily.grant';       amount: number; multiplier: number }
  | { event: 'api.usage';         model: string; cost: number; requestId: string }
  | { event: 'referral.redeemed'; recipientEmail: string | null }

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

function sign(secret: string, timestamp: number, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

async function deliverToEndpoint(
  endpointId: string,
  url: string,
  secret: string,
  event: WebhookEventType,
  payload: WebhookPayload,
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000)
  const body = JSON.stringify({ ...payload, timestamp })
  const signature = sign(secret, timestamp, body)
  const start = Date.now()

  let statusCode: number | undefined
  let success = false
  let error: string | undefined

  try {
    await validateWebhookUrl(url)
  } catch (e) {
    error = e instanceof SsrfBlockedError ? e.message : 'Invalid endpoint URL'
    db.webhookDelivery
      .create({
        data: { endpointId, event, payload: payload as object, statusCode: undefined, success: false, error, durationMs: 0 },
      })
      .catch(() => {})
    return
  }

  try {
    const res = await fetch(url, {
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
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const durationMs = Date.now() - start

  // Record delivery attempt (best-effort, non-blocking)
  db.webhookDelivery
    .create({
      data: {
        endpointId,
        event,
        payload: payload as object,
        statusCode,
        success,
        error,
        durationMs,
      },
    })
    .catch(() => {})
}

/**
 * Deliver an event to all enabled endpoints subscribed to it for a user.
 * Always fire-and-forget — never awaited by callers.
 */
export function fireWebhook(
  userId: string,
  payload: WebhookPayload,
): void {
  const event = payload.event as WebhookEventType

  db.webhookEndpoint
    .findMany({
      where: {
        userId,
        enabled: true,
        events: { has: event },
      },
      select: { id: true, url: true, secret: true },
    })
    .then((endpoints) => {
      for (const ep of endpoints) {
        deliverToEndpoint(ep.id, ep.url, ep.secret, event, payload).catch(() => {})
      }
    })
    .catch(() => {})
}
