# Product Roadmap

## Guiding principle
Ship revenue-generating features first. Benchmark data quality second. Developer experience third. Everything else later.

---

## Phase 1 — Launch & First Revenue (Now → Month 2)

### Milestone: 10 paying users, $490 MRR

**Must ship:**
- [x] Vercel deployment live
- [x] All 9 games functional
- [x] Stripe checkout
- [x] Semantic cache
- [x] Oracle benchmark system
- [x] /benchmarks page
- [ ] Groq + Anthropic + OpenRouter keys in production → games work end-to-end
- [ ] Stripe webhook + subscription management
- [ ] Custom domain (tokenomicon.io)

**Marketing:**
- [ ] HN Show HN post
- [ ] Product Hunt launch
- [ ] Twitter/X launch thread
- [ ] r/LocalLLaMA post

---

## Phase 2 — Growth & Retention (Month 2 → Month 6)

### Milestone: 100 paying users, $5K MRR

**Product:**
- [ ] Daily credit grant automation (100 arena credits/day, automated)
- [ ] Referral system UI (backend already built)
- [ ] Budget alert emails (Resend + BudgetAlertConfig)
- [ ] Webhook endpoint management UI
- [ ] API key dashboard (create, revoke, usage stats)
- [ ] Game history + replay viewer
- [ ] Public leaderboard (top players this week)

**Games:**
- [ ] Game 10: "Context Window Roulette" — guess which prompt fits in N tokens
- [ ] Game 11: "Model Fingerprint" — identify which model generated a response

**Infrastructure:**
- [ ] Upgrade Vercel to Pro ($20/mo) → 5-min cron for oracle pool refill
- [ ] Add Vercel Analytics (conversion funnel)
- [ ] pgvector upgrade for semantic cache (at 50K+ entries)

---

## Phase 3 — Monetization Expansion (Month 6 → Month 12)

### Milestone: 500 paying users, $25K MRR

**New revenue streams:**
- [ ] Team/org accounts ($99-299/mo) — shared credit pool, SSO
- [ ] Enterprise API (custom rate limits, SLA, dedicated support)
- [ ] Data API — sell anonymized benchmark data to AI labs and researchers ($500-5K/mo per subscriber)
- [ ] Benchmark report — monthly "State of AI Inference" report (email-gated, builds list)

**Product:**
- [ ] Auto-topup flow (AutoTopupConfig — backend done, UI needed)
- [ ] Usage analytics dashboard for API users
- [ ] Model recommendation engine ("for your workload, Groq is 3× faster and 40% cheaper")
- [ ] Slack/Discord bot integration for oracle queries

**Distribution:**
- [ ] Affiliate program (20% rev-share for 12 months)
- [ ] Developer newsletter (weekly benchmark update)
- [ ] Conference talks: AI Engineer Summit, Local First Conference

---

## Phase 4 — Scale or Exit (Month 12 → Month 18)

### Milestone: $1M ARR or strategic exit

**At $50K MRR:**
- Evaluate raising seed round vs staying owner-operator
- Hire first FT engineer (backend/infra)
- Hire developer advocate / content

**Potential acquirers:**
- Groq (inference speed showcase)
- OpenRouter (benchmark data + user base)
- Vercel (AI inference layer for their platform)
- Cloudflare (Workers AI complement)
- Any AI lab wanting developer mindshare

**Exit target:**
- $1M ARR owner-operator: exit at 3-5× ARR ($3-5M)
- $3M ARR: raise Series A, hire team, target $20M ARR

---

## Parking lot (good ideas, not now)

- Mobile app for games
- Hardware benchmark (test on actual GPUs)
- Fine-tuning marketplace (buy credits to fine-tune models)
- Voice/multimodal games
- Multiplayer real-time games (Arena PvP framework is already built)
