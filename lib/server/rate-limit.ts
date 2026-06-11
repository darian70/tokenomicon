import { db } from '@/lib/server/db'

// DB-backed rate limiter — works correctly across all serverless instances.
// The in-memory Map version silently broke on Vercel because each instance
// had its own Map; users on different instances had no effective rate limit.
//
// Note: For very high throughput, upgrade to Upstash Redis + @upstash/ratelimit.
// The DB approach is correct for current scale (<1K API calls/minute).
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const now = new Date()
  const newWindowEnd = new Date(now.getTime() + windowMs)

  return db.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } })

    if (!bucket || bucket.windowEnd <= now) {
      // Window expired or first request — reset the bucket.
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, windowEnd: newWindowEnd },
        update: { count: 1, windowEnd: newWindowEnd },
      })
      return { ok: true, remaining: max - 1 }
    }

    if (bucket.count >= max) {
      return { ok: false, remaining: 0 }
    }

    await tx.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    })

    return { ok: true, remaining: max - bucket.count - 1 }
  })
}
