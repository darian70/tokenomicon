import { ArenaDuelStatus, Prisma } from '@prisma/client'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'

// ============================================================================
// Types
// ============================================================================

export type { ArenaDuelStatus }

export interface ArenaMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens: number
  timestamp: string // ISO — JSON-serializable for DB storage
}

export interface DuelPlayerState {
  userId: string
  username: string
  rating: number
  totalTokens: number
  crashed: boolean
  crashReason?: string
  connected: boolean
  messages: ArenaMessage[]
}

export interface ActiveDuel {
  id: string
  status: ArenaDuelStatus
  playerA: DuelPlayerState
  playerB: DuelPlayerState | null
  model: string
  maxTokens: number
  startedAt?: Date
  endedAt?: Date
  winnerId?: string
  spectators: string[]
  createdAt: Date
  ratingChanges?: {
    winnerId: string
    winnerDelta: number
    loserDelta: number
    winnerNewRating: number
    loserNewRating: number
  }
}

// ============================================================================
// ELO Configuration
// ============================================================================

const ELO_CONFIG = {
  initialRating: 1500,
  kFactor: 32,
  maxEloDiff: 200,
  placementGames: 5,
}

export const ARENA_CONFIG = {
  minEntry: 100,
  maxEntry: 2000,
  defaultEntry: 200,
  platformRakePercent: 15,
  timeLimitSeconds: 300,
  maxTokens: 8192,
  queueTtlSeconds: 300,
}

// ============================================================================
// Internal helpers
// ============================================================================

type DuelRow = Prisma.ArenaDuelGetPayload<{
  include: {
    playerA: { select: { id: true; email: true } }
    playerB: { select: { id: true; email: true } }
  }
}>

async function buildActiveDuel(
  row: DuelRow,
  winnerDelta?: number,
  loserDelta?: number,
  winnerNewRating?: number,
  loserNewRating?: number,
): Promise<ActiveDuel> {
  const [ratingA, ratingB] = await Promise.all([
    db.arenaStats.findUnique({ where: { userId: row.playerAId }, select: { rating: true } }),
    db.arenaStats.findUnique({ where: { userId: row.playerBId }, select: { rating: true } }),
  ])

  const messagesA = (row.messagesA as unknown as ArenaMessage[]) ?? []
  const messagesB = (row.messagesB as unknown as ArenaMessage[]) ?? []

  const displayName = (email: string | null | undefined) =>
    email ? email.split('@')[0] : 'Player'

  const duel: ActiveDuel = {
    id: row.id,
    status: row.status,
    playerA: {
      userId: row.playerAId,
      username: displayName(row.playerA.email),
      rating: ratingA?.rating ?? ELO_CONFIG.initialRating,
      totalTokens: row.tokensA,
      crashed: row.status === 'completed' && row.winnerId !== null && row.winnerId !== row.playerAId,
      connected: row.connectedA,
      messages: messagesA,
    },
    playerB: {
      userId: row.playerBId,
      username: displayName(row.playerB.email),
      rating: ratingB?.rating ?? ELO_CONFIG.initialRating,
      totalTokens: row.tokensB,
      crashed: row.status === 'completed' && row.winnerId !== null && row.winnerId !== row.playerBId,
      connected: row.connectedB,
      messages: messagesB,
    },
    model: row.model,
    maxTokens: row.maxTokens,
    startedAt: row.startedAt ?? undefined,
    endedAt: row.endedAt ?? undefined,
    winnerId: row.winnerId ?? undefined,
    spectators: [],
    createdAt: row.createdAt,
  }

  if (row.winnerId && winnerDelta !== undefined && loserDelta !== undefined) {
    duel.ratingChanges = {
      winnerId: row.winnerId,
      winnerDelta,
      loserDelta,
      winnerNewRating: winnerNewRating ?? ELO_CONFIG.initialRating,
      loserNewRating: loserNewRating ?? ELO_CONFIG.initialRating,
    }
  }

  return duel
}

