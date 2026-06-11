import Stripe from 'stripe'
import { db } from './db'
import { getBalances, addLedgerEntry } from './ledger'
import { TOPUP_PACKS, type TopupPackId } from '@/lib/topup-packs'
import { fireWebhook } from './webhooks'

export { TOPUP_PACKS, type TopupPackId }

// Debounce: don't charge more than once per 5 minutes per user
const TOPUP_DEBOUNCE_MS = 5 * 60 * 1000

/**
 * Checks if a user's balance has fallen below their configured threshold and,
 * if so, executes an off-session Stripe charge using their saved payment method.
 * Safe to fire-and-forget — all failures are recorded to AutoTopupConfig.
 */
export async function checkAndTriggerAutoTopup(userId: string, stripeKey: string): Promise<void> {
  const config = await db.autoTopupConfig.findUnique({ where: { userId } })
  if (!config?.enabled) return

  if (config.lastTopupAt && Date.now() - config.lastTopupAt.getTime() < TOPUP_DEBOUNCE_MS) return

  const balances = await getBalances(userId)
  const totalCompute = balances.purchased_compute + balances.bonus_compute
  if (totalCompute >= config.thresholdCredits) return

  const pack = TOPUP_PACKS[config.topupPackId as TopupPackId]
  if (!pack) return

  const stripe = new Stripe(stripeKey)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.amountCents,
      currency: 'usd',
      customer: config.stripeCustomerId,
      payment_method: config.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      description: `Tokenomicon auto-topup: ${pack.label}`,
    })

    if (paymentIntent.status === 'succeeded') {
      await db.$transaction(async (tx) => {
        await addLedgerEntry({
          tx,
          userId,
          bucket: 'purchased_compute',
          type: 'purchase_credit',
          amount: pack.credits,
          metadata: {
            paymentIntentId: paymentIntent.id,
            source: 'auto_topup',
            pack: config.topupPackId,
            amountCents: pack.amountCents,
          },
        })

        await tx.autoTopupConfig.update({
          where: { userId },
          data: { lastTopupAt: new Date(), lastFailedAt: null, failureReason: null },
        })
      })

      const newBalances = await getBalances(userId)
      fireWebhook(userId, {
        event: 'credit.topup',
        amount: pack.credits,
        pack: config.topupPackId,
        newBalance: newBalances.purchased_compute + newBalances.bonus_compute,
      })
    }
  } catch (err) {
    await db.autoTopupConfig.update({
      where: { userId },
      data: {
        lastFailedAt: new Date(),
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      },
    }).catch(() => {})
  }
}
