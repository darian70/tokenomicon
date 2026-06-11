import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ACHIEVEMENTS } from '@/lib/server/progression'

export async function GET() {
  try {
    const user = await requireUserProfile()

    const unlocked = await db.achievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'asc' },
    })

    const unlockedCodes = new Set(unlocked.map((a) => a.code))

    const all = ACHIEVEMENTS.map((def) => ({
      code: def.code,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlocked: unlockedCodes.has(def.code),
      unlockedAt: unlocked.find((a) => a.code === def.code)?.unlockedAt?.toISOString() ?? null,
    }))

    return NextResponse.json({ achievements: all, totalUnlocked: unlockedCodes.size })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
