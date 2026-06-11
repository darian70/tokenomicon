import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import {
  getOrCreateReferralCode,
  redeemReferralCode,
  getReferralStats,
} from '@/lib/server/referrals'

// GET — return user's referral code + stats
export async function GET() {
  try {
    const user = await requireUserProfile()
    const stats = await getReferralStats(user.id)
    // Ensure code exists (creates one if not); stats.code may already have it
    if (!stats.code) await getOrCreateReferralCode(user.id, user.email)
    const freshStats = stats.code ? stats : await getReferralStats(user.id)
    return NextResponse.json(freshStats)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 })
  }
}

// POST — redeem someone else's code
export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const { code } = z.object({ code: z.string().min(1) }).parse(await req.json())
    const result = await redeemReferralCode(code, user.id)
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
    return NextResponse.json({ bonus: result.bonus })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 400 })
  }
}
