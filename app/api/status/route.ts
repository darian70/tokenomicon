import { NextResponse } from 'next/server'
import { checkProviderHealth } from '@/lib/server/providers/router'
import { listEnabledModels } from '@/lib/server/pricing'

export async function GET() {
  const [health, models] = await Promise.all([
    checkProviderHealth(),
    Promise.resolve(listEnabledModels()),
  ])

  const providers = Object.entries(health).map(([name, status]) => ({
    name,
    ...status,
    modelCount: models.filter((m) => m.provider === name).length,
  }))

  return NextResponse.json({
    providers,
    totalModels: models.length,
    timestamp: new Date().toISOString(),
  })
}
