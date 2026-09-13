import { useNavigate } from 'react-router-dom'
import type { ThemeName } from '../api/types'
import { Balloon } from '../components/balloon/Balloon'
import { IconBoost, IconStar, IconTrophy } from '../components/ui/Icons'
import { audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'
import './HomeScreen.css'

const FEATURES = [
  { Icon: IconBoost, title: 'Бустеры', text: 'Множитель ждёт на одном из уровней' },
  { Icon: IconTrophy, title: 'Турнир', text: 'Живой рейтинг и таблица участников' },
  { Icon: IconStar, title: 'Игровые очки', text: 'Копятся отдельно от бонусных баллов' },
]

export function HomeScreen() {
  const config = useGameStore((state) => state.config)
  const setTheme = useGameStore((state) => state.setTheme)
  const navigate = useNavigate()

  const choose = (theme: ThemeName) => {
    audio.unlock()
    audio.drop()
    setTheme(theme)
    navigate('/bet')
  }

  const themes: { name: ThemeName; levels: number; title: string }[] = [
    {
      name: 'red',
      title: config?.themes.red.title ?? 'Красный шар',
      levels: config?.themes.red.levels ?? 12,
    },
    {
      name: 'green',
      title: config?.themes.green.title ?? 'Зелёный шар',
      levels: config?.themes.green.levels ?? 9,
    },
  ]

  return (
    <div className="screen home">
      <section className="home__hero card">
        <div className="home__hero-text">
          <h1 className="home__title">Воздушный шар</h1>
          <p className="home__subtitle">Бонусная crash-игра с турнирной механикой</p>
          <p className="home__lead">
            Ставьте бонусные баллы и забирайте растущий выигрыш до того, как шар лопнет. Выберите тему —
            она задаёт количество уровней и стиль полёта.
          </p>
        </div>
        <div className="home__hero-balloon">
          <Balloon theme="red" size={150} floating floatSeconds={5.2} />
        </div>
      </section>

      <section className="home__themes">
        {themes.map((theme, index) => (
          <button
            key={theme.name}
            className={`home__theme home__theme--${theme.name}`}
            onClick={() => choose(theme.name)}
          >
            <div className="home__theme-info">
              <span className="home__theme-title">{theme.title}</span>
              <span className="home__theme-levels">{theme.levels} уровней</span>
            </div>
            <Balloon theme={theme.name} size={92} floating floatSeconds={index === 0 ? 4.1 : 5.7} />
          </button>
        ))}
      </section>

      <section className="home__features">
        {FEATURES.map(({ Icon, title, text }) => (
          <div key={title} className="home__feature card card--flat">
            <span className="home__feature-icon">
              <Icon size={20} />
            </span>
            <div>
              <p className="home__feature-title">{title}</p>
              <p className="home__feature-text">{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
