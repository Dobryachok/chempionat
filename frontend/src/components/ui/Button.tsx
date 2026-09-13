import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { audio } from '../../lib/audio'
import './Button.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'theme'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
  size?: 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  className = '',
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    block ? 'button--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      onClick={(event) => {
        audio.unlock()
        audio.click()
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
