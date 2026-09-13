import type {
  AdminConfigResponse,
  AdminGameConfig,
  AdminUpdateResponse,
  HistoryItem,
  PublicConfig,
  Session,
  StartedRound,
  ThemeName,
  TournamentView,
} from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    let code = 'HTTP_' + response.status
    let message = 'Сервер недоступен, попробуйте позже'
    try {
      const body = await response.json()
      code = body.code ?? code
      message = body.message ?? (body.errors?.join('; ') || message)
    } catch {
      /* keep the fallback message */
    }
    throw new ApiError(response.status, code, message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const api = {
  session: () => request<Session>('/api/session', { method: 'POST' }),

  player: (playerId: number) => request<Session>(`/api/players/${playerId}`),

  publicConfig: () => request<PublicConfig>('/api/config/public'),

  history: (limit = 25) => request<HistoryItem[]>(`/api/history?limit=${limit}`),

  tournament: (playerId: number, mask: boolean) =>
    request<TournamentView>(`/api/tournament?playerId=${playerId}&mask=${mask}`),

  startRound: (playerId: number, theme: ThemeName, betOptionId: string) =>
    request<StartedRound>('/api/rounds', {
      method: 'POST',
      body: JSON.stringify({ playerId, theme, betOptionId }),
    }),

  cashout: (roundId: string) =>
    request<{ multiplier: number; win: number; points: number; balance: number; message: string }>(
      `/api/rounds/${roundId}/cashout`,
      { method: 'POST' },
    ),

  acceptUpsell: (playerId: number, roundId: string) =>
    request<{ tickets: number; price: number; balance: number; totalTickets: number }>(
      '/api/upsell/accept',
      { method: 'POST', body: JSON.stringify({ playerId, roundId }) },
    ),

  adminConfig: () => request<AdminConfigResponse>('/api/admin/config'),

  saveAdminConfig: (config: AdminGameConfig) =>
    request<AdminUpdateResponse>('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
}

export function gameSocketUrl(roundId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/game?roundId=${encodeURIComponent(roundId)}`
}
