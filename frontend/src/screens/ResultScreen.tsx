import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Balloon } from '../components/balloon/Balloon'
import { UpsellModal, isUpsellSuppressed } from '../components/modals/UpsellModal'
import { Button } from '../components/ui/Button'
import { IconPuzzle, IconShield, IconStar } from '../components/ui/Icons'
import { audio } from '../lib/audio'
import { formatNumber, shortHash } from '../lib/format'
import { useGameStore } from '../store/useGameStore'
import './ResultScreen.css'

/** Idle timeout of the result screen, as required by the brief. */
const IDLE_SECONDS = 10

export function ResultScreen() {
  const result = useGameStore((state) => state.result)
  const round = useGameStore((state) => state.round)
  const config = useGameStore((state) => state.config)
  const upsellUsed = useGameStore((state) => state.upsellUsedThisSession)
  const clearRound = useGameStore((state) => state.clearRound)
  const startRound = useGameStore((state) => state.startRound)
  const navigate = useNavigate()

  const showUpsell = Boolean(result?.upsell.eligible) && !upsellUsed && !isUpsellSuppressed()
  const [upsellOpen, setUpsellOpen] = useState(showUpsell)
  const [secondsLeft, setSecondsLeft] = useState(IDLE_SECONDS)
  const [repeating, setRepeating] = useState(false)
  const rewardPlayed = useRef(false)

  useEffect(() => {
    if (result && !rewardPlayed.current) {
      rewardPlayed.current = true
      window.setTimeout(() => audio.reward(), 250)
    }
  }, [result])

  // Any interaction postpones the automatic exit to the theme screen.
  useEffect(() => {
    const reset = () => setSecondsLeft(IDLE_SECONDS)
    window.addEventListener('pointerdown', reset)
    window.addEventListener('keydown', reset)
    return () => {
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [])

  useEffect(() => {
    if (upsellOpen) return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [upsellOpen])

  useEffect(() => {
    if (secondsLeft > 0) return
    clearRound()
    navigate('/')
  }, [secondsLeft, clearRound, navigate])

  if (!result) {
    return <Navigate to="/bet" replace />
  }

  const won = result.cashedOut && result.win > 0
  const potentialMax = Math.round(result.bet * result.crashMultiplier)

  const playAgain = () => {
    clearRound()
    navigate('/bet')
  }

  // Instant repeat: find the same fragment (cost plus booster tier) in the current theme.
  const sameOption = config?.themes[result.theme].betOptions.find(
    (option) => option.cost === result.bet && option.boosterTier === (round?.boosterTier ?? option.boosterTier),
  )

  const repeat = async () => {
    if (!sameOption || repeating) return
    setRepeating(true)
    const next = await startRound(sameOption.id)
    setRepeating(false)
    if (next) {
      navigate('/game')
    }
  }

  return (
    <div className="screen result">
      <section className={`card result__card ${won ? 'is-win' : 'is-loss'}`}>
        <div className="result__balloon">
          <Balloon theme={result.theme} size={110} state={won ? 'flying' : 'popped'} floating={won} floatSeconds={4.2} />
        </div>

        <h1 className="result__title">{won ? 'Вы забрали выигрыш!' : 'Шар сдулся!'}</h1>
        <p className="result__multiplier">
          x{(won ? result.cashoutMultiplier ?? 0 : result.crashMultiplier).toFixed(2)}
        </p>
        <p className="result__subtitle">
          {won
            ? `Коэффициент краха был x${result.crashMultiplier.toFixed(2)} — можно было забрать до ${formatNumber(potentialMax)} баллов`
            : `Ставка ${formatNumber(result.bet)} баллов сгорела: шар лопнул на x${result.crashMultiplier.toFixed(2)}`}
        </p>

        <div className="result__grid">
          <div className="result__cell">
            <span className="muted">Выигрыш</span>
            <b className={won ? 'is-win' : ''}>{won ? `+${formatNumber(result.win)}` : '0'}</b>
          </div>
          <div className="result__cell">
            <span className="muted">Игровые очки</span>
            <b>
              <IconStar size={16} /> +{formatNumber(result.points)}
            </b>
          </div>
          <div className="result__cell">
            <span className="muted">Уровни</span>
            <b>
              {result.levelsReached} / {result.levels}
            </b>
          </div>
          <div className="result__cell">
            <span className="muted">Бустер</span>
            <b>{result.boosterApplied ? `x${result.boosterValue} на ур. ${result.boosterLevel}` : 'не сработал'}</b>
          </div>
        </div>

        <div className="result__reward">
          <span className={`result__reward-icon is-${result.reward.rarity}`}>
            <IconPuzzle size={22} />
          </span>
          <div>
            <p className="result__reward-title">Награда раунда: фрагмент «{result.reward.title}»</p>
            <p className="result__reward-text">
              Собрано {result.reward.collected} из {result.reward.total} фрагментов коллекции ·{' '}
              {result.reward.rarity === 'epic'
                ? 'эпический'
                : result.reward.rarity === 'rare'
                  ? 'редкий'
                  : 'обычный'}
            </p>
          </div>
        </div>

        <div className="result__actions">
          <Button block size="lg" onClick={playAgain}>
            Играть снова
          </Button>
          {sameOption && (
            <Button block variant="secondary" disabled={repeating} onClick={() => void repeat()}>
              {repeating ? 'Запускаем…' : `Повторить с той же ставкой (${formatNumber(result.bet)})`}
            </Button>
          )}
        </div>

        <p className="result__idle">Автопереход на выбор темы через {Math.max(0, secondsLeft)} с</p>
      </section>

      <section className="card result__fairness">
        <p className="card__title">
          <IconShield size={16} /> Проверка честности раунда
        </p>
        <p className="result__fairness-text">
          До полёта сервер опубликовал хеш, а теперь раскрывает секрет: {result.fairness.formula}.
        </p>
        <dl className="result__fairness-list">
          <div>
            <dt>Хеш</dt>
            <dd title={result.fairness.commitHash}>{shortHash(result.fairness.commitHash)}</dd>
          </div>
          <div>
            <dt>Секрет сервера</dt>
            <dd title={result.fairness.serverSeed}>{shortHash(result.fairness.serverSeed)}</dd>
          </div>
          <div>
            <dt>Точка краха</dt>
            <dd>{result.baseCrashMultiplier.toFixed(4)}</dd>
          </div>
          <div>
            <dt>Уровень бустера</dt>
            <dd>{result.fairness.lootLine || '—'}</dd>
          </div>
        </dl>
      </section>

      {result.upsell.eligible && (
        <UpsellModal
          open={upsellOpen}
          offer={result.upsell}
          roundId={round?.roundId ?? ''}
          win={result.win}
          onClose={() => setUpsellOpen(false)}
        />
      )}
    </div>
  )
}
