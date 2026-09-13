import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconClose } from './Icons'
import './Modal.css'

interface ModalProps {
  open: boolean
  title?: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Sheets can be dismissed by swiping down on touch screens. */
  variant?: 'dialog' | 'sheet'
  showClose?: boolean
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  variant = 'dialog',
  showClose = true,
}: ModalProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleTouchStart = (event: React.TouchEvent) => {
    if (variant !== 'sheet') return
    startY.current = event.touches[0].clientY
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (variant !== 'sheet' || startY.current === null) return
    const delta = event.touches[0].clientY - startY.current
    setDragOffset(Math.max(0, delta))
  }

  const handleTouchEnd = () => {
    if (dragOffset > 110) {
      onClose()
    }
    setDragOffset(0)
    startY.current = null
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__backdrop" onClick={onClose} />
      <div
        className={`modal__panel modal__panel--${variant}`}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {variant === 'sheet' && <div className="modal__grabber" />}
        {(title || showClose) && (
          <header className="modal__header">
            <div>
              {title && <h2 className="modal__title">{title}</h2>}
              {subtitle && <p className="modal__subtitle">{subtitle}</p>}
            </div>
            {showClose && (
              <button className="modal__close" onClick={onClose} aria-label="Закрыть">
                <IconClose />
              </button>
            )}
          </header>
        )}
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}
