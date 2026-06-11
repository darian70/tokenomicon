/**
 * Referral system.
 *
 * Each user gets one unique referral code (generated on demand).
 * When a new user redeems a code they receive REFERRAL_SIGNUP_BONUS arena
 * credits immediately. When they complete their first purchase, the referrer
 * receives REFERRAL_PURCHASE_BONUS compute credits.
 */

import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'
import { fireWebhook } from '@/lib/server/webhooks'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REFERRAL_SIGNUP_BONUS = 250    // arena credits for the new user
export const REFERRAL_PURCHASE_BONUS = 500  // bonus_compute for the referrer

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function makeCode(email: string | null | undefined): string {
  const prefix = (email?.split('@')[0] ?? 'USER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

/** Returns the user's referral code, creating one if it doesn't exist. */
export async function getOrCreateReferralCode(userId: string, email?: string | null): Promise<string> {
  const existing = await db.referralCode.findUnique({ where: { userId } })
  if (existing) return existing.code

  // Retry up to 5 times in case of code collision
  for (let i = 0; i < 5; i++) {
    const code = makeCode(email)
    try {
      const created = await db.referralCode.create({ data: { userId, code } })
      return created.code
    } catch {
      // unique constraint on code — retry with a new suffix
    }
  }
  throw new Error('Failed to generate unique referral code')
}

// ---------------------------------------------------------------------------
// Redemption
// ---------------------------------------------------------------------------

export type RedeemResult =
  | { ok: true;  bonus: number }
  | { ok: false; reason: string }

/**
 * Attempt to redeem a referral code for a new user.
 * - Validates code exists and doesn't belong to the recipient
 * - Ensures the recipient hasn't already redeemed a code
 * - Grants REFERRAL_SIGNUP_BONUS arena credits to the recipient
 */
export async function redeemReferralCode(
  code: string,
  recipientId: string,
): Promise<RedeemResult> {
  const referralCode = await db.referralCode.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: { id: true, userId: true },
  })
  if (!referralCode) return { ok: false, reason: 'Code not found' }
  if (referralCode.userId === recipientId) return { ok: false, reason: 'Cannot use your own code' }

  // One redemption per user
  const alreadyRedeemed = await db.referralRedemption.findUnique({
    where: { recipientId },
  })
  if (alreadyRedeemed) return { ok: false, reason: 'You have already redeemed a referral code' }

  // Create redemption + grant signup bonus atomically
  await db.$transaction([
    db.referralRedemption.create({
      data: {
        codeId: referralCode.id,
        giverId: referralCode.userId,
        recipientId,
      },
    }),
    // Inline ledger entry for the recipient's bonus
    db.creditLedgerEntry.create({
      data: {
        userId: recipientId,
        bucket: 'arena_credits',
        type: 'referral_bonus',
        amount: REFERRAL_SIGNUP_BONUS,
        metadata: { code, role: 'recipient' },
      },
    }),
  ])

  // Notify the referrer that someone used their code (fire-and-forget)
  const giver = await db.userProfile.findUnique({
    where: { id: referralCode.userId },
    select: { email: true },
  }).catch(() => null)
  fireWebhook(referralCode.userId, {
    event: 'referral.redeemed',
    recipientEmail: giver?.email ?? null,
  })

  return { ok: true, bonus: REFERRAL_SIGNUP_BONUS }
}

/**
 * Called after a referee's first successful purchase.
 * Marks the redemption as paid and grants the referrer their bonus.
 * Safe to call multiple times — idempotent via `bonusPaid` flag.
 */
export async function maybePayReferrerBonus(recipientId: string): Promise<void> {
  const redemption = await db.referralRedemption.findUnique({
    where: { recipientId },
    select: { id: true, giverId: true, bonusPaid: true },
  })
  if (!redemption || redemption.bonusPaid) return

  await db.$transaction([
    db.referralRedemption.update({
      where: { id: redemption.id },
      data: { bonusPaid: true },
    }),
    db.creditLedgerEntry.create({
      data: {
        userId: redemption.giverId,
        bucket: 'bonus_compute',
        type: 'referral_bonus',
        amount: REFERRAL_PURCHASE_BONUS,
        metadata: { role: 'referrer', recipientId },
      },
    }),
  ])
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getReferralStats(userId: string) {
  const code = await db.referralCode.findUnique({
    where: { userId },
    include: {
      redemptions: {
        select: { bonusPaid: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!code) return { code: null, totalRedemptions: 0, pendingBonus: 0, paidBonus: 0 }

  const total = code.redemptions.length
  const paid = code.redemptions.filter((r) => r.bonusPaid).length
  const pending = total - paid

  return {
    code: code.code,
    totalRedemptions: total,
    pendingBonus: pending * REFERRAL_PURCHASE_BONUS,
    paidBonus: paid * REFERRAL_PURCHASE_BONUS,
  }
}
