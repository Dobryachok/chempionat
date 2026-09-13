import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { HistoryItem, ThemeName } from '../api/types'
import { Balloon } from '../components/balloon/Balloon'
import { HistoryList } from '../components/bet/HistoryList'
import { LevelLadder } from '../components/game/LevelLadder'
import { RulesModal } from '../components/modals/RulesModal'
import { TournamentTable } from '../components/tournament/TournamentTable'
import { Button } from '../components/ui/Button'
import { IconBoost, IconCoin, IconInfo, IconTrophy } from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { useTournament } from '../hooks/useTournament'
import { audio } from '../lib/audio'
import { formatBoosterLabel, formatCountdown, formatNumber } from '../lib/format'
import { useGameStore } from '../store/useGameStore'
import './BetScreen.css'

export function BetScreen() {
  const config = useGameStore((state) => state.config)
  const session = useGameStore((state) => state.session)
  const theme = useGameStore((state) => state.theme)
  const setTheme = useGameStore((state) => state.setTheme)
  const startRound = useGameStore((state) => state.startRound)
  const showToast = useGameStore((state) => state.showToast)
  const navigate = useNavigate()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tournamentOpen, setTournamentOpen] = useState(false)
  const { view: tournament, changed } = useTournament(true, 1000)

  const themeConfig = config?.themes[theme] ?? null
  const options = themeConfig?.betOptions ?? []
  const selected = options.find((option) => option.id === selectedId) ?? null
  const balance = session?.balance ?? 0

  // The bet options belong to the current theme, so the selection resets when it changes.
  useEffect(() => {
    setSelectedId(null)
  }, [theme])

  useEffect(() => {
    let disposed = false
    const load = async () => {
      try {
        const items = await api.history(20)
        if (!disposed) setHistory(items)
      } catch {
        /* history is not critical for the round */
      }
    }
    void load()
    const timer = window.setInterval(load, 5000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [])

  const switchTheme = (next: ThemeName) => {
    audio.drop()
    setTheme(next)
  }

  const pick = (optionId: string, cost: number) => {
    if (cost > balance) {
      showToast('Не хватает бонусов', 'error')
      return
    }
    setSelectedId(optionId)
  }

  const start = async () => {
    if (!selected) return
    if (selected.cost > balance) {
      showToast('Не хватает бонусов', 'error')
      return
    }
    // Short activation animation of the chosen puzzle fragment before the flight starts.
    setActivatingId(selected.id)
    await new Promise((resolve) => window.setTimeout(resolve, 420))
    const round = await startRound(selected.id)
    setActivatingId(null)
    if (round) {
      navigate('/game')
    }
  }

  const otherTheme: ThemeName = theme === 'red' ? 'green' : 'red'

  return (
    <div className="screen bet">
      <section className="bet__themes">
        {(['red', 'green'] as ThemeName[]).map((name) => {
          const info = config?.themes[name]
          return (
            <button
              key={name}
              className={`bet__theme bet__theme--${name} ${theme === name ? 'is-active' : ''}`}
              onClick={() => switchTheme(name)}
            >
              <Balloon theme={name} size={54} floating floatSeconds={name === 'red' ? 4.3 : 5.5} />
              <span className="bet__theme-text">
                <span className="bet__theme-title">{info?.title ?? (name === 'red' ? 'Красный шар' : 'Зелёный шар')}</span>
                <span className="bet__theme-levels">{info?.levels ?? (name === 'red' ? 12 : 9)} уровней</span>
              </span>
            </button>
          )
        })}
      </section>

      <div className="bet__layout">
        <section className="card bet__main">
          <header className="bet__header">
            <div>
              <p className="section-title">Ваш баланс</p>
              <p className="bet__balance">
                <IconCoin size={20} />
                {formatNumber(balance)}
              </p>
            </div>
            <div className="bet__actions">
              <button className="bet__chip" onClick={() => setRulesOpen(true)}>
                <IconInfo size={18} />
                Правила
              </button>
              <button className="bet__chip bet__chip--trophy" onClick={() => setTournamentOpen(true)}>
                <span className="bet__trophy">
                  <IconTrophy size={18} />
                </span>
                <span className="bet__chip-text">
                  Турнир
                  {tournament?.active && (
                    <span className="bet__chip-timer">{formatCountdown(tournament.secondsLeft)}</span>
                  )}
                </span>
              </button>
            </div>
          </header>

          <h2 className="bet__section-title">Выберите ставку</h2>
          <div className="bet__options">
            {options.map((option) => {
              const affordable = option.cost <= balance
              const classes = [
                'bet-option',
                selectedId === option.id ? 'is-selected' : '',
                affordable ? '' : 'is-locked',
                activatingId === option.id ? 'is-activating' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button key={option.id} className={classes} onClick={() => pick(option.id, option.cost)}>
                  <span className="bet-option__cost">{formatNumber(option.cost)}</span>
                  <span className="bet-option__unit">бонусов</span>
                  <span className={`bet-option__booster ${option.boosterTier > 1 ? 'is-active' : ''}`}>
                    {option.boosterTier > 1 && <IconBoost size={13} />}
                    {formatBoosterLabel(option.boosterTier, option.boosterValue)}
                  </span>
                  {!affordable && <span className="bet-option__lock">Не хватает бонусов</span>}
                </button>
              )
            })}
          </div>

          <h2 className="bet__section-title">Бустер</h2>
          <div className="bet__boosters">
            {options.map((option) => (
              <span
                key={`booster-${option.id}`}
                className={`bet__booster-pill ${selected?.id === option.id ? 'is-active' : ''}`}
              >
                {formatBoosterLabel(option.boosterTier, option.boosterValue)}
              </span>
            ))}
          </div>

          <p className="bet__hint">
            {selected ? (
              selected.boosterTier > 1 ? (
                <>
                  Ставка {formatNumber(selected.cost)} бонусов. Бустер x{selected.boosterValue} ждёт на одном из{' '}
                  {themeConfig?.levels} уровней: если шар дойдёт до него раньше, чем вы нажмёте «Забрать»,
                  коэффициент умножится на {selected.boosterValue}.
                </>
              ) : (
                <>Ставка {formatNumber(selected.cost)} бонусов без бустера: коэффициент растёт только со временем.</>
              )
            ) : (
              <>Выберите фрагмент пазла — он задаёт стоимость ставки и бустер. Кнопка «Начать игру» включится после выбора.</>
            )}
          </p>

          <Button block size="lg" disabled={!selected || Boolean(activatingId)} onClick={() => void start()}>
            {activatingId ? 'Активируем фрагмент…' : 'Начать игру'}
          </Button>
        </section>

        <aside className="bet__side">
          <div className="card bet__levels">
            <div className="bet__levels-head">
              <p className="card__title">Уровни</p>
              <span className="bet__levels-count">{themeConfig?.levels ?? 0}</span>
            </div>
            <p className="bet__levels-hint">
              Каждый уровень — порог коэффициента. За его прохождение начисляются игровые очки, а «Забрать»
              становится доступно после первого уровня.
            </p>
            <LevelLadder thresholds={themeConfig?.levelMultipliers ?? []} compact />
          </div>

          <div className="card bet__switch">
            <p className="card__title">Другая тема</p>
            <button className="bet__switch-button" onClick={() => switchTheme(otherTheme)}>
              <Balloon theme={otherTheme} size={64} floating floatSeconds={otherTheme === 'red' ? 4.7 : 6.1} />
              <span>
                {config?.themes[otherTheme].title}
                <span className="muted"> · {config?.themes[otherTheme].levels} уровней</span>
              </span>
            </button>
          </div>
        </aside>
      </div>

      <section className="card bet__history">
        <div className="bet__history-head">
          <p className="card__title">История игр</p>
          <span className="muted">все игроки прототипа</span>
        </div>
        <HistoryList items={history} />
      </section>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} config={config} />

      <Modal
        open={tournamentOpen}
        onClose={() => setTournamentOpen(false)}
        title="Турнирная таблица"
        variant="sheet"
      >
        <TournamentTable view={tournament} changed={changed} maxHeight={280} />
      </Modal>
    </div>
  )
}