async function loadDuelRow(duelId: string): Promise<DuelRow | null> {
  return db.arenaDuel.findUnique({
    where: { id: duelId },
    include: {
      playerA: { select: { id: true, email: true } },
      playerB: { select: { id: true, email: true } },
    },
  })
}

async function cleanExpiredQueueEntries() {
  await db.matchmakingEntry.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}

// ============================================================================
// ELO System
// ============================================================================

export async function getPlayerRating(userId: string): Promise<number> {
  const stats = await db.arenaStats.findUnique({ where: { userId } })
  return stats?.rating ?? ELO_CONFIG.initialRating
}

export async function updatePlayerRating(
  winnerId: string,
  loserId: string,
  wasDraw = false,
): Promise<{ winnerNewRating: number; loserNewRating: number }> {
  const [winnerStats, loserStats] = await Promise.all([
    db.arenaStats.findUnique({ where: { userId: winnerId } }),
    db.arenaStats.findUnique({ where: { userId: loserId } }),
  ])

  const winnerRating = winnerStats?.rating ?? ELO_CONFIG.initialRating
  const loserRating = loserStats?.rating ?? ELO_CONFIG.initialRating
  const winnerGames = winnerStats?.totalGames ?? 0
  const loserGames = loserStats?.totalGames ?? 0

  const winnerExpected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  const loserExpected = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400))

  const winnerK = winnerGames < ELO_CONFIG.placementGames ? 50 : ELO_CONFIG.kFactor
  const loserK = loserGames < ELO_CONFIG.placementGames ? 50 : ELO_CONFIG.kFactor

  const winnerScore = wasDraw ? 0.5 : 1
  const loserScore = wasDraw ? 0.5 : 0

  const winnerNewRating = Math.round(winnerRating + winnerK * (winnerScore - winnerExpected))
  const loserNewRating = Math.round(loserRating + loserK * (loserScore - loserExpected))

  await db.$transaction([
    db.arenaStats.upsert({
      where: { userId: winnerId },
      create: { userId: winnerId, rating: winnerNewRating, totalGames: 1, wins: wasDraw ? 0 : 1, draws: wasDraw ? 1 : 0, losses: 0, totalCreditsWon: 0, totalCreditsLost: 0 },
      update: { rating: winnerNewRating, totalGames: { increment: 1 }, wins: wasDraw ? {} : { increment: 1 }, draws: wasDraw ? { increment: 1 } : {} },
    }),
    db.arenaStats.upsert({
      where: { userId: loserId },
      create: { userId: loserId, rating: loserNewRating, totalGames: 1, wins: 0, draws: wasDraw ? 1 : 0, losses: wasDraw ? 0 : 1, totalCreditsWon: 0, totalCreditsLost: 0 },
      update: { rating: loserNewRating, totalGames: { increment: 1 }, draws: wasDraw ? { increment: 1 } : {}, losses: wasDraw ? {} : { increment: 1 } },
    }),
  ])

  return { winnerNewRating, loserNewRating }
}

// ============================================================================
// Matchmaking — DB-backed queue (replaces in-memory playerQueue)
// ============================================================================

