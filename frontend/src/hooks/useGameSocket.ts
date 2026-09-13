import { useEffect, useRef, useState } from 'react'
import { gameSocketUrl } from '../api/client'
import type {
  BoostEvent,
  CashoutEvent,
  CrashEvent,
  GameEvent,
  LevelEvent,
  StateEvent,
  TickEvent,
} from '../api/types'

export interface SocketHandlers {
  onState?: (event: StateEvent) => void
  onTick?: (event: TickEvent) => void
  onLevel?: (event: LevelEvent) => void
  onBoost?: (event: BoostEvent) => void
  onCashout?: (event: CashoutEvent) => void
  onCrash?: (event: CrashEvent) => void
  onError?: (message: string) => void
}

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed'

/**
 * Real-time channel of one flight. The server owns the multiplier; the client only asks
 * for a cashout and renders what arrives.
 */
export function useGameSocket(roundId: string | null, handlers: SocketHandlers) {
  const [status, setStatus] = useState<SocketStatus>('idle')
  const socketRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  const finishedRef = useRef(false)

  // Handlers change on every render, so they are kept in a ref instead of reconnecting.
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!roundId) {
      setStatus('idle')
      return
    }

    finishedRef.current = false
    let disposed = false
    let retries = 0
    let retryTimer: number | undefined

    const connect = () => {
      if (disposed) return
      setStatus('connecting')
      const socket = new WebSocket(gameSocketUrl(roundId))
      socketRef.current = socket

      socket.onopen = () => setStatus('open')

      socket.onmessage = (message) => {
        let event: GameEvent
        try {
          event = JSON.parse(message.data as string) as GameEvent
        } catch {
          return
        }
        const current = handlersRef.current
        switch (event.type) {
          case 'state':
            current.onState?.(event)
            break
          case 'tick':
            current.onTick?.(event)
            break
          case 'level':
            current.onLevel?.(event)
            break
          case 'boost':
            current.onBoost?.(event)
            break
          case 'cashout':
            current.onCashout?.(event)
            break
          case 'crash':
            finishedRef.current = true
            current.onCrash?.(event)
            break
          case 'error':
            current.onError?.(event.message)
            break
          default:
            break
        }
      }

      socket.onclose = () => {
        setStatus('closed')
        if (disposed || finishedRef.current || retries >= 3) return
        retries += 1
        retryTimer = window.setTimeout(connect, 500 * retries)
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) window.clearTimeout(retryTimer)
      const socket = socketRef.current
      socketRef.current = null
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [roundId])

  const sendCashout = () => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'cashout' }))
      return true
    }
    return false
  }

  return { status, sendCashout }
}
