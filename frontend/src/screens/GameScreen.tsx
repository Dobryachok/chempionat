import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { CrashEvent } from '../api/types'
import { Balloon } from '../components/balloon/Balloon'
import { LevelLadder } from '../components/game/LevelLadder'
import { LiveRating } from '../components/game/LiveRating'
import { Button } from '../components/ui/Button'
import { IconBoost, IconShield } from '../components/ui/Icons'
import { useGameSocket } from '../hooks/useGameSocket'
import { useTournament } from '../hooks/useTournament'
import { audio } from '../lib/audio'
import { formatNumber, shortHash } from '../lib/format'
import { useGameStore } from '../store/useGameStore'
import './GameScreen.css'

interface Floater {
  id: number
  points: number
  progress: number
  kind: 'level' | 'boost'
}

/** Vertical placement of the balloon inside the stage, in percent from the bottom. */
const FLOOR = 6
const CEILING = 74

export function GameScreen() {
  const round = useGameStore((state) => state.round)
  const theme = useGameStore((state) => state.theme)
  const onboardingSeen = useGameStore((state) => state.onboardingSeen)
  const markOnboardingSeen = useGameStore((state) => state.markOnboardingSeen)
  const setCashout = useGameStore((state) => state.setCashout)
  const finishRound = useGameStore((state) => state.finishRound)
  const showToast = useGameStore((state) => state.showToast)
  const navigate = useNavigate()

  const [level, setLevel] = useState(0)
  const [points, setPoints] = useState(0)
  const [cashedOut, setCashedOut] = useState(false)
  const [cashoutWin, setCashoutWin] = useState<number | null>(null)
  const [boosterApplied, setBoosterApplied] = useState(false)
  const [flashLevel, setFlashLevel] = useState<number | null>(null)
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [popped, setPopped] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!onboardingSeen)
  const { view: tournament, changed } = useTournament(true, 1000)

  const multiplierRef = useRef<HTMLSpanElement>(null)
  const winRef = useRef<HTMLSpanElement>(null)
  const balloonRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLDivElement>(null)

  // Interpolation state: the server is authoritative, the client only smooths between ticks.
  const serverMultiplier = useRef(1)
  const serverBase = useRef(1)
  const serverAt = useRef(0)
  const growthPerMs = useRef(0)
  const boosterFactor = useRef(1)
  const frozen = useRef(false)
  const displayed = useRef(1)
  const floaterId = useRef(0)

  const topThreshold = useMemo(() => {
    if (!round || round.levelMultipliers.length === 0) return 8
    return round.levelMultipliers[round.levelMultipliers.length - 1] * 1.25
  }, [round])

  const progressOf = useCallback(
    (base: number) => {
      const value = Math.log(Math.max(1, base)) / Math.log(topThreshold)
      return Math.min(1, Math.max(0, value))
    },
    [topThreshold],
  )

  const paint = useCallback(() => {
    const value = displayed.current
    if (multiplierRef.current) {
      multiplierRef.current.textContent = `x${value.toFixed(2)}`
    }
    if (winRef.current && round) {
      winRef.current.textContent = formatNumber(round.bet * value)
    }
    const base = boosterFactor.current > 1 ? value / boosterFactor.current : value
    const progress = progressOf(base)
    if (balloonRef.current) {
      const bottom = FLOOR + (CEILING - FLOOR) * progress
      balloonRef.current.style.bottom = `${bottom}%`
    }
    if (trailRef.current) {
      trailRef.current.style.height = `${Math.max(0, progress * (CEILING - FLOOR))}%`
    }
  }, [progressOf, round])

  // Smooth 60 fps interpolation between the server ticks.
  useEffect(() => {
    let frame = 0
    const loop = () => {
      if (!frozen.current) {
        const elapsed = performance.now() - serverAt.current
        const projected = serverMultiplier.current * Math.exp(growthPerMs.current * elapsed)
        // Never run more than a tick and a half ahead of the server.
        const ceiling = serverMultiplier.current * Math.exp(growthPerMs.current * 90)
        displayed.current = Math.min(projected, ceiling)
        paint()
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [paint])

  useEffect(() => {
    if (!showOnboarding) return
    const timer = window.setTimeout(() => {
      setShowOnboarding(false)
      markOnboardingSeen()
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [showOnboarding, markOnboardingSeen])

  const pushFloater = (pointsValue: number, kind: Floater['kind']) => {
    if (pointsValue <= 0) return
    floaterId.current += 1
    const id = floaterId.current
    const base = boosterFactor.current > 1 ? displayed.current / boosterFactor.current : displayed.current
    setFloaters((current) => [...current, { id, points: pointsValue, progress: progressOf(base), kind }])
    window.setTimeout(() => {
      setFloaters((current) => current.filter((floater) => floater.id !== id))
    }, 1200)
  }

  const handleCrash = (event: CrashEvent) => {
    frozen.current = true
    displayed.current = event.crashMultiplier
    paint()
    setPopped(true)
    audio.crash()
    window.setTimeout(() => {
      finishRound(event)
      navigate('/result')
    }, 1150)
  }

  const { status, sendCashout } = useGameSocket(round?.roundId ?? null, {
    onState: (event) => {
      growthPerMs.current = (Math.log(1 + event.growthRate) * event.fps) / 1000
      boosterFactor.current = event.boosterApplied ? event.boosterValue : 1
      serverMultiplier.current = Math.max(1, event.multiplier)
      serverBase.current = Math.max(1, event.multiplier / boosterFactor.current)
      serverAt.current = performance.now()
      displayed.current = serverMultiplier.current
      setLevel(event.level)
      setPoints(event.points)
      setCashedOut(event.cashedOut)
      setBoosterApplied(event.boosterApplied)
      paint()
    },
    onTick: (event) => {
      serverMultiplier.current = event.multiplier
      serverBase.current = event.baseMultiplier
      serverAt.current = performance.now()
    },
    onLevel: (event) => {
      setLevel(event.level)
      setPoints(event.totalPoints)
      setFlashLevel(event.level)
      window.setTimeout(() => setFlashLevel(null), 450)
      if (event.points > 0) {
        pushFloater(event.points, 'level')
        audio.levelUp(event.level)
      }
    },
    onBoost: (event) => {
      boosterFactor.current = event.boosterValue
      serverMultiplier.current = event.multiplier
      serverAt.current = performance.now()
      displayed.current = event.multiplier
      setBoosterApplied(true)
      setPoints(event.totalPoints)
      pushFloater(event.points, 'boost')
      audio.boost()
      paint()
    },
    onCashout: (event) => {
      setCashedOut(true)
      setCashoutWin(event.win)
      setPoints(event.points)
      setCashout(event)
      audio.cashout()
    },
    onCrash: handleCrash,
    onError: (message) => showToast(message, 'error'),
  })

  if (!round) {
    return <Navigate to="/bet" replace />
  }

  const canCashout = level >= 1 && !cashedOut && !popped
  const tier = level >= 3 ? 3 : level
  const boosterValueLabel = round.boosterValue % 1 === 0 ? round.boosterValue.toFixed(0) : round.boosterValue.toFixed(1)

  const cashout = () => {
    if (!canCashout) return
    if (!sendCashout()) {
      showToast('Соединение с сервером потеряно', 'error')
    }
    setShowOnboarding(false)
  }

  return (
    <div className="screen game">
      {tournament && (
        <LiveRating
          participants={tournament.participants}
          changed={changed}
          currentRank={tournament.currentRank}
        />
      )}

      <div className={`game__stage game__stage--${theme}`}>
        <div className="game__multiplier" data-tier={tier}>
          <span ref={multiplierRef}>x1.00</span>
        </div>

        <div className="game__trail" ref={trailRef} />

        <div className="game__balloon" ref={balloonRef}>
          <Balloon theme={theme} size={104} state={popped ? 'popped' : 'flying'} floating={!popped} floatSeconds={3.6} />
        </div>

        <div className="game__ladder">
          <LevelLadder
            thresholds={round.levelMultipliers}
            passed={level}
            boosterLevel={round.boosterLevel}
            boosterValue={round.boosterValue}
            boosterApplied={boosterApplied}
            flashLevel={flashLevel}
            compact
          />
        </div>

        <div className="game__chips">
          <span className="game__chip">
            Ставка <b>{formatNumber(round.bet)}</b>
          </span>
          {round.boosterTier > 1 && (
            <span className={`game__chip game__chip--boost ${boosterApplied ? 'is-applied' : ''}`}>
              <IconBoost size={14} />
              Бустер x{boosterValueLabel} · ур. {round.boosterLevel}
            </span>
          )}
          <span className="game__chip">
            Очки <b>{formatNumber(points)}</b>
          </span>
          <span className="game__chip game__chip--hash" title={`Хеш раунда: ${round.commitHash}`}>
            <IconShield size={14} />
            {shortHash(round.commitHash)}
          </span>
        </div>

        {floaters.map((floater) => (
          <span
            key={floater.id}
            className={`game__floater ${floater.kind === 'boost' ? 'is-boost' : ''}`}
            style={{ bottom: `${FLOOR + (CEILING - FLOOR) * floater.progress + 8}%` }}
          >
            +{floater.points}
          </span>
        ))}

        {cashedOut && !popped && (
          <div className="game__cashout">
            <p className="game__cashout-title">Вы забрали выигрыш!</p>
            <p className="game__cashout-sum">+{formatNumber(cashoutWin ?? 0)}</p>
            <p className="game__cashout-note">Могли бы забрать больше — шар ещё летит</p>
          </div>
        )}

        {popped && <div className="game__crash-note">Шар лопнул!</div>}

        {status === 'connecting' && <div className="game__status">Соединяемся с сервером…</div>}
      </div>

      <div className="game__footer">
        {showOnboarding && !cashedOut && (
          <div className="game__onboarding">
            <span>Нажми «Забрать» до того, как шар лопнет</span>
            <span className="game__onboarding-arrow" aria-hidden="true">
              ↓
            </span>
          </div>
        )}
        <Button block size="lg" disabled={!canCashout} onClick={cashout}>
          {cashedOut ? 'Выигрыш зафиксирован' : 'Забрать '}
          {!cashedOut && <span ref={winRef}>{formatNumber(round.bet)}</span>}
        </Button>
        {level < 1 && !cashedOut && (
          <p className="game__footer-hint">Кнопка включится после первого уровня</p>
        )}
      </div>
    </div>
  )
}
