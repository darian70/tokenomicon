import { CreditBucket, LedgerEntryType, Prisma } from '@prisma/client'
import { db } from '@/lib/server/db'
import { allocateComputeDebit, type ComputeDebit } from '@/lib/server/credit-policy'
import { ECONOMY, SUBSCRIPTION_DAILY_GRANT_MULTIPLIER } from '@/lib/server/economy'

export const DAILY_ARENA_GRANT = ECONOMY.DAILY_ARENA_GRANT

type LedgerTx = Prisma.TransactionClient

export async function addLedgerEntry(input: {
  tx?: LedgerTx
  userId: string
  bucket: CreditBucket
  type: LedgerEntryType
  amount: number
  metadata?: Prisma.InputJsonValue
}) {
  const client = input.tx ?? db
  return client.creditLedgerEntry.create({
    data: {
      userId: input.userId,
      bucket: input.bucket,
      type: input.type,
      amount: input.amount,
      metadata: input.metadata,
    },
  })
}

export async function getBalances(userId: string, tx?: LedgerTx) {
  const client = tx ?? db
  const grouped = await client.creditLedgerEntry.groupBy({
    by: ['bucket'],
    where: { userId },
    _sum: { amount: true },
  })

  const balances: Record<CreditBucket, number> = {
    purchased_compute: 0,
    arena_credits: 0,
    bonus_compute: 0,
  }

  for (const row of grouped) {
    balances[row.bucket] = row._sum.amount ?? 0
  }

  return balances
}

// Returns the subscription tier for a user, or null if none / not active.
async function getActiveSubscriptionTier(userId: string): Promise<string | null> {
  const sub = await db.userSubscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  })
  if (!sub || sub.status !== 'active') return null
  return sub.tier
}

export async function ensureDailyArenaCredits(userId: string) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const existing = await db.creditLedgerEntry.findFirst({
    where: {
      userId,
      type: 'daily_arena_grant',
      createdAt: { gte: start },
    },
  })

  if (!existing) {
    const tier = await getActiveSubscriptionTier(userId)
    const multiplier = tier ? (SUBSCRIPTION_DAILY_GRANT_MULTIPLIER[tier] ?? 1) : 1
    const grantAmount = ECONOMY.DAILY_ARENA_GRANT * multiplier

    await addLedgerEntry({
      userId,
      bucket: 'arena_credits',
      type: 'daily_arena_grant',
      amount: grantAmount,
      metadata: { source: 'daily_login', subscriptionTier: tier ?? 'none', multiplier },
    })
  }
}

export const WELCOME_BONUS = 50

export async function ensureWelcomeBonus(userId: string) {
  const existing = await db.creditLedgerEntry.findFirst({
    where: {
      userId,
      type: 'signup_bonus',
    },
  })

  if (!existing) {
    await addLedgerEntry({
      userId,
      bucket: 'bonus_compute',
      type: 'signup_bonus',
      amount: WELCOME_BONUS,
      metadata: { source: 'welcome_bonus' },
    })
  }
}

// Debits credits for API usage. Returns the actual debit breakdown so callers
// can issue precise refunds when pre-debiting for streaming requests.
export async function debitForApiUsage(input: {
  tx: LedgerTx
  userId: string
  amount: number
  metadata?: Prisma.InputJsonValue
}): Promise<ComputeDebit[]> {
  const balances = await getBalances(input.userId, input.tx)
  const debits = allocateComputeDebit({
    amount: input.amount,
    balances: {
      bonus_compute: balances.bonus_compute,
      purchased_compute: balances.purchased_compute,
    },
  })

  for (const debit of debits) {
    await addLedgerEntry({
      tx: input.tx,
      userId: input.userId,
      bucket: debit.bucket,
      type: 'api_usage_debit',
      amount: -debit.amount,
      metadata: input.metadata,
    })
  }

  return debits
}

// Issues a precise refund to the same buckets that were originally debited.
// Used by the streaming path to refund the over-estimated pre-debit.
export async function refundDebits(input: {
  tx: LedgerTx
  userId: string
  originalDebits: ComputeDebit[]  // debits returned by debitForApiUsage
  actualAmount: number             // the real cost (must be <= sum of originalDebits)
  metadata?: Prisma.InputJsonValue
}) {
  const totalDebited = input.originalDebits.reduce((s, d) => s + d.amount, 0)
  let refundRemaining = totalDebited - input.actualAmount
  if (refundRemaining <= 0) return

  // Refund in reverse bucket order: since bonus was debited first, refund
  // purchased first so the user's paid credits are restored before bonus.
  const reversed = [...input.originalDebits].reverse()
  for (const debit of reversed) {
    if (refundRemaining <= 0) break
    const fromBucket = Math.min(debit.amount, refundRemaining)
    await addLedgerEntry({
      tx: input.tx,
      userId: input.userId,
      bucket: debit.bucket,
      type: 'adjustment',
      amount: fromBucket,
      metadata: input.metadata,
    })
    refundRemaining -= fromBucket
  }
}

// Records a failed streaming credit adjustment for admin reconciliation.
// Called when the post-stream refund transaction fails to commit.
export async function recordFailedAdjustment(input: {
  userId: string
  amount: number
  reason: string
  metadata?: Prisma.InputJsonValue
}) {
  try {
    await db.failedAdjustment.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
  } catch {
    // If we can't write to failed_adjustment, the reconciliation report
    // (buildReconciliationReport) will surface the discrepancy via the
    // mismatch between charged credits and provider usage totals.
  }
}
