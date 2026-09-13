import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RulesModal } from '../components/modals/RulesModal'
import { Button } from '../components/ui/Button'
import { IconCoin, IconPuzzle, IconStar, IconTicket } from '../components/ui/Icons'
import { formatNumber } from '../lib/format'
import { useGameStore } from '../store/useGameStore'
import './ProfileScreen.css'

const PIECE_TITLES = [
  'Рассвет',
  'Облако',
  'Стая птиц',
  'Тёплый ветер',
  'Горелка',
  'Корзина',
  'Радуга',
  'Ночное небо',
  'Золотой шар',
]

export function ProfileScreen() {
  const session = useGameStore((state) => state.session)
  const config = useGameStore((state) => state.config)
  const soundEnabled = useGameStore((state) => state.soundEnabled)
  const toggleSound = useGameStore((state) => state.toggleSound)
  const [rulesOpen, setRulesOpen] = useState(false)

  const collected = new Set(session?.collectedPieces ?? [])

  return (
    <div className="screen profile">
      <section className="card profile__head">
        <div className="profile__avatar">{(session?.name ?? '?').slice(0, 1)}</div>
        <div className="profile__identity">
          <p className="profile__name">{session?.name ?? 'Игрок'}</p>
          <p className="muted">Демонстрационный аккаунт прототипа</p>
        </div>
      </section>

      <section className="profile__stats">
        <div className="card card--flat profile__stat">
          <IconCoin size={22} />
          <div>
            <p className="profile__stat-value">{formatNumber(session?.balance ?? 0)}</p>
            <p className="profile__stat-label">Бонусные баллы</p>
          </div>
        </div>
        <div className="card card--flat profile__stat">
          <IconStar size={22} />
          <div>
            <p className="profile__stat-value">{formatNumber(session?.gamePoints ?? 0)}</p>
            <p className="profile__stat-label">Игровые очки</p>
          </div>
        </div>
        <div className="card card--flat profile__stat">
          <IconTicket size={22} />
          <div>
            <p className="profile__stat-value">{formatNumber(session?.tickets ?? 0)}</p>
            <p className="profile__stat-label">Лотерейные билеты</p>
          </div>
        </div>
      </section>

      <section className="card profile__collection">
        <div className="profile__collection-head">
          <p className="card__title">
            <IconPuzzle size={16} /> Коллекция «Воздушный шар»
          </p>
          <span className="muted">
            {collected.size} / {session?.totalPieces ?? PIECE_TITLES.length}
          </span>
        </div>
        <p className="profile__collection-text">
          Фрагмент выдаётся за каждый завершённый раунд — и при выигрыше, и при проигрыше.
        </p>
        <div className="profile__pieces">
          {PIECE_TITLES.map((title, index) => {
            const number = index + 1
            const owned = collected.has(number)
            return (
              <div key={title} className={`profile__piece ${owned ? 'is-owned' : ''}`}>
                <IconPuzzle size={18} />
                <span>{title}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card profile__settings">
        <p className="card__title">Настройки и документация</p>
        <div className="profile__settings-row">
          <span>Звуковое сопровождение</span>
          <Button variant="secondary" onClick={toggleSound}>
            {soundEnabled ? 'Включено' : 'Выключено'}
          </Button>
        </div>
        <div className="profile__settings-row">
          <span>Правила игры</span>
          <Button variant="secondary" onClick={() => setRulesOpen(true)}>
            Открыть
          </Button>
        </div>
        <div className="profile__settings-row">
          <span>Параметры игры (админ-панель)</span>
          <Link to="/admin">
            <Button variant="secondary">Перейти</Button>
          </Link>
        </div>
        <p className="profile__version">
          Версия конфигурации: {config?.version ?? '—'} · игра {config?.active ? 'активна' : 'выключена'}
        </p>
      </section>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} config={config} />
    </div>
  )
}
