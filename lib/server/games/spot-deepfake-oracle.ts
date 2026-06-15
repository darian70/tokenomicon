// Spot the AI oracle.
//
// Wraps the curated text Turing-test scenarios in the oracle architecture.
// Ground truth (fakePosition, explanation) comes from the curated dataset.
// Cost per round: $0. Oracle provides pool warming and consistent delivery.
//
// Challenge → shuffled snippets with isAI flags (stripped by sanitizeChallengeForClient)
// Truth → fakePosition (the display index of the AI snippet) + explanation
//
// Pool target: 4 per tier. Cache TTL: 72h.

import { GameType } from '@prisma/client'
import { registerOracle, type GameOracleSpec, type GenerationSeed } from './oracle'
import { fairRandom } from '@/lib/server/fairness'
import type { DifficultyTier } from '@/lib/server/economy'

interface SpotAIScenario {
  theme: string
  snippets: string[]   // 4 entries; fakeIdx is the AI-written one
  fakeIdx: number
  explanation: string
}

// ---------------------------------------------------------------------------
// Curated scenario pools — difficulty corresponds to how subtle the AI tells are
// ---------------------------------------------------------------------------

const SANDBOX_SCENARIOS: SpotAIScenario[] = [
  {
    theme: 'Stack Overflow answer · JavaScript object check',
    fakeIdx: 2,
    explanation: '"Certainly!", numbered list, "I hope this helps!" — classic AI tells. Humans on SO are terse and opinionated.',
    snippets: [
      `Object.keys(obj).length === 0 && obj.constructor === Object\n\nworks in every browser. Don't use JSON.stringify — it's slow and breaks on circular refs.`,
      `!Object.keys(obj).length is what I use. Cleaner in conditionals. Just remember it won't catch null/undefined.`,
      `Certainly! There are several approaches to check if an object is empty in JavaScript:\n\n1. Using Object.keys(): Object.keys(obj).length === 0 returns true for empty objects\n2. Using JSON.stringify(): JSON.stringify(obj) === '{}'\n3. Using a for...in loop for maximum compatibility\n\nI hope this helps!`,
      `lodash has _.isEmpty() if you're already using it. Otherwise Object.keys is fine for 99% of cases.`,
    ],
  },
  {
    theme: 'GitHub issue comment · reproducible bug report',
    fakeIdx: 0,
    explanation: 'Perfectly structured with environment details, steps, and polite closing — far more formal than typical developer comments.',
    snippets: [
      `Thank you for reporting this issue! I was able to reproduce the problem on my end.\n\nEnvironment:\n- OS: macOS 14.2\n- Node version: 20.11.0\n- Package version: 3.2.1\n\nSteps to reproduce:\n1. Install the package\n2. Run the example script\n3. Observe the error\n\nI believe this may be related to the recent changes in v3.2.0. Looking forward to a fix!`,
      `yep reproducible here too. node 18, linux. happens every time you pass an empty array as the second arg`,
      `same. also crashes in docker but not locally weirdly. might be a path issue`,
      `confirmed. fresh install, no plugins. the stack trace points to line 847 in parser.js`,
    ],
  },
  {
    theme: 'Code review comment · async/await usage',
    fakeIdx: 1,
    explanation: '"Great work overall!" and "Consider using" are AI hedging patterns. Real reviewers are direct and specific.',
    snippets: [
      `you're missing error handling here. if fetchUser rejects the whole component crashes with an unhandled promise rejection`,
      `Great work overall! Consider using a try-catch block to handle potential errors from the async operations. Additionally, you might want to look into using Promise.all() for the independent fetches to improve performance. Keep up the good work!`,
      `this will serialize the fetches unnecessarily. user profile and posts can be parallel — Promise.all([getProfile(id), getPosts(id)])`,
      `also the loading state never resets if the fetch throws. setLoading(false) needs to be in a finally block`,
    ],
  },
  {
    theme: 'Slack dev channel · "anyone know why prod is slow"',
    fakeIdx: 3,
    explanation: 'Unusually formal and comprehensive for a chat message. Real Slack messages are casual and fragmented.',
    snippets: [
      `check the db. we had a slow query last week that looked exactly like this`,
      `was just looking at the dashboard — p99 spiked around 14:30 UTC. datadog shows it's the /api/search endpoint`,
      `anyone restarted the workers recently? sometimes they just need a kick`,
      `Hello! This could be caused by several factors: 1) Increased traffic load on the database servers, 2) A recent deployment introducing a performance regression, 3) Network latency between services, or 4) Memory pressure causing garbage collection pauses. I'd recommend checking your monitoring dashboards and recent deployment history to narrow down the cause.`,
    ],
  },
  {
    theme: 'PR description · database migration',
    fakeIdx: 2,
    explanation: 'Structured with headers, bullet points, and a "Please let me know" close — AI formatting in a context where devs write two sentences.',
    snippets: [
      `adds index on user_id + created_at for the ledger table. should fix the slow dashboard query we noticed last sprint`,
      `Also updates the query in getBalances() to use the new index. Tested locally — query time went from 450ms to 8ms.`,
      `## Summary\n\nThis PR adds a database index to improve query performance on the credit ledger table.\n\n## Changes Made\n- Added composite index on (user_id, created_at)\n- Updated getBalances() to leverage the new index\n- Added migration script\n\n## Testing\nI have thoroughly tested these changes locally and the results look promising. Please let me know if you need any additional information!`,
      `the getBalances query was doing a full table scan — this index cuts it to a range scan. migration is non-blocking (CONCURRENTLY)`,
    ],
  },
]

