# TOKENOMICON — Engineering Blueprint
### MVP → Production: Technical Strategy Across All Disciplines
**Version 1.0 — Living Document**

---

## EXECUTIVE AUDIT: WHERE WE ARE

The MVP is structurally sound. Server-scored games, immutable credit ledger, Clerk auth, Stripe payments, OpenAI/Anthropic proxy — all functional. But it's held together with duct tape in critical areas. Here's the honest assessment:

| System | MVP State | Production Requirement | Gap Severity |
|---|---|---|---|
| Credit Pricing | `totalTokens / 10` flat rate | Per-model, per-direction pricing with margin | **CRITICAL** |
| Provider Layer | if/else on model prefix | Adapter pattern, health checks, failover, streaming | **CRITICAL** |
| Game RNG | `Math.random()` | Provably fair commit-reveal | **CRITICAL** |
| Rate Limiting | In-memory Map | Redis/Upstash, survives restarts, horizontal | **HIGH** |
| Game Economy | Flat 2x score reward, no caps | Tiered rewards, daily caps, diminishing returns | **HIGH** |
| Leaderboard | 100% mock data | Real DB queries, ranked | **HIGH** |
| Game Variety | 3 games, small challenge pools | 6+ games, large/generated pools, AI-judged | **MEDIUM** |
| Monitoring | Zero | Structured logging, error tracking, alerting | **MEDIUM** |
| Tests | Zero | 80%+ coverage on server libs | **MEDIUM** |
| Streaming | Not supported | SSE streaming for chat completions | **MEDIUM** |
| Live Feed | Static marketing text | Real WebSocket/polling event stream | **LOW** |

---

## PART 1: TECHNICAL ARCHITECTURE (CTO)

### 1.1 — System Design Decisions

**Monolith-first, extract later.** Next.js App Router gives us API routes, SSR, and frontend in one deployable. We stay monolith through 25K MAU. Extraction targets if needed:
- Compute Router → standalone service (latency-sensitive)
- Game Settlement → background worker (consistency-sensitive)
- WebSocket server → standalone (connection-sensitive)

**Database: PostgreSQL + Redis.**
- Postgres (via Prisma): Credit ledger, game state, user profiles, usage logs. The ledger is append-only and immutable — this is our source of truth.
- Redis (via Upstash): Rate limiting, session cache, real-time leaderboard sorted sets, pub/sub for live feed events.

**Provider strategy: Own-account only.** We buy credits on our own OpenAI/Anthropic/Groq accounts. Users never expose their keys. This is legally clean (Model B from master strategy) and operationally simple.

### 1.2 — Provider Abstraction Layer

The current `providers.ts` uses raw fetch with if/else branching. This must become a pluggable adapter system:

```
ProviderAdapter (interface)
├── OpenAIAdapter    → gpt-4o, gpt-4o-mini, o3-mini, etc.
├── AnthropicAdapter → claude-sonnet-4, claude-haiku, etc.
├── GroqAdapter      → llama-3.3-70b, mixtral, gemma2, etc.
└── (future)         → Together, Fireworks, local models
```

**Each adapter implements:**
- `chat(messages, model, options)` → response + usage
- `stream(messages, model, options)` → AsyncIterable<chunk>
- `healthCheck()` → latency + status
- `estimateCost(model, promptTokens, completionTokens)` → credits

**The Compute Router sits above adapters:**
1. Validate model is enabled in price table
2. Check user has sufficient credits (estimate worst-case)
3. Select adapter by model prefix
4. If primary fails, try fallback model (configurable per model)
5. Record latency, token usage, cost
6. Debit actual usage from ledger

### 1.3 — Model Price Registry

Every model gets an entry with:
- `provider`: which adapter handles it
- `modelId`: the provider's model identifier
- `inputCostPer1k`: our cost per 1K input tokens (in microdollars)
- `outputCostPer1k`: our cost per 1K output tokens
- `creditRate`: how many Tokenomicon credits per 1K total tokens
- `marginBps`: our markup in basis points (default 2000 = 20%)
- `maxOutputTokens`: cap for this model
- `enabled`: can users route to it
- `fallbackModel`: what to try if this model is down
- `tier`: 'standard' | 'premium' | 'economy'

Credits charged = `ceil((promptTokens * inputRate + completionTokens * outputRate) / 1000)`

This replaces the flat `totalTokens / 10` with real economics.

### 1.4 — Provably Fair System

