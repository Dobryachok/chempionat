import type { HistoryItem } from '../../api/types'
import { formatMultiplier, formatNumber, formatTime } from '../../lib/format'
import './HistoryList.css'

interface HistoryListProps {
  items: HistoryItem[]
  emptyText?: string
}

export function HistoryList({ items, emptyText = 'Раундов пока нет' }: HistoryListProps) {
  if (items.length === 0) {
    return <p className="history__empty">{emptyText}</p>
  }

  return (
    <ul className="history">
      {items.map((item) => {
        const won = item.status === 'CASHED_OUT' && item.win > 0
        return (
          <li key={item.id} className="history__row">
            <span className={`history__dot history__dot--${item.theme}`} aria-hidden="true" />
            <div className="history__main">
              <span className="history__player">{item.playerName}</span>
              <span className="history__meta">
                {formatNumber(item.bet)} б · {item.levelsReached} ур.
                {item.boosterApplied ? ` · бустер x${item.boosterTier}` : ''}
              </span>
            </div>
            <div className="history__numbers">
              <span className={`history__multiplier ${won ? 'is-win' : 'is-loss'}`}>
                {formatMultiplier(won ? (item.cashoutMultiplier ?? 0) : item.crashMultiplier)}
              </span>
              <span className="history__time">{formatTime(item.finishedAt)}</span>
            </div>
            <span className={`history__result ${won ? 'is-win' : 'is-loss'}`}>
              {won ? `+${formatNumber(item.win)}` : `−${formatNumber(item.bet)}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
