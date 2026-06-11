import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { revokeApiKey } from '@/lib/server/api-keys'

const schema = z.object({
  keyId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())
    await revokeApiKey(user.id, body.keyId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
