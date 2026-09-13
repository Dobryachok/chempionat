import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { AppHeader } from './components/layout/AppHeader'
import { BottomNav } from './components/layout/BottomNav'
import { Sky } from './components/layout/Sky'
import { Button } from './components/ui/Button'
import { Toast } from './components/ui/Toast'
import { audio } from './lib/audio'
import { AdminScreen } from './screens/AdminScreen'
import { BetScreen } from './screens/BetScreen'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ResultScreen } from './screens/ResultScreen'
import { TournamentScreen } from './screens/TournamentScreen'
import { useGameStore } from './store/useGameStore'

/** Screens where the ambient bird sounds belong, as described in the brief. */
const BIRD_SOUND_ROUTES = ['/', '/bet']

export default function App() {
  const bootstrap = useGameStore((state) => state.bootstrap)
  const bootstrapped = useGameStore((state) => state.bootstrapped)
  const bootError = useGameStore((state) => state.bootError)
  const theme = useGameStore((state) => state.theme)
  const soundEnabled = useGameStore((state) => state.soundEnabled)
  const location = useLocation()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    audio.setEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (!bootstrapped) {
    return (
      <div className="boot">
        <div className="boot__balloon" />
        <p className="boot__text">Надуваем шар…</p>
      </div>
    )
  }

  if (bootError) {
    return (
      <div className="boot">
        <h1 className="boot__title">Сервер недоступен</h1>
        <p className="boot__text">{bootError}</p>
        <p className="boot__hint">
          Запустите бэкенд командой <code>mvn spring-boot:run</code> в папке <code>backend</code> и обновите
          страницу.
        </p>
        <Button onClick={() => void bootstrap()}>Повторить попытку</Button>
      </div>
    )
  }

  return (
    <div className="app">
      <Sky key={location.pathname} withBirdSounds={BIRD_SOUND_ROUTES.includes(location.pathname)} />
      <AppHeader />
      <main className="app__content">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/bet" element={<BetScreen />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/tournament" element={<TournamentScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <Toast />
    </div>
  )
}
