'use client'

import { useState, useEffect } from 'react'

interface Achievement {
  code: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt: string | null
}

interface DailyUsage {
  date: string
  totalTokens: number
  totalCost: number
  requests: number
}

interface ModelUsage {
  model: string
  provider: string
  totalTokens: number
  totalCost: number
  requests: number
}

interface UsageData {
  totalRequests: number
  totalTokens: number
  totalCost: number
  daily: DailyUsage[]
  byModel: ModelUsage[]
}

const RANK_NAMES = ['', 'Initiate', 'Apprentice', 'Journeyman', 'Hacker', 'Architect', 'Operator', 'Specialist', 'Virtuoso', 'Legend', 'Champion']

export default function ProfilePage() {
  const [tab, setTab] = useState<'achievements' | 'usage' | 'api_keys' | 'referral'>('achievements')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [totalUnlocked, setTotalUnlocked] = useState(0)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [profile, setProfile] = useState<{ xp: number; rank: number; totalGamesPlayed: number; totalGamesWon: number; currentStreak: number; bestStreak: number } | null>(null)
  const [loading, setLoading] = useState(true)

  // API keys state
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null }>>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)

  // Referral state
  const [referral, setReferral] = useState<{
    code: string | null; totalRedemptions: number; pendingBonus: number; paidBonus: number
  } | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/achievements').then((r) => r.json()),
      fetch('/api/credits/balance').then((r) => r.json()),
    ]).then(([ach, bal]) => {
      if (ach.achievements) {
        setAchievements(ach.achievements)
        setTotalUnlocked(ach.totalUnlocked)
      }
      if (bal.progression) setProfile(bal.progression)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'usage' && !usage) {
      fetch('/api/v1/usage').then((r) => r.json()).then((data) => {
        if (!data.error) setUsage(data)
      }).catch(() => {})
    }
    if (tab === 'referral' && !referral) {
      fetch('/api/referral').then((r) => r.json()).then((d) => setReferral(d)).catch(() => {})
    }
    if (tab === 'api_keys' && apiKeys.length === 0 && !keysLoading) {
      loadKeys()
    }
  }, [tab, usage]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadKeys() {
    setKeysLoading(true)
    try {
      const data = await fetch('/api/keys').then((r) => r.json())
      if (data.keys) setApiKeys(data.keys)
    } catch { /* ignore */ } finally {
      setKeysLoading(false)
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim() || creatingKey) return
    setCreatingKey(true)
    setKeyError(null)
    try {
      const res = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create key')
      setRevealedKey(data.rawKey)
      setNewKeyName('')
      await loadKeys()
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleRevokeKey(id: string) {
    setRevokingId(id)
    setKeyError(null)
    try {
      const res = await fetch('/api/keys/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keyId: id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to revoke key')
      }
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Failed to revoke key')
    } finally {
      setRevokingId(null)
    }
  }

  const maxDailyCost = usage ? Math.max(...usage.daily.map((d) => d.totalCost), 1) : 1

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#192433] bg-[#070a10]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="font-display text-lg font-bold text-white tracking-widest">PROFILE</h1>
          <p className="text-xs text-[#4a5a6d] font-mono">Rank, achievements, and API usage stats</p>
        </div>
      </div>

    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Rank Card */}
      {!profile && !loading && (
        <div className="rounded-2xl border border-[#192433] bg-[#0c111a] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#59f5a9]/8 border border-[#59f5a9]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="1.5">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
          <p className="font-display text-sm font-bold text-[#59f5a9] tracking-widest">NO RANK YET</p>
          <p className="text-xs font-mono text-[#4a5a6d] mt-2">Play your first game to earn XP and climb the ranks.</p>
        </div>
      )}

      {profile && (
        <div className="rounded-2xl border border-[#192433] bg-[#0c111a] overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#192433]">
            <div className="w-10 h-10 rounded-xl bg-[#59f5a9]/10 border border-[#59f5a9]/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="1.5">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d]">PLAYER RANK</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-black text-[#59f5a9]">{profile.rank}</span>
                <span className="font-display text-sm text-[#59f5a9]/60">{RANK_NAMES[profile.rank]}</span>
                <span className="text-xs font-mono text-[#4a5a6d]">· {profile.xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#192433]">
            <ProfileStat label="GAMES PLAYED" value={profile.totalGamesPlayed} />
            <ProfileStat label="GAMES WON" value={profile.totalGamesWon} color="#59f5a9" />
            <ProfileStat label="BEST STREAK" value={`${profile.bestStreak} day${profile.bestStreak !== 1 ? 's' : ''}`} color="#ffd700" />
            <ProfileStat
              label="WIN RATE"
              value={profile.totalGamesPlayed > 0 ? `${Math.round((profile.totalGamesWon / profile.totalGamesPlayed) * 100)}%` : '—'}
              color="#5ad8ff"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#192433]">
        {(['achievements', 'usage', 'api_keys', 'referral'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-display tracking-widest border-b-2 transition-colors ${
              tab === t
                ? 'border-[#59f5a9] text-[#59f5a9]'
                : 'border-transparent text-[#4a5a6d] hover:text-[#a8b8cc]'
            }`}
          >
            {t === 'api_keys' ? 'API KEYS' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#59f5a9]/20 border-t-[#59f5a9] rounded-full animate-spin" />
        </div>
      )}

      {/* Achievements Tab */}
      {!loading && tab === 'achievements' && (
        <div>
          <p className="text-[11px] font-mono text-[#4a5a6d] mb-4">
            {totalUnlocked} / {achievements.length} unlocked
          </p>
          {achievements.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm font-mono text-[#4a5a6d]">No achievements found.</p>
              <p className="text-[10px] text-[#2a3a4a] mt-1">Play games and complete challenges to unlock them.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.code}
                className={`rounded-xl border p-4 transition-all ${
                  a.unlocked
                    ? 'border-[#ffd700]/30 bg-[#ffd700]/5'
                    : 'border-[#192433] bg-[#0c111a] opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {a.unlocked ? (
                    <span className="text-2xl">{a.icon}</span>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#0a1520] border border-[#192433] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a3a4a" strokeWidth="2">
                        <rect width="11" height="11" x="6.5" y="11" rx="2"/>
                        <path d="M12 11V7a4 4 0 0 0-4 4"/>
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className={`text-sm font-display tracking-wide ${a.unlocked ? 'text-[#ffd700]' : 'text-[#4a5a6d]'}`}>
                      {a.name}
                    </p>
                    {a.unlockedAt && (
                      <p className="text-[9px] font-mono text-[#3a4a5a]">
                        {new Date(a.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] font-mono text-[#4a5a6d] leading-relaxed">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'api_keys' && (
        <div className="space-y-6">

          {/* One-time key reveal modal */}
          {revealedKey && (
            <div className="rounded-xl border border-[#59f5a9]/40 bg-[#59f5a9]/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[#59f5a9] text-lg">✓</span>
                <p className="text-sm font-display font-bold text-[#59f5a9] tracking-widest">KEY CREATED</p>
              </div>
              <p className="text-xs font-mono text-[#4a5a6d]">
                Copy this key now. <strong className="text-[#f87171]">It will never be shown again.</strong>
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-[#59f5a9]/30 bg-black/40 px-4 py-3">
                <code className="flex-1 text-xs font-mono text-[#59f5a9] break-all select-all">{revealedKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(revealedKey) }}
                  className="flex-shrink-0 text-[10px] font-display tracking-widest text-[#4a5a6d] hover:text-[#59f5a9] transition-colors border border-[#1a2535] hover:border-[#59f5a9]/40 px-3 py-1.5 rounded"
                >
                  COPY
                </button>
              </div>
              <div className="pt-1">
                <p className="text-[10px] font-mono text-[#4a5a6d]">
                  Base URL: <code className="text-[#5ad8ff]">https://tokenomicon.io/api/v1</code>
                </p>
                <p className="text-[10px] font-mono text-[#4a5a6d] mt-0.5">
                  Header: <code className="text-[#5ad8ff]">Authorization: Bearer {revealedKey}</code>
                </p>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="text-[10px] font-mono text-[#3a4a5a] hover:text-[#6b7a8d] transition-colors"
              >
                I&apos;ve saved it — dismiss
              </button>
            </div>
          )}

          {/* Create new key */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5">
            <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-3">CREATE API KEY</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                placeholder="e.g. Production, Hobby project..."
                maxLength={40}
                className="flex-1 bg-black/30 border border-[#1a2535] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-[#2a3a4a] focus:outline-none focus:border-[#59f5a9]/40 transition-colors"
              />
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || creatingKey}
                className="px-5 py-2 rounded-lg font-display text-xs tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#59f5a9', color: '#000' }}
              >
                {creatingKey ? '...' : 'CREATE'}
              </button>
            </div>
            {keyError && <p className="text-xs text-[#f87171] font-mono mt-2">{keyError}</p>}
          </div>

          {/* Existing keys */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#192433] flex items-center justify-between">
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d]">ACTIVE KEYS</p>
              <p className="text-[10px] font-mono text-[#2a3a4a]">{apiKeys.length} / 10 used</p>
            </div>

            {keysLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#59f5a9]/20 border-t-[#59f5a9] rounded-full animate-spin" />
              </div>
            )}

            {!keysLoading && apiKeys.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-mono text-[#4a5a6d]">No API keys yet.</p>
                <p className="text-xs font-mono text-[#2a3a4a] mt-1">Create one above to start using the API.</p>
              </div>
            )}

            {!keysLoading && apiKeys.map((key, i) => (
              <div
                key={key.id}
                className={`flex items-center gap-4 px-5 py-4 ${i !== apiKeys.length - 1 ? 'border-b border-[#0f1520]' : ''}`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#59f5a9]/8 border border-[#59f5a9]/15 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#59f5a9" strokeWidth="1.75">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-bold text-white truncate">{key.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-[10px] font-mono text-[#5ad8ff]">{key.keyPrefix}••••••••</code>
                    <span className="text-[10px] font-mono text-[#2a3a4a]">
                      created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt && (
                      <span className="text-[10px] font-mono text-[#2a3a4a]">
                        · used {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                    {!key.lastUsedAt && (
                      <span className="text-[10px] font-mono text-[#1a2535]">· never used</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  disabled={revokingId === key.id}
                  className="flex-shrink-0 text-[10px] font-display tracking-widest text-[#3a4a5a] hover:text-[#f87171] transition-colors border border-[#1a2535] hover:border-[#f87171]/30 px-3 py-1.5 rounded disabled:opacity-40"
                >
                  {revokingId === key.id ? '...' : 'REVOKE'}
                </button>
              </div>
            ))}
          </div>

          {/* Usage instructions */}
          <div className="rounded-xl border border-[#1a2535] bg-[#070a10] p-5 space-y-3">
            <p className="text-[10px] font-display tracking-widest text-[#4a5a6d]">HOW TO USE</p>
            <div className="space-y-2 text-xs font-mono">
              <p className="text-[#4a5a6d]">Base URL</p>
              <code className="block bg-black/40 border border-[#1a2535] rounded px-3 py-2 text-[#5ad8ff] text-[11px]">
                https://tokenomicon.io/api/v1
              </code>
              <p className="text-[#4a5a6d] pt-1">OpenAI-compatible — works with any client:</p>
              <pre className="bg-black/40 border border-[#1a2535] rounded px-3 py-3 text-[#a8b8cc] text-[10px] leading-relaxed overflow-x-auto whitespace-pre">{`from openai import OpenAI

client = OpenAI(
    base_url="https://tokenomicon.io/api/v1",
    api_key="tkm_live_your_key_here",
)

response = client.chat.completions.create(
    model="claude-3-5-haiku-20241022",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`}</pre>
            </div>
            <p className="text-[10px] font-mono text-[#2a3a4a]">
              Credits are debited per request. Bonus compute credits from games are used first.
            </p>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {!loading && tab === 'usage' && (
        <div className="space-y-5">
          {usage ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <UsageStat label="REQUESTS" value={usage.totalRequests.toLocaleString()} color="#5ad8ff" />
                <UsageStat label="TOKENS" value={`${(usage.totalTokens / 1000).toFixed(1)}K`} color="#a8b8cc" />
                <UsageStat label="CREDITS SPENT" value={usage.totalCost.toLocaleString()} color="#ffd700" />
              </div>

              {usage.daily.length > 0 && (
                <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5">
                  <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4">DAILY SPEND — LAST 30 DAYS</p>
                  <div className="flex items-end gap-0.5 h-20">
                    {usage.daily.map((d) => {
                      const h = Math.max(3, Math.round((d.totalCost / maxDailyCost) * 76))
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center justify-end">
                          <div
                            className="w-full rounded-sm bg-[#59f5a9]/50 hover:bg-[#59f5a9]/80 transition-colors"
                            style={{ height: `${h}px` }}
                            title={`${d.date}: ${d.totalCost} cr · ${d.requests} req`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] font-mono text-[#2a3a4a]">{usage.daily[0]?.date}</span>
                    <span className="text-[9px] font-mono text-[#2a3a4a]">{usage.daily[usage.daily.length - 1]?.date}</span>
                  </div>
                </div>
              )}

              {usage.byModel.length > 0 && (
                <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#192433]">
                    <p className="text-[10px] font-display tracking-widest text-[#4a5a6d]">TOP MODELS</p>
                  </div>
                  <div className="divide-y divide-[#0f1520]">
                    {usage.byModel.slice(0, 8).map((m) => (
                      <div key={m.model} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-xs font-mono font-bold text-[#a8b8cc]">{m.model}</p>
                          <p className="text-[10px] font-mono text-[#4a5a6d]">
                            {m.provider} · {m.requests} req · {(m.totalTokens / 1000).toFixed(1)}K tokens
                          </p>
                        </div>
                        <span className="text-sm font-mono font-bold text-[#ffd700]">{m.totalCost} cr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usage.totalRequests === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm font-mono text-[#4a5a6d]">No API usage yet. Make your first call with your Tokenomicon key.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#59f5a9]/20 border-t-[#59f5a9] rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
      {/* ── Referral tab ── */}
      {tab === 'referral' && (
        <div className="p-6 space-y-6">
          {/* Your code */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 space-y-4">
            <p className="text-xs font-display tracking-widest text-[#a8b8cc]">YOUR REFERRAL CODE</p>
            {referral ? (
              <>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-2xl font-mono font-bold text-[#59f5a9] tracking-widest">
                    {referral.code ?? '—'}
                  </code>
                  {referral.code && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referral.code!)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="px-3 py-1.5 border border-[#192433] rounded-lg text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <p className="text-xs font-mono text-[#4a5a6d]">
                  Share this code. New users who redeem it get <span className="text-[#59f5a9]">250 arena credits</span> free.
                  You get <span className="text-[#5ad8ff]">500 compute credits</span> when they complete their first purchase.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'REDEMPTIONS', value: referral.totalRedemptions, color: '#a8b8cc' },
                    { label: 'BONUS EARNED', value: `${referral.paidBonus} cr`, color: '#59f5a9' },
                    { label: 'PENDING', value: `${referral.pendingBonus} cr`, color: '#ffd700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg border border-[#192433] bg-[#070a10] p-3 text-center">
                      <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
                      <p className="text-[9px] font-display tracking-widest text-[#3a4a5a] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-16 bg-[#070a10] rounded-lg animate-pulse" />
            )}
          </div>

          {/* Redeem a code */}
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 space-y-3">
            <p className="text-xs font-display tracking-widest text-[#a8b8cc]">REDEEM A CODE</p>
            <p className="text-xs font-mono text-[#4a5a6d]">
              Enter a friend&apos;s code to claim <span className="text-[#59f5a9]">250 free arena credits</span>. One-time only.
            </p>
            <div className="flex gap-2">
              <input
                value={redeemCode}
                onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null) }}
                placeholder="FRIEND-XXXX"
                className="flex-1 bg-[#070a10] border border-[#192433] rounded-lg px-3 py-2 text-sm font-mono text-white uppercase tracking-widest focus:outline-none focus:border-[#59f5a9]/40 placeholder:text-[#3a4a5a] placeholder:normal-case placeholder:tracking-normal"
              />
              <button
                onClick={async () => {
                  setRedeemLoading(true); setRedeemMsg(null)
                  try {
                    const r = await fetch('/api/referral', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ code: redeemCode }),
                    })
                    const d = await r.json()
                    if (r.ok) {
                      setRedeemMsg({ ok: true, text: `+${d.bonus} arena credits added to your account!` })
                      setRedeemCode('')
                      fetch('/api/referral').then((res) => res.json()).then(setReferral).catch(() => {})
                    } else {
                      setRedeemMsg({ ok: false, text: d.error ?? 'Failed' })
                    }
                  } finally {
                    setRedeemLoading(false)
                  }
                }}
                disabled={redeemLoading || !redeemCode.trim()}
                className="px-4 py-2 bg-[#59f5a9]/10 border border-[#59f5a9]/30 rounded-lg text-xs font-mono font-bold text-[#59f5a9] hover:bg-[#59f5a9]/20 disabled:opacity-40 transition-colors"
              >
                {redeemLoading ? '…' : 'Redeem'}
              </button>
            </div>
            {redeemMsg && (
              <p className="text-xs font-mono" style={{ color: redeemMsg.ok ? '#59f5a9' : '#f55a5a' }}>
                {redeemMsg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

function ProfileStat({ label, value, color = '#a8b8cc' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="px-5 py-4 text-center">
      <p className="font-mono text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px] font-display tracking-widest text-[#3a4a5a] mt-0.5">{label}</p>
    </div>
  )
}

function UsageStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#192433] bg-[#0c111a] p-5 text-center">
      <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mt-1">{label}</p>
    </div>
  )
}