export async function joinMatchmaking(
  userId: string,
  entryAmount = ARENA_CONFIG.defaultEntry,
): Promise<{ duelId?: string; position?: number; estimatedWait?: number }> {
  if (entryAmount < ARENA_CONFIG.minEntry || entryAmount > ARENA_CONFIG.maxEntry) {
    throw new Error(`Entry must be between ${ARENA_CONFIG.minEntry} and ${ARENA_CONFIG.maxEntry}`)
  }

  const balance = await db.creditLedgerEntry.aggregate({
    where: { userId, OR: [{ bucket: 'arena_credits' }, { bucket: 'bonus_compute' }] },
    _sum: { amount: true },
  })
  if ((balance._sum.amount ?? 0) < entryAmount) {
    throw new Error('Insufficient credits for arena entry')
  }

  await cleanExpiredQueueEntries()

  return db.$transaction(async (tx) => {
    // Debit entry fee to escrow before joining queue
    const arenaBal = await tx.creditLedgerEntry.aggregate({
      where: { userId, bucket: 'arena_credits' },
      _sum: { amount: true },
    })
    const arenaCr = Math.max(0, arenaBal._sum.amount ?? 0)
    let remaining = entryAmount
    const fromArena = Math.min(arenaCr, remaining)
    if (fromArena > 0) {
      await addLedgerEntry({
        tx, userId, bucket: 'arena_credits', type: 'arena_entry',
        amount: -fromArena,
        metadata: { game: 'context_chicken_arena', status: 'escrow' },
      })
      remaining -= fromArena
    }
    if (remaining > 0) {
      await addLedgerEntry({
        tx, userId, bucket: 'bonus_compute', type: 'arena_entry',
        amount: -remaining,
        metadata: { game: 'context_chicken_arena', status: 'escrow' },
      })
    }

    const rating = await getPlayerRating(userId)
    const expiresAt = new Date(Date.now() + ARENA_CONFIG.queueTtlSeconds * 1000)

    // Find a compatible opponent from the DB queue
    const opponent = await tx.matchmakingEntry.findFirst({
      where: {
        userId: { not: userId },
        entryAmount,
        rating: { gte: rating - ELO_CONFIG.maxEloDiff, lte: rating + ELO_CONFIG.maxEloDiff },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (opponent) {
      await tx.matchmakingEntry.delete({ where: { id: opponent.id } })

      const models = ['claude-3-5-sonnet-20241022', 'gpt-4o-2024-11-20', 'gemini-2.5-flash-preview-05-20']
      const selectedModel = models[Math.floor(Math.random() * models.length)]

      const duel = await tx.arenaDuel.create({
        data: {
          playerAId: opponent.userId,
          playerBId: userId,
          entryAmount,
          model: selectedModel,
          maxTokens: ARENA_CONFIG.maxTokens,
          status: 'waiting',
        },
      })

      return { duelId: duel.id }
    }

    // No match found — add to queue (upsert handles re-join after disconnect)
    await tx.matchmakingEntry.upsert({
      where: { userId },
      create: { userId, entryAmount, rating, expiresAt },
      update: { entryAmount, rating, expiresAt },
    })

    const position = await tx.matchmakingEntry.count({
      where: { createdAt: { lte: new Date() } },
    })

    return { position, estimatedWait: Math.ceil(position * 30) }
  })
}

export async function leaveMatchmaking(userId: string): Promise<boolean> {
  const entry = await db.matchmakingEntry.findUnique({ where: { userId } })
  if (!entry) return false

  await db.$transaction(async (tx) => {
    await tx.matchmakingEntry.delete({ where: { userId } })
    // Refund the escrowed entry amount
    await addLedgerEntry({
      tx, userId, bucket: 'arena_credits', type: 'adjustment',
      amount: entry.entryAmount,
      metadata: { reason: 'matchmaking_cancelled', game: 'context_chicken_arena' },
    })
  })

  return true
}

export async function getQueueDepth(): Promise<number> {
  await cleanExpiredQueueEntries()
  return db.matchmakingEntry.count({ where: { expiresAt: { gt: new Date() } } })
}

// ============================================================================
// Duel Management — DB-backed (replaces in-memory activeDuels Map)
// ============================================================================

export async function getDuel(duelId: string): Promise<ActiveDuel | null> {
  const row = await loadDuelRow(duelId)
  if (!row) return null
  return buildActiveDuel(row)
}

export async function connectPlayer(
  duelId: string,
  userId: string,
): Promise<{ duel: ActiveDuel; player: 'A' | 'B' | null }> {
  const row = await loadDuelRow(duelId)
  if (!row) throw new Error('Duel not found')

  let player: 'A' | 'B' | null = null
  const updateData: Prisma.ArenaDuelUpdateInput = {}

  if (row.playerAId === userId) {
    player = 'A'
    updateData.connectedA = true
  } else if (row.playerBId === userId) {
    player = 'B'
    updateData.connectedB = true
  }

  if (player) {
    await db.arenaDuel.update({ where: { id: duelId }, data: updateData })
  }

  const updated = await loadDuelRow(duelId)
  const duel = await buildActiveDuel(updated!)
  return { duel, player }
}

export async function disconnectPlayer(duelId: string, userId: string): Promise<void> {
  const row = await db.arenaDuel.findUnique({ where: { id: duelId } })
  if (!row || row.status !== 'active') return

  const updateData: Prisma.ArenaDuelUpdateInput = {}
  if (row.playerAId === userId) updateData.connectedA = false
  else if (row.playerBId === userId) updateData.connectedB = false
  else return

  await db.arenaDuel.update({ where: { id: duelId }, data: updateData })
}

export async function startDuel(duelId: string): Promise<ActiveDuel> {
  const row = await loadDuelRow(duelId)
  if (!row) throw new Error('Duel not found')
  if (row.status !== 'waiting') throw new Error('Duel already started')

  const systemMsg: ArenaMessage = {
    id: crypto.randomUUID(),
    role: 'system',
    content: `Context Chicken Arena! Keep the conversation going. First to exceed ${row.maxTokens} tokens loses. Type STOP to safely concede.`,
    tokens: 0,
    timestamp: new Date().toISOString(),
  }

  await db.arenaDuel.update({
    where: { id: duelId },
    data: {
      status: 'active',
      startedAt: new Date(),
      messagesA: [systemMsg] as unknown as Prisma.InputJsonValue,
      messagesB: [systemMsg] as unknown as Prisma.InputJsonValue,
    },
  })

  const updated = await loadDuelRow(duelId)
  return buildActiveDuel(updated!)
}

export async function submitMessage(
  duelId: string,
  userId: string,
  content: string,
): Promise<{ message: ArenaMessage; duel: ActiveDuel; crashed: boolean }> {
  return db.$transaction(async (tx) => {
    const row = await tx.arenaDuel.findUnique({
      where: { id: duelId },
      include: {
        playerA: { select: { id: true, email: true } },
        playerB: { select: { id: true, email: true } },
      },
    })
    if (!row) throw new Error('Duel not found')
    if (row.status !== 'active') throw new Error('Duel not active')

    const isPlayerA = row.playerAId === userId
    const opponentId = isPlayerA ? row.playerBId : row.playerAId
    const currentTokens = isPlayerA ? row.tokensA : row.tokensB
    const existingMessages = (isPlayerA
      ? (row.messagesA as unknown as ArenaMessage[])
      : (row.messagesB as unknown as ArenaMessage[])) ?? []

    // Safe concede
    if (content.trim().toUpperCase() === 'STOP') {
      await tx.arenaDuel.update({
        where: { id: duelId },
        data: { status: 'completed', endedAt: new Date(), winnerId: opponentId, endedReason: 'stopped' },
      })

      await settleCreditsAndElo(tx, duelId, opponentId, userId, row.entryAmount)

      const updated = await tx.arenaDuel.findUnique({
        where: { id: duelId },
        include: {
          playerA: { select: { id: true, email: true } },
          playerB: { select: { id: true, email: true } },
        },
      })

      const sysMsg: ArenaMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'You stopped the conversation. Opponent wins.',
        tokens: 0,
        timestamp: new Date().toISOString(),
      }

      const duel = await buildActiveDuel(updated!)
      return { message: sysMsg, duel, crashed: true }
    }

    const estimatedTokens = Math.ceil(content.length / 4)
    const newTotal = currentTokens + estimatedTokens

    const msg: ArenaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      tokens: estimatedTokens,
      timestamp: new Date().toISOString(),
    }

    if (newTotal > row.maxTokens) {
      // Player crashed
      const updatedMessages = [...existingMessages, {
        ...msg,
        role: 'system' as const,
        content: `💥 CRASH! You exceeded ${row.maxTokens} tokens (${newTotal} total). You lose!`,
      }]

      await tx.arenaDuel.update({
        where: { id: duelId },
        data: {
          status: 'completed',
          endedAt: new Date(),
          winnerId: opponentId,
          endedReason: 'crash',
          ...(isPlayerA
            ? { tokensA: newTotal, messagesA: updatedMessages as unknown as Prisma.InputJsonValue }
            : { tokensB: newTotal, messagesB: updatedMessages as unknown as Prisma.InputJsonValue }),
        },
      })

      await settleCreditsAndElo(tx, duelId, opponentId, userId, row.entryAmount)

      const updated = await tx.arenaDuel.findUnique({
        where: { id: duelId },
        include: {
          playerA: { select: { id: true, email: true } },
          playerB: { select: { id: true, email: true } },
        },
      })
      const duel = await buildActiveDuel(updated!)

      return { message: updatedMessages[updatedMessages.length - 1], duel, crashed: true }
    }

    // Normal message
    const updatedMessages = [...existingMessages, msg]
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: isPlayerA
        ? { tokensA: newTotal, messagesA: updatedMessages as unknown as Prisma.InputJsonValue }
        : { tokensB: newTotal, messagesB: updatedMessages as unknown as Prisma.InputJsonValue },
    })

    const updated = await tx.arenaDuel.findUnique({
      where: { id: duelId },
      include: {
        playerA: { select: { id: true, email: true } },
        playerB: { select: { id: true, email: true } },
      },
    })
    const duel = await buildActiveDuel(updated!)
    return { message: msg, duel, crashed: false }
  })
}

