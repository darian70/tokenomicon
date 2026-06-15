import { describe, it, expect } from 'vitest'
import {
  generateServerSeed,
  verifyServerSeed,
  combineSeeds,
  deriveOutcome,
  fairRandom,
} from '@/lib/server/fairness'

describe('generateServerSeed', () => {
  it('produces a 64-char hex seed and matching sha256 hash', () => {
    const { seed, hash } = generateServerSeed()
    expect(seed).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifyServerSeed returns true for a matching pair', () => {
    const { seed, hash } = generateServerSeed()
    expect(verifyServerSeed(seed, hash)).toBe(true)
  })

  it('verifyServerSeed returns false for a tampered seed', () => {
    const { hash } = generateServerSeed()
    expect(verifyServerSeed('deadbeef'.repeat(8), hash)).toBe(false)
  })
})

describe('combineSeeds', () => {
  it('is deterministic for the same inputs', () => {
    const a = combineSeeds('seed', 'client', 1)
    const b = combineSeeds('seed', 'client', 1)
    expect(a).toBe(b)
  })

  it('differs when nonce changes', () => {
    const a = combineSeeds('seed', 'client', 1)
    const b = combineSeeds('seed', 'client', 2)
    expect(a).not.toBe(b)
  })

  it('differs when client seed changes', () => {
    const a = combineSeeds('seed', 'clientA', 1)
    const b = combineSeeds('seed', 'clientB', 1)
    expect(a).not.toBe(b)
  })
})

describe('deriveOutcome', () => {
  it('always returns a value in [0, max)', () => {
    const hash = combineSeeds('server', 'client', 42)
    for (const max of [2, 6, 16, 25, 100]) {
      const result = deriveOutcome(hash, max)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(max)
    }
  })
})

describe('fairRandom', () => {
  it('returns an integer in [0, max)', () => {
    for (let i = 0; i < 20; i++) {
      const result = fairRandom('seed', 'client', i, 4)
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(4)
    }
  })

  it('produces a reasonably uniform distribution over many nonces', () => {
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < 400; i++) {
      counts[fairRandom('seed', 'client', i, 4)]++
    }
    // Each bucket should appear ~25% of the time; allow ±15% variance
    for (const count of counts) {
      expect(count).toBeGreaterThan(50)
      expect(count).toBeLessThan(150)
    }
  })
})
