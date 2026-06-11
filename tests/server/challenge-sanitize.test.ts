import { describe, expect, it } from 'vitest'
import { sanitizeChallengeForClient } from '@/lib/server/games'

// These guard the single most important integrity property of the arcade:
// the challenge payload sent to the browser must NEVER contain the answer.
// If any of these fail, players can read the answer from the network response
// and farm a perfect score, draining real compute. Do not weaken these.
describe('sanitizeChallengeForClient', () => {
  it('strips the Token Prophet answer + reveal fields', () => {
    const clean = sanitizeChallengeForClient('token_prophet', {
      promptA: 'a', promptB: 'b', longerIs: 'B', tokensA: 10, tokensB: 300, hint: 'tell', expectedTokens: 300,
    })
    expect(clean.promptA).toBe('a')
    expect(clean.promptB).toBe('b')
    expect(clean).not.toHaveProperty('longerIs')
    expect(clean).not.toHaveProperty('tokensA')
    expect(clean).not.toHaveProperty('tokensB')
    expect(clean).not.toHaveProperty('hint')
    expect(clean).not.toHaveProperty('expectedTokens')
  })

  it('strips the Bug Exorcist answer fields but keeps the code', () => {
    const clean = sanitizeChallengeForClient('bug_exorcist', {
      snippet: 'if (x = 0) {}', context: 'fn', language: 'js', mustInclude: '===', explanation: 'why',
    })
    expect(clean.snippet).toBeDefined()
    expect(clean).not.toHaveProperty('mustInclude')
    expect(clean).not.toHaveProperty('explanation')
  })

  it('strips the Context Chicken minimum context', () => {
    const clean = sanitizeChallengeForClient('context_chicken', {
      description: 'task', unit: 'tokens', minContext: 4096,
    })
    expect(clean.description).toBe('task')
    expect(clean).not.toHaveProperty('minContext')
  })

  it('strips the Rate Roulette winner + latencies but keeps provider info', () => {
    const clean = sanitizeChallengeForClient('rate_limit_roulette', {
      prompt: 'p', providers: ['A', 'B'], providerProfiles: [{ provider: 'A' }], fastest: 'A',
      latencies: [{ provider: 'A', latencyMs: 100 }],
    })
    expect(clean.providers).toEqual(['A', 'B'])
    expect(clean.providerProfiles).toBeDefined()
    expect(clean).not.toHaveProperty('fastest')
    expect(clean).not.toHaveProperty('latencies')
  })

  it('strips the Benchmark Brawl winner but keeps outputs to judge', () => {
    const clean = sanitizeChallengeForClient('benchmark_brawl', {
      task: 't', criteria: 'c', models: ['A', 'B'], outputs: { A: 'x', B: 'y' }, bestModel: 'A',
    })
    expect(clean.outputs).toBeDefined()
    expect(clean.models).toEqual(['A', 'B'])
    expect(clean).not.toHaveProperty('bestModel')
  })

  it('strips the Spot the AI answer from every snippet', () => {
    const clean = sanitizeChallengeForClient('spot_deepfake', {
      theme: 'slack',
      fakePosition: 2,
      explanation: 'why',
      snippets: [
        { id: 's-0', text: 'a', position: 0, isAI: false },
        { id: 's-1', text: 'b', position: 1, isAI: false },
        { id: 's-2', text: 'c', position: 2, isAI: true },
      ],
    })
    expect(clean).not.toHaveProperty('fakePosition')
    expect(clean).not.toHaveProperty('explanation')
    const snippets = clean.snippets as Array<Record<string, unknown>>
    expect(snippets).toHaveLength(3)
    for (const s of snippets) {
      expect(s).not.toHaveProperty('isAI')
      expect(s.text).toBeDefined()
    }
  })

  it('leaves chance games (no client-known answer) untouched', () => {
    const crash = { scenario: 'x', model: 'GPT-4o', note: 'n' }
    expect(sanitizeChallengeForClient('prompt_crash', { ...crash })).toEqual(crash)
  })
})
