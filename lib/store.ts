'use client'

import { create } from 'zustand'
import type {
  ArenaGameId,
  ArenaGameStatus,
  DifficultyTier,
  CreditBalances,
  ApiKeyEntry,
  LedgerEntry,
  GameStat,
  GameSession,
  GameResult,
  PlayerProgression,
  ProgressionUpdate,
  CreditPack,
} from './types'

interface ArenaStore {
  // Dashboard data (fetched from /api/credits/balance)
  balances: CreditBalances | null
  keys: ApiKeyEntry[]
  recentLedger: LedgerEntry[]
  gameStats: GameStat[]
  progression: PlayerProgression | null
  lastProgression: ProgressionUpdate | null
  isAdmin: boolean
  dashboardLoading: boolean
  dashboardError: string | null

  // Active game state
  activeGame: ArenaGameId
  selectedTier: DifficultyTier
  gameStatus: ArenaGameStatus
  activeSession: GameSession | null
  lastResult: GameResult | null

  // Actions
  loadDashboard: () => Promise<void>
  setActiveGame: (game: ArenaGameId) => void
  setSelectedTier: (tier: DifficultyTier) => void
  startGame: () => Promise<void>
  submitGame: (submission: Record<string, unknown>) => Promise<void>
  /** Settle the active session from a custom action endpoint (e.g. token_mines). */
  settleFromAction: (params: {
    game: ArenaGameId
    score: number
    rewardAmount: number
    flavorMessage: string
    challenge: Record<string, unknown>
    progression?: ProgressionUpdate | null
  }) => Promise<void>
  resetGame: () => void
  createKey: (name: string) => Promise<string>
  revokeKey: (keyId: string) => Promise<void>
  buyCredits: (pack: CreditPack) => Promise<void>
}

export const useArenaStore = create<ArenaStore>((set, get) => ({
  balances: null,
  keys: [],
  recentLedger: [],
  gameStats: [],
  progression: null,
  lastProgression: null,
  isAdmin: false,
  dashboardLoading: false,
  dashboardError: null,

  activeGame: 'token_prophet',
  selectedTier: 'sandbox',
  gameStatus: 'idle',
  activeSession: null,
  lastResult: null,

  loadDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null })
    try {
      const res = await fetch('/api/credits/balance')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      set({
        balances: json.balances,
        keys: json.keys,
        isAdmin: json.isAdmin ?? false,
        recentLedger: json.recentLedger,
        gameStats: json.gameStats,
        progression: json.progression ?? null,
        dashboardLoading: false,
      })
    } catch (e) {
      set({ dashboardError: e instanceof Error ? e.message : 'Failed to load', dashboardLoading: false })
    }
  },

  setActiveGame: (game) => {
    if (get().gameStatus === 'active' || get().gameStatus === 'submitting' || get().gameStatus === 'loading') return
    set({ activeGame: game, gameStatus: 'idle', activeSession: null, lastResult: null })
  },

  setSelectedTier: (tier) => {
    if (get().gameStatus === 'active' || get().gameStatus === 'submitting' || get().gameStatus === 'loading') return
    set({ selectedTier: tier })
  },

  startGame: async () => {
    set({ gameStatus: 'loading', activeSession: null, lastResult: null, dashboardError: null })
    try {
      const res = await fetch('/api/games/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ game: get().activeGame, tier: get().selectedTier }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not start game')
      set({
        gameStatus: 'active',
        activeSession: {
          sessionId: json.sessionId,
          game: json.game,
          challenge: json.challenge ?? {},
          entryCost: json.entryCost,
          tier: json.tier ?? 'sandbox',
          serverSeedHash: json.serverSeedHash ?? null,
          expiresAt: json.expiresAt ?? null,
        },
      })
      await get().loadDashboard()
    } catch (e) {
      set({ gameStatus: 'idle', dashboardError: e instanceof Error ? e.message : 'Game start failed' })
    }
  },

  submitGame: async (submission) => {
    const session = get().activeSession
    if (!session) return
    set({ gameStatus: 'submitting' })
    try {
      const res = await fetch('/api/games/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, submission }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submit failed')
      set({
        gameStatus: 'result',
        lastResult: {
          game: json.game,
          score: json.score,
          rewardAmount: json.rewardAmount,
          flavorMessage: json.flavorMessage ?? '',
          challenge: json.challenge ?? {},
          fairness: json.fairness ?? { serverSeed: null, serverSeedHash: null, clientSeed: null },
        },
        lastProgression: json.progression ?? null,
        activeSession: null,
      })
      await get().loadDashboard()
    } catch (e) {
      set({ gameStatus: 'idle', dashboardError: e instanceof Error ? e.message : 'Submit failed' })
    }
  },

  settleFromAction: async (params) => {
    set({
      gameStatus: 'result',
      lastResult: {
        game: params.game,
        score: params.score,
        rewardAmount: params.rewardAmount,
        flavorMessage: params.flavorMessage,
        challenge: params.challenge,
        fairness: { serverSeed: null, serverSeedHash: null, clientSeed: null },
      },
      lastProgression: params.progression ?? null,
      activeSession: null,
    })
    await get().loadDashboard()
  },

  resetGame: () => set({ gameStatus: 'idle', activeSession: null, lastResult: null }),

  createKey: async (name) => {
    const res = await fetch('/api/keys/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create key')
    await get().loadDashboard()
    return json.rawKey as string
  },

  revokeKey: async (keyId) => {
    const res = await fetch('/api/keys/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keyId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to revoke key')
    await get().loadDashboard()
  },

  buyCredits: async (pack) => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pack }),
    })
    const json = await res.json()
    if (!res.ok || !json.url) throw new Error(json.error ?? 'Checkout failed')
    window.location.href = json.url
  },
}))
