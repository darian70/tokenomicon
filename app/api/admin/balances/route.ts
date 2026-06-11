import { NextResponse } from 'next/server'
import { requireAdminProfile } from '@/lib/server/auth'
import { fetchAllProviderBalances, checkLowBalances } from '@/lib/server/provider-balances'

export async function GET() {
  try {
    await requireAdminProfile()
    const balances = await fetchAllProviderBalances()
    const warnings = checkLowBalances(balances)
    return NextResponse.json({ balances, warnings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
