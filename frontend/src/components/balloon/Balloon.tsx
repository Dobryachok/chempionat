import { useId } from 'react'
import type { ThemeName } from '../../api/types'
import './Balloon.css'

interface BalloonProps {
  theme: ThemeName
  size?: number
  /** Idle floating animation used on the theme and bet screens. */
  floating?: boolean
  /** Each balloon floats with its own rhythm, so movements never look synchronised. */
  floatSeconds?: number
  state?: 'flying' | 'popped'
  className?: string
}

const PALETTE: Record<ThemeName, { light: string; base: string; deep: string; basket: string }> = {
  red: { light: '#ff8a7d', base: '#ff4d40', deep: '#c9342a', basket: '#b5762f' },
  green: { light: '#6bd3a0', base: '#38b273', deep: '#237c50', basket: '#b5762f' },
}

export function Balloon({
  theme,
  size = 160,
  floating = false,
  floatSeconds = 4.5,
  state = 'flying',
  className = '',
}: BalloonProps) {
  const id = useId().replace(/:/g, '')
  const colors = PALETTE[theme]
  const classes = [
    'balloon',
    floating ? 'balloon--floating' : '',
    state === 'popped' ? 'balloon--popped' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} style={{ width: size, animationDuration: `${floatSeconds}s` }}>
      <svg className="balloon__svg" viewBox="0 0 120 168" role="img" aria-label={`Воздушный шар`}>
        <defs>
          <radialGradient id={`env-${id}`} cx="38%" cy="28%" r="78%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="55%" stopColor={colors.base} />
            <stop offset="100%" stopColor={colors.deep} />
          </radialGradient>
          <linearGradient id={`gore-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <g className="balloon__envelope">
          <path
            d="M60 4c30 0 52 23 52 52 0 26-19 48-33 62-6 6-9 10-9 14H50c0-4-3-8-9-14C27 104 8 82 8 56 8 27 30 4 60 4z"
            fill={`url(#env-${id})`}
          />
          <path
            d="M60 4c8 0 14 23 14 52 0 26-5 48-9 62-2 6-3 10-3 14h-4c0-4-1-8-3-14-4-14-9-36-9-62C46 27 52 4 60 4z"
            fill={`url(#gore-${id})`}
          />
          <path
            d="M28 20c-8 10-12 22-12 36 0 20 11 38 22 52"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        <g className="balloon__rig">
          <path d="M50 133l6 12M70 133l-6 12" stroke="#7a5230" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="48" y="143" width="24" height="19" rx="5" fill={colors.basket} />
          <path d="M48 149h24" stroke="#8f5c22" strokeWidth="2" opacity="0.8" />
        </g>
      </svg>
    </div>
  )
}
