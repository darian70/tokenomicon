import { eventBus, type GameEvent } from '@/lib/server/event-bus'

export const runtime = 'nodejs'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: GameEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // stream closed
        }
      }

      const unsubscribe = eventBus.subscribe(send)

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
        }
      }, 15_000)

      // Cleanup when the client disconnects
      const cleanup = () => {
        unsubscribe()
        clearInterval(keepAlive)
      }

      // Store cleanup for cancel
      ;(controller as unknown as { _cleanup: () => void })._cleanup = cleanup
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void }
      c._cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}