// Shared credit + ELO settlement used by endDuel, submitMessage, and abandonDuel.
async function settleCreditsAndElo(
  tx: Prisma.TransactionClient,
  duelId: string,
  winnerId: string,
  loserId: string,
  entryAmount: number,
): Promise<{ winnerNewRating: number; loserNewRating: number; winnerDelta: number; loserDelta: number }> {
  const totalPot = entryAmount * 2
  const platformRake = Math.floor(totalPot * (ARENA_CONFIG.platformRakePercent / 100))
  const winnerPrize = totalPot - platformRake

  // Record winner prize
  await addLedgerEntry({
    tx, userId: winnerId, bucket: 'bonus_compute', type: 'arena_reward',
    amount: winnerPrize,
    metadata: { game: 'context_chicken_arena', duelId, opponentId: loserId, platformRake },
  })

  // platformRake is intentionally not added to the ledger — those credits are
  // consumed (never in circulation). The rake is tracked on ArenaDuel.platformRake
  // and accounted for in buildArenaRakeReport() in reconciliation.ts.

  await tx.arenaDuel.update({
    where: { id: duelId },
    data: { platformRake, winnerPrize },
  })

  // ELO update
  const [winnerStats, loserStats] = await Promise.all([
    db.arenaStats.findUnique({ where: { userId: winnerId } }),
    db.arenaStats.findUnique({ where: { userId: loserId } }),
  ])

  const winnerRating = winnerStats?.rating ?? ELO_CONFIG.initialRating
  const loserRating = loserStats?.rating ?? ELO_CONFIG.initialRating
  const winnerK = (winnerStats?.totalGames ?? 0) < ELO_CONFIG.placementGames ? 50 : ELO_CONFIG.kFactor
  const loserK = (loserStats?.totalGames ?? 0) < ELO_CONFIG.placementGames ? 50 : ELO_CONFIG.kFactor

  const winnerExpected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  const loserExpected = 1 - winnerExpected

  const winnerNewRating = Math.round(winnerRating + winnerK * (1 - winnerExpected))
  const loserNewRating = Math.round(loserRating + loserK * (0 - loserExpected))

  await Promise.all([
    db.arenaStats.upsert({
      where: { userId: winnerId },
      create: { userId: winnerId, rating: winnerNewRating, totalGames: 1, wins: 1, draws: 0, losses: 0, totalCreditsWon: winnerPrize, totalCreditsLost: entryAmount },
      update: { rating: winnerNewRating, totalGames: { increment: 1 }, wins: { increment: 1 }, totalCreditsWon: { increment: winnerPrize } },
    }),
    db.arenaStats.upsert({
      where: { userId: loserId },
      create: { userId: loserId, rating: loserNewRating, totalGames: 1, wins: 0, draws: 0, losses: 1, totalCreditsWon: 0, totalCreditsLost: entryAmount },
      update: { rating: loserNewRating, totalGames: { increment: 1 }, losses: { increment: 1 }, totalCreditsLost: { increment: entryAmount } },
    }),
  ])

  return {
    winnerNewRating,
    loserNewRating,
    winnerDelta: winnerNewRating - winnerRating,
    loserDelta: loserNewRating - loserRating,
  }
}

