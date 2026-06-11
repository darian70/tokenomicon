import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LandingA from '@/components/landing/LandingA'
import LandingB from '@/components/landing/LandingB'

// ---------------------------------------------------------------------------
// UTM sources that map first-time visitors to Persona B.
// Mirrors the logic in proxy.ts so searchParams fallback works in dev.
// ---------------------------------------------------------------------------

const BENCH_SOURCES = new Set([
  'twitter', 'x',
  'bench', 'benchmark',
  'github',
  'hackernews', 'hn',
  'reddit',
])

type SearchParams = Promise<{
  variant?: string
  utm_source?: string
  utm_content?: string
  utm_campaign?: string
}>

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  // Auth: redirect logged-in users to the app
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    if (userId) redirect('/arena')
  }

  // Primary: read variant injected by proxy.ts into the request headers.
  // This is available on the SAME request (no Set-Cookie round-trip).
  const reqHeaders = await headers()
  const headerVariant = reqHeaders.get('x-tk-variant') as 'a' | 'b' | null

  // Fallback: resolve directly from searchParams.
  // Used in local dev (no proxy running) and on the rare first UTM visit
  // before the proxy cookie has been set.
  let variant: 'a' | 'b' = headerVariant ?? 'a'
  if (!headerVariant) {
    const params = await searchParams
    if (params.variant === 'b') {
      variant = 'b'
    } else if (params.variant === 'a') {
      variant = 'a'
    } else {
      const src = (params.utm_source ?? '').toLowerCase()
      const content = (params.utm_content ?? '').toLowerCase()
      const campaign = (params.utm_campaign ?? '').toLowerCase()
      if (
        BENCH_SOURCES.has(src) ||
        content.includes('bench') ||
        campaign.includes('bench')
      ) {
        variant = 'b'
      }
    }
  }

  return variant === 'b' ? <LandingB /> : <LandingA />
}
