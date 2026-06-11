type Listener = (event: GameEvent) => void

export interface GameEvent {
  type: 'game_result'
  displayName: string
  game: string
  score: number
  reward: number
  timestamp: string
}

class EventBus {
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: GameEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // ignore listener errors
      }
    }
  }
}

const globalForBus = globalThis as unknown as { eventBus?: EventBus }
export const eventBus = globalForBus.eventBus ?? new EventBus()
if (process.env.NODE_ENV !== 'production') globalForBus.eventBus = eventBus
