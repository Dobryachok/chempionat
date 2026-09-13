import type { Participant, TournamentView } from '../../api/types'
import { formatCountdown, formatNumber } from '../../lib/format'
import { useGameStore } from '../../store/useGameStore'
import './TournamentTable.css'

interface TournamentTableProps {
  view: TournamentView | null
  changed?: Record<number, 'same' | 'moved'>
  /** Rows visible before the list starts scrolling. */
  maxHeight?: number
}

function Row({
  participant,
  change,
  pinned = false,
}: {
  participant: Participant
  change?: 'same' | 'moved'
  pinned?: boolean
}) {
  const classes = [
    'tournament-row',
    participant.current ? 'is-current' : '',
    pinned ? 'is-pinned' : '',
    change === 'same' ? 'is-flash-short' : '',
    change === 'moved' ? 'is-flash-long' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={classes}>
      <span className={`tournament-row__rank ${participant.rank <= 3 ? 'is-top' : ''}`}>{participant.rank}</span>
      <span className="tournament-row__name">{participant.name}</span>
      <span className="tournament-row__points">{formatNumber(participant.points)}</span>
    </li>
  )
}

export function TournamentTable({ view, changed = {}, maxHeight = 260 }: TournamentTableProps) {
  const maskNames = useGameStore((state) => state.maskNames)
  const toggleMask = useGameStore((state) => state.toggleMask)

  if (!view) {
    return <p className="tournament__empty">Загружаем таблицу…</p>
  }

  const top = view.participants.slice(0, 3)
  const rest = view.participants.slice(3)
  const current = view.participants.find((participant) => participant.current)
  const currentInRest = current ? rest.some((participant) => participant.id === current.id) : false

  return (
    <div className="tournament">
      <div className="tournament__head">
        <div>
          <p className="tournament__name">{view.name ?? 'Турнир не запущен'}</p>
          <p className="tournament__timer">
            {view.active ? `До окончания: ${formatCountdown(view.secondsLeft)}` : 'Турнир завершён'}
          </p>
        </div>
        <label className="tournament__mask">
          <input type="checkbox" checked={maskNames} onChange={toggleMask} />
          <span>Скрывать имена</span>
        </label>
      </div>

      {view.description && <p className="tournament__description">{view.description}</p>}

      <ul className="tournament__top">
        {top.map((participant) => (
          <Row key={participant.id} participant={participant} change={changed[participant.id]} />
        ))}
      </ul>

      <ul className="tournament__list" style={{ maxHeight }}>
        {rest.map((participant) => (
          <Row key={participant.id} participant={participant} change={changed[participant.id]} />
        ))}
      </ul>

      {current && currentInRest && (
        <ul className="tournament__pinned">
          <Row participant={current} change={changed[current.id]} pinned />
        </ul>
      )}
    </div>
  )
}
