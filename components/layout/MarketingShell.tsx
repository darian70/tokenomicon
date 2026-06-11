import Link from 'next/link'
import type { ReactNode } from 'react'

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-mono text-[#4a5a6d] hover:text-white transition-colors px-3 py-1.5"
    >
      {children}
    </Link>
  )
}

export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070a10] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#192433]/80 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-md flex items-center justify-center">
                <span className="font-display text-[10px] font-black text-[#ff4d6d]">TK</span>
              </div>
              <span className="font-display text-sm font-black text-white tracking-[0.14em]">TOKENOMICON</span>
            </Link>
            <span className="hidden sm:inline text-[10px] text-[#3d8fb5] font-mono tracking-widest border-l border-[#192433] pl-3">
              COMPUTE ARCADE
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/models">Models</NavLink>
            <NavLink href="/docs">Docs</NavLink>
            <NavLink href="/games">Games</NavLink>
            <Link
              href="/arena"
              className="ml-3 px-4 py-2 bg-[#ff4d6d] text-white font-display text-xs tracking-[0.12em] rounded-lg hover:bg-[#ff6b84] transition-all hover:shadow-[0_0_20px_rgba(255,77,109,0.4)]"
            >
              PLAY FREE
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content with fixed nav offset */}
      <div className="pt-[73px]">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#192433] bg-[#080d14] mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-md flex items-center justify-center">
                  <span className="font-display text-[10px] font-black text-[#ff4d6d]">TK</span>
                </div>
                <span className="font-display text-sm font-black text-white tracking-[0.14em]">TOKENOMICON</span>
              </div>
              <p className="text-[11px] text-[#3a4a5a] font-mono leading-relaxed max-w-[200px]">
                One API key for every major AI model. Play skill games to earn bonus compute.
              </p>
              <div className="flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#59f5a9] animate-pulse" />
                <span className="text-[10px] font-mono text-[#2a5a3a]">Platform operational</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Product</p>
              <div className="space-y-2.5">
                {[
                  ['Games', '/games'],
                  ['Pricing', '/pricing'],
                  ['Models', '/models'],
                  ['Playground', '/playground'],
                  ['Docs', '/docs'],
                  ['Changelog', '/changelog'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Resources</p>
              <div className="space-y-2.5">
                {[
                  ['Help Center', '/help'],
                  ['About', '/about'],
                  ['Status', '/status'],
                  ['Leaderboard', '/leaderboard'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal & Contact */}
            <div>
              <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-4 uppercase">Legal</p>
              <div className="space-y-2.5">
                {[
                  ['Terms of Service', '/terms'],
                  ['Privacy Policy', '/privacy'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-[11px] font-mono text-[#3a4a5a] hover:text-[#a8b8cc] transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-display tracking-widest text-[#4a5a6d] mb-3 uppercase">Contact</p>
                <p className="text-[11px] font-mono text-[#3a4a5a]">support@tokenomicon.io</p>
                <p className="text-[11px] font-mono text-[#3a4a5a] mt-1">security@tokenomicon.io</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#192433] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-[#2a3a4a] font-mono">
              © 2026 Tokenomicon · Credits have no cash value · Not financial advice
            </p>
            <p className="text-[10px] text-[#2a3a4a] font-mono">
              Provably fair · No crypto · No nonsense
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
