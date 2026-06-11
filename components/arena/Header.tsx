'use client'

import { useArenaStore } from '@/lib/store'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactElement } from 'react'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// SVG Icons
const Icons = {
  compute: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  ),
  arena: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  bonus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      <circle cx="12" cy="7" r="3" />
    </svg>
  ),
  profile: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  playground: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M10 2v2" />
      <path d="M7 8H3" />
      <path d="M21 16h-4" />
      <path d="M11 3H9" />
    </svg>
  ),
  admin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  live: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
}

export default function Header() {
  const { balances, isAdmin, dashboardLoading } = useArenaStore()
  const pathname = usePathname()

  const totalCompute = balances
    ? balances.purchased_compute + balances.bonus_compute
    : null

  const navItems = [
    { href: '/profile', label: 'Profile', icon: Icons.profile },
    { href: '/playground', label: 'Playground', icon: Icons.playground, accent: true },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Icons.admin, danger: true }] : []),
  ]

  return (
    <header className="panel panel-elevated px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/arena" className="flex items-baseline gap-2 group">
          <h1 className="font-display text-xl lg:text-2xl font-bold tracking-[0.12em] text-gradient-accent glow-text-accent transition-all duration-300">
            TOKENOMICON
          </h1>
          <span className="hidden lg:inline text-xs text-text-secondary tracking-widest font-mono">
            COMPUTE ARCADE
          </span>
        </Link>

        {/* Stats - Desktop */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <Stat
            label="Compute"
            value={dashboardLoading ? undefined : totalCompute}
            icon={Icons.compute}
            variant="primary"
          />
          <Stat
            label="Arena"
            value={dashboardLoading ? undefined : balances?.arena_credits}
            icon={Icons.arena}
            variant="default"
          />
          <Stat
            label="Bonus"
            value={dashboardLoading ? undefined : balances?.bonus_compute}
            icon={Icons.bonus}
            variant={balances && balances.bonus_compute > 0 ? 'success' : 'default'}
          />
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-wide rounded-md
                  transition-all duration-200
                  ${item.accent
                    ? 'text-accent hover:text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20'
                    : item.danger
                      ? 'text-error hover:text-error bg-error/5 hover:bg-error/10 border border-error/20'
                      : isActive
                        ? 'text-text bg-surface border border-border'
                        : 'text-text-secondary hover:text-text hover:bg-surface'
                  }
                `}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs font-medium text-success tracking-wide">LIVE</span>
          </div>
        </nav>
      </div>
    </header>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: number | null | undefined
  icon: () => ReactElement
  variant?: 'default' | 'primary' | 'success'
}) {
  const colorClasses = {
    default: 'text-text-secondary',
    primary: 'text-accent',
    success: 'text-success',
  }

  const valueColorClasses = {
    default: 'text-text',
    primary: 'text-accent glow-text-accent',
    success: 'text-success',
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className={`flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase ${colorClasses[variant]}`}>
        <Icon />
        <span>{label}</span>
      </div>
      <span className={`text-sm font-mono font-semibold tabular-nums ${valueColorClasses[variant]}`}>
        {value !== null && value !== undefined ? (
          `${fmt(value)} cr`
        ) : (
          <span className="inline-block w-16 h-4 bg-surface rounded animate-pulse" />
        )}
      </span>
    </div>
  )
}
