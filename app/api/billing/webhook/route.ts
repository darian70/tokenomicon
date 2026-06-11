import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import Stripe from 'stripe'
import { env } from '@/lib/server/env'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'

export async function POST(req: Request) {
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
    }

    const signature = (await headers()).get('stripe-signature')
    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)

    // ── Auto-topup: user saved a payment method via setup checkout ───────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      if (session.mode === 'setup') {
        const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : null
        const stripeCustomerId = session.metadata?.stripeCustomerId ?? null
        const clerkUserId = session.metadata?.clerkUserId ?? null

        if (setupIntentId && stripeCustomerId && clerkUserId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
          const paymentMethodId = typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : null

          if (paymentMethodId) {
            const user = await db.userProfile.findUnique({ where: { clerkUserId } })
            if (user) {
              await db.autoTopupConfig.upsert({
                where: { userId: user.id },
                create: {
                  userId: user.id,
                  stripeCustomerId,
                  stripePaymentMethodId: paymentMethodId,
                  enabled: true,
                },
                update: {
                  stripeCustomerId,
                  stripePaymentMethodId: paymentMethodId,
                  enabled: true,
                  lastFailedAt: null,
                  failureReason: null,
                },
              })
            }
          }
        }

        return NextResponse.json({ received: true })
      }
    }

    // ── One-time purchase fulfilled ────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      if (session.mode === 'payment') {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          const record = await tx.stripeCheckoutSession.findUnique({
            where: { stripeSessionId: session.id },
          })
          if (!record || record.fulfilledAt) return

          await addLedgerEntry({
            tx,
            userId: record.userId,
            bucket: 'purchased_compute',
            type: 'purchase_credit',
            amount: record.creditsPurchased,
            metadata: {
              stripeSessionId: session.id,
              paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            },
          })

          await tx.stripeCheckoutSession.update({
            where: { id: record.id },
            data: {
              fulfilledAt: new Date(),
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            },
          })
        })
      } else if (session.mode === 'subscription') {
        const clerkUserId = session.metadata?.clerkUserId
        const plan = session.metadata?.plan as 'dev_monthly' | 'pro_monthly' | undefined
        const credits = parseInt(session.metadata?.credits ?? '0', 10)

        if (clerkUserId && plan && credits > 0) {
          const user = await db.userProfile.findUnique({ where: { clerkUserId } })
          if (user) {
            await db.userSubscription.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
                stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
                tier: plan,
                status: 'active',
                monthlyCredits: credits,
              },
              update: {
                stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
                stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
                tier: plan,
                status: 'active',
                monthlyCredits: credits,
              },
            })
          }
        }
      }
    }

    // ── Monthly subscription renewed / first payment ───────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
      const subscriptionId: string | null = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as Stripe.Subscription | null)?.id ?? null

      if (!subscriptionId) return NextResponse.json({ received: true })

      const sub = await db.userSubscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
      })
      if (!sub) return NextResponse.json({ received: true })

      const newPeriodEnd = new Date(((invoice as unknown as { period_end?: number }).period_end ?? 0) * 1000)
      if (sub.currentPeriodEnd && sub.currentPeriodEnd >= newPeriodEnd) {
        return NextResponse.json({ received: true })
      }

      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await addLedgerEntry({
          tx,
          userId: sub.userId,
          bucket: 'purchased_compute',
          type: 'subscription_grant',
          amount: sub.monthlyCredits,
          metadata: {
            plan: sub.tier,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            periodEnd: newPeriodEnd.toISOString(),
          },
        })

        await tx.userSubscription.update({
          where: { id: sub.id },
          data: { status: 'active', currentPeriodEnd: newPeriodEnd },
        })
      })
    }

    // ── Subscription payment failed → mark past_due, do NOT grant credits ──
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
      const subscriptionId: string | null = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as Stripe.Subscription | null)?.id ?? null

      if (subscriptionId) {
        await db.userSubscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: 'past_due' },
        })
      }
      // Stripe will retry the charge and eventually send customer.subscription.deleted
      // if all retries fail. No credit clawback on first failure — only on deletion.
    }

    // ── Refund issued in Stripe dashboard → claw back credits ────────────
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      if (!paymentIntentId) return NextResponse.json({ received: true })

      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const record = await tx.stripeCheckoutSession.findFirst({
          where: { stripePaymentIntentId: paymentIntentId, fulfilledAt: { not: null } },
        })
        if (!record) return

        // Claw back the credits. The ledger entry is negative, reducing balance.
        // If the user has already spent the credits, their balance may go negative —
        // that is intentional and visible in the admin reconciliation report.
        await addLedgerEntry({
          tx,
          userId: record.userId,
          bucket: 'purchased_compute',
          type: 'adjustment',
          amount: -record.creditsPurchased,
          metadata: {
            reason: 'stripe_refund',
            paymentIntentId,
            stripeSessionId: record.stripeSessionId,
          },
        })

        // Mark the checkout session as refunded so subsequent refund events
        // for the same PaymentIntent are idempotent.
        await tx.stripeCheckoutSession.update({
          where: { id: record.id },
          data: { fulfilledAt: null },
        })
      })
    }

    // ── Subscription cancelled or fully lapsed ────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      await db.userSubscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'cancelled' },
      })
    }

    // ── Subscription status changed (e.g. past_due → active after retry) ──
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const status =
        subscription.status === 'active'    ? 'active'
        : subscription.status === 'past_due'  ? 'past_due'
        : subscription.status === 'trialing'  ? 'trialing'
        : subscription.status === 'canceled'  ? 'cancelled'
        : 'past_due'

      await db.userSubscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
