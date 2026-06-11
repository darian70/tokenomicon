import { env } from '@/lib/server/env'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface ProviderCfg {
  getKey: () => string | undefined
  url: string
  model: string
  isAnthropic?: boolean
  extraHeaders?: () => Record<string, string>
}

const OR_HEADERS = () => ({ 'x-title': 'Tokenomicon', 'http-referer': 'https://tokenomicon.io' })

/** Maps every display name used in game scenarios to a real API config. */
const PROVIDER_CFG: Record<string, ProviderCfg> = {
  // ── OpenAI ────────────────────────────────────────────────────────────────
  'OpenAI GPT-4o':      { getKey: () => env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  'GPT-4o':             { getKey: () => env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  'OpenAI GPT-4o-mini': { getKey: () => env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  'GPT-4o-mini':        { getKey: () => env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  'OpenAI o3-mini':     { getKey: () => env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'o3-mini' },
  // ── Anthropic ─────────────────────────────────────────────────────────────
  'Anthropic Claude Sonnet': { getKey: () => env.ANTHROPIC_API_KEY, url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022', isAnthropic: true },
  'Claude Sonnet':           { getKey: () => env.ANTHROPIC_API_KEY, url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022', isAnthropic: true },
  'Claude 3.5 Haiku':        { getKey: () => env.ANTHROPIC_API_KEY, url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-20241022', isAnthropic: true },
  'Claude Haiku':            { getKey: () => env.ANTHROPIC_API_KEY, url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-20241022', isAnthropic: true },
  // ── Groq ──────────────────────────────────────────────────────────────────
  'Groq Llama':   { getKey: () => env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant' },
  'Groq Mixtral': { getKey: () => env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'mixtral-8x7b-32768' },
  'Groq Llama 3': { getKey: () => env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  // ── OpenRouter ────────────────────────────────────────────────────────────
  'DeepSeek V3':      { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-chat',              extraHeaders: OR_HEADERS },
  'DeepSeek R1':      { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-r1',                extraHeaders: OR_HEADERS },
  'Gemini 2.5 Flash': { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-flash-preview',     extraHeaders: OR_HEADERS },
  'Gemini 2.5 Pro':   { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-pro-preview',       extraHeaders: OR_HEADERS },
  'Gemini Pro':       { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-flash-preview',     extraHeaders: OR_HEADERS },
  'Gemini Flash':     { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-flash-preview',     extraHeaders: OR_HEADERS },
  'Mistral Small':    { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'mistralai/mistral-small',             extraHeaders: OR_HEADERS },
  'Qwen 3 235B':      { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'qwen/qwen3-235b-a22b',                extraHeaders: OR_HEADERS },
  'Qwen 3':           { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'qwen/qwen3-235b-a22b',                extraHeaders: OR_HEADERS },
  'Llama 4 Maverick': { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-maverick',         extraHeaders: OR_HEADERS },
  'Llama 4':          { getKey: () => env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-4-maverick',         extraHeaders: OR_HEADERS },
}

function buildHeaders(cfg: ProviderCfg, apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(cfg.isAnthropic
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : { authorization: `Bearer ${apiKey}` }),
    ...(cfg.extraHeaders?.() ?? {}),
  }
}

function buildBody(cfg: ProviderCfg, content: string, maxTokens: number): string {
  if (cfg.isAnthropic) {
    return JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: [{ role: 'user', content }] })
  }
  return JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: [{ role: 'user', content }] })
}

function extractText(cfg: ProviderCfg, json: Record<string, unknown>): string {
  if (cfg.isAnthropic) {
    const content = json.content as Array<{ type: string; text?: string }> | undefined
    return content?.[0]?.text ?? ''
  }
  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined
  return choices?.[0]?.message?.content ?? ''
}

/** Best available cheap/fast judge provider. */
function getJudgeCfg(): { cfg: ProviderCfg; apiKey: string } | null {
  const candidates = ['Groq Llama', 'GPT-4o-mini', 'Gemini 2.5 Flash', 'Mistral Small']
  for (const name of candidates) {
    const cfg = PROVIDER_CFG[name]
    const key = cfg?.getKey()
    if (cfg && key) return { cfg, apiKey: key }
  }
  return null
}

// ---------------------------------------------------------------------------
// Token Prophet — actual model call
// ---------------------------------------------------------------------------

/**
 * Calls a cheap/fast model to get a real output for a Token Prophet prompt,
 * returning the actual completion token count. Falls back to the heuristic
 * value if no provider is configured or the call fails.
 */
export async function enrichTokenProphetChallenge(
  challenge: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const prompt = String(challenge.prompt ?? '')
  if (!prompt) return challenge

  const apiKey = env.GROQ_API_KEY ?? env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY
  if (!apiKey) return challenge

  const isGroq = !!env.GROQ_API_KEY
  const isOpenRouter = !isGroq && !!env.OPENROUTER_API_KEY

  const url = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'

  const model = isGroq
    ? 'gemma2-9b-it'
    : isOpenRouter
      ? 'mistralai/mistral-small-3.2-24b-instruct'
      : 'gpt-4o-mini'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...(isOpenRouter ? OR_HEADERS() : {}),
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 512 }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return challenge

    const json = await res.json()
    const completionTokens = json.usage?.completion_tokens
    if (typeof completionTokens === 'number' && completionTokens > 0) {
      return { ...challenge, expectedTokens: completionTokens, liveVerified: true, verificationModel: model }
    }
  } catch {
    // Fall back to heuristic
  }

  return challenge
}

// ---------------------------------------------------------------------------
// Rate Limit Roulette — real provider race
// ---------------------------------------------------------------------------

async function raceProvider(
  displayName: string,
  prompt: string,
): Promise<{ displayName: string; latencyMs: number; ok: boolean }> {
  const cfg = PROVIDER_CFG[displayName]
  const apiKey = cfg?.getKey()
  if (!cfg || !apiKey) return { displayName, latencyMs: 9999, ok: false }

  try {
    const start = Date.now()
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: buildHeaders(cfg, apiKey),
      body: buildBody(cfg, prompt, 32),
      signal: AbortSignal.timeout(12000),
    })
    return { displayName, latencyMs: Date.now() - start, ok: res.ok }
  } catch {
    return { displayName, latencyMs: 9999, ok: false }
  }
}

/**
 * Fires real concurrent requests to all providers in the matchup and records
 * actual latencies. Fastest is determined by first successful response.
 */
export async function enrichRateLimitRouletteChallenge(
  challenge: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const providers = Array.isArray(challenge.providers) ? challenge.providers.map(String) : []
  const prompt = String(challenge.prompt ?? '')
  if (!providers.length || !prompt) return challenge

  const anyConfigured = providers.some(p => !!PROVIDER_CFG[p]?.getKey())
  if (!anyConfigured) return challenge

  try {
    const results = await Promise.all(providers.map(p => raceProvider(p, prompt)))
    const sorted = [...results].sort((a, b) => a.latencyMs - b.latencyMs)
    const fastest = sorted.find(r => r.ok)?.displayName ?? sorted[0].displayName
    const latencies = results.map(r => ({
      provider: r.displayName,
      latencyMs: r.ok ? r.latencyMs : null,
      ok: r.ok,
    }))
    return { ...challenge, fastest, latencies, liveRaced: true }
  } catch {
    return challenge
  }
}

// ---------------------------------------------------------------------------
// Benchmark Brawl — real parallel model evaluation + LLM judge
// ---------------------------------------------------------------------------

async function runModel(
  displayName: string,
  task: string,
): Promise<{ displayName: string; output: string; ok: boolean }> {
  const cfg = PROVIDER_CFG[displayName]
  const apiKey = cfg?.getKey()
  if (!cfg || !apiKey) return { displayName, output: '', ok: false }

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: buildHeaders(cfg, apiKey),
      body: buildBody(cfg, task, 400),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return { displayName, output: '', ok: false }
    const json = await res.json()
    return { displayName, output: extractText(cfg, json), ok: true }
  } catch {
    return { displayName, output: '', ok: false }
  }
}

/**
 * Runs the task against all models in parallel, then uses a judge model
 * to determine which output best satisfies the criteria.
 */
export async function enrichBenchmarkBrawlChallenge(
  challenge: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const task = String(challenge.task ?? '')
  const criteria = String(challenge.criteria ?? '')
  const models = Array.isArray(challenge.models) ? challenge.models.map(String) : []
  if (!task || !models.length) return challenge

  const judge = getJudgeCfg()
  if (!judge) return challenge

  // Run all models in parallel
  const rawResults = await Promise.all(models.map(m => runModel(m, task)))
  const outputs: Record<string, string> = {}
  for (const r of rawResults) {
    outputs[r.displayName] = r.ok && r.output ? r.output : '[Provider not configured]'
  }

  // Build judge prompt — only include models that produced output
  const available = models.filter(m => outputs[m] && outputs[m] !== '[Provider not configured]')
  let bestModel = String(challenge.bestModel ?? models[0])

  if (available.length >= 2) {
    const judgePrompt = [
      `You are a strict technical evaluator. Your job: pick the BEST model output.`,
      `TASK: ${task}`,
      `JUDGING CRITERIA: ${criteria}`,
      ``,
      ...available.map(m => `## ${m}\n${outputs[m]}`),
      ``,
      `Which model produced the best output for this task judged by "${criteria}"?`,
      `Reply with ONLY the exact model name from the list above, nothing else.`,
    ].join('\n')

    try {
      const res = await fetch(judge.cfg.url, {
        method: 'POST',
        headers: buildHeaders(judge.cfg, judge.apiKey),
        body: buildBody(judge.cfg, judgePrompt, 60),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const json = await res.json()
        const answer = extractText(judge.cfg, json).trim()
        const match = models.find(m => answer.includes(m))
        if (match) bestModel = match
      }
    } catch {
      // Keep hardcoded bestModel
    }
  }

  return { ...challenge, bestModel, outputs, liveEvaluated: true }
}

// ---------------------------------------------------------------------------
// Spot the Deepfake — Picsum real photos + DALL-E 3 generated fake
// ---------------------------------------------------------------------------

const DEEPFAKE_DALLE_PROMPTS: Record<string, string> = {
  portrait:     'a highly realistic portrait photograph of a person, studio lighting, sharp focus, high resolution, photorealistic',
  landscape:    'a highly realistic landscape photograph, golden hour sunlight, mountains and water, high resolution, photorealistic',
  animals:      'a highly realistic wildlife photograph of an animal in its natural habitat, sharp details, photorealistic',
  architecture: 'a highly realistic architectural photograph of a modern building exterior, sharp lines, blue sky, photorealistic',
  food:         'a highly realistic food photography image, professional studio lighting, restaurant quality plating, photorealistic',
}

/** Picsum seeds curated to loosely match each category. */
const PICSUM_SEEDS: Record<string, number[]> = {
  portrait:     [10, 26, 64, 91, 177, 338, 509, 823],
  landscape:    [15, 29, 58, 112, 287, 431, 666, 748],
  animals:      [24, 83, 163, 237, 395, 577, 682, 799],
  architecture: [37, 72, 145, 248, 366, 493, 701, 855],
  food:         [49, 119, 175, 292, 414, 538, 624, 910],
}

/**
 * Fills in real Picsum images for the 3 real slots and generates a DALL-E 3
 * image for the fake slot. Falls back to a 4th Picsum photo if DALL-E unavailable.
 */
export async function enrichSpotDeepfakeChallenge(
  challenge: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const category = String(challenge.category ?? 'portrait')
  const fakePosition = Number(challenge.fakePosition ?? 0)
  const seeds = PICSUM_SEEDS[category] ?? PICSUM_SEEDS.portrait

  // Pick 3 deterministic seeds from the challenge data
  const base = (fakePosition * 37 + (challenge.round as number ?? 1) * 13) % seeds.length
  const realUrls = [
    `https://picsum.photos/seed/${seeds[base % seeds.length]}/600/600`,
    `https://picsum.photos/seed/${seeds[(base + 2) % seeds.length]}/600/600`,
    `https://picsum.photos/seed/${seeds[(base + 4) % seeds.length]}/600/600`,
  ]

  // Generate DALL-E 3 fake
  let fakeUrl = `https://picsum.photos/seed/${seeds[(base + 6) % seeds.length]}/600/600`
  let liveGenerated = false

  if (env.OPENAI_API_KEY) {
    try {
      const dallePrompt = DEEPFAKE_DALLE_PROMPTS[category] ?? DEEPFAKE_DALLE_PROMPTS.portrait
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
        signal: AbortSignal.timeout(35000),
      })
      if (res.ok) {
        const json = await res.json()
        const url = (json.data as Array<{ url?: string }>)?.[0]?.url
        if (url) { fakeUrl = url; liveGenerated = true }
      }
    } catch {
      // Fall back to Picsum placeholder
    }
  }

  // Build the 4-image array, inserting fake at fakePosition
  const allUrls: string[] = []
  let realIdx = 0
  for (let i = 0; i < 4; i++) {
    allUrls.push(i === fakePosition ? fakeUrl : realUrls[realIdx++])
  }

  const images = allUrls.map((url, i) => ({
    id: `img-${i}`,
    url,
    isFake: i === fakePosition,
    position: i,
  }))

  return { ...challenge, images, liveGenerated }
}

// ---------------------------------------------------------------------------
// Prompt Golf — run the player's prompt through a real model at submit time
// ---------------------------------------------------------------------------

/**
 * Calls a real model with the player's submitted prompt and checks whether
 * the output satisfies the target keywords. Enriches the challenge with
 * liveOutput so the scorer can use actual results (not just keyword matching
 * on the prompt itself).
 *
 * Falls back gracefully if no provider is configured — the heuristic scorer
 * in games.ts handles the unenriched case.
 */
export async function enrichPromptGolfSubmission(
  challenge: Record<string, unknown>,
  submission: Record<string, unknown>,
): Promise<{ enrichedChallenge: Record<string, unknown>; enrichedSubmission: Record<string, unknown> }> {
  const prompt = String(submission.prompt ?? '')
  const required = Array.isArray(challenge.required) ? challenge.required.map(String) : []
  if (!prompt || !required.length) return { enrichedChallenge: challenge, enrichedSubmission: submission }

  const apiKey = env.GROQ_API_KEY ?? env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY
  if (!apiKey) return { enrichedChallenge: challenge, enrichedSubmission: submission }

  const isGroq = !!env.GROQ_API_KEY
  const isOpenRouter = !isGroq && !!env.OPENROUTER_API_KEY
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
  const model = isGroq ? 'llama-3.3-70b-versatile'
    : isOpenRouter ? 'mistralai/mistral-small-3.2-24b-instruct'
    : 'gpt-4o-mini'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...(isOpenRouter ? OR_HEADERS() : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 256,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { enrichedChallenge: challenge, enrichedSubmission: submission }

    const json = await res.json()
    const output: string = json.choices?.[0]?.message?.content ?? ''
    const outputLower = output.toLowerCase()
    const outputSatisfied = required.every((w) => outputLower.includes(w.toLowerCase()))

    return {
      enrichedChallenge: {
        ...challenge,
        liveOutput: output,
        liveVerified: true,
        outputSatisfied,
        verificationModel: model,
      },
      enrichedSubmission: {
        ...submission,
        _liveVerified: true,
        _outputSatisfied: outputSatisfied,
        _liveOutput: output,
      },
    }
  } catch {
    return { enrichedChallenge: challenge, enrichedSubmission: submission }
  }
}

// ---------------------------------------------------------------------------
// Bug Exorcist — AI judge validates the player's code fix at submit time
// ---------------------------------------------------------------------------

/**
 * Runs the player's proposed fix through an LLM judge that evaluates whether
 * it actually corrects the bug. Returns a judgment (0–100) and explanation.
 * Falls back to heuristic scoring if no provider is configured.
 */
export async function enrichBugExorcistSubmission(
  challenge: Record<string, unknown>,
  submission: Record<string, unknown>,
): Promise<{ enrichedChallenge: Record<string, unknown>; enrichedSubmission: Record<string, unknown> }> {
  const fix = String(submission.fix ?? '')
  const snippet = String(challenge.snippet ?? '')
  const explanation = String(challenge.explanation ?? '')
  const mustInclude = String(challenge.mustInclude ?? '')

  if (!fix || !snippet) return { enrichedChallenge: challenge, enrichedSubmission: submission }

  const judge = getJudgeCfg()
  if (!judge) return { enrichedChallenge: challenge, enrichedSubmission: submission }

  const judgePrompt = [
    `You are a precise code review judge. Evaluate whether the proposed fix correctly addresses the bug.`,
    ``,
    `BUGGY CODE SNIPPET:`,
    `\`\`\``,
    snippet,
    `\`\`\``,
    ``,
    `BUG EXPLANATION: ${explanation}`,
    `EXPECTED FIX INDICATOR: The fix should include "${mustInclude}"`,
    ``,
    `PLAYER'S FIX:`,
    `\`\`\``,
    fix,
    `\`\`\``,
    ``,
    `Does this fix correctly address the bug? Consider:`,
    `1. Does it fix the root cause (not just symptoms)?`,
    `2. Is it syntactically valid?`,
    `3. Would it work in a real codebase?`,
    ``,
    `Reply with ONLY a JSON object: {"correct": true/false, "score": 0-100, "reason": "one sentence"}`,
  ].join('\n')

  try {
    const res = await fetch(judge.cfg.url, {
      method: 'POST',
      headers: buildHeaders(judge.cfg, judge.apiKey),
      body: buildBody(judge.cfg, judgePrompt, 120),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return { enrichedChallenge: challenge, enrichedSubmission: submission }

    const json = await res.json()
    const raw = extractText(judge.cfg, json).trim()
    // Extract JSON from the response (may have markdown fencing)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { enrichedChallenge: challenge, enrichedSubmission: submission }

    const judgment = JSON.parse(jsonMatch[0]) as { correct: boolean; score: number; reason: string }

    return {
      enrichedChallenge: {
        ...challenge,
        aiJudgment: judgment,
        aiJudged: true,
        judgeModel: judge.cfg.model,
      },
      enrichedSubmission: {
        ...submission,
        _aiJudged: true,
        _aiJudgment: judgment,
      },
    }
  } catch {
    return { enrichedChallenge: challenge, enrichedSubmission: submission }
  }
}
