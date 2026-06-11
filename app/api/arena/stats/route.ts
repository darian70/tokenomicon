import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { getArenaStats, getLeaderboard } from '@/lib/server/arena-matchmaking'

export async function GET(req: Request) {
  try {
    const user = await requireUserProfile()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'personal'

    if (type === 'personal') {
      const stats = await getArenaStats(user.id)
      return NextResponse.json(stats)
    }

    if (type === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '100', 10)
      const leaderboard = await getLeaderboard(limit)
      return NextResponse.json(leaderboard)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
