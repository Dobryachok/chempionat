import { useEffect, useMemo, useRef } from 'react'
import { audio } from '../../lib/audio'
import { useGameStore } from '../../store/useGameStore'
import './Sky.css'

interface Drifter {
  id: string
  top: number
  duration: number
  delay: number
  scale: number
  direction: 1 | -1
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** From one to three items, regenerated every time the screen is mounted. */
function generate(kind: 'cloud' | 'bird'): Drifter[] {
  const count = 1 + Math.floor(Math.random() * 3)
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    top: kind === 'cloud' ? randomBetween(4, 46) : randomBetween(8, 60),
    // Birds move noticeably faster than clouds, which creates the sense of depth.
    duration: kind === 'cloud' ? randomBetween(48, 90) : randomBetween(14, 26),
    delay: -randomBetween(0, 30),
    scale: kind === 'cloud' ? randomBetween(0.75, 1.5) : randomBetween(0.6, 1.15),
    direction: Math.random() > 0.35 ? 1 : -1,
  }))
}

interface SkyProps {
  /** Random bird chirps every 1.8-5 seconds, as described in the brief. */
  withBirdSounds?: boolean
}

export function Sky({ withBirdSounds = false }: SkyProps) {
  const clouds = useMemo(() => generate('cloud'), [])
  const birds = useMemo(() => generate('bird'), [])
  const soundEnabled = useGameStore((state) => state.soundEnabled)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!withBirdSounds || !soundEnabled) return

    const scheduleNext = () => {
      const delay = 1800 + Math.random() * 3200
      timerRef.current = window.setTimeout(() => {
        audio.bird()
        scheduleNext()
      }, delay)
    }
    scheduleNext()

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [withBirdSounds, soundEnabled])

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky__sun" />
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className={`sky__drifter sky__drifter--cloud ${cloud.direction === 1 ? 'is-forward' : 'is-back'}`}
          style={{
            top: `${cloud.top}%`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <svg viewBox="0 0 120 54" width="120" height="54" style={{ transform: `scale(${cloud.scale})` }}>
            <g fill="#ffffff" opacity="0.9">
              <circle cx="34" cy="32" r="20" />
              <circle cx="58" cy="24" r="24" />
              <circle cx="84" cy="34" r="18" />
              <rect x="16" y="34" width="86" height="18" rx="9" />
            </g>
          </svg>
        </div>
      ))}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className={`sky__drifter sky__drifter--bird ${bird.direction === 1 ? 'is-forward' : 'is-back'}`}
          style={{
            top: `${bird.top}%`,
            animationDuration: `${bird.duration}s`,
            animationDelay: `${bird.delay}s`,
          }}
        >
          <svg viewBox="0 0 40 18" width="40" height="18" style={{ transform: `scale(${bird.scale})` }}>
            <path
              d="M2 12c6 0 9-8 13-8s2 5 5 5 4-4 8-4"
              fill="none"
              stroke="#33475f"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
