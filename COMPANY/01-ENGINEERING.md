# Engineering Handbook

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16 (App Router) | Cache Components enabled |
| DB | PostgreSQL via Supabase | Prisma ORM |
| Auth | Clerk | Middleware-based, all `/app` routes protected |
| Payments | Stripe | Checkout + webhooks + subscriptions |
| Email | Resend | Budget alerts, transactional |
| Deployment | Vercel | Hobby plan → Pro when revenue covers it |
| CI | GitHub Actions | Lint + typecheck + build on every PR |

## Critical rules (read before touching anything)

1. **Never write credits directly to the DB.** All credit changes go through `CreditLedgerEntry`. Balance = sum of ledger entries. This is the audit trail.

2. **Always check for the `GameType` enum** when adding a new game — it's a Postgres enum, requires a migration.

3. **API routes that cost money need auth.** Every route that calls an AI provider must be protected by either Clerk session or `CRON_SECRET` header check.

4. **Oracle answers must never be returned to the player before submission.** The `GameRoundOracle` commits to a seed hash. Ground truth is sealed until the player submits.

5. **`export const dynamic = 'force-dynamic'`** on any page that reads from the DB at request time. Next.js 16 prerenders everything it can at build time.

## Branch strategy

```
main          — production (auto-deploys to Vercel)
feature/*     — feature branches, PR to main
fix/*         — bug fixes, PR to main
```

No staging environment (Vercel previews serve this role).

## PR process

1. Branch from `main`
2. Open PR — Vercel auto-creates a preview URL
3. Self-review using the PR template checklist
4. Merge when green CI + preview URL looks right
5. Production deploy is automatic on merge to main

## Database changes

Every schema change requires:
1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description_of_change`
3. Apply to prod: use Supabase MCP `apply_migration` (port 5432 blocked externally)
4. Regenerate client: `npx prisma generate`

**Project ID**: `qtqrimgnlzkijmgshgvc`

## Environment variables

| Var | Where to get |
|-----|-------------|
| `DATABASE_URL` | Supabase project settings |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com/settings/keys |
| `GROQ_API_KEY` | console.groq.com/keys |
| `OPENROUTER_API_KEY` | openrouter.ai/settings/keys |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com/webhooks |
| `CRON_SECRET` | Random 32-char hex (already set) |
| `RESEND_API_KEY` | resend.com/api-keys |

## Local development

```bash
git clone https://github.com/darian70/tokenomicon
cd tokenomicon
npm install
vercel env pull .env.local   # pulls production-linked secrets
npm run dev
```

## Architecture decisions

### Why semantic cache is O(n) not vector search
At <10K entries per model, O(n) cosine similarity is under 5ms. pgvector adds complexity. Revisit at 100K+ entries.

### Why we don't use Redis
Every in-memory store (playerQueue, match state) is now in Postgres. Serverless-safe. No Redis cost.

### Why Clerk not NextAuth
Clerk handles all edge cases (email verification, MFA, org switching) without custom code. ~$25/mo at 1K users — worth it.

### Why Vercel not Fly/Railway
Vercel's edge network + serverless auto-scale handles traffic spikes without ops. Single-person team can't babysit servers.