**The problem:** `Math.random()` is not auditable. Users have no way to verify game outcomes weren't rigged.

**The solution: Commit-reveal with HMAC.**

```
1. Server generates serverSeed (crypto.randomBytes)
2. Server sends seedHash = SHA-256(serverSeed) to client
3. Client provides clientSeed (or we auto-generate)
4. Combined entropy: HMAC-SHA256(serverSeed, clientSeed + nonce)
5. After game settles, server reveals serverSeed
6. Client can verify: SHA-256(revealedSeed) === seedHash
```

This is the same scheme used by Stake, Rollbit, and every legitimate crypto casino. It costs us nothing and gives us provable fairness as a feature.

For AI-judged games (future), the prompt + model + response hash chain provides auditability.

### 1.5 — Security Posture

**Immediate (before any paid user):**
- Move rate limiting to Redis (in-memory won't survive redeployment)
- Add request signing for internal API calls
- Implement API key scopes (read-only, full-access)
- Add CORS restrictions on API routes
- Validate all Zod schemas have `.max()` bounds
- Add idempotency keys to ledger writes

**Before public launch:**
- Professional pen test on API routes
- Stripe webhook signature verification (already done ✓)
- Content Security Policy headers
- API key rate limits per-key, not just per-user
- Automated ledger reconciliation job
- Reserve monitoring with alerts

**Phase 2:**
- SOC 2 Type II compliance roadmap
- HSM for provider API key storage
- Audit logging for all admin actions
- IP allowlisting for admin routes

---

## PART 2: GAME ENGINE ARCHITECTURE (Head of Game Engineering)

### 2.1 — Game Engine v2

The current game system has each game's logic inline in `games.ts`. This must become a registry of game implementations behind a common interface:

```typescript
interface GameDefinition {
  id: GameType
  name: string
  description: string
  tiers: Record<DifficultyTier, TierConfig>
  createChallenge(tier: DifficultyTier, seed: Buffer): Challenge
  score(challenge: Challenge, submission: unknown): ScoreResult
  maxSessionDuration: number // seconds
  requiresAI: boolean // does scoring need an LLM call
}
```

**Every game is registered in a map.** Adding a new game = implementing the interface + adding the enum value. No if/else chains.

### 2.2 — Difficulty Tiers

Three tiers replace the flat 25-credit entry:

| Tier | Entry Cost | Base Reward Multiplier | Challenge Difficulty |
|---|---|---|---|
| `sandbox` | 15 arena cr | 1.0x | Easy — smaller range, fewer options |
| `production` | 30 arena cr | 2.2x | Medium — standard |
| `blackbox` | 60 arena cr | 4.5x | Hard — wider range, time pressure, more distractors |

Tier selection is per-session, chosen by the player before starting.

### 2.3 — Game Roster (6 Games)

**Existing (enhanced):**

1. **Token Prophet** — Guess output token count. Enhanced: larger prompt pool (20+), tier-based precision bands, actual LLM call option at blackbox tier.

2. **Prompt Golf** — Shortest prompt hitting targets. Enhanced: more goal types, penalty for extra tokens, par system like real golf.

3. **Bug Exorcist** — Pick the correct patch. Enhanced: 15+ bug patterns, multi-bug rounds at higher tiers, time limit at blackbox.

**New:**

4. **Context Chicken** — Push a conversation longer and longer. Each turn costs more tokens but earns more points. Bail out or bust when the model loses coherence. The "chicken" is knowing when to stop. Uses real LLM calls.

5. **Rate Limit Roulette** — Predict whether a request to a model will succeed or get rate-limited. Based on current load patterns. The thing every developer hates becomes a game. Purely skill-based: requires understanding API behavior.

6. **Benchmark Brawl** — Two models answer the same prompt. Player bets on which scores higher by a judge model. Uses real LLM calls. Three-way AI interaction.

### 2.4 — Session Lifecycle

```
CREATED → ACTIVE → SUBMITTED → SETTLED
           ↓ (timeout)
         EXPIRED (refund entry cost)
```

- Sessions expire after `maxSessionDuration` (default 300s)
- Only one active session per user per game
- Expired sessions get a partial refund (50% of entry cost)
- Settled sessions are immutable

### 2.5 — Challenge Pool Management

Static challenge pools are memorizable. Mitigation:
- Each game has 20+ base challenges minimum
- Challenges are parameterized — same template with random values
- Token Prophet: prompts generated from templates with variable subjects
- Bug Exorcist: code snippets from a combinatorial generator
- At blackbox tier, challenges can be AI-generated on the fly

---

## PART 3: CREDIT ECONOMY (Lead Game Economist)

### 3.1 — Economy Constants

```typescript
const ECONOMY = {
  DAILY_ARENA_GRANT: 100,
  DAILY_BONUS_CAP: 2000,          // max bonus compute earnable per day
  REWARD_CURVE_EXPONENT: 1.6,     // diminishing returns above score 80
  RAKE_BPS: 200,                  // 2% house edge
  STREAK_BONUS_PER_LEVEL: 0.05,   // +5% per consecutive win, max 5 streak
  MAX_STREAK_BONUS: 0.25,         // cap at +25%
  PERFECT_SCORE_JACKPOT: 500,     // one-time bonus for 100/100
  REFERRAL_BONUS: 50,             // bonus compute for referred user's first game
}
```

### 3.2 — Reward Formula

```
base_reward = tier.baseReward
score_factor = (score / 100) ^ REWARD_CURVE_EXPONENT
streak_factor = 1 + min(streak * STREAK_BONUS_PER_LEVEL, MAX_STREAK_BONUS)
raw_reward = floor(base_reward * score_factor * streak_factor)
rake = floor(raw_reward * RAKE_BPS / 10000)
final_reward = min(raw_reward - rake, DAILY_BONUS_CAP - today_earned)
```

The exponent `1.6` means:
- Score 50 → factor 0.33 (low reward for mediocre play)
- Score 80 → factor 0.69 (decent reward)
- Score 95 → factor 0.92 (near-full reward)
- Score 100 → factor 1.00 (full reward + jackpot if first time)

This heavily rewards skill while making average play less profitable than the flat 2x system.

### 3.3 — Anti-Exploit Guardrails

- **Daily bonus cap:** No user earns more than 2000 bonus compute/day regardless of play volume
- **Session rate limit:** Max 3 active sessions per user per 5-minute window
- **Score anomaly detection:** Flag users scoring >95 on >50% of attempts
- **Cooldown after losses:** Optional (user-configurable responsible gaming)
- **Reserve check:** If total outstanding bonus_compute exceeds reserve threshold, reduce reward multipliers globally

### 3.4 — Economy Health Metrics

Dashboard for monitoring (admin-only):
- Total credits in circulation (by bucket)
- Daily credit generation vs consumption
- Credit velocity (credits transacted per day)
- Top earners (potential exploit flag)
- Reserve ratio
- Revenue per user

---

## PART 4: PRODUCT STRATEGY — PLATFORM (Head of Product, Platform)

### 4.1 — Developer Experience North Star

**Time to first API call: under 3 minutes.**

The flow:
1. Sign up (Clerk — 30s)
2. Get 100 free arena credits automatically
3. Play one game (60s)
4. Win bonus compute
5. Create API key (10s)
6. Make first API call with bonus compute (30s)

No credit card required for the first experience. This is our conversion funnel.

### 4.2 — API Design

**Base URL:** `https://api.tokenomicon.gg/v1/`

**Endpoints:**
- `POST /v1/chat/completions` — OpenAI-compatible chat (our proxy)
- `GET  /v1/models` — List available models + pricing
- `GET  /v1/usage` — User's usage history
- `GET  /v1/balance` — Current credit balances

**Compatibility goal:** Drop-in replacement for OpenAI SDK. Change base_url and api_key, everything else works. This is how OpenRouter won — zero migration cost.

### 4.3 — Dashboard v2 Priorities

1. **Usage analytics** — Charts showing credit burn rate, top models, cost per day
2. **Model pricing table** — Live prices, compare providers
3. **API key management** — Scopes, usage per key, last used
4. **Billing history** — All purchases, receipts, invoices
5. **Game history** — Past sessions, scores, earnings timeline

### 4.4 — Onboarding Flow

New user lands on `/arena` for the first time:
1. Tooltip: "You have 100 arena credits. Play a game to earn bonus compute."
2. Guided first game (Token Prophet is simplest — just slide a range)
3. Win screen shows: "You earned X bonus compute. Create an API key to use it."
4. API key creation with one-click copy
5. Code snippet: `curl -H "Authorization: Bearer tkm_live_..." https://api.tokenomicon.gg/v1/chat/completions`

---

## PART 5: PRODUCT STRATEGY — GAMES (Head of Product, Games)

### 5.1 — Player Progression

**Rank System:**
- Rank 1-10, based on total XP earned
- XP = sum of all game scores (not rewards)
- Each rank unlocks: new games, higher tiers, cosmetic badges
- Rank 5 unlocks blackbox tier
- Rank 8 unlocks AI-judged games (Context Chicken, Benchmark Brawl)

**Achievements (examples):**
- "First Blood" — Complete first game
- "Calibrated" — Score 95+ on Token Prophet
- "Under Par" — Prompt Golf score 90+ in 3 consecutive rounds
- "Bug Hunter" — 10 perfect Bug Exorcist rounds
- "Degen Hours" — Play 10 games in one session
- "The Streak" — 5 consecutive wins

### 5.2 — Daily/Weekly Challenges

- **Daily:** "Score 80+ on Bug Exorcist" → 50 bonus compute
- **Weekly:** "Win 15 games across any mode" → 200 bonus compute
- Challenges rotate, some are game-specific, some are cross-game

### 5.3 — Tournament System (Phase 2)

- Entry fee in arena credits
- Fixed schedule (daily at 6pm UTC, weekly on Saturdays)
- Best-of-5 format
- Prize pool = sum of entries minus rake
- Top 3 split: 50/30/20
- Leaderboard season: monthly reset, top 10 get "Season Champion" badge

### 5.4 — Responsible Gaming

- **Session time reminders** — Notification after 30 minutes continuous play
- **Daily loss limit** — User-configurable, default off
- **Cool-down period** — After 5 consecutive losses, suggest a break
- **Self-exclusion** — User can lock themselves out for 24h/7d/30d
- **Play history** — Full transparency on win/loss/spend

---

## PART 6: UX & DESIGN DIRECTION (Senior UX/UI)

### 6.1 — Design System: "Void Terminal"

The dark arcade theme is strong. Formalize it:

**Color tokens:**
- `void` (#070a10) — deepest background
- `panel` (#0c111a) — card/surface
- `border` (#192433) — structural lines
- `dim` (#5c6a7d) — secondary text
- `text` (#dce7f7) — primary text
- `acid` (#59f5a9) — success, primary action, wins
- `gold` (#ffd700) — currency, premium
- `blood` (#ff4d6d) — danger, losses, errors
- `cyan` (#5ad8ff) — info, navigation, links

**Typography:**
- Orbitron — display/headings (the "arcade cabinet" font)
- Share Tech Mono — body/data (the "terminal" font)
- VT323 — flavor text, subtitles (the "retro" font)

**Component patterns:**
- `.panel` — gradient background with top-edge glow line
- Buttons — uppercase tracking-widest, crosshair cursor
- Cards — border + hover:border-color transition
- Data — monospace, right-aligned numbers, color-coded +/-

### 6.2 — Information Hierarchy

The arena page has the right 3-column layout. Refine:
- **Left (Wallet):** Financial state. "How much do I have?"
- **Center (Game):** Active gameplay. "What am I doing right now?"
- **Right (Social):** Community context. "How do I compare?"

On mobile: stack as Game → Wallet → Social (game is primary action).

### 6.3 — Motion Design Principles

- **Consequential:** Animations should feel like cause → effect. Button press → result appears.
- **Fast:** UI transitions ≤ 200ms. Game animations ≤ 400ms. Result reveals 400-800ms.
- **Informative:** Score reveal should build tension (count up, not instant). Credit changes should animate.
- **60fps minimum:** No layout thrashing. Use transform/opacity only. Framer Motion for React, CSS keyframes for simple effects.

### 6.4 — The "Vault" Wallet Concept

The wallet panel should feel like a secure vault, not a spreadsheet:
- Big gold number at top (total compute — your "net worth")
- Bucket breakdown with tiny progress bars
- Recent activity as a feed with +/- color coding
- Buy credits button should feel premium (gold border, glow on hover)
- API key section should feel secure (lock icon, masked display)

---

## PART 7: CONTENT & TONE (Game Content Lead)

### 7.1 — Voice Guidelines

**Tone:** Unhinged but precise. We know exactly what we're doing, we just think it's hilarious that we're doing it.

**Do:**
- "Your API credits are burning a hole in your pocket. Might as well put them to work."
- "Score: 47. Honestly? Brave of you to submit that."
- "PERFECT. The model never saw it coming."

**Don't:**
- Generic SaaS copy ("Streamline your workflow...")
- Overly edgy / try-hard ("DEGEN LIFE WAGMI")
- Misleading (never imply credits have cash value)

### 7.2 — Result Messages

| Score Range | Flavor |
|---|---|
| 95-100 | "FLAWLESS. The compute gods smile upon you." |
| 80-94 | "Solid. Your credits are multiplying." |
| 60-79 | "Passable. Room for improvement." |
| 40-59 | "Mediocre. The model is unimpressed." |
| 20-39 | "Rough. Your arena credits died for this." |
| 0-19 | "Catastrophic. We're not mad, just disappointed." |

### 7.3 — The Lore Wrapper

Tokenomicon isn't just a platform — it's "The Exchange." The arena is "The Floor." High-stakes games happen in "The Blackbox." Your credit balance is your "Reserve." The leaderboard is "The Ledger of Champions."

This mythology gives us naming conventions for features, marketing hooks, and community identity.

---

## PART 8: IMPLEMENTATION ROADMAP

### Sprint 1 (Week 1-2): Foundation

**Goal:** Replace all MVP shortcuts with production infrastructure.

- [ ] Model price registry with real per-model pricing
- [ ] Provider adapter layer (OpenAI, Anthropic, Groq)
- [ ] Provably fair RNG (commit-reveal HMAC)
- [ ] Economy config (reward curves, daily caps, tiers)
- [ ] Prisma schema updates (new games, tiers, fairness fields)
- [ ] Redis rate limiting (Upstash or node-redis)

### Sprint 2 (Week 3-4): Game Engine v2

**Goal:** Ship 6 games with tiers and provably fair outcomes.

- [ ] Game engine refactor (registry pattern)
- [ ] Enhanced Token Prophet (20+ prompts, tier bands)
- [ ] Enhanced Prompt Golf (more goals, par system)
- [ ] Enhanced Bug Exorcist (15+ patterns, time limits)
- [ ] New: Context Chicken (real LLM calls)
- [ ] New: Rate Limit Roulette
- [ ] Session expiry + concurrent session prevention

### Sprint 3 (Week 5-6): Real Data + API Polish

**Goal:** No more mock data. API is production-ready.

- [ ] Real leaderboard (DB queries, sorted sets)
- [ ] Real live feed (recent game events)
- [ ] GET /v1/models endpoint
- [ ] GET /v1/usage endpoint
- [ ] Streaming support for chat completions (SSE)
- [ ] API rate limit headers (X-RateLimit-*)
- [ ] Usage analytics on dashboard

### Sprint 4 (Week 7-8): Player Systems + Polish

**Goal:** Progression, achievements, responsible gaming.

- [ ] XP + Rank system
- [ ] Achievement tracking
- [ ] Daily/weekly challenges
- [ ] Responsible gaming features (limits, cooldowns)
- [ ] Onboarding flow for new users
- [ ] Mobile responsive pass
- [ ] Accessibility audit (WCAG AA on dark theme)

### Sprint 5 (Week 9-10): Launch Prep

**Goal:** Production hardening.

- [ ] Structured logging (pino or winston)
- [ ] Error monitoring (Sentry)
- [ ] Automated ledger reconciliation
- [ ] Reserve monitoring + alerts
- [ ] Load testing (target: 100 concurrent games)
- [ ] Security review of all API routes
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Test coverage to 80% on server libs

---

## PART 9: TECHNICAL DIFFERENTIATION

What can we build that OpenRouter can't copy in 3 months?

1. **The game layer is the moat.** OpenRouter routes API calls. We route API calls AND make them fun. The game engine, economy, and community are defensible.

2. **Provably fair compute gaming.** No one has combined commit-reveal fairness proofs with AI model outputs. This is a new primitive.

3. **AI-native game mechanics.** Context Chicken and Benchmark Brawl can only exist because LLMs exist. These aren't adaptations of existing games — they're new genres.

4. **The economy flywheel.** Users buy credits → play games → earn bonus → use bonus on API → run out → buy more OR play more. The game layer increases LTV by 3-5x vs a pure API proxy because engagement drives recurring behavior.

5. **Developer identity.** Ranks, achievements, and leaderboard create status. "I'm Rank 8 on Tokenomicon" becomes a badge of honor in dev communities. OpenRouter has no identity layer.

---

*This is a living document. Update after each sprint retro.*
*Next review: End of Sprint 1.*
