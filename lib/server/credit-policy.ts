import type { CreditBucket } from '@prisma/client'

type ComputeBalances = {
  bonus_compute: number
  purchased_compute: number
}

export type ComputeDebit = {
  bucket: Extract<CreditBucket, 'bonus_compute' | 'purchased_compute'>
  amount: number
}

export function allocateComputeDebit(input: {
  amount: number
  balances: ComputeBalances
}): ComputeDebit[] {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Debit amount must be positive')
  }

  const bonusBalance = Math.max(0, input.balances.bonus_compute)
  const purchasedBalance = Math.max(0, input.balances.purchased_compute)

  if (bonusBalance + purchasedBalance < input.amount) {
    throw new Error('Insufficient compute credits')
  }

  const debits: ComputeDebit[] = []
  let remaining = input.amount

  const fromBonus = Math.min(bonusBalance, remaining)
  if (fromBonus > 0) {
    debits.push({ bucket: 'bonus_compute', amount: fromBonus })
    remaining -= fromBonus
  }

  if (remaining > 0) {
    debits.push({ bucket: 'purchased_compute', amount: remaining })
  }

  return debits
}
