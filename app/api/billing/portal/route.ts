import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireUserProfile } from '@/lib/server/auth'
import { env } from '@/lib/server/env'
import { db } from '@/lib/server/db'

// Creates a Stripe Customer Portal session so subscribers can cancel,
// update their payment method, or view invoice history without contacting support.
export async function POST(req: Request) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const user = await requireUserProfile()

    const sub = await db.userSubscription.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true, status: true },
    })

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found. Purchase a plan first.' },
        { status: 404 }
      )
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/wallet`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
