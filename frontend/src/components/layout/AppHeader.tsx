import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { audio } from '../../lib/audio'
import { formatNumber } from '../../lib/format'
import { useGameStore } from '../../store/useGameStore'
import { IconBack, IconCoin, IconSound, IconSoundOff } from '../ui/Icons'
import './AppHeader.css'

const DESKTOP_LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/bet', label: 'Игры' },
  { to: '/tournament', label: 'Турнир' },
  { to: '/profile', label: 'Профиль' },
  { to: '/admin', label: 'Правила и настройки' },
]

export function AppHeader() {
  const session = useGameStore((state) => state.session)
  const soundEnabled = useGameStore((state) => state.soundEnabled)
  const toggleSound = useGameStore((state) => state.toggleSound)
  const navigate = useNavigate()
  const location = useLocation()

  const canGoBack = location.pathname !== '/' && location.pathname !== '/game'

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__left">
          {canGoBack ? (
            <button className="header__icon-button" onClick={() => navigate(-1)} aria-label="Назад">
              <IconBack />
            </button>
          ) : null}
          <NavLink to="/" className="header__brand">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M12 2.5c4.4 0 8 3.4 8 7.6 0 3.7-2.9 7-5.8 9h-4.4C6.9 17.1 4 13.8 4 10.1 4 5.9 7.6 2.5 12 2.5z" fill="#FF4D40" />
              <rect x="10.4" y="19.4" width="3.2" height="2.6" rx="0.8" fill="#C77C3A" />
            </svg>
            <span>Столото</span>
          </NavLink>
        </div>

        <nav className="header__nav">
          {DESKTOP_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `header__link ${isActive ? 'is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__right">
          <div className="header__balance" title="Бонусные баллы">
            <IconCoin />
            <span>{session ? formatNumber(session.balance) : '—'}</span>
          </div>
          <button
            className="header__icon-button"
            onClick={() => {
              audio.unlock()
              toggleSound()
            }}
            aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? <IconSound /> : <IconSoundOff />}
          </button>
        </div>
      </div>
    </header>
  )
}