export async function endDuel(
  duelId: string,
  winnerId: string,
  reason: 'crash' | 'timeout' | 'stopped' | 'abandon',
): Promise<ActiveDuel> {
  const row = await loadDuelRow(duelId)
  if (!row) throw new Error('Duel not found')

  const loserId = row.playerAId === winnerId ? row.playerBId : row.playerAId

  await db.$transaction(async (tx) => {
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: { status: 'completed', endedAt: new Date(), winnerId, endedReason: reason },
    })
    await settleCreditsAndElo(tx, duelId, winnerId, loserId, row.entryAmount)
  })

  const updated = await loadDuelRow(duelId)
  return buildActiveDuel(updated!)
}

export async function abandonDuel(duelId: string, userId: string, reason: string): Promise<void> {
  const row = await db.arenaDuel.findUnique({ where: { id: duelId } })
  if (!row || row.status === 'completed' || row.status === 'abandoned') return

  const opponentId = row.playerAId === userId ? row.playerBId : row.playerAId

  if (row.status === 'waiting') {
    // No opponent yet — cancel and refund both if both joined
    await db.$transaction(async (tx) => {
      await tx.arenaDuel.update({ where: { id: duelId }, data: { status: 'abandoned', endedAt: new Date(), endedReason: reason } })
      for (const pid of [row.playerAId, row.playerBId]) {
        await addLedgerEntry({
          tx, userId: pid, bucket: 'arena_credits', type: 'adjustment',
          amount: row.entryAmount,
          metadata: { reason: 'duel_cancelled', duelId },
        })
      }
    })
    return
  }

  // Active duel — opponent wins
  await db.$transaction(async (tx) => {
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: { status: 'completed', endedAt: new Date(), winnerId: opponentId, endedReason: reason },
    })
    await settleCreditsAndElo(tx, duelId, opponentId, userId, row.entryAmount)
  })
}

// ============================================================================
// Stats & Leaderboard
// ============================================================================

export async function getArenaStats(userId: string) {
  const stats = await db.arenaStats.findUnique({ where: { userId } })
  if (!stats) {
    return { rating: ELO_CONFIG.initialRating, totalGames: 0, wins: 0, draws: 0, losses: 0, winRate: 0, totalCreditsWon: 0, totalCreditsLost: 0, netProfit: 0, isPlacement: true }
  }
  const winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0
  return { rating: stats.rating, totalGames: stats.totalGames, wins: stats.wins, draws: stats.draws, losses: stats.losses, winRate, totalCreditsWon: stats.totalCreditsWon, totalCreditsLost: stats.totalCreditsLost, netProfit: stats.totalCreditsWon - stats.totalCreditsLost, isPlacement: stats.totalGames < ELO_CONFIG.placementGames }
}

export async function getLeaderboard(limit = 100) {
  return db.arenaStats.findMany({
    orderBy: { rating: 'desc' },
    take: limit,
    include: { user: { select: { id: true, email: true } } },
  })
}
