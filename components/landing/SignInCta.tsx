'use client'

import { SignInButton, useUser } from '@clerk/nextjs'

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export function SignInCtaPrimary({ label }: { label: string }) {
  const { isSignedIn } = useUser()

  if (isSignedIn) {
    return (
      <a href="/arena" className="px-10 py-4 bg-acid text-void font-display text-sm tracking-[0.2em] hover:bg-acid/90 transition-colors font-black cursor-crosshair">
        ENTER ARENA →
      </a>
    )
  }

  if (!CLERK_ENABLED) {
    return (
      <a href="/sign-in" className="px-10 py-4 bg-acid text-void font-display text-sm tracking-[0.2em] hover:bg-acid/90 transition-colors font-black cursor-crosshair">
        {label}
      </a>
    )
  }
  return (
    <SignInButton mode="modal">
      <button className="px-10 py-4 bg-acid text-void font-display text-sm tracking-[0.2em] hover:bg-acid/90 transition-colors font-black cursor-crosshair">
        {label}
      </button>
    </SignInButton>
  )
}

export function SignInCtaNav() {
  const { isSignedIn } = useUser()

  if (isSignedIn) {
    return (
      <a href="/arena" className="px-5 py-2 border border-acid/50 text-acid font-display text-xs tracking-widest hover:bg-acid/10 transition-colors cursor-crosshair">
        ARENA
      </a>
    )
  }

  if (!CLERK_ENABLED) {
    return (
      <a href="/sign-in" className="px-5 py-2 border border-acid/50 text-acid font-display text-xs tracking-widest hover:bg-acid/10 transition-colors cursor-crosshair">
        SIGN IN
      </a>
    )
  }
  return (
    <SignInButton mode="modal">
      <button className="px-5 py-2 border border-acid/50 text-acid font-display text-xs tracking-widest hover:bg-acid/10 transition-colors cursor-crosshair">
        SIGN IN
      </button>
    </SignInButton>
  )
}
