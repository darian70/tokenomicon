import { describe, expect, it } from 'vitest'
import { scoreGameSubmission } from '@/lib/server/games'

describe('scoreGameSubmission', () => {
  it('scores Token Prophet exact guesses', () => {
    expect(scoreGameSubmission(
      'token_prophet',
      { expectedTokens: 120 },
      { guess: 120 },
      'sandbox',
    )).toBe(100)
  })

  it('scores Prompt Golf prompts that include every required target', () => {
    expect(scoreGameSubmission(
      'prompt_golf',
      { required: ['json', 'title', 'score'] },
      { prompt: 'json title score' },
      'sandbox',
    )).toBeGreaterThan(0)
  })

  it('scores Bug Exorcist fixes that include the required repair', () => {
    expect(scoreGameSubmission(
      'bug_exorcist',
      { mustInclude: '===' },
      { fix: 'if (items.length === 0) return []' },
      'sandbox',
    )).toBe(95)
  })

  it('scores Context Chicken minimum viable context bets', () => {
    expect(scoreGameSubmission(
      'context_chicken',
      { minContext: 4096 },
      { contextBet: 4096 },
      'production',
    )).toBe(100)
  })

  it('scores Rate Limit Roulette correct provider picks', () => {
    expect(scoreGameSubmission(
      'rate_limit_roulette',
      { fastest: 'Groq Llama', providers: ['OpenAI GPT-4o', 'Groq Llama'] },
      { pick: 'Groq Llama' },
      'sandbox',
    )).toBe(100)
  })

  it('scores Benchmark Brawl correct model picks', () => {
    expect(scoreGameSubmission(
      'benchmark_brawl',
      { bestModel: 'Claude Sonnet', models: ['GPT-4o', 'Claude Sonnet'] },
      { pick: 'Claude Sonnet' },
      'sandbox',
    )).toBe(100)
  })

  it('scores Spot Deepfake correct image picks', () => {
    expect(scoreGameSubmission(
      'spot_deepfake',
      { fakePosition: 2 },
      { selectedPosition: 2 },
      'blackbox',
    )).toBe(100)
  })
})
