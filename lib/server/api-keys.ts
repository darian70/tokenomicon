import crypto from 'crypto'
import { db } from '@/lib/server/db'

const RAW_PREFIX = 'tkm_live_'

function hashKey(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function createApiKey(userId: string, name: string) {
  const random = crypto.randomBytes(24).toString('hex')
  const rawKey = `${RAW_PREFIX}${random}`
  const keyPrefix = rawKey.slice(0, 16)
  const keyHash = hashKey(rawKey)

  const key = await db.apiKey.create({
    data: {
      userId,
      name,
      keyPrefix,
      keyHash,
    },
  })

  return { key, rawKey }
}

export async function revokeApiKey(userId: string, keyId: string) {
  const key = await db.apiKey.findFirst({
    where: { id: keyId, userId, revokedAt: null },
  })
  if (!key) throw new Error('API key not found')

  return db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
}

export async function resolveApiKey(rawKey: string) {
  const keyHash = hashKey(rawKey)
  const key = await db.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    include: { user: true },
  })
  if (!key) return null

  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  })

  return key
}
