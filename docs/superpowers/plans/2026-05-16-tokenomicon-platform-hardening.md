# Tokenomicon Platform Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Tokenomicon from a promising MVP into a testable, deployable credit-backed game and AI API platform.

**Architecture:** Keep the current Next.js App Router, Prisma, Clerk, Stripe, and provider-router shape. Centralize credit rules into pure policy modules, keep database writes in transactional services, and make every game pass through the same challenge, submit, ledger, progression, and audit path.

**Tech Stack:** Next.js 16, React 19, Prisma 6, Postgres, Clerk, Stripe, Vitest, Docker, provider APIs.

---

## Current Status

| Area | Status | Notes |
|---|---|---|
| App shell | Partially built | Landing, arena, wallet, profile, docs, admin, and playground routes exist. |
| Games | Partially built | Seven game ids exist with challenge generation and scoring, but no automated coverage yet. |
| Credits | Partially built | Append-only ledger exists with arena, bonus, and purchased buckets. Needs shared policy tests, idempotency keys, and reconciliation automation. |
| Billing | Partially built | Stripe checkout and webhook paths exist. One-time purchase fulfillment has a local guard; subscription grants need stronger event-level idempotency. |
| API proxy | Partially built | OpenAI-compatible `/api/v1/chat/completions` exists. Debit logic is present, streaming settlement is best-effort and needs durable recovery. |
| Admin ops | Partially built | Health, balances, grants, and reconciliation routes exist. Needs deployment checklist, alert thresholds, and runbooks. |
| Testing | Not ready | No test runner or test files are present. |
| Deployment | Not ready | Dockerfile and compose exist. No documented env matrix, migration procedure, CI, smoke test, or deployment status. |

## File Structure

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add test scripts for unit and future integration coverage. |
| `package-lock.json` | Modify | Lock the test runner dependency graph. |
| `vitest.config.ts` | Create | Configure isolated TypeScript unit tests with the `@/` alias. |
| `lib/server/credit-policy.ts` | Create | Hold pure credit allocation rules shared by ledger and API usage code. |
| `lib/server/ledger.ts` | Modify | Delegate compute debit allocation to `credit-policy` while preserving transactional writes. |
| `tests/server/credit-policy.test.ts` | Create | Prove compute credits debit bonus first, then purchased, and never overdraft. |
| `docs/superpowers/plans/2026-05-16-tokenomicon-platform-hardening.md` | Create | Master implementation plan and checklist. |
| `docs/DEPLOYMENT_STATUS.md` | Create | Current deployability report, required environment variables, checks, and blockers. |

## Platform Requirements

| Requirement | Implementation Path | Verification |
|---|---|---|
| All games can be started and submitted | Route every game through `/api/games/challenge` and `/api/games/submit` with shared schemas | Unit tests for every scorer plus API smoke tests |
| Credits cannot go negative | Central policy returns exact debits or throws before writes | Unit tests and transactional ledger tests |
| Bonus compute is spent before purchased compute | `allocateComputeDebit()` returns bonus debit first | Unit tests |
| Arena credits pay for game entry | `createGameSession()` debits `arena_credits` transactionally | Integration test with seeded Postgres |
| Rewards are capped daily | `calculateReward()` enforces `DAILY_BONUS_CAP` | Unit tests at cap, below cap, above cap |
| Stripe webhooks are idempotent | Persist processed event or invoice id with a unique key | Webhook replay tests |
| API usage is auditable | Each debit links to `ProviderUsage.requestId` | Integration test for successful request |
| Streaming usage is recoverable | Persist a pending usage record before streaming or settle through a durable finalizer | Integration test for stream completion and interrupted stream |
| Admin can inspect health | Admin routes report DB, provider, Stripe, and ledger health | Protected route tests and smoke test |
| Deployment can be checked | `docs/DEPLOYMENT_STATUS.md` plus CI commands | Build, lint, unit test, migration dry run |

## Game Design Checklist

