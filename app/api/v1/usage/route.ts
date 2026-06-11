import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'

export async function GET(req: Request) {
  try {
    const user = await requireUserProfile()
    const url = new URL(req.url)
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10)))
    const keyId = url.searchParams.get('keyId') ?? undefined

    const since = new Date()
    since.setDate(since.getDate() - days)

    const rows = await db.providerUsage.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: since },
        ...(keyId ? { apiKeyId: keyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: {
        id: true,
        apiKeyId: true,
        provider: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costInCredits: true,
        createdAt: true,
      },
    })

    // ── Daily rollup ────────────────────────────────────────────────────────
    const byDay: Record<string, { date: string; totalTokens: number; totalCost: number; requests: number }> = {}
    for (const r of rows) {
      const day = r.createdAt.toISOString().slice(0, 10)
      if (!byDay[day]) byDay[day] = { date: day, totalTokens: 0, totalCost: 0, requests: 0 }
      byDay[day].totalTokens += r.totalTokens
      byDay[day].totalCost += r.costInCredits
      byDay[day].requests++
    }

    // ── By model rollup ─────────────────────────────────────────────────────
    const byModel: Record<string, { model: string; provider: string; totalTokens: number; totalCost: number; requests: number }> = {}
    for (const r of rows) {
      if (!byModel[r.model]) byModel[r.model] = { model: r.model, provider: r.provider, totalTokens: 0, totalCost: 0, requests: 0 }
      byModel[r.model].totalTokens += r.totalTokens
      byModel[r.model].totalCost += r.costInCredits
      byModel[r.model].requests++
    }

    // ── By API key rollup ───────────────────────────────────────────────────
    const byKey: Record<string, { apiKeyId: string; totalTokens: number; totalCost: number; requests: number }> = {}
    for (const r of rows) {
      const k = r.apiKeyId ?? 'playground'
      if (!byKey[k]) byKey[k] = { apiKeyId: k, totalTokens: 0, totalCost: 0, requests: 0 }
      byKey[k].totalTokens += r.totalTokens
      byKey[k].totalCost += r.costInCredits
      byKey[k].requests++
    }

    // Enrich key rollup with key names
    const keyIds = Object.keys(byKey).filter((k) => k !== 'playground')
    const keyRecords = keyIds.length
      ? await db.apiKey.findMany({
          where: { id: { in: keyIds } },
          select: { id: true, name: true, keyPrefix: true },
        })
      : []
    const keyMap = Object.fromEntries(keyRecords.map((k) => [k.id, k]))

    const byKeyEnriched = Object.values(byKey).map((entry) => ({
      ...entry,
      name: entry.apiKeyId === 'playground'
        ? 'Playground'
        : (keyMap[entry.apiKeyId]?.name ?? 'Unknown Key'),
      keyPrefix: keyMap[entry.apiKeyId]?.keyPrefix ?? null,
    })).sort((a, b) => b.totalCost - a.totalCost)

    return NextResponse.json({
      totalRequests: rows.length,
      totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
      totalCost: rows.reduce((s, r) => s + r.costInCredits, 0),
      daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      byModel: Object.values(byModel).sort((a, b) => b.totalCost - a.totalCost),
      byKey: byKeyEnriched,
      recent: rows.slice(0, 50).map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        keyName: r.apiKeyId === null
          ? 'Playground'
          : (keyMap[r.apiKeyId]?.name ?? 'Unknown Key'),
        keyPrefix: r.apiKeyId ? (keyMap[r.apiKeyId]?.keyPrefix ?? null) : null,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
