interface IconProps {
  size?: number
  className?: string
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' })

export function IconHome({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 11l8-6.5 8 6.5v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" strokeLinejoin="round" />
    </svg>
  )
}

export function IconGames({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconTrophy({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" strokeLinejoin="round" />
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5C4 8.4 5.6 10 7.5 10H8M16 5h2.5A1.5 1.5 0 0 1 20 6.5c0 1.9-1.6 3.5-3.5 3.5H16" />
      <path d="M12 13v4M9 20h6M10 17h4" strokeLinecap="round" />
    </svg>
  )
}

export function IconProfile({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconCoin({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" fill="#FCC33E" />
      <circle cx="12" cy="12" r="6.2" fill="#F0AD14" opacity="0.55" />
      <path d="M12 7.5v9M9.6 9.6h4.8M9.6 14.4h4.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconStar({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16.2 7.4 18.6l.9-5.3L4.5 9.6l5.2-.7L12 4z"
        fill="#FCC33E"
      />
    </svg>
  )
}

export function IconSound({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 10v4h3l4 3V7L8 10H5z" strokeLinejoin="round" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7.5a6.5 6.5 0 0 1 0 9" strokeLinecap="round" />
    </svg>
  )
}

export function IconSoundOff({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 10v4h3l4 3V7L8 10H5z" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" strokeLinecap="round" />
    </svg>
  )
}

export function IconBack({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 5.5L8 12l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClose({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" strokeLinecap="round" />
    </svg>
  )
}

export function IconInfo({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5v6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconBoost({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13 3l-7 9.5h4.2L9 21l7.5-10H12L13 3z" fill="#FCC33E" stroke="#F0AD14" strokeWidth="1.2" />
    </svg>
  )
}

export function IconTicket({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a2 2 0 0 0 0 3v2A1.5 1.5 0 0 1 18.5 17h-13A1.5 1.5 0 0 1 4 15.5v-2a2 2 0 0 0 0-3v-2z" />
      <path d="M12 9v6" strokeDasharray="2 2" />
    </svg>
  )
}

export function IconPuzzle({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 6h4a2 2 0 1 1 4 0h4v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4V6z" strokeLinejoin="round" />
    </svg>
  )
}

export function IconGear({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.6 7.8l1.9 1.1M17.5 15.1l1.9 1.1M4.6 16.2l1.9-1.1M17.5 8.9l1.9-1.1" strokeLinecap="round" />
    </svg>
  )
}

export function IconShield({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3.5l6.5 2.3v5.4c0 4-2.7 7.3-6.5 8.8-3.8-1.5-6.5-4.8-6.5-8.8V5.8L12 3.5z" strokeLinejoin="round" />
      <path d="M9.2 12.2l2 2 3.6-3.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
