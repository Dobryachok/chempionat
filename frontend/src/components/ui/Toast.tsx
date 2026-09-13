import { useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import './Toast.css'

export function Toast() {
  const toast = useGameStore((state) => state.toast)
  const hideToast = useGameStore((state) => state.hideToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(hideToast, 2800)
    return () => window.clearTimeout(timer)
  }, [toast, hideToast])

  if (!toast) return null

  return (
    <div className={`toast toast--${toast.tone}`} role="status">
      {toast.text}
    </div>
  )
}
