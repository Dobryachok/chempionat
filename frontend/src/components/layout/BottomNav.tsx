import { NavLink } from 'react-router-dom'
import { IconGames, IconHome, IconProfile, IconTrophy } from '../ui/Icons'
import './BottomNav.css'

const TABS = [
  { to: '/', label: 'Главная', Icon: IconHome },
  { to: '/bet', label: 'Игры', Icon: IconGames },
  { to: '/tournament', label: 'Турнир', Icon: IconTrophy },
  { to: '/profile', label: 'Профиль', Icon: IconProfile },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav__tab ${isActive ? 'is-active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
