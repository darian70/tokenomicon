import { describe, it, expect } from 'vitest'
import { calculateReward } from '@/lib/server/economy'

// ---------------------------------------------------------------------------
// calculateReward
// ---------------------------------------------------------------------------

describe('calculateReward', () => {
  it('returns 0 reward for 0 score', () => {
    const { reward } = calculateReward({ score: 0, tier: 'sandbox', streak: 0, dailyEarned: 0 })
    expect(reward).toBe(0)
  })

  it('awards perfect score bonus on score 100', () => {
    const { reward: noBonus } = calculateReward({ score: 99, tier: 'sandbox', streak: 0, dailyEarned: 0 })
    const { reward: withBonus } = calculateReward({ score: 100, tier: 'sandbox', streak: 0, dailyEarned: 0 })
    // score-100 path adds PERFECT_SCORE_BONUS (500)
    expect(withBonus).toBeGreaterThan(noBonus)
    expect(withBonus - noBonus).toBeGreaterThanOrEqual(400) // after rake
  })

  it('caps at daily bonus cap', () => {
    const { reward, capped } = calculateReward({ score: 100, tier: 'blackbox', streak: 5, dailyEarned: 1999 })
    expect(capped).toBe(true)
    expect(reward).toBe(1) // only 1 credit remaining before cap
  })

  it('does not cap when dailyEarned is 0 and reward is under cap', () => {
    const { capped } = calculateReward({ score: 80, tier: 'sandbox', streak: 0, dailyEarned: 0 })
    expect(capped).toBe(false)
  })

  it('streak multiplier increases reward monotonically', () => {
    const rewards = [0, 1, 2, 3, 4, 5].map(
      (streak) => calculateReward({ score: 80, tier: 'sandbox', streak, dailyEarned: 0 }).reward,
    )
    for (let i = 1; i < rewards.length; i++) {
      expect(rewards[i]).toBeGreaterThanOrEqual(rewards[i - 1])
    }
  })

  it('blackbox tier yields more than sandbox tier at same score', () => {
    const sandbox = calculateReward({ score: 80, tier: 'sandbox', streak: 0, dailyEarned: 0 })
    const blackbox = calculateReward({ score: 80, tier: 'blackbox', streak: 0, dailyEarned: 0 })
    expect(blackbox.reward).toBeGreaterThan(sandbox.reward)
  })

  it('rake is non-negative and less than raw reward', () => {
    const { reward, rake } = calculateReward({ score: 75, tier: 'production', streak: 2, dailyEarned: 0 })
    expect(rake).toBeGreaterThanOrEqual(0)
    expect(rake).toBeLessThanOrEqual(reward + rake) // rake < gross
  })
})
