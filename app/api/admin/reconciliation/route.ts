import { NextResponse } from 'next/server'
import { requireAdminProfile } from '@/lib/server/auth'
import { buildReconciliationReport, modelMarkupSummary, buildArenaRakeReport } from '@/lib/server/reconciliation'

export async function GET(req: Request) {
  try {
    await requireAdminProfile()
    const url = new URL(req.url)
    const days = Math.min(90, parseInt(url.searchParams.get('days') ?? '30', 10))
    const [report, markup, arenaRake] = await Promise.all([
      buildReconciliationReport(days),
      Promise.resolve(modelMarkupSummary()),
      buildArenaRakeReport(days),
    ])
    return NextResponse.json({ report, markup, arenaRake })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