| Game | Current Mechanic | Ship-Ready Work |
|---|---|---|
| Token Prophet | Guess token count for prompt | Add calibrated token estimator, explanation after result, scorer tests for exact/near/far guesses. |
| Prompt Golf | Shortest prompt containing targets | Add par by tier, reject empty submissions, scorer tests for missing targets and length penalty. |
| Bug Exorcist | Identify/fix code defect | Add structured answer schema, more bug categories, scorer tests for exact and partial fixes. |
| Context Chicken | Pick minimum viable context window | Add tier-specific options, explanation of over/under bet, scorer tests around thresholds. |
| Rate Limit Roulette | Predict fastest provider | Separate simulated mode from live-race mode, cache provider health, scorer tests for valid/invalid picks. |
| Benchmark Brawl | Pick best model for task | Add generated model outputs or curated examples, scorer tests for best/second/invalid picks. |
| Spot Deepfake | Pick AI-generated image among real images | Replace empty image URLs with real asset pipeline or generated fixtures, test image payload shape. |

## Dependency-Ordered Tasks

### TASK-001: Establish Unit Test Runner

**Type:** Infrastructure  
**Priority:** P0  
**Dependencies:** None  
**Sprint:** Sprint 1

Acceptance criteria:
- [ ] `npm test` runs Vitest once.
- [ ] `npm run test:watch` starts Vitest watch mode.
- [ ] Test files can import project modules through `@/`.

Steps:
- [ ] Add Vitest as a dev dependency.
- [ ] Create `vitest.config.ts` with the `@/` alias.
- [ ] Add `test` and `test:watch` scripts.
- [ ] Run `npm test` and confirm the runner executes.

### TASK-002: Centralize Compute Credit Debit Policy

**Type:** Implementation  
**Priority:** P0  
**Dependencies:** TASK-001  
**Sprint:** Sprint 1

Acceptance criteria:
- [ ] A pure policy allocates compute debits from `bonus_compute` first.
- [ ] The policy uses `purchased_compute` only after bonus is exhausted.
- [ ] The policy throws before any ledger write when available compute is insufficient.
- [ ] The policy rejects non-positive debit amounts.

Steps:
- [ ] Write failing tests in `tests/server/credit-policy.test.ts`.
- [ ] Run `npm test -- tests/server/credit-policy.test.ts` and verify the missing module failure.
- [ ] Implement `lib/server/credit-policy.ts`.
- [ ] Wire `debitForApiUsage()` to use the policy.
- [ ] Run the targeted test and then the full test suite.

### TASK-003: Add Game Scoring Coverage

**Type:** Testing  
**Priority:** P0  
**Dependencies:** TASK-001  
**Sprint:** Sprint 1

Acceptance criteria:
- [ ] Each game has scorer tests for perfect, partial, and invalid submissions.
- [ ] Challenge generators produce stable results for the same fairness seeds.
- [ ] Tier differences are covered where scoring depends on tier.

Implementation notes:
- Export scorer and generator helpers from a focused module such as `lib/server/games/rules.ts`.
- Keep database session orchestration in `lib/server/games.ts`.
- Use fixed seeds in tests so failures are reproducible.

### TASK-004: Add Ledger Integration Tests

**Type:** Testing  
**Priority:** P0  
**Dependencies:** TASK-002  
**Sprint:** Sprint 1

Acceptance criteria:
- [ ] A user can receive daily arena credits once per day.
- [ ] Game entry debits arena credits exactly once.
- [ ] Submitting a game rewards bonus compute exactly once.
- [ ] Expired sessions are settled and partially refunded.

Implementation notes:
- Use a dedicated test database URL.
- Reset the Prisma schema between tests.
- Seed one `UserProfile` per test case.

### TASK-005: Harden Ledger Idempotency

**Type:** Implementation  
**Priority:** P0  
**Dependencies:** TASK-004  
**Sprint:** Sprint 2

Acceptance criteria:
- [ ] `CreditLedgerEntry` supports an optional unique `idempotencyKey`.
- [ ] Stripe purchase entries use `stripe:checkout:<sessionId>`.
- [ ] Subscription grants use `stripe:invoice:<invoiceId>`.
- [ ] API usage debits use `api:<requestId>`.
- [ ] Replayed writes return the existing ledger entry or no-op without duplicate credits.

