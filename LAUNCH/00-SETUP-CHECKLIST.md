# Launch Checklist — Tokenomicon

Site is LIVE at https://tokenomicon.vercel.app

## 1. IMMEDIATE (blocking revenue)

### Run DB migration
```bash
cd tokenomicon
npx prisma migrate deploy
```
This creates: OracleCacheEntry, OraclePoolEntry, OracleCallLog, SemanticCacheEntry

### Add missing Vercel env vars
```bash
# AI providers (games won't work without these)
vercel env add OPENAI_API_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add GROQ_API_KEY production
vercel env add OPENROUTER_API_KEY production   # DeepSeek, Gemini, Llama via OpenRouter

# Stripe (payments won't work without these)
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRICE_DEV_MONTHLY production    # from Stripe dashboard
vercel env add STRIPE_PRICE_PRO_MONTHLY production    # from Stripe dashboard

# Admin
vercel env add TOKENOMICON_ADMIN_EMAILS production    # your email
vercel env add CRON_SECRET production                 # any random 32-char string

# Email (optional but good for budget alerts)
vercel env add RESEND_API_KEY production
```

### Set Stripe webhook
In Stripe dashboard → Webhooks → Add endpoint:
- URL: https://tokenomicon.vercel.app/api/billing/webhook
- Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded

### Redeploy after adding env vars
```bash
vercel --prod --yes
```

### Point custom domain
```bash
vercel domains add tokenomicon.io
# Then add CNAME/A records at your DNS provider
```

## 2. FIRST WEEK (growth)

- [ ] Post on Hacker News (see LAUNCH/01-HN-POST.md)
- [ ] Post Twitter launch thread (see LAUNCH/02-TWITTER-THREAD.md)
- [ ] Submit to Product Hunt (see LAUNCH/03-PRODUCT-HUNT.md)
- [ ] Post in r/LocalLLaMA, r/MachineLearning, r/ChatGPT
- [ ] Add to awesome-llm-apps, awesome-openai lists on GitHub
- [ ] DM 20 AI devs on Twitter who complain about API costs
- [ ] Email the 10 investors (see LAUNCH/05-INVESTOR-EMAILS.md)

## 3. FIRST MONTH (revenue)

- [ ] Upgrade Vercel to Pro ($20/mo) → unlocks 5-min oracle cron (much better game freshness)
- [ ] Set up Vercel Analytics (free tier) for conversion tracking
- [ ] A/B test: watch which landing variant converts better
  - Add `?variant=b` to tweets, `?variant=a` to builder communities
  - Goal: 10 paid users in first 30 days
- [ ] Reach out to Groq for partnership (they benefit from being showcased as "fastest")
- [ ] Apply to Anthropic startup credits program
- [ ] Apply to OpenAI startup program

## Revenue milestone targets

| Target | When |
|--------|------|
| 10 paying users ($490/mo ARR) | Week 2 |
| 100 paying users ($4,900/mo ARR) | Month 2 |
| 500 paying users ($24,500/mo ARR) | Month 6 |
| 2,000 paying users ($98,000/mo ARR = $1.2M ARR) | Month 18 |

Most likely conversion path: HN post → sign up for free credits → play game → see value → buy Builder pack ($49)
