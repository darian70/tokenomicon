import { NextResponse } from 'next/server'
import { requireUserProfile } from '@/lib/server/auth'
import { getDuel, connectPlayer, startDuel, submitMessage, abandonDuel, type ActiveDuel } from '@/lib/server/arena-matchmaking'

export async function GET(req: Request) {
  try {
    const user = await requireUserProfile()
    const { searchParams } = new URL(req.url)
    const duelId = searchParams.get('id')

    if (!duelId) {
      return NextResponse.json({ error: 'Duel ID required' }, { status: 400 })
    }

    const result = await connectPlayer(duelId, user.id)

    if (!result.player) {
      return NextResponse.json({ error: 'Not a participant in this duel' }, { status: 403 })
    }

    // Auto-start duel when both players connect
    if (result.duel.status === 'waiting' && result.duel.playerB?.connected) {
      await startDuel(duelId)
    }

    return NextResponse.json({
      duel: sanitizeDuelForPlayer(result.duel, user.id),
      player: result.player,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = await req.json()
    const { duelId, action, content } = body

    if (!duelId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    switch (action) {
      case 'message': {
        if (!content) {
          return NextResponse.json({ error: 'Message content required' }, { status: 400 })
        }
        const result = await submitMessage(duelId, user.id, content)
        return NextResponse.json({
          message: result.message,
          crashed: result.crashed,
          duel: sanitizeDuelForPlayer(result.duel, user.id),
        })
      }

      case 'forfeit': {
        await abandonDuel(duelId, user.id, 'forfeit')
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// Sanitize duel data to only show relevant info to each player
function sanitizeDuelForPlayer(duel: ActiveDuel, userId: string): unknown {
  const isPlayerA = duel.playerA.userId === userId
  const player = isPlayerA ? duel.playerA : duel.playerB
  const opponent = isPlayerA ? duel.playerB : duel.playerA

  const rc = duel.ratingChanges
  const ratingDelta = rc
    ? (rc.winnerId === userId ? rc.winnerDelta : rc.loserDelta)
    : null
  const newRating = rc
    ? (rc.winnerId === userId ? rc.winnerNewRating : rc.loserNewRating)
    : null

  return {
    id: duel.id,
    status: duel.status,
    model: duel.model,
    maxTokens: duel.maxTokens,
    startedAt: duel.startedAt,
    endedAt: duel.endedAt,
    winnerId: duel.winnerId,
    ratingDelta,
    newRating,
    player: {
      userId: player?.userId,
      username: player?.username,
      rating: player?.rating,
      totalTokens: player?.totalTokens,
      crashed: player?.crashed,
      connected: player?.connected,
    },
    opponent: opponent ? {
      username: opponent.username,
      rating: opponent.rating,
      totalTokens: opponent.totalTokens,
      crashed: opponent.crashed,
      connected: opponent.connected,
    } : null,
    messages: player?.messages,
  }
}