const PRODUCTION_SCENARIOS: SpotAIScenario[] = [
  {
    theme: 'Code review · TypeScript generics',
    fakeIdx: 0,
    explanation: '"This looks great!" opener followed by hedged suggestions. Production reviewers lead with the specific problem.',
    snippets: [
      `This looks great! One thing to consider is that the generic constraint here might be too loose. You could potentially add a more specific constraint to ensure type safety. Additionally, it might be worth considering whether the return type inference is working as expected in all cases. Just some thoughts to consider!`,
      `the constraint needs \`extends object\` or you'll accept primitives. caught that in prod once with a null slip-through`,
      `type inference breaks when T has optional fields — add explicit return type on line 47`,
      `also this will widen to \`unknown\` when you spread the generic. narrowing it before the spread fixes the compiler warning`,
    ],
  },
  {
    theme: 'Stack Overflow · React re-render question',
    fakeIdx: 3,
    explanation: 'Perfectly balanced explanation with all options listed, "hope this helps." Real SO answers pick one approach and defend it.',
    snippets: [
      `useMemo won't help here because the dependency array changes every render. problem is the object literal in the parent`,
      `move the config object outside the component or use useRef. useMemo with an object dep is basically no-op`,
      `you're creating a new object reference every render. React does shallow comparison for deps`,
      `There are multiple ways to solve React re-render issues caused by object references:\n\n1. **useMemo** - Memoize the object with useMemo and the correct dependency array\n2. **useCallback** - For function props that change on every render\n3. **Move outside component** - If the object doesn't depend on props or state\n4. **useRef** - Store the object in a ref for stable identity\n\nThe best approach depends on your specific use case. I hope this helps clarify the options!`,
    ],
  },
  {
    theme: 'Tech interview Slack channel · salary negotiation',
    fakeIdx: 1,
    explanation: 'Balanced "on one hand / on the other hand" framing with a polite close. Real community advice is opinionated and direct.',
    snippets: [
      `just counter. worst they say is no. i countered on my last two offers and both matched without pushback`,
      `It's important to consider multiple factors when deciding whether to negotiate salary. On one hand, negotiating can potentially result in higher compensation and signals your value. On the other hand, it's essential to be mindful of the company's budget constraints and maintain a positive relationship. I'd recommend researching market rates and being prepared to justify your ask. Whatever you decide, approach it professionally and respectfully.`,
      `always counter, even if it's small. sets a baseline for your first review cycle too`,
      `get the competing offer in writing first. leverage without paperwork is weak`,
    ],
  },
  {
    theme: 'GitHub discussion · monorepo vs multi-repo',
    fakeIdx: 2,
    explanation: '"Both have their merits" exhaustive list without a recommendation is the AI neutrality tell. Engineers take a side.',
    snippets: [
      `monorepo wins if you have shared code. cross-repo PRs are a nightmare once you have 3+ packages with interdependencies`,
      `depends on team size honestly. small team on one product = monorepo. 5+ independent products = separate repos`,
      `Great question! Both monorepo and multi-repo approaches have their merits:\n\n**Monorepo pros:** Unified versioning, easier refactoring, shared tooling, atomic cross-package changes\n**Monorepo cons:** Can become slow as it scales, complex CI setup, harder access control\n\n**Multi-repo pros:** Clear ownership, faster CI for individual packages, simpler permissions\n**Multi-repo cons:** Versioning hell, difficult cross-repo changes, duplicated tooling\n\nThe right choice depends on your team size, project complexity, and organizational structure. Both are valid and used by major companies!`,
      `we switched from multi-repo to monorepo at 30 engineers and never looked back. the shared tooling savings alone paid for the migration`,
    ],
  },
]