Implementation notes:
- Add a Prisma migration for `idempotencyKey`.
- Update `addLedgerEntry()` to accept the key.
- Use unique constraints instead of find-then-create races.

### TASK-006: Make API Usage Settlement Durable

**Type:** Implementation  
**Priority:** P0  
**Dependencies:** TASK-005  
**Sprint:** Sprint 2

Acceptance criteria:
- [ ] Non-streaming usage creates one provider usage row and one or two ledger debit rows.
- [ ] Streaming usage records settlement even if the final callback fails.
- [ ] Failed provider calls do not debit credits.
- [ ] Request ids are traceable in ledger metadata and provider usage.

Implementation notes:
- Introduce a usage settlement service around `ProviderUsage` and `debitForApiUsage()`.
- Consider a `pending` metadata state before stream begins and a finalizer after stream close.

### TASK-007: Stripe Billing Completion

**Type:** Implementation  
**Priority:** P0  
**Dependencies:** TASK-005  
**Sprint:** Sprint 2

Acceptance criteria:
- [ ] Checkout creation validates plan ids and configured price ids.
- [ ] One-time checkout fulfillment is replay-safe.
- [ ] Subscription creation and recurring invoice grants are replay-safe.
- [ ] Webhook tests cover missing signature, unknown session, replay, and successful grant.

### TASK-008: Deployment Readiness

**Type:** Deployment  
**Priority:** P0  
**Dependencies:** TASK-001  
**Sprint:** Sprint 1

Acceptance criteria:
- [ ] `docs/DEPLOYMENT_STATUS.md` lists all required env vars.
- [ ] Local smoke checklist covers `npm test`, `npm run lint`, `npm run build`, `npx prisma migrate status`, and a health endpoint.
- [ ] Production blockers are explicit.
- [ ] Docker and Vercel deployment paths are documented.

### TASK-009: CI Pipeline

**Type:** Infrastructure  
**Priority:** P1  
**Dependencies:** TASK-001, TASK-008  
**Sprint:** Sprint 2

Acceptance criteria:
- [ ] CI runs install, Prisma generate, unit tests, lint, typecheck, and build.
- [ ] CI has a Postgres service for integration tests.
- [ ] CI blocks deploys on failed tests.

### TASK-010: Operations Dashboard Completion

**Type:** Implementation  
**Priority:** P1  
**Dependencies:** TASK-006  
**Sprint:** Sprint 3

Acceptance criteria:
- [ ] Admin dashboard shows credit supply by bucket.
- [ ] Admin dashboard shows provider margin and low-balance warnings.
- [ ] Reconciliation report can detect ledger/provider usage mismatch.
- [ ] Admin grants require reason, bucket, amount, and admin identity.

## Sprint Schedule

| Sprint | Goal | Tasks |
|---|---|---|
| Sprint 1 | Make the platform testable and document deployment reality | TASK-001, TASK-002, TASK-003, TASK-004, TASK-008 |
| Sprint 2 | Harden money/credit correctness | TASK-005, TASK-006, TASK-007, TASK-009 |
| Sprint 3 | Complete operations and admin readiness | TASK-010 plus load testing and dashboards |

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Duplicate Stripe events mint extra credits | Critical | Ledger idempotency keys and webhook replay tests |
| Streaming responses fail after user receives tokens but before debit | Critical | Durable usage settlement and reconciliation job |
| Game rewards are exploitable | High | Server-side scoring, seeded challenge generation, daily caps, per-user rate limits |
| Provider costs exceed credit revenue | High | Reconciliation report, model markup review, provider low-balance alarms |
| No deployment gate | High | CI, smoke tests, migration status checks |
| Responsible gaming/legal messaging is incomplete | Medium | Keep credits non-cash, no cash-out language, session limits, terms review |

## Definition Of Done

- [ ] Unit tests cover credit policy, economy rewards, and game scoring.
- [ ] Integration tests cover ledger writes, Stripe replay, and API usage settlement.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] Deployment status is current and includes blockers.
- [ ] Production env vars are documented.
- [ ] Migrations are applied and reversible through normal Prisma flow.
- [ ] Admin health and reconciliation routes are verified.
