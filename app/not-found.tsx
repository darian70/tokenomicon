import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 — Page Not Found | Tokenomicon',
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center bg-void">
      <div>
        <p className="font-vt text-[120px] lg:text-[200px] leading-none text-blood/20 select-none">404</p>
        <h1 className="font-display text-2xl lg:text-4xl font-black text-blood tracking-widest -mt-6">PAGE NOT FOUND</h1>
        <p className="font-mono text-dim text-sm mt-4 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or was moved. Check the URL or head back to the arcade.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/arena"
          className="px-8 py-3 bg-blood text-void font-display text-sm tracking-widest hover:bg-blood/80 transition-colors"
        >
          ENTER ARENA
        </Link>
        <Link
          href="/"
          className="px-8 py-3 border border-border text-dim font-display text-sm tracking-widest hover:border-cyan hover:text-cyan transition-colors"
        >
          HOME
        </Link>
      </div>
    </main>
  )
}
