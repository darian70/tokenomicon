# Tokenomicon — Investor One-Pager

**June 2026**

---

## The Problem

AI developers pay 2-5× too much for inference. Managing multiple provider keys, accounts, and rate limits is friction that slows product development. Existing aggregators (OpenRouter, Eden AI) just route requests — they don't optimize costs or help developers understand model behavior.

## The Solution

**Tokenomicon** is an OpenAI-compatible API proxy that routes to 15+ major models through a single key, with two structural cost advantages:

1. **Negotiated rates** — 2.5× cheaper than OpenAI direct on the same models
2. **Semantic cache** — near-duplicate prompt detection (cosine similarity on embeddings) cuts costs another 30-70% for repetitive AI app workloads

**The flywheel:** Users earn compute credits by playing skill games that test real LLM knowledge. Games generate real inference data. Data becomes a public benchmark dataset (/benchmarks) that attracts benchmarking-oriented developers. More users → more data → better benchmarks → more users.

## Market

- **Primary**: AI app developers, startups building on LLMs
- **TAM**: ~$40B AI inference market, growing 60% YoY
- **Wedge**: Developer tools. $49-$249 one-time packs, $15-$49/mo subscriptions
- **Comparable**: OpenRouter ($5M+ ARR, acqui-hired by OpenAI). We have a defensible moat they don't: the game + cache + benchmark flywheel.

## Traction (at launch)

- Product live at tokenomicon.io
- 9 skill games shipped, all using real live inference (not mocked)
- Oracle system: real-time inference verification with provably fair seed commitment
- Semantic cache: production-ready, integrated into API proxy
- Public benchmark dataset: live, auto-updating, SEO-indexed

## Business Model

| Product | Price | Margin |
|---------|-------|--------|
| Starter pack | $10 one-time | ~60% |
| Builder pack | $49 one-time | ~65% |
| Pro pack | $99 one-time | ~65% |
| Dev monthly | $15/mo | ~65% |
| Pro monthly | $49/mo | ~70% |

Target: 2,000 paying users → $1.2M ARR by month 18. Owner-operator economics: 80%+ gross margin at scale, minimal headcount required.

## Why now

- AI inference costs are the #1 complaint among AI startup CTOs
- No competitor has combined routing + semantic cache + benchmarks + gamification
- Developer fatigue with multi-provider management is peaking
- LLM quality differentiation is narrowing → routing and cost become the product

## What we're looking for

**$150K–$500K angel round** (optional — can reach cashflow without it)

Use of funds:
- Vercel Pro + infra ($300/mo)
- AI provider API credits for oracle system ($500/mo)
- Marketing / developer community presence
- Self-sustaining by month 4 at current trajectory

**Strategic partners we want:**
- Groq (speed advantage showcased in our benchmarks)
- Anthropic (startup credits program)
- OpenAI (startup program)
- YC (S26 batch application)

## Contact

[Your name] — founder@tokenomicon.io
tokenomicon.io | github.com/[your-handle]

---

*Credits have no cash value. Not financial advice.*
