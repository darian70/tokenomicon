import { NextResponse } from 'next/server'
import { getActivePlayerCounts } from '@/lib/server/player-counts'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ counts: getActivePlayerCounts() })
}
