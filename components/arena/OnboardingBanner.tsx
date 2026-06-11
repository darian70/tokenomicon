'use client'

import { useState } from 'react'
import { useArenaStore } from '@/lib/store'

// SVG Icons instead of emojis
const StepIcons = [
  // Gamepad
  () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.983 3.702A4 4 0 0 0 2.5 12.01V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4.99a4 4 0 0 0-.196-3.303A4 4 0 0 0 17.32 5z" />
    </svg>
  ),
  // Key
  () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3Z" />
    </svg>
  ),
  // Rocket
  () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
]

const Icons = {
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  arrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
}

const STEPS = [
  {
    title: 'Play a Game',
    desc: 'Pick any game below and choose Sandbox difficulty (free to try). Win to earn bonus compute credits.',
  },
  {
    title: 'Create an API Key',
    desc: 'Click "New Key" in the Wallet panel. Use it as a drop-in OpenAI replacement — point any client at our API.',
  },
  {
    title: 'Start Coding',
    desc: 'Your bonus compute + 100 free daily arena credits are spendable on real AI API calls immediately.',
  },
]

export default function OnboardingBanner() {
  const { keys, balances, createKey } = useArenaStore()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('onboarding_dismissed') === '1'
  })
  const [creatingKey, setCreatingKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)

  // Only show for brand-new users: no API keys and loaded
  const isNewUser = balances !== null && keys.length === 0

  if (dismissed || !isNewUser) return null

  function dismiss() {
    localStorage.setItem('onboarding_dismissed', '1')
    setDismissed(true)
  }

  async function handleCreateKey() {
    setCreatingKey(true)
    try {
      const raw = await createKey('My First Key')
      setCreatedKey(raw)
      setStep(2)
    } catch {
      /* silent */
    } finally {
      setCreatingKey(false)
    }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-4 panel border-success/20 bg-success/5 p-4 relative">
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 text-text-secondary hover:text-text hover:bg-surface rounded transition-colors"
        aria-label="Dismiss"
      >
        <Icons.close />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <p className="text-xs font-medium tracking-wide text-success uppercase">Welcome to Tokenomicon</p>
      </div>

      {/* Steps */}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {STEPS.map((s, i) => {
          const Icon = StepIcons[i]
          const isActive = step === i
          const isCompleted = step > i

          return (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                isActive
                  ? 'border-success/40 bg-success/10'
                  : isCompleted
                    ? 'border-success/20 bg-success/5'
                    : 'border-border bg-surface/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`transition-colors ${isActive ? 'text-success' : isCompleted ? 'text-success/70' : 'text-text-secondary'}`}>
                  <Icon />
                </div>
                <span className={`text-xs font-medium tracking-wide uppercase ${isActive ? 'text-success' : isCompleted ? 'text-text' : 'text-text-secondary'}`}>
                  {s.title}
                </span>
                {isCompleted && (
                  <div className="ml-auto text-success">
                    <Icons.check />
                  </div>
                )}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{s.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Key Created State */}
      {createdKey ? (
        <div className="p-4 rounded-lg border border-success/30 bg-surface/50">
          <div className="flex items-center gap-2 mb-3">
            <Icons.check />
            <span className="text-sm font-medium text-success">API Key Created — Copy Now</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs font-mono text-text break-all bg-surface px-3 py-2 rounded border border-border">
              {createdKey}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-2 text-accent hover:bg-accent/10 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Icons.check /> : <Icons.copy />}
            </button>
          </div>

          <p className="text-xs text-text-secondary font-mono mb-3">
            Base URL: <code className="text-accent">{process.env.NEXT_PUBLIC_APP_URL ?? 'https://tokenomicon.io'}/api/v1</code>
          </p>

          <div className="flex items-center gap-4">
            <a href="/docs" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              View Docs
              <Icons.arrowRight />
            </a>
            <button onClick={dismiss} className="text-xs font-medium text-text-secondary hover:text-text transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { setStep(0); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            className="px-4 py-2 border border-success/40 text-success text-xs font-medium tracking-wide rounded-md hover:bg-success/10 transition-colors"
          >
            Play First Game
          </button>
          <button
            onClick={handleCreateKey}
            disabled={creatingKey}
            className="px-4 py-2 bg-success text-void text-xs font-medium tracking-wide rounded-md hover:bg-success/80 transition-colors disabled:opacity-50"
          >
            {creatingKey ? 'Creating...' : 'Create API Key'}
          </button>
          <a
            href="/docs"
            className="px-4 py-2 border border-border text-text-secondary text-xs font-medium tracking-wide rounded-md hover:border-accent hover:text-accent transition-colors"
          >
            Read Docs
          </a>
        </div>
      )}
    </div>
  )
}
