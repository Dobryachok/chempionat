export type ThemeName = 'red' | 'green'

export interface Session {
  playerId: number
  name: string
  balance: number
  gamePoints: number
  tickets: number
  collectedPieces: number[]
  totalPieces: number
  activeRoundId?: string | null
}

export interface BetOption {
  id: string
  cost: number
  boosterTier: number
  boosterValue: number
}

export interface ThemeConfig {
  title: string
  levels: number
  levelMultipliers: number[]
  betOptions: BetOption[]
}

export interface PointsConfig {
  pointsPerLine: number
  pointsCashoutBonus: number
  pointsX2Bonus: number
  pointsX3Bonus: number
  pointsX4Bonus: number
}

export interface BoostersConfig {
  multiplierTier1Value: number
  multiplierTier2Value: number
  multiplierTier3Value: number
  multiplierTier4Value: number
}

export interface UpsellConfig {
  minWinAmount: number
  popupTimeoutSeconds: number
  ticketPrice: number
  maxTickets: number
}

export interface PublicConfig {
  gameId: string
  gameName: string
  active: boolean
  version: number
  math: { fps: number; growthRate: number; maxMultiplier: number; delta: number }
  points: PointsConfig
  boosters: BoostersConfig
  upsell: UpsellConfig
  themes: Record<ThemeName, ThemeConfig>
}

export interface StartedRound {
  roundId: string
  commitHash: string
  theme: ThemeName
  bet: number
  boosterTier: number
  boosterValue: number
  boosterLevel: number
  levels: number
  levelMultipliers: number[]
  balance: number
  fps: number
  growthRate: number
}

export interface HistoryItem {
  id: string
  playerName: string
  theme: ThemeName
  bet: number
  boosterTier: number
  boosterApplied: boolean
  cashoutMultiplier: number | null
  crashMultiplier: number
  win: number
  points: number
  levelsReached: number
  rewardTitle: string | null
  status: 'CASHED_OUT' | 'CRASHED'
  finishedAt: string
}

export interface Participant {
  id: number
  name: string
  points: number
  rank: number
  current: boolean
}

export interface TournamentView {
  active: boolean
  name: string | null
  description: string | null
  endsAt: string | null
  secondsLeft: number
  participants: Participant[]
  currentRank: number
  currentPoints: number
}

export interface UpsellOffer {
  eligible: boolean
  tickets: number
  price: number
  ticketPrice: number
  timeoutSeconds: number
  minWinAmount: number
}

export interface RoundReward {
  index: number
  title: string
  rarity: 'common' | 'rare' | 'epic'
  collected: number
  total: number
}

export interface Fairness {
  commitHash: string
  serverSeed: string
  lootLine: number
  formula: string
}

/* Real-time events pushed by the server over the websocket. */

export interface StateEvent {
  type: 'state'
  roundId: string
  theme: ThemeName
  bet: number
  boosterTier: number
  boosterValue: number
  boosterLevel: number
  boosterApplied: boolean
  levels: number
  levelMultipliers: number[]
  multiplier: number
  level: number
  tick: number
  fps: number
  growthRate: number
  cashedOut: boolean
  cashoutMultiplier: number | null
  points: number
  commitHash: string
}

export interface TickEvent {
  type: 'tick'
  multiplier: number
  baseMultiplier: number
  level: number
  tick: number
}

export interface LevelEvent {
  type: 'level'
  level: number
  points: number
  totalPoints: number
  multiplier: number
}

export interface BoostEvent {
  type: 'boost'
  level: number
  boosterTier: number
  boosterValue: number
  multiplier: number
  points: number
  totalPoints: number
}

export interface CashoutEvent {
  type: 'cashout'
  multiplier: number
  win: number
  points: number
  cashoutBonus: number
  balance: number
  message: string
}

export interface CrashEvent {
  type: 'crash'
  crashMultiplier: number
  baseCrashMultiplier: number
  cashedOut: boolean
  cashoutMultiplier: number | null
  win: number
  bet: number
  points: number
  levelsReached: number
  levels: number
  boosterApplied: boolean
  boosterValue: number
  boosterLevel: number
  balance: number
  gamePoints: number
  theme: ThemeName
  reward: RoundReward
  fairness: Fairness
  upsell: UpsellOffer
}

export interface ErrorEvent {
  type: 'error'
  message: string
}

export interface PongEvent {
  type: 'pong'
}

export type GameEvent =
  | StateEvent
  | TickEvent
  | LevelEvent
  | BoostEvent
  | CashoutEvent
  | CrashEvent
  | ErrorEvent
  | PongEvent

/* Admin panel */

export interface AdminGameConfig {
  basic: { gameId: string; gameName: string; gameType: string; isActive: boolean }
  math: {
    alpha: number
    minCrashMultiplier: number
    maxMultiplier: number
    multiplierGrowthRate: number
    fps: number
    delta: number
    instantCrashProbability: number
  }
  points: PointsConfig
  boosters: BoostersConfig
  upsell: UpsellConfig
  themes: Record<
    ThemeName,
    {
      title: string
      levels: number
      levelMultipliers: number[]
      lootProbabilities: number[]
      betOptions: { id: string; cost: number; boosterTier: number }[]
    }
  >
  dev: { fixedSeed: string | null }
}

export interface AdminConfigResponse {
  config: AdminGameConfig
  version: number
  updatedAt: string
  path: string
}

export interface AdminUpdateResponse {
  applied: boolean
  version: number
  updatedAt: string
  errors: string[]
}
