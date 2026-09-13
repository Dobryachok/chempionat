import { create } from 'zustand'
import { ApiError, api } from '../api/client'
import type { CashoutEvent, CrashEvent, PublicConfig, Session, StartedRound, ThemeName } from '../api/types'

const STORAGE = {
  theme: 'balloon.theme',
  onboarding: 'balloon.onboardingSeen',
  sound: 'balloon.sound',
  mask: 'balloon.maskNames',
  round: 'balloon.activeRound',
  upsell: 'balloon.upsellUsed',
}

/** Unfinished rounds are only restored for an hour, as described in the docs. */
const ROUND_TTL_MS = 60 * 60 * 1000

type Tone = 'info' | 'error' | 'success'

interface Toast {
  id: number
  text: string
  tone: Tone
}

interface GameState {
  session: Session | null
  config: PublicConfig | null
  theme: ThemeName
  round: StartedRound | null
  cashout: CashoutEvent | null
  result: CrashEvent | null
  bootstrapped: boolean
  bootError: string | null
  toast: Toast | null
  onboardingSeen: boolean
  upsellUsedThisSession: boolean
  soundEnabled: boolean
  maskNames: boolean

  bootstrap: () => Promise<void>
  refreshSession: () => Promise<void>
  setTheme: (theme: ThemeName) => void
  startRound: (betOptionId: string) => Promise<StartedRound | null>
  restoreRound: (round: StartedRound) => void
  setCashout: (event: CashoutEvent) => void
  finishRound: (event: CrashEvent) => void
  clearRound: () => void
  showToast: (text: string, tone?: Tone) => void
  hideToast: () => void
  markOnboardingSeen: () => void
  markUpsellUsed: () => void
  toggleSound: () => void
  toggleMask: () => void
  patchSession: (patch: Partial<Session>) => void
}

function readTheme(): ThemeName {
  return localStorage.getItem(STORAGE.theme) === 'green' ? 'green' : 'red'
}

function readStoredRound(): StartedRound | null {
  try {
    const raw = localStorage.getItem(STORAGE.round)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt: number; round: StartedRound }
    if (Date.now() - parsed.savedAt > ROUND_TTL_MS) {
      localStorage.removeItem(STORAGE.round)
      return null
    }
    return parsed.round
  } catch {
    return null
  }
}

function storeRound(round: StartedRound | null) {
  if (round) {
    localStorage.setItem(STORAGE.round, JSON.stringify({ savedAt: Date.now(), round }))
  } else {
    localStorage.removeItem(STORAGE.round)
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  config: null,
  theme: readTheme(),
  round: null,
  cashout: null,
  result: null,
  bootstrapped: false,
  bootError: null,
  toast: null,
  onboardingSeen: localStorage.getItem(STORAGE.onboarding) === '1',
  upsellUsedThisSession: sessionStorage.getItem(STORAGE.upsell) === '1',
  soundEnabled: localStorage.getItem(STORAGE.sound) !== '0',
  maskNames: localStorage.getItem(STORAGE.mask) !== '0',

  bootstrap: async () => {
    try {
      const [session, config] = await Promise.all([api.session(), api.publicConfig()])
      // A round that is still in the air survives a page reload.
      const stored = readStoredRound()
      const round = stored && stored.roundId === session.activeRoundId ? stored : null
      if (!round) {
        storeRound(null)
      }
      set({
        session,
        config,
        round,
        bootstrapped: true,
        bootError: null,
        theme: round ? round.theme : get().theme,
      })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не удалось соединиться с сервером'
      set({ bootstrapped: true, bootError: message })
    }
  },

  refreshSession: async () => {
    const current = get().session
    if (!current) return
    try {
      const session = await api.player(current.playerId)
      set({ session })
    } catch {
      /* the balance will be refreshed with the next event */
    }
  },

  setTheme: (theme) => {
    localStorage.setItem(STORAGE.theme, theme)
    set({ theme })
  },

  startRound: async (betOptionId) => {
    const { session, theme } = get()
    if (!session) return null
    try {
      const round = await api.startRound(session.playerId, theme, betOptionId)
      storeRound(round)
      set({
        round,
        result: null,
        cashout: null,
        session: { ...session, balance: round.balance },
      })
      return round
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не удалось начать раунд'
      get().showToast(message, 'error')
      return null
    }
  },

  restoreRound: (round) => {
    storeRound(round)
    set({ round, theme: round.theme })
  },

  setCashout: (event) => {
    const session = get().session
    set({
      cashout: event,
      session: session ? { ...session, balance: event.balance } : session,
    })
  },

  finishRound: (event) => {
    storeRound(null)
    const session = get().session
    set({
      result: event,
      session: session
        ? { ...session, balance: event.balance, gamePoints: event.gamePoints }
        : session,
    })
  },

  clearRound: () => {
    storeRound(null)
    set({ round: null, result: null, cashout: null })
  },

  showToast: (text, tone = 'info') => set({ toast: { id: Date.now(), text, tone } }),

  hideToast: () => set({ toast: null }),

  markOnboardingSeen: () => {
    localStorage.setItem(STORAGE.onboarding, '1')
    set({ onboardingSeen: true })
  },

  markUpsellUsed: () => {
    sessionStorage.setItem(STORAGE.upsell, '1')
    set({ upsellUsedThisSession: true })
  },

  toggleSound: () => {
    const next = !get().soundEnabled
    localStorage.setItem(STORAGE.sound, next ? '1' : '0')
    set({ soundEnabled: next })
  },

  toggleMask: () => {
    const next = !get().maskNames
    localStorage.setItem(STORAGE.mask, next ? '1' : '0')
    set({ maskNames: next })
  },

  patchSession: (patch) => {
    const session = get().session
    if (!session) return
    set({ session: { ...session, ...patch } })
  },
}))

export function themeConfig(config: PublicConfig | null, theme: ThemeName) {
  return config ? config.themes[theme] : null
}
