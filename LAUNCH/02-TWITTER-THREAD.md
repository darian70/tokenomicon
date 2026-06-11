# Twitter / X Launch Thread

**Tweet 1 (hook):**
I built an AI API proxy that gives you compute credits for playing skill games.

Not gimmicky. The games test real model knowledge. Wins pay for real API calls.

🧵

**Tweet 2:**
The problem: I was juggling GPT-4o, Claude Sonnet, Gemini, Groq, DeepSeek.

Three API keys. Three billing dashboards. Three rate limits.

One endpoint fixes all of it → tokenomicon.io

Change two lines of code:
```python
client = OpenAI(
    api_key="tok-your-key",
    base_url="https://tokenomicon.io/api/v1"
)
```

**Tweet 3:**
The semantic cache alone is worth it.

If your AI app sends similar prompts repeatedly (support bots, RAG pipelines, classification), we detect near-duplicates using cosine similarity on embeddings.

Result: 30-70% cost reduction on repetitive workloads. Automatic. No code changes.

**Tweet 4:**
Now the games.

9 developer skill games that reward knowing how LLMs actually work:

• Rate Roulette — which of 3 providers responds fastest to the same prompt?
• Token Prophet — which of 2 prompts generates more tokens?
• Benchmark Brawl — 3 flagship models, same task, you judge the winner

These aren't trivia. They require real model intuition.

**Tweet 5:**
Rate Roulette insight that surprised me:

Groq with Llama 70B responds in ~280ms median
GPT-4o median: ~1.3 seconds

That's a 5× latency difference on the same prompt.

We publish the actual data at tokenomicon.io/benchmarks — live, from real API calls, updated constantly.

**Tweet 6:**
The economics:

100 free arena credits land in your account every day. No purchase required.

Win a round of Rate Roulette (sandbox tier): up to 200 credits.

Builder pack: $49 → 55,000 credits. 18M GPT-4o-mini tokens or ~300 Claude Haiku calls.

That's ~0.89¢/1K tokens vs $1.5-3/1K going direct.

**Tweet 7:**
The benchmark angle is actually the moat.

Every round generates real inference data. Speed, quality, cost — from real users, real API calls.

No vendor numbers. No synthetic benchmarks.

Someone needs to publish this data. Might as well be us.
→ tokenomicon.io/benchmarks

**Tweet 8:**
Tech stack if you care:
• Next.js 16 (just shipped)
• Postgres + Prisma
• Clerk for auth
• Stripe for billing
• Vercel deployment
• Provably fair: server commits to seed hash before game starts, reveals after

No blockchain. No crypto. Just math.

**Tweet 9 (CTA):**
Try it: tokenomicon.io

100 free credits. No credit card. Sign up → play a round of Rate Roulette → see which provider on your actual workload is fastest.

Happy to answer anything about how the oracle system works (verifying answers in real-time without leaking them to players first is a fun engineering problem).

---

# Standalone tweets (post 2-3 days after launch):

**Benchmark tweet:**
Real latency data, updated from actual API calls:

Groq (Llama 70B): 287ms median, 441ms p90
GPT-4o-mini: 623ms median, 891ms p90
GPT-4o: 1,342ms median, 2,100ms p90
Gemini 2.5 Pro: 1,890ms median, 3,200ms p90

This is from our live oracle, not vendor claims.
→ tokenomicon.io/benchmarks

**Educational tweet:**
Why Token Prophet is a real skill game, not luck:

"Summarize this paper" → ~400 tokens
"List 10 key takeaways from this paper" → ~600 tokens (list structure + numbering)
"What is the main argument?" → ~150 tokens

Prompt structure drives token count. Players who know this win more.

**Partnership tweet:**
For anyone building AI apps:

We're looking for beta partners. If you have a repetitive AI workload and want to test the semantic cache, DM me.

Deal: You run your prompts through our endpoint for 30 days, we show you exactly how much you saved vs going direct.
