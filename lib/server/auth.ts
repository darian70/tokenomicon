import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/server/db'
import { env } from '@/lib/server/env'

function adminEmailSet() {
  return new Set(
    (env.TOKENOMICON_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

export async function requireUserProfile() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null
  const isAdmin = email ? adminEmailSet().has(email.toLowerCase()) : false

  const profile = await db.userProfile.upsert({
    where: { clerkUserId: userId },
    update: { email, isAdmin },
    create: { clerkUserId: userId, email, isAdmin },
  })

  return profile
}

export async function requireAdminProfile() {
  const profile = await requireUserProfile()
  if (!profile.isAdmin) throw new Error('Forbidden')
  return profile
}
