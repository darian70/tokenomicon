import { randomBytes, createHash, createHmac } from 'crypto'

export interface FairnessProof {
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  nonce: number
  combinedHash: string
}

export function generateServerSeed(): { seed: string; hash: string } {
  const seed = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(seed).digest('hex')
  return { seed, hash }
}

export function generateClientSeed(): string {
  return randomBytes(16).toString('hex')
}

export function combineSeeds(serverSeed: string, clientSeed: string, nonce: number): string {
  return createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex')
}

export function deriveOutcome(combinedHash: string, max: number): number {
  const slice = combinedHash.slice(0, 8)
  const value = parseInt(slice, 16)
  return value % max
}

export function verifyServerSeed(serverSeed: string, expectedHash: string): boolean {
  const actual = createHash('sha256').update(serverSeed).digest('hex')
  return actual === expectedHash
}

export function createFairnessProof(nonce: number): {
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  combinedHash: string
  nonce: number
} {
  const { seed: serverSeed, hash: serverSeedHash } = generateServerSeed()
  const clientSeed = generateClientSeed()
  const combinedHash = combineSeeds(serverSeed, clientSeed, nonce)
  return { serverSeed, serverSeedHash, clientSeed, combinedHash, nonce }
}

export function fairRandom(serverSeed: string, clientSeed: string, nonce: number, max: number): number {
  const combined = combineSeeds(serverSeed, clientSeed, nonce)
  return deriveOutcome(combined, max)
}
