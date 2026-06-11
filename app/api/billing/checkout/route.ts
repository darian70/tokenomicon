import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { env } from '@/lib/server/env'
import { db } from '@/lib/server/db'

const packSchema = z.object({
  pack: z.enum(['starter', 'builder', 'pro', 'teams', 'dev_monthly', 'pro_monthly']),
})

const ONE_TIME_PACKS: Record<'starter' | 'builder' | 'pro' | 'teams', {
  amountCents: number; credits: number; label: string
}> = {
  starter: { amountCents:  1000, credits:  10000, label: 'Starter — 10,000 compute credits' },
  builder: { amountCents:  4900, credits:  55000, label: 'Builder — 55,000 compute credits' },
  pro:     { amountCents:  9900, credits: 120000, label: 'Pro — 120,000 compute credits' },
  teams:   { amountCents: 24900, credits: 350000, label: 'Teams — 350,000 compute credits' },
}

const SUBSCRIPTION_PLANS: Record<'dev_monthly' | 'pro_monthly', {
  amountCents: number; credits: number; label: string; priceIdEnvKey: 'STRIPE_PRICE_DEV_MONTHLY' | 'STRIPE_PRICE_PRO_MONTHLY'
}> = {
  dev_monthly: {
    amountCents:  1500,
    credits:     20000,
    label:       'Dev Plan — 20,000 credits/month',
    priceIdEnvKey: 'STRIPE_PRICE_DEV_MONTHLY',
  },
  pro_monthly: {
    amountCents:  4900,
    credits:     75000,
    label:       'Pro Plan — 75,000 credits/month',
    priceIdEnvKey: 'STRIPE_PRICE_PRO_MONTHLY',
  },
}

export async function POST(req: Request) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const user = await requireUserProfile()
    const body = packSchema.parse(await req.json())
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

    // ── Subscription ──────────────────────────────────────────────────────────
    if (body.pack === 'dev_monthly' || body.pack === 'pro_monthly') {
      const plan = SUBSCRIPTION_PLANS[body.pack]
      const priceId = env[plan.priceIdEnvKey]
      if (!priceId) {
        return NextResponse.json(
          { error: `Subscription plan not yet configured. Set ${plan.priceIdEnvKey} in your environment.` },
          { status: 503 }
        )
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        success_url: `${baseUrl}/wallet?checkout=success`,
        cancel_url: `${baseUrl}/wallet?checkout=cancelled`,
        line_items: [{ quantity: 1, price: priceId }],
        metadata: {
          clerkUserId: user.clerkUserId,
          plan: body.pack,
          credits: String(plan.credits),
        },
        subscription_data: {
          metadata: {
            clerkUserId: user.clerkUserId,
            plan: body.pack,
            credits: String(plan.credits),
          },
        },
      })

      return NextResponse.json({ url: session.url })
    }

    // ── One-time purchase ─────────────────────────────────────────────────────
    const pack = ONE_TIME_PACKS[body.pack as 'starter' | 'builder' | 'pro' | 'teams']

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/wallet?checkout=success`,
      cancel_url: `${baseUrl}/wallet?checkout=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.amountCents,
            product_data: { name: pack.label },
          },
        },
      ],
      metadata: {
        clerkUserId: user.clerkUserId,
        credits: String(pack.credits),
      },
    })

    await db.stripeCheckoutSession.create({
      data: {
        userId: user.id,
        stripeSessionId: session.id,
        creditsPurchased: pack.credits,
        amountCents: pack.amountCents,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
