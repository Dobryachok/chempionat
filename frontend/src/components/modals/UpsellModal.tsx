import { useEffect, useState } from 'react'
import { ApiError, api } from '../../api/client'
import type { UpsellOffer } from '../../api/types'
import { formatNumber } from '../../lib/format'
import { useGameStore } from '../../store/useGameStore'
import { Button } from '../ui/Button'
import { IconTicket } from '../ui/Icons'
import { Modal } from '../ui/Modal'
import './UpsellModal.css'

const SUPPRESS_KEY = 'balloon.upsellHidden'

export function isUpsellSuppressed(): boolean {
  return localStorage.getItem(SUPPRESS_KEY) === '1'
}

interface UpsellModalProps {
  open: boolean
  offer: UpsellOffer
  roundId: string
  win: number
  onClose: () => void
}

export function UpsellModal({ open, offer, roundId, win, onClose }: UpsellModalProps) {
  const session = useGameStore((state) => state.session)
  const patchSession = useGameStore((state) => state.patchSession)
  const showToast = useGameStore((state) => state.showToast)
  const markUpsellUsed = useGameStore((state) => state.markUpsellUsed)
  const [secondsLeft, setSecondsLeft] = useState(offer.timeoutSeconds)
  const [suppress, setSuppress] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    if (suppress) {
      localStorage.setItem(SUPPRESS_KEY, '1')
    }
    markUpsellUsed()
    onClose()
  }

  // Auto close after POPUP_TIMEOUT seconds without any interaction.
  useEffect(() => {
    if (!open) return
    setSecondsLeft(offer.timeoutSeconds)
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          close()
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer.timeoutSeconds])

  const buy = async () => {
    if (!session || busy) return
    setBusy(true)
    try {
      const result = await api.acceptUpsell(session.playerId, roundId)
      patchSession({ balance: result.balance, tickets: result.totalTickets })
      showToast(`Куплено билетов: ${result.tickets}`, 'success')
      close()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не удалось оформить покупку'
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Закрепи успех!" showClose>
      <div className="upsell">
        <div className="upsell__tickets" aria-hidden="true">
          <IconTicket size={34} />
          <span className="upsell__tickets-count">{offer.tickets}</span>
        </div>

        <p className="upsell__text">
          Вы забрали {formatNumber(win)} бонусных баллов. Используйте часть выигрыша и купите{' '}
          {offer.tickets} лотерейных билета за {formatNumber(offer.price)} баллов — вдруг именно этот тираж
          станет вашим.
        </p>

        <div className="upsell__price">
          <span className="muted">К списанию</span>
          <b>{formatNumber(offer.price)} баллов</b>
        </div>

        <label className="upsell__suppress">
          <input type="checkbox" checked={suppress} onChange={(event) => setSuppress(event.target.checked)} />
          <span>Больше не показывать это окно</span>
        </label>

        <div className="upsell__actions">
          <Button block size="lg" disabled={busy} onClick={() => void buy()}>
            Купить
          </Button>
          <Button block variant="secondary" onClick={close}>
            Отказаться · {secondsLeft} с
          </Button>
        </div>
      </div>
    </Modal>
  )
}
