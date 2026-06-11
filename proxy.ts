import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Landing page A/B variant routing
// ---------------------------------------------------------------------------
//
// Persona A (default) — AI app builders: arcade-forward, free credits hook.
// Persona B           — Inference nerds: benchmark-forward, latency data hook.
//
// Priority: ?variant= override → UTM params → existing cookie → default A
//
// We inject x-tk-variant into the forwarded request headers AND set a cookie
// so the Server Component sees the correct variant on the SAME request
// (no Set-Cookie round-trip needed for first-visit rendering).

const BENCH_SOURCES = new Set([
  'twitter', 'x',
  'bench', 'benchmark',
  'github',
  'hackernews', 'hn',
  'reddit',
])

function resolveVariant(req: NextRequest): 'a' | 'b' {
  const url = new URL(req.url)

  // Explicit override (?variant=a or ?variant=b) — useful for QA
  const param = url.searchParams.get('variant')
  if (param === 'a') return 'a'
  if (param === 'b') return 'b'

  // UTM-based detection → Persona B
  const utmSource   = (url.searchParams.get('utm_source')   ?? '').toLowerCase()
  const utmContent  = (url.searchParams.get('utm_content')  ?? '').toLowerCase()
  const utmCampaign = (url.searchParams.get('utm_campaign') ?? '').toLowerCase()

  if (
    BENCH_SOURCES.has(utmSource) ||
    utmContent.includes('bench') ||
    utmCampaign.includes('bench')
  ) {
    return 'b'
  }

  // Existing cookie — preserve the variant from the first visit
  const cookie = req.cookies.get('tk-variant')?.value
  if (cookie === 'a' || cookie === 'b') return cookie

  return 'a'
}

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/games(.*)',
  '/arena(.*)',
  '/profile(.*)',
  '/wallet(.*)',
  '/playground(.*)',
  '/admin(.*)',
])

// Routes that require admin (checked separately after auth)
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Landing page A/B variant routing.
  // We return early with a custom NextResponse so we can inject x-tk-variant
  // into the forwarded request headers — the Server Component reads this on
  // the same request without a Set-Cookie round-trip.
  // Clerk has already injected its auth headers into req.headers at this
  // point, so copying req.headers preserves auth() access in the page.
  if (req.nextUrl.pathname === '/') {
    const variant = resolveVariant(req)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tk-variant', variant)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.cookies.set('tk-variant', variant, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    })
    return response
  }

  // /api/v1/* is authenticated via API key (Bearer token), not Clerk session
  // Let those requests through — the route handlers verify the key themselves
  if (req.nextUrl.pathname.startsWith('/api/v1/')) {
    return NextResponse.next()
  }

  if (isProtectedRoute(req)) {
    // Redirects to sign-in if no session; no-op if already authenticated
    await auth.protect()
  }

  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth()

    // Clerk stores the primary email in sessionClaims.email (set up via Clerk
    // session customization) or we fall back to the unsafe metadata approach.
    // Either way, the page-level requireAdminProfile() is the authoritative
    // check; this is a fast redirect to avoid exposing the admin shell UI.
    const email =
      (sessionClaims as Record<string, unknown> | null)?.email as string | undefined

    const adminEmails = new Set(
      (process.env.TOKENOMICON_ADMIN_EMAILS ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )

    if (email && !adminEmails.has(email.toLowerCase())) {
      // Not an admin — redirect to arena
      return NextResponse.redirect(new URL('/arena', req.url))
    }
  }
})

export const config = {
  matcher: [
    // Run middleware on all routes except static files and Next internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)).*)',
  ],
}
