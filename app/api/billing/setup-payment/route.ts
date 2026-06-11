import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireUserProfile } from '@/lib/server/auth'
import { env } from '@/lib/server/env'
import { ensureStripeCustomer } from '@/lib/server/stripe-customer'

/**
 * Creates a Stripe Checkout session in `setup` mode. The user completes it
 * to save a payment method for automatic credit top-ups. On success Stripe
 * fires checkout.session.completed (mode=setup) → our webhook saves the
 * payment method to AutoTopupConfig.
 */
export async function POST(req: Request) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const user = await requireUserProfile()
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

    const stripeCustomerId = await ensureStripeCustomer(user.id, stripe)

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      currency: 'usd',
      success_url: `${baseUrl}/wallet?topup=enabled`,
      cancel_url: `${baseUrl}/wallet?topup=cancelled`,
      metadata: {
        clerkUserId: user.clerkUserId,
        stripeCustomerId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
