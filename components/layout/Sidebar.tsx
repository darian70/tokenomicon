'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useArenaStore } from '@/lib/store'
import AnimatedNumber from '@/components/fx/AnimatedNumber'
import StreakFire from '@/components/fx/StreakFire'
import { useSound } from '@/lib/use-sound'

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

const Icons = {
  home: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  games: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="18" y2="12"/><line x1="12" y1="6" x2="12" y2="18"/>
      <rect x="2" y="6" width="20" height="12" rx="2"/>
    </svg>
  ),
  leaderboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  wallet: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  playground: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  docs: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  usage: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  history: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
    </svg>
  ),
  verify: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  webhook: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16.016c0 1.1-.9 2-2 2H8l-4 4V8c0-1.1.9-2 2-2h4"/><circle cx="18" cy="8" r="3"/><path d="M21 8h-3"/>
    </svg>
  ),
  admin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  credits: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  chevron: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  live: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="12"/>
    </svg>
  ),
}

type NavItem = { href: string; label: string; icon: () => React.ReactElement; badge?: string }

const NAV_SECTIONS: Array<{ section: string | null; items: NavItem[] }> = [
  {
    section: null,
    items: [
      { href: '/arena', label: 'Home', icon: Icons.home },
    ],
  },
  {
    section: 'Play',
    items: [
      { href: '/games', label: 'Games', icon: Icons.games },
      { href: '/leaderboard', label: 'Leaderboard', icon: Icons.leaderboard },
      { href: '/history', label: 'History', icon: Icons.history },
      { href: '/verify', label: 'Verify', icon: Icons.verify },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/wallet', label: 'Wallet', icon: Icons.wallet },
      { href: '/profile', label: 'Profile', icon: Icons.profile },
    ],
  },
  {
    section: 'Developer',
    items: [
      { href: '/playground', label: 'Playground', icon: Icons.playground },
      { href: '/usage', label: 'Usage', icon: Icons.usage },
      { href: '/webhooks', label: 'Webhooks', icon: Icons.webhook },
      { href: '/docs', label: 'Docs', icon: Icons.docs },
    ],
  },
]

function NavItem({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-[#1a2535] text-white border border-[#2a3a50]'
          : 'text-[#6b7a8d] hover:bg-[#0f1822] hover:text-[#a8b8cc]'
        }
      `}
    >
      <span className={`flex-shrink-0 ${active ? 'text-[#5ad8ff]' : 'text-[#4a5a6d] group-hover:text-[#6b7a8d]'}`}>
        <Icon />
      </span>
      <span className="truncate">{label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5ad8ff] flex-shrink-0" />
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { balances, progression, isAdmin, loadDashboard, dashboardLoading } = useArenaStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { muted, toggleMuted, play } = useSound()
  const [dailyClaimed, setDailyClaimed] = useState<boolean | null>(null)
  const [dailyClaiming, setDailyClaiming] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    fetch('/api/credits/daily-grant')
      .then((r) => r.json())
      .then((d) => setDailyClaimed(d.claimed ?? false))
      .catch(() => {})
  }, [])

  async function claimDaily() {
    if (dailyClaiming || dailyClaimed) return
    setDailyClaiming(true)
    play('win')
    try {
      const r = await fetch('/api/credits/daily-grant', { method: 'POST' })
      const d = await r.json()
      if (r.ok) {
        setDailyClaimed(true)
        loadDashboard()
      } else {
        if (d.error === 'Already claimed today') setDailyClaimed(true)
      }
    } catch {
      // silent
    } finally {
      setDailyClaiming(false)
    }
  }

  const totalCompute = balances ? balances.purchased_compute + balances.bonus_compute : null
  const arenaCredits = balances?.arena_credits ?? null
  const streak = progression?.currentStreak ?? 0
  const rank = progression?.rank ?? 0

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-[#1a2535]">
        <Link href="/arena" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-display text-xs font-black text-[#ff4d6d] tracking-widest">TK</span>
          </div>
          <div>
            <p className="font-display text-sm font-black text-white tracking-[0.12em]">TOKENOMICON</p>
            <p className="text-[9px] text-[#3d8fb5] font-mono tracking-widest">COMPUTE ARCADE</p>
          </div>
        </Link>
      </div>

      {/* Live indicator + streak + sound */}
      <div className="px-4 py-2 border-b border-[#1a2535]">
        <div className="flex items-center gap-2">
          <span className="text-[#59f5a9] animate-pulse">
            <Icons.live />
          </span>
          <span className="text-[10px] font-mono text-[#4a6a4a]">Live</span>
          {streak >= 2 && <StreakFire streak={streak} />}
          {rank > 0 && (
            <span className="text-[9px] font-mono text-[#6e9bff]" title="Rank">R{rank}</span>
          )}
          <button
            onClick={() => { play('click'); toggleMuted() }}
            className="ml-auto p-1 rounded text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors cursor-crosshair"
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            title={muted ? 'Sound off — click to enable' : 'Sound on'}
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section ?? 'main'} className="mb-4">
            {section.section && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-[#3a4a5a] uppercase">
                {section.section}
              </p>
            )}
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname === item.href || (item.href !== '/arena' && pathname.startsWith(item.href))}
              />
            ))}
          </div>
        ))}

        {isAdmin && (
          <div className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-[#5a2a2a] uppercase">Admin</p>
            <NavItem href="/admin" label="Admin" icon={Icons.admin} active={pathname.startsWith('/admin')} />
          </div>
        )}
      </nav>

      {/* Credits Display */}
      <div className="px-4 py-4 border-t border-[#1a2535] space-y-2">
        {dashboardLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-[#0f1822] rounded-lg animate-pulse" />
            <div className="h-8 bg-[#0f1822] rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a1520] rounded-lg border border-[#1a2535]">
              <div>
                <p className="text-[9px] font-mono text-[#4a5a6d] uppercase tracking-wider">Compute</p>
                <p className="text-sm font-mono font-bold text-white">
                  {totalCompute !== null
                    ? <><AnimatedNumber value={totalCompute} format={(n) => fmt(n)} /> cr</>
                    : '—'}
                </p>
              </div>
              <Link href="/wallet" className="text-[10px] font-display text-[#5ad8ff] hover:text-white transition-colors tracking-wider">
                BUY
              </Link>
            </div>
            <button
              onClick={claimDaily}
              disabled={dailyClaiming || dailyClaimed === true}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-150 ${
                dailyClaimed
                  ? 'bg-[#0a1520] border-[#1a2535] cursor-default'
                  : 'bg-[#0a2a1a] border-[#1a4a2a] hover:bg-[#0c3a1c] hover:border-[#2a6a3a] cursor-pointer'
              }`}
            >
              <div>
                <p className="text-[9px] font-mono text-[#4a5a6d] uppercase tracking-wider">Arena</p>
                <p className="text-sm font-mono font-bold text-[#59f5a9]">
                  {arenaCredits !== null
                    ? <><AnimatedNumber value={arenaCredits} format={(n) => fmt(n)} /> cr</>
                    : '—'}
                </p>
              </div>
              <span className="text-[9px] font-mono" style={{ color: dailyClaimed ? '#2a5a2a' : '#59f5a9' }}>
                {dailyClaiming ? '…' : dailyClaimed ? 'CLAIMED' : 'CLAIM'}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#0c111a] border border-[#192433] rounded-lg text-[#6b7a8d]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <Icons.close /> : <Icons.menu />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64
          bg-[#080d14] border-r border-[#192433]
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[#080d14] border-r border-[#192433] h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  )
}