const BLACKBOX_SCENARIOS: SpotAIScenario[] = [
  {
    theme: 'Senior engineer Slack · architecture decision',
    fakeIdx: 3,
    explanation: 'The AI response is technically correct but unusually comprehensive, structured, and ends with a question back to the team — hedging that senior devs don\'t do.',
    snippets: [
      `event sourcing is overkill for what you're describing. just use postgres with updated_at and a changes JSONB column`,
      `we tried CQRS on the payments service. took 6 months and the only thing we got was a harder codebase to debug`,
      `depends on write volume. under 1k events/day? don't bother. over 10k? maybe. the kafka overhead has to earn its salary`,
      `There are several architectural patterns worth considering here. Event sourcing provides an immutable audit log and enables temporal queries, but adds complexity in terms of event schema versioning and eventual consistency. CQRS can improve read performance by separating concerns, but requires maintaining separate read models. A simpler approach might be optimistic locking with a version column. What are the specific consistency requirements and expected write volumes for your use case?`,
    ],
  },
  {
    theme: 'Code review · security-sensitive middleware',
    fakeIdx: 1,
    explanation: 'The AI correctly identifies the issue but wraps it in softening language ("might want to consider", "I think") that experienced security engineers don\'t use.',
    snippets: [
      `this is a timing oracle. use crypto.timingSafeEqual — not ===. ship this and you've got a side-channel vuln`,
      `I noticed a potential security concern in the authentication middleware. You might want to consider using a constant-time comparison function instead of the standard equality operator, as string comparison can leak information through timing differences. I think crypto.timingSafeEqual would be more appropriate here. Additionally, it might be worth reviewing the error messages to ensure they don't reveal too much information about the authentication failure reason.`,
      `also the 401 response leaks whether the user exists vs wrong password. make it always say "invalid credentials"`,
      `rate limit this endpoint or you're handing out unlimited brute force. 5 attempts per minute per IP minimum`,
    ],
  },
  {
    theme: 'Tech community Discord · burnout discussion',
    fakeIdx: 0,
    explanation: '"Burnout is a serious issue" opener with a structured list. Real engineers sharing in a community are personal and specific, not prescriptive.',
    snippets: [
      `Burnout is a serious issue in the tech industry, and it's important to address it proactively. Here are some strategies that may help: 1) Set clear boundaries between work and personal time, 2) Take regular breaks using techniques like the Pomodoro method, 3) Communicate with your manager about workload concerns, 4) Prioritize self-care activities, 5) Consider speaking with a mental health professional if needed. Remember, your health is more important than any deadline!`,
      `took 3 months off after my last job. best thing i did. came back and could actually think again`,
      `the moment i stopped checking slack after 6pm was when things improved. sounds simple but it's genuinely hard in a culture that celebrates responsiveness`,
      `i had to quit. no amount of "boundaries" was going to fix a 70hr/week culture. sometimes the only answer is to leave`,
    ],
  },
  {
    theme: 'Engineering blog comment · database indexing post',
    fakeIdx: 2,
    explanation: 'The comment is substantive but too well-structured and ends with a question to drive engagement — a pattern more common in AI-generated content than engineer blog comments.',
    snippets: [
      `the covering index tip is what got us from 800ms to 12ms on our analytics queries. include the select columns and the planner stops hitting the heap`,
      `worth mentioning that partial indexes are underrated. added WHERE deleted_at IS NULL to our index and cut its size by 60%`,
      `This is a great article that covers the fundamentals of database indexing really well! I particularly appreciated the section on composite indexes and how column order affects query planning. One thing I'd add is that index bloat is often overlooked — regular VACUUM ANALYZE is critical for maintaining index efficiency in high-write PostgreSQL deployments. Have you considered writing a follow-up about index maintenance strategies?`,
      `the b-tree vs hash index distinction is subtle but matters. been burned by hash indexes not surviving a crash before WAL replay`,
    ],
  },
]

