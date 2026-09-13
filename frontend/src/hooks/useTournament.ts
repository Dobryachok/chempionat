import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { TournamentView } from '../api/types'
import { useGameStore } from '../store/useGameStore'

/**
 * Polls the tournament once per second, which is the interval allowed for the MVP,
 * and reports which participants changed so the UI can flash them.
 */
export function useTournament(enabled: boolean, intervalMs = 1000) {
  const session = useGameStore((state) => state.session)
  const maskNames = useGameStore((state) => state.maskNames)
  const [view, setView] = useState<TournamentView | null>(null)
  const [changed, setChanged] = useState<Record<number, 'same' | 'moved'>>({})
  const previous = useRef<Map<number, { points: number; rank: number }>>(new Map())

  useEffect(() => {
    if (!enabled || !session) return
    let disposed = false

    const load = async () => {
      try {
        const next = await api.tournament(session.playerId, maskNames)
        if (disposed) return
        const changes: Record<number, 'same' | 'moved'> = {}
        next.participants.forEach((participant) => {
          const before = previous.current.get(participant.id)
          if (before && before.points !== participant.points) {
            changes[participant.id] = before.rank === participant.rank ? 'same' : 'moved'
          }
          previous.current.set(participant.id, { points: participant.points, rank: participant.rank })
        })
        setView(next)
        setChanged(changes)
      } catch {
        /* keep the previous snapshot on a transient error */
      }
    }

    void load()
    const timer = window.setInterval(load, intervalMs)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [enabled, session, maskNames, intervalMs])

  return { view, changed }
}
