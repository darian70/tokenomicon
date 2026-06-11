import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { joinMatchmaking, leaveMatchmaking, getQueueDepth } from '@/lib/server/arena-matchmaking'

export async function GET() {
  return NextResponse.json({ queueDepth: await getQueueDepth() })
}

const joinSchema = z.object({
  entryAmount: z.number().min(100).max(2000).default(200),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = joinSchema.parse(await req.json())

    const result = await joinMatchmaking(user.id, body.entryAmount)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}

export async function DELETE() {
  try {
    const user = await requireUserProfile()
    const success = await leaveMatchmaking(user.id)
    
    return NextResponse.json({ success })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
