import { db } from './db'
import { providerCostUsd, revenueUsd, listEnabledModels } from './pricing'

export interface ReconciliationRow {
  model: string
  provider: string
  requests: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  revenueUsd: number       // what users paid in $
  costUsd: number          // what we paid providers in $
  grossProfitUsd: number
  marginPct: number        // gross margin %
}

export interface ReconciliationReport {
  periodStart: Date
  periodEnd: Date
  rows: ReconciliationRow[]
  totals: {
    requests: number
    revenueUsd: number
    costUsd: number
    grossProfitUsd: number
    marginPct: number
  }
  generatedAt: string
}

export async function buildReconciliationReport(days = 30): Promise<ReconciliationReport> {
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)

  const usageRows = await db.providerUsage.groupBy({
    by: ['model', 'provider'],
    where: { createdAt: { gte: periodStart, lte: periodEnd } },
    _count: { id: true },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      costInCredits: true,
    },
  })

  const rows: ReconciliationRow[] = usageRows.map((row) => {
    const promptTokens = row._sum.promptTokens ?? 0
    const completionTokens = row._sum.completionTokens ?? 0
    const totalTokens = row._sum.totalTokens ?? 0
    const creditsCharged = row._sum.costInCredits ?? 0
    const rev = revenueUsd(creditsCharged)
    const cost = providerCostUsd(row.model, promptTokens, completionTokens)
    const profit = rev - cost
    return {
      model: row.model,
      provider: row.provider,
      requests: row._count.id,
      totalTokens,
      promptTokens,
      completionTokens,
      revenueUsd: rev,
      costUsd: cost,
      grossProfitUsd: profit,
      marginPct: rev > 0 ? (profit / rev) * 100 : 0,
    }
  })

  rows.sort((a, b) => b.revenueUsd - a.revenueUsd)

  const totals = rows.reduce(
    (acc, r) => ({
      requests: acc.requests + r.requests,
      revenueUsd: acc.revenueUsd + r.revenueUsd,
      costUsd: acc.costUsd + r.costUsd,
      grossProfitUsd: acc.grossProfitUsd + r.grossProfitUsd,
      marginPct: 0,
    }),
    { requests: 0, revenueUsd: 0, costUsd: 0, grossProfitUsd: 0, marginPct: 0 }
  )
  totals.marginPct = totals.revenueUsd > 0 ? (totals.grossProfitUsd / totals.revenueUsd) * 100 : 0

  return { periodStart, periodEnd, rows, totals, generatedAt: new Date().toISOString() }
}

export interface ArenaRakeReport {
  periodStart: Date
  periodEnd: Date
  totalDuels: number
  completedDuels: number
  totalPotCredits: number
  totalRakeCredits: number
  totalRakeUsd: number
  avgRakePerDuel: number
}

export async function buildArenaRakeReport(days = 30): Promise<ArenaRakeReport> {
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)

  const rows = await db.arenaDuel.findMany({
    where: {
      createdAt: { gte: periodStart, lte: periodEnd },
      status: 'completed',
    },
    select: { entryAmount: true, platformRake: true },
  })

  const totalDuels = await db.arenaDuel.count({
    where: { createdAt: { gte: periodStart, lte: periodEnd } },
  })

  const totalRakeCredits = rows.reduce((sum, r) => sum + (r.platformRake ?? 0), 0)
  const totalPotCredits  = rows.reduce((sum, r) => sum + (r.entryAmount ?? 0) * 2, 0)

  return {
    periodStart,
    periodEnd,
    totalDuels,
    completedDuels: rows.length,
    totalPotCredits,
    totalRakeCredits,
    totalRakeUsd: totalRakeCredits * 0.001,
    avgRakePerDuel: rows.length > 0 ? totalRakeCredits / rows.length : 0,
  }
}

export function modelMarkupSummary() {
  return listEnabledModels().map((m) => {
    const inputMarkup = (m.inputCostPer1kCredits * 0.001) / (m.providerInputCostUsdPer1M / 1_000_000 * 1_000)
    const outputMarkup = (m.outputCostPer1kCredits * 0.001) / (m.providerOutputCostUsdPer1M / 1_000_000 * 1_000)
    return {
      model: m.model,
      displayName: m.displayName,
      provider: m.provider,
      tier: m.tier,
      userInputPriceUsdPer1M: m.inputCostPer1kCredits,       // credits/1K → $/1M (* 1000 / 0.001 = * 1)
      userOutputPriceUsdPer1M: m.outputCostPer1kCredits,
      providerInputCostUsdPer1M: m.providerInputCostUsdPer1M,
      providerOutputCostUsdPer1M: m.providerOutputCostUsdPer1M,
      inputMarkupX: +inputMarkup.toFixed(2),
      outputMarkupX: +outputMarkup.toFixed(2),
    }
  })
}
