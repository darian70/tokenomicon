# Deployment Status

Last updated: 2026-05-16

## Status

**Current state:** Buildable, but not production-ready yet.

The app has a deployable shape: Next.js standalone output, Dockerfile, Docker Compose with Postgres, Prisma schema, Clerk auth, Stripe billing routes, admin routes, provider routing, and game/credit APIs. The current blockers are test coverage, credit idempotency, migration/runbook clarity, and final verification of required production environment variables.

## Verification Results

| Check | Result | Notes |
|---|---|---|
| `npm test` | Pass | 2 test files, 11 tests. Covers shared compute debit policy and all seven game scorer paths. |
| `npm run build` | Pass | Next.js production build completed and generated 41 routes. |
| `npm run lint` | Fail | 17 errors remain in existing UI/app files: Next `Link` usage, synchronous effect state updates, render-time `Math.random`, plus warnings. |
| `npx prisma migrate status` | Fail | Database is reachable, but 5 migrations are pending: context chicken, fairness tiers/expiry, games 5/6, progression, subscriptions. |

## Known Deployment Paths

| Target | Status | Notes |
|---|---|---|
| Local dev | Partially ready | `npm run dev` should work once env vars and Postgres are configured. |
| Docker Compose | Partially ready | `docker-compose.yml` builds app plus Postgres. Needs env file and migration step. |
| Vercel | Plausible, not verified | Next app is compatible in shape, but Prisma migrations, env vars, and Stripe webhooks must be configured. |
| Production Docker | Plausible, not verified | Dockerfile uses standalone output. Needs runtime migration strategy and secrets management. |

## Required Environment Variables

| Variable | Required For | Status |
|---|---|---|
| `DATABASE_URL` | Prisma/Postgres | Required |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend auth | Required for auth-enabled app |
| `CLERK_SECRET_KEY` | Clerk server auth | Required |
| `TOKENOMICON_ADMIN_EMAILS` | Admin access | Required for admin dashboard |
| `STRIPE_SECRET_KEY` | Checkout and webhook handling | Required for billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Required for billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe flows | Required when checkout UI uses Stripe client SDK |
| `STRIPE_PRICE_DEV_MONTHLY` | Dev subscription checkout | Required if subscription plan is enabled |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro subscription checkout | Required if subscription plan is enabled |
| `OPENAI_API_KEY` | OpenAI provider routing | Required for OpenAI models |
| `ANTHROPIC_API_KEY` | Anthropic provider routing | Required for Anthropic models |
| `GROQ_API_KEY` | Groq provider routing | Required for Groq models |
| `OPENROUTER_API_KEY` | OpenRouter provider routing and balance checks | Optional unless OpenRouter models are enabled |

## Pre-Deploy Checklist

- [ ] Install dependencies with `npm ci`.
- [ ] Generate Prisma client with `npm run prisma:generate`.
- [ ] Apply migrations with `npx prisma migrate deploy`.
- [ ] Run unit tests with `npm test`.
- [ ] Run lint with `npm run lint`.
- [ ] Run production build with `npm run build`.
- [ ] Verify `/api/admin/health` with an admin account.
- [ ] Verify `/api/credits/balance` with a signed-in user.
- [ ] Verify a Stripe checkout in test mode.
- [ ] Replay the same Stripe webhook and confirm no duplicate credits are minted.
- [ ] Create a game session and submit it successfully.
- [ ] Make a small `/api/v1/chat/completions` request with a platform API key.

## Current Production Blockers

1. Lint fails and must be cleared before CI can be enforced.
2. Five Prisma migrations are pending against the local configured database.
3. Ledger entries do not have first-class idempotency keys.
4. Streaming API usage settlement is best-effort after stream completion.
5. Game challenge generators and database-backed session flows need integration coverage.
6. Stripe webhook replay safety depends on per-flow guards rather than a shared ledger-level guarantee.
7. No CI pipeline is present.
8. No documented migration/runbook sequence for production deploys.

## Smoke Test Commands

```bash
npm ci
npm run prisma:generate
npm test
npm run lint
npm run build
npx prisma migrate status
```

## Operational Checks

| Check | Target |
|---|---|
| Provider health | `/api/admin/health` |
| Provider balances | `/api/admin/balances` |
| Ledger reconciliation | `/api/admin/reconciliation?days=30` |
| User balance | `/api/credits/balance` |
| Models list | `/api/v1/models` |
| API usage debit | `/api/v1/chat/completions` |

## Deployment Decision

Do not put real users or real payment volume on this platform until the P0 items in `docs/superpowers/plans/2026-05-16-tokenomicon-platform-hardening.md` are complete and verified.
