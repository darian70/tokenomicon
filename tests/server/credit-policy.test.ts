import { describe, expect, it } from 'vitest'
import { allocateComputeDebit } from '@/lib/server/credit-policy'

describe('allocateComputeDebit', () => {
  it('debits bonus compute before purchased compute', () => {
    const debits = allocateComputeDebit({
      amount: 75,
      balances: {
        bonus_compute: 100,
        purchased_compute: 500,
      },
    })

    expect(debits).toEqual([
      { bucket: 'bonus_compute', amount: 75 },
    ])
  })

  it('uses purchased compute after bonus compute is exhausted', () => {
    const debits = allocateComputeDebit({
      amount: 125,
      balances: {
        bonus_compute: 50,
        purchased_compute: 500,
      },
    })

    expect(debits).toEqual([
      { bucket: 'bonus_compute', amount: 50 },
      { bucket: 'purchased_compute', amount: 75 },
    ])
  })

  it('throws before allocating when compute balance is insufficient', () => {
    expect(() => allocateComputeDebit({
      amount: 125,
      balances: {
        bonus_compute: 25,
        purchased_compute: 50,
      },
    })).toThrow('Insufficient compute credits')
  })

  it('rejects non-positive debit amounts', () => {
    expect(() => allocateComputeDebit({
      amount: 0,
      balances: {
        bonus_compute: 25,
        purchased_compute: 50,
      },
    })).toThrow('Debit amount must be positive')
  })
})
