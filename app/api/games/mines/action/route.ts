import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserProfile } from '@/lib/server/auth'
import { revealMinesCell, cashOutMines } from '@/lib/server/games'
import { eventBus } from '@/lib/server/event-bus'
import { updateProgression } from '@/lib/server/progression'

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reveal'),
    sessionId: z.string().min(1),
    cellIndex: z.number().int().min(0).max(24),
  }),
  z.object({
    action: z.literal('cashout'),
    sessionId: z.string().min(1),
  }),
])

export async function POST(req: Request) {
  try {
    const user = await requireUserProfile()
    const body = schema.parse(await req.json())

    const result = body.action === 'reveal'
      ? await revealMinesCell({ userId: user.id, sessionId: body.sessionId, cellIndex: body.cellIndex })
      : await cashOutMines({ userId: user.id, sessionId: body.sessionId })

    // If the action settled the session, broadcast + update progression (mirrors /api/games/submit).
    if (result.resolved) {
      const r = result.resolved
      const progression = await updateProgression({
        userId: user.id,
        game: 'token_mines',
        score: r.score,
        rewardAmount: r.reward,
      })
      eventBus.emit({
        type: 'game_result',
        displayName: user.email?.split('@')[0] ?? 'anon',
        game: 'token_mines',
        score: r.score,
        reward: r.reward,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({
        ok: true,
        state: result.state,
        resolved: {
          ...r,
          progression: progression ?? null,
        },
      })
    }

    return NextResponse.json({ ok: true, state: result.state })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
