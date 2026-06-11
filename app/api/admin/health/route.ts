import { NextResponse } from 'next/server'
import { requireAdminProfile } from '@/lib/server/auth'
import { checkProviderHealth } from '@/lib/server/providers/router'

export async function GET() {
  try {
    await requireAdminProfile()
    const health = await checkProviderHealth()
    return NextResponse.json({ providers: health, checkedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
