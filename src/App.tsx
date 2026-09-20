import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from './components/layout/Header'
import { HelpModal } from './components/modals/HelpModal'
import { StatsModal, type DailySnapshot } from './components/stats/StatsModal'
import { ToastStack } from './components/toast/ToastStack'
import { useTodayPuzzleNumber } from './hooks/useDailyClock'
import { usePrefs } from './hooks/usePrefs'
import { useRouter } from './hooks/useRouter'
import { useStats } from './hooks/useStats'
import { OverlayProvider } from './providers/OverlayProvider'
import { PrefsProvider } from './providers/PrefsProvider'
import { RouterProvider } from './providers/RouterProvider'
import { StatsProvider } from './providers/StatsProvider'
import { ToastProvider } from './providers/ToastProvider'
import { getDailyAnswer } from './lib/daily/select'
import { loadDaily } from './lib/storage/schema'
import { ArchiveGameScreen } from './screens/ArchiveGameScreen'
import { ArchiveScreen } from './screens/ArchiveScreen'
import { CountryResultScreen } from './screens/CountryResultScreen'
import { DailyScreen } from './screens/DailyScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { QuizPlayScreen } from './screens/QuizPlayScreen'
import { QuizScreen } from './screens/QuizScreen'
import { StudyScreen } from './screens/StudyScreen'

function initialDailySnapshot(todayNumber: number): DailySnapshot | null {
  const saved = loadDaily()
  if (!saved || saved.puzzleNumber !== todayNumber) return null
  return {
    puzzleNumber: saved.puzzleNumber,
    answer: getDailyAnswer(saved.puzzleNumber),
    guesses: saved.guesses,
    status: saved.status,
  }
}

function AppShell() {
  const { route } = useRouter()
  const { prefs, markHelpSeen } = usePrefs()
  const { stats } = useStats()
  const todayNumber = useTodayPuzzleNumber()
  const [helpOpen, setHelpOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [daily, setDaily] = useState<DailySnapshot | null>(() => initialDailySnapshot(todayNumber))

  // First visit: show the tutorial automatically.
  useEffect(() => {
    if (prefs.hasSeenHelp) return
    const id = setTimeout(() => setHelpOpen(true), 250)
    return () => clearTimeout(id)
  }, [prefs.hasSeenHelp])

  const closeHelp = useCallback(() => {
    setHelpOpen(false)
    if (!prefs.hasSeenHelp) markHelpSeen()
  }, [prefs.hasSeenHelp, markHelpSeen])

  const onSnapshot = useCallback((snapshot: DailySnapshot) => setDaily(snapshot), [])
  const openStats = useCallback(() => setStatsOpen(true), [])

  const todayAnswer = useMemo(() => getDailyAnswer(todayNumber).normalized, [todayNumber])

  let screen: React.ReactNode
  switch (route.name) {
    case 'daily':
      screen = <DailyScreen todayNumber={todayNumber} onSnapshot={onSnapshot} />
      break
    case 'practice':
      screen = <PracticeScreen />
      break
    case 'archive':
      screen = <ArchiveScreen todayNumber={todayNumber} />
      break
    case 'archive-game':
      screen = <ArchiveGameScreen puzzleNumber={route.puzzleNumber} todayNumber={todayNumber} />
      break
    case 'study':
      screen = <StudyScreen />
      break
    case 'quiz':
      screen = <QuizScreen />
      break
    case 'quiz-play':
      screen = <QuizPlayScreen key={route.mode} mode={route.mode} />
      break
    case 'results':
      screen = <CountryResultScreen key={route.countrySlug} countrySlug={route.countrySlug} />
      break
    default:
      screen = <NotFoundScreen />
  }

  return (
    <div className="app-shell text-secondary">
      <Header onOpenHelp={() => setHelpOpen(true)} onOpenStats={openStats} />
      <main className="relative flex min-h-0 flex-1 flex-col">{screen}</main>
      <ToastStack />
      <HelpModal open={helpOpen} onClose={closeHelp} excludeAnswer={todayAnswer} />
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        todayNumber={todayNumber}
        daily={daily && daily.puzzleNumber === todayNumber ? daily : null}
      />
    </div>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <ToastProvider>
        <StatsProvider>
          <RouterProvider>
            <OverlayProvider>
              <AppShell />
            </OverlayProvider>
          </RouterProvider>
        </StatsProvider>
      </ToastProvider>
    </PrefsProvider>
  )
}
