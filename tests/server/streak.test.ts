import { describe, it, expect } from 'vitest'
import { computeStreak } from '@/lib/server/streak'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

describe('computeStreak', () => {
  it('returns 0 for no attempts', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 0 when all attempts fail', () => {
    expect(computeStreak([
      { score: 50, createdAt: daysAgo(0) },
      { score: 0, createdAt: daysAgo(1) },
    ])).toBe(0)
  })

  it('returns 1 for a single passing attempt', () => {
    expect(computeStreak([{ score: 80, createdAt: daysAgo(0) }])).toBe(1)
  })

  it('counts consecutive days with a pass', () => {
    expect(computeStreak([
      { score: 80, createdAt: daysAgo(0) },
      { score: 70, createdAt: daysAgo(1) },
      { score: 90, createdAt: daysAgo(2) },
    ])).toBe(3)
  })

  it('breaks streak on a gap day', () => {
    expect(computeStreak([
      { score: 80, createdAt: daysAgo(0) },
      { score: 70, createdAt: daysAgo(1) },
      // day 2 is missing (gap)
      { score: 90, createdAt: daysAgo(3) },
    ])).toBe(2)
  })

  it('counts multiple wins on the same day as one streak day', () => {
    const today = daysAgo(0)
    expect(computeStreak([
      { score: 90, createdAt: today },
      { score: 80, createdAt: today },
      { score: 75, createdAt: today },
    ])).toBe(1)
  })

  it('a fail on day N does not break streak if another pass exists on the same day', () => {
    expect(computeStreak([
      { score: 80, createdAt: daysAgo(0) },
      { score: 10, createdAt: daysAgo(0) }, // fail same day — day still counts
      { score: 75, createdAt: daysAgo(1) },
    ])).toBe(2)
  })

  it('stops counting after first broken day', () => {
    expect(computeStreak([
      { score: 80, createdAt: daysAgo(0) },
      // gap at day 1
      { score: 80, createdAt: daysAgo(2) },
      { score: 80, createdAt: daysAgo(3) },
    ])).toBe(1)
  })

  it('caps at MAX_STREAK (5)', () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({
      score: 80,
      createdAt: daysAgo(i),
    }))
    expect(computeStreak(attempts)).toBe(5)
  })
})