export interface SpotDeepfakeChallenge {
  theme: string
  snippets: Array<{ id: string; text: string; position: number; isAI: boolean }>
}

export interface SpotDeepfakeTruth {
  fakePosition: number
  explanation: string
}

function buildChallenge(scenario: SpotAIScenario, seed: GenerationSeed): SpotDeepfakeChallenge {
  // Shuffle display order using provably-fair Fisher-Yates.
  const order = [0, 1, 2, 3]
  for (let i = order.length - 1; i > 0; i--) {
    const j = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce + i + 5, i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const snippets = order.map((origIdx, displayPos) => ({
    id: `s-${displayPos}`,
    text: scenario.snippets[origIdx],
    position: displayPos,
    isAI: origIdx === scenario.fakeIdx,
  }))

  return { theme: scenario.theme, snippets }
}

function pickScenario(seed: GenerationSeed, tier: DifficultyTier): SpotAIScenario {
  const pool =
    tier === 'blackbox' ? BLACKBOX_SCENARIOS
    : tier === 'production' ? PRODUCTION_SCENARIOS
    : SANDBOX_SCENARIOS
  const idx = fairRandom(seed.serverSeed, seed.clientSeed, seed.nonce, pool.length)
  return pool[idx]
}

export const spotDeepfakeOracle: GameOracleSpec<GenerationSeed, SpotDeepfakeChallenge, SpotDeepfakeTruth> = {
  game: GameType.spot_deepfake,
  cacheTtlMs: 72 * 60 * 60 * 1000,
  poolTargetPerTier: 4,

  generateChallenge: (seed, tier) => {
    const scenario = pickScenario(seed, tier)
    return buildChallenge(scenario, seed)
  },

  computeGroundTruth: async (challenge) => {
    const aiSnippet = challenge.snippets.find((s) => s.isAI)
    const fakePosition = aiSnippet?.position ?? 0

    // Find the explanation by matching the theme back to the pool
    const allScenarios = [...SANDBOX_SCENARIOS, ...PRODUCTION_SCENARIOS, ...BLACKBOX_SCENARIOS]
    const matched = allScenarios.find((s) => challenge.theme === s.theme)
    const explanation = matched?.explanation ?? 'One of these snippets was generated by an AI language model.'

    return {
      truth: { fakePosition, explanation },
      calls: [],
    }
  },

  // Cache by theme + snippet texts (shuffle order is not content-meaningful).
  canonicalForCache: (c) => ({
    theme: c.theme,
    texts: [...c.snippets].sort((a, b) => a.text.localeCompare(b.text)).map((s) => s.text),
  }),
}

registerOracle(spotDeepfakeOracle)
