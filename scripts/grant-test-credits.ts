/**
 * Dev-only script: grant test credits to a user by Clerk user ID.
 * Usage: npx tsx scripts/grant-test-credits.ts <clerkUserId>
 *
 * Find your Clerk user ID at: https://dashboard.clerk.com → Users → click your account
 * It looks like: user_2abc123...
 */
import { PrismaClient } from '@prisma/client'
import { addLedgerEntry } from '../lib/server/ledger'

const db = new PrismaClient()

async function main() {
  const clerkUserId = process.argv[2]
  if (!clerkUserId) {
    console.error('Usage: npx tsx scripts/grant-test-credits.ts <clerkUserId>')
    console.error('  e.g. npx tsx scripts/grant-test-credits.ts user_2abc123xyz')
    process.exit(1)
  }

  const isEmail = clerkUserId.includes('@')
  const user = isEmail
    ? await db.userProfile.findFirst({ where: { email: clerkUserId } })
    : await db.userProfile.findUnique({ where: { clerkUserId } })

  if (!user) {
    const all = await db.userProfile.findMany({ select: { clerkUserId: true, email: true } })
    if (all.length === 0) {
      console.error('No UserProfile rows found at all.')
      console.error('→ Sign in and visit http://localhost:3002/arena first to create your profile, then re-run.')
    } else {
      console.error(`No profile found for: ${clerkUserId}`)
      console.error('Existing profiles:')
      all.forEach(u => console.error(`  ${u.clerkUserId}  ${u.email ?? ''}`))
    }
    process.exit(1)
  }

  const GRANTS = [
    { bucket: 'arena_credits',     amount: 500,  label: '500 arena credits (play games)' },
    { bucket: 'bonus_compute',     amount: 5000, label: '5,000 bonus compute credits' },
    { bucket: 'purchased_compute', amount: 5000, label: '5,000 purchased compute credits' },
  ] as const

  await db.$transaction(async (tx) => {
    for (const g of GRANTS) {
      await addLedgerEntry({
        tx,
        userId:   user.id,
        bucket:   g.bucket,
        type:     'manual_grant',
        amount:   g.amount,
        metadata: { reason: 'dev test grant', script: 'grant-test-credits.ts' },
      })
      console.log(`✓ Granted ${g.label}`)
    }
  })

  console.log('\nDone! Refresh the dashboard — credits should appear immediately.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
