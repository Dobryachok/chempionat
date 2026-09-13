import { useEffect, useRef } from 'react'
import type { Participant } from '../../api/types'
import { formatNumber } from '../../lib/format'
import './LiveRating.css'

interface LiveRatingProps {
  participants: Participant[]
  changed: Record<number, 'same' | 'moved'>
  currentRank: number
}

/**
 * Horizontal rating strip shown above the flight: one chip per tournament participant,
 * sorted by points, with the current player highlighted in the theme colour.
 */
export function LiveRating({ participants, changed, currentRank }: LiveRatingProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const currentRef = useRef<HTMLLIElement>(null)

  // Keep the player's chip in view when their position moves.
  useEffect(() => {
    const chip = currentRef.current
    if (!chip || !listRef.current) return
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentRank])

  if (participants.length === 0) return null

  return (
    <div className="live-rating">
      <span className="live-rating__label">Рейтинг турнира</span>
      <ul className="live-rating__list" ref={listRef}>
        {participants.map((participant) => {
          const change = changed[participant.id]
          const classes = [
            'live-rating__chip',
            participant.current ? 'is-current' : '',
            change === 'same' ? 'is-flash-short' : '',
            change === 'moved' ? 'is-flash-long' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={participant.id} className={classes} ref={participant.current ? currentRef : undefined}>
              <span className="live-rating__rank">{participant.rank}</span>
              <span className="live-rating__points">{formatNumber(participant.points)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
