import dns from 'node:dns/promises'

// RFC-1918 and link-local ranges that must never be reachable via a user-supplied URL.
const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local (AWS metadata endpoint lives here)
  /^100\.64\./, // CGNAT shared space
  /^::1$/,
  /^fe80:/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
]

function isPrivate(address: string): boolean {
  return PRIVATE_PATTERNS.some((p) => p.test(address))
}

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Webhook URL blocked: ${reason}`)
    this.name = 'SsrfBlockedError'
  }
}

/**
 * Validates that a URL is safe to use as a webhook target.
 * Throws SsrfBlockedError if the URL is disallowed.
 *
 * Checks: HTTPS-only, no private hostnames in the URL itself, and no private
 * IPs after DNS resolution (prevents DNS rebinding bypass).
 */
export async function validateWebhookUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError('invalid URL')
  }

  if (parsed.protocol !== 'https:') {
    throw new SsrfBlockedError('only HTTPS endpoints are allowed')
  }

  const hostname = parsed.hostname

  if (isPrivate(hostname)) {
    throw new SsrfBlockedError('private address or localhost not allowed')
  }

  // Resolve and re-check — guards against DNS rebinding and hostnames like
  // "169.254.169.254.nip.io" that look public but resolve to private IPs.
  let resolved: string
  try {
    const result = await dns.lookup(hostname)
    resolved = result.address
  } catch {
    throw new SsrfBlockedError('hostname could not be resolved')
  }

  if (isPrivate(resolved)) {
    throw new SsrfBlockedError('resolves to a private IP address')
  }
}
