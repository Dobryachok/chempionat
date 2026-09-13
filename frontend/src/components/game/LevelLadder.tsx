import { IconBoost } from '../ui/Icons'
import './LevelLadder.css'

interface LevelLadderProps {
  /** Multiplier thresholds of the theme, from the first level upwards. */
  thresholds: number[]
  /** How many levels the balloon has already crossed. */
  passed?: number
  /** Level holding the booster, 0 when the round has none. */
  boosterLevel?: number
  boosterValue?: number
  boosterApplied?: boolean
  /** Level currently being highlighted by a flash. */
  flashLevel?: number | null
  compact?: boolean
}

export function LevelLadder({
  thresholds,
  passed = 0,
  boosterLevel = 0,
  boosterValue = 1,
  boosterApplied = false,
  flashLevel = null,
  compact = false,
}: LevelLadderProps) {
  // Rendered top down: the highest level is the top of the flight.
  const levels = thresholds.map((threshold, index) => ({ level: index + 1, threshold })).reverse()
  const showBoosterColumn = boosterLevel > 0

  return (
    <ol className={`ladder ${compact ? 'ladder--compact' : ''}`} aria-label="Уровни полёта">
      {levels.map(({ level, threshold }) => {
        const isPassed = level <= passed
        const hasBooster = boosterLevel === level
        const classes = [
          'ladder__item',
          isPassed ? 'is-passed' : '',
          hasBooster ? 'is-booster' : '',
          flashLevel === level ? 'is-flashing' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const isCurrent = level === passed && passed > 0

        return (
          <li key={level} className={classes}>
            {showBoosterColumn &&
              (hasBooster ? (
                <span className={`ladder__booster ${boosterApplied ? 'is-applied' : ''}`}>
                  <IconBoost size={14} />
                  x{boosterValue % 1 === 0 ? boosterValue.toFixed(0) : boosterValue.toFixed(1)}
                </span>
              ) : (
                <span className="ladder__booster-spacer" aria-hidden="true" />
              ))}
            <div className={`ladder__row ${isCurrent ? 'is-current' : ''}`}>
              <span className="ladder__marker">{level}</span>
              <span className="ladder__threshold">x{threshold.toFixed(2)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
