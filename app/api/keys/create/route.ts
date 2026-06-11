import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { createApiKey } from '@/lib/server/api-keys'

const schema = z.object({
  name: z.string().min(2).max(40),
})

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())
    const { key, rawKey } = await createApiKey(user.id, body.name)

    return NextResponse.json({
      key: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        createdAt: key.createdAt,
      },
      rawKey,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
