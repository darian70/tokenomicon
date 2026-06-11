import type Stripe from 'stripe'
import { db } from './db'

/**
 * Returns an existing Stripe customer ID for the user, or creates a new one.
 * Checks AutoTopupConfig first, then UserSubscription, then creates fresh.
 */
export async function ensureStripeCustomer(
  userId: string,
  stripe: Stripe,
): Promise<string> {
  const [autoTopup, sub, user] = await Promise.all([
    db.autoTopupConfig.findUnique({ where: { userId }, select: { stripeCustomerId: true } }),
    db.userSubscription.findUnique({ where: { userId }, select: { stripeCustomerId: true } }),
    db.userProfile.findUnique({ where: { id: userId }, select: { email: true } }),
  ])

  if (autoTopup?.stripeCustomerId) return autoTopup.stripeCustomerId
  if (sub?.stripeCustomerId) return sub.stripeCustomerId

  const customer = await stripe.customers.create({
    email: user?.email ?? undefined,
    metadata: { tokenomiconUserId: userId },
  })

  return customer.id
}
