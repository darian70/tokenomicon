# Finance & Unit Economics

## Pricing model

### One-time credit packs
| Pack | Price | Credits | Cost/1K credits | Margin |
|------|-------|---------|----------------|--------|
| Starter | $10 | 10,000 | $1.00 | ~60% |
| Builder | $49 | 55,000 | $0.89 | ~65% |
| Pro | $99 | 120,000 | $0.82 | ~65% |
| Power | $249 | 350,000 | $0.71 | ~70% |

### Monthly subscriptions
| Plan | Price | Credits/mo | Margin |
|------|-------|-----------|--------|
| Dev | $15 | 15,000 | ~65% |
| Pro | $49 | 60,000 | ~70% |

### Free tier
- 100 arena credits/day (game earnings, not API-usable)
- No credit card required

---

## Unit economics

### Cost per credit (what we pay providers)
- GPT-4o-mini: ~0.15¢ per 1K tokens = ~0.015¢ per credit
- GPT-4o: ~0.5¢ per 1K tokens = ~0.05¢ per credit  
- Claude Sonnet: ~0.3¢ per 1K tokens = ~0.03¢ per credit
- Groq Llama 70B: ~0.07¢ per 1K tokens = ~0.007¢ per credit

**Blended COGS estimate**: ~0.03¢ per credit (assuming GPT-4o-mini heavy mix)

### Gross margin at scale
- Sell credits at ~$0.089/1K (Builder pack)
- Cost: ~$0.03/1K  
- **Gross margin: ~66%**

### Semantic cache impact
If cache hit rate reaches 40% (realistic for AI apps with repetitive prompts):
- Effective COGS drops to ~$0.018/1K
- **Gross margin improves to ~80%**

---

## Revenue model

### Path to $1M ARR

| Milestone | Users | MRR | ARR | Timeline |
|-----------|-------|-----|-----|----------|
| First dollar | 1 | ~$49 | ~$600 | Week 1-2 |
| Ramen profitable | 20 | $1,000 | $12K | Month 1-2 |
| Covers infra + time | 100 | $5,000 | $60K | Month 3-4 |
| Part-time hire | 300 | $15,000 | $180K | Month 6-8 |
| Full-time hire | 700 | $35,000 | $420K | Month 10-12 |
| Owner-operator exit target | 2,000 | $100,000 | $1.2M | Month 18 |

Assumption: avg revenue/user = $49/mo (mix of one-time and subscription)

---

## Monthly burn (bootstrapped)

| Expense | Monthly |
|---------|---------|
| Vercel Hobby | $0 (→ Pro $20 at $1K MRR) |
| Supabase free tier | $0 (→ Pro $25 at $5K MRR) |
| Clerk free tier (500 users) | $0 (→ $25/mo at 500+ users) |
| AI provider costs (oracle) | ~$50-200/mo |
| Domain | ~$1/mo |
| **Total burn** | **~$50-200/mo** |

**Runway**: Essentially infinite bootstrapped. First paid invoice makes it cashflow positive.

---

## Key metrics to track

| Metric | Target | Tool |
|--------|--------|------|
| MRR | +$1K/mo growth | Stripe dashboard |
| CAC (customer acquisition cost) | <$10 | UTM tracking |
| LTV (lifetime value) | >$100 | Stripe + custom query |
| Credit churn | <5%/mo | Ledger query |
| Semantic cache hit rate | >30% | SemanticCacheEntry.cacheHits |
| Oracle pool hit rate | >80% | OracleCallLog |
| Daily active players | +10%/wk | GameAttempt query |

---

## Banking & accounting

### Recommended setup (post-incorporation)
- **Bank**: Mercury (mercury.com) — free, no minimums, API access
- **Card**: Mercury debit or Brex (net-60 terms, no personal guarantee)
- **Accounting**: Bench ($299/mo) or DIY in QuickBooks/Wave
- **Payroll** (when needed): Gusto ($40/mo base)

### Tax considerations
- Quarterly estimated taxes as sole proprietor or S-corp election
- R&D tax credit: cloud infrastructure + AI API costs likely qualify
- Consult a CPA after first $50K revenue
