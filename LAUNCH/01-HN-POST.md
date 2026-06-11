# Hacker News — Show HN

**Title:**
Show HN: Tokenomicon – OpenAI-compatible API proxy where you earn compute by playing skill games

**Post body:**

I built a cheaper OpenAI-compatible API proxy that lets you earn compute credits by playing developer skill games.

**The problem I kept hitting:** I was switching between GPT-4o, Claude Sonnet, and Gemini for different tasks. Managing three API keys, three billing accounts, and three rate limits was annoying. The costs added up fast.

**What Tokenomicon does:**

- One API key, one endpoint, 15+ models (OpenAI, Anthropic, Google, Groq, DeepSeek, Mistral)
- 2.5× cheaper than going direct to providers
- Semantic cache: near-duplicate prompts return cached responses (saves 30-70% more on repetitive workloads)
- 100 free arena credits every day, no purchase required

**The games part:**

The credits you earn aren't just for fun — they pay for real API calls. Nine developer-themed skill games:

- **Rate Roulette**: Three providers race on the same prompt. Which responds fastest? (Groq LPU vs GPU matters a lot here)
- **Token Prophet**: Predict which of two prompts generates more tokens. Real model calls, real counts.
- **Benchmark Brawl**: Three flagship models tackle the same task. You judge the winner. Your picks feed the public leaderboard at /benchmarks.

**The benchmarks are real:**

Every round generates actual inference data. The speed leaderboard at /benchmarks is built from real wall-clock latency — not vendor-supplied numbers. If you've ever been frustrated that "reported latency" from providers doesn't match what you see in production, this is the dataset you actually want.

**Tech stack:** Next.js 16, Postgres, Prisma, Clerk, Stripe, deployed on Vercel. No blockchain, no tokens, no nonsense.

**Try it:** https://tokenomicon.io (or https://tokenomicon.vercel.app while DNS propagates)

Happy to answer questions about how the oracle system works (how we verify answers in real-time without letting players see them first) or the provably fair seed system.

---

**Top anticipated comments and my answers:**

Q: How is this different from OpenRouter?
A: OpenRouter routes to models but doesn't cache, doesn't run skill games, and doesn't publish real benchmark data. The semantic cache alone should save meaningful money on any repetitive AI app workload.

Q: Isn't the game thing just a gimmick?
A: The games are real. Token Prophet fires both prompts at a real model and compares actual completion token counts. Rate Roulette races three providers and measures wall-clock latency. The "fun" part is that winning requires understanding how LLMs actually work — prompt structure, provider hardware, model architecture.

Q: What's the pricing model?
A: One-time credit packs ($10–$249) or monthly subscriptions ($15–$49/mo). Credits don't expire. You can also earn them for free by playing games.

Q: Why not just use the provider APIs directly?
A: You can. This is for people who (1) want a single key that routes to any model, (2) want the semantic cache to reduce costs automatically, (3) enjoy the games as a way to build intuition about model behavior while generating real compute.
