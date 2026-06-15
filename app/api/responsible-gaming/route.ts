import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import {
  selfExclude,
  getSelfExclusionStatus,
  SELF_EXCLUSION_OPTIONS,
} from '@/lib/server/responsible-gaming'
import { toApiResponse } from '@/lib/server/api-error'

const schema = z.object({
  days: z.number().int().min(1).max(365),
})

export async function GET() {
  try {
    const user = await requireUserProfile()
    const status = await getSelfExclusionStatus(user.id)
    return NextResponse.json({ ...status, options: SELF_EXCLUSION_OPTIONS })
  } catch (error) {
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const { days } = schema.parse(await req.json())
    const until = await selfExclude(user.id, days)
    return NextResponse.json({ excluded: true, until: until.toISOString() })
  } catch (error) {
    const { message, status } = toApiResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
