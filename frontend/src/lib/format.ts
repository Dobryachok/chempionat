const numberFormat = new Intl.NumberFormat('ru-RU')

export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value))
}

export function formatMultiplier(value: number): string {
  return `x${value.toFixed(2)}`
}

export function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}

/** Tournament countdown: days while there is a lot of time left, otherwise hh:mm:ss. */
export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return 'завершён'
  const days = Math.floor(secondsLeft / 86400)
  if (days >= 1) {
    const plural = days % 10 === 1 && days % 100 !== 11 ? 'день' : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20) ? 'дня' : 'дней'
    return `${days} ${plural}`
  }
  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const seconds = Math.floor(secondsLeft % 60)
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBoosterLabel(tier: number, value: number): string {
  return tier <= 1 ? 'Без бустера' : `x${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}`
}

export function shortHash(hash: string): string {
  return hash.length <= 14 ? hash : `${hash.slice(0, 8)}…${hash.slice(-6)}`
}
