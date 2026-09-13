import { TournamentTable } from '../components/tournament/TournamentTable'
import { IconStar } from '../components/ui/Icons'
import { useTournament } from '../hooks/useTournament'
import { formatNumber } from '../lib/format'
import { useGameStore } from '../store/useGameStore'
import './TournamentScreen.css'

export function TournamentScreen() {
  const session = useGameStore((state) => state.session)
  const config = useGameStore((state) => state.config)
  const { view, changed } = useTournament(true, 1000)

  const points = config?.points

  return (
    <div className="screen tournament-screen">
      <section className="card tournament-screen__me">
        <div>
          <p className="section-title">Ваши игровые очки</p>
          <p className="tournament-screen__points">
            <IconStar size={22} />
            {formatNumber(session?.gamePoints ?? 0)}
          </p>
        </div>
        <div className="tournament-screen__place">
          <span className="muted">Место</span>
          <b>{view?.currentRank ? `#${view.currentRank}` : '—'}</b>
        </div>
      </section>

      <section className="card">
        <TournamentTable view={view} changed={changed} maxHeight={420} />
      </section>

      <section className="card tournament-screen__how">
        <p className="card__title">Как начисляются очки</p>
        <ul className="tournament-screen__list">
          <li>{points?.pointsPerLine ?? 10} очков за каждый пройденный уровень полёта</li>
          <li>{points?.pointsCashoutBonus ?? 25} очков за успешно забранный выигрыш</li>
          <li>
            {points?.pointsX2Bonus ?? 20} / {points?.pointsX3Bonus ?? 35} / {points?.pointsX4Bonus ?? 50} очков
            за активацию бустера x2 / x3 / x4
          </li>
          <li>Очки не тратятся и не зависят от бонусных баллов — они определяют место в турнире</li>
        </ul>
      </section>
    </div>
  )
}
