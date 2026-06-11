import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { db } from '@/lib/server/db'

export async function GET() {
  try {
    const user = await requireUserProfile()
    const keys = await db.apiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ keys })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}
