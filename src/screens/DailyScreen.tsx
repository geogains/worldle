import { useCallback, useMemo, useState } from 'react'
import { GameView } from '../components/game/GameView'
import { RolloverBanner } from '../components/layout/RolloverBanner'
import { branding } from '../config/branding'
import { useStats } from '../hooks/useStats'
import type { GameCompletion } from '../hooks/useGameEngine'
import { formatPuzzleDate } from '../lib/daily/date'
import { getDailyAnswer } from '../lib/daily/select'
import type { GameStatus } from '../lib/game/types'
import { loadDaily, saveDaily } from '../lib/storage/schema'
import type { DailySnapshot } from '../components/stats/StatsModal'

export interface DailyScreenProps {
  todayNumber: number
  onSnapshot: (snapshot: DailySnapshot) => void
  onShowResults: () => void
}

export function DailyScreen({ todayNumber, onSnapshot, onShowResults }: DailyScreenProps) {
  // The puzzle the player is currently looking at. It only advances when the
  // player accepts the rollover banner, so a game in progress is never
  // silently swapped under them.
  const [activeNumber, setActiveNumber] = useState(todayNumber)
  const answer = useMemo(() => getDailyAnswer(activeNumber), [activeNumber])
  const saved = useMemo(() => {
    const s = loadDaily()
    return s && s.puzzleNumber === activeNumber ? s : null
  }, [activeNumber])
  const { recordDailyResult } = useStats()

  const onPersist = useCallback(
    (snap: { guesses: string[]; current: string; status: GameStatus }) => {
      saveDaily({ ...snap, puzzleNumber: activeNumber, updatedAt: Date.now() })
      onSnapshot({ puzzleNumber: activeNumber, answer, guesses: snap.guesses, status: snap.status })
    },
    [activeNumber, answer, onSnapshot],
  )

  const onComplete = useCallback(
    (c: GameCompletion) =>
      recordDailyResult({ puzzleNumber: activeNumber, won: c.status === 'won', attempts: c.attempts }),
    [activeNumber, recordDailyResult],
  )

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <GameView
        key={`daily-${activeNumber}`}
        answer={answer}
        initialGuesses={saved?.guesses}
        initialCurrent={saved?.current}
        label={
          <>
            <span className="font-semibold text-ink">
              {branding.name} #{activeNumber}
            </span>
            <span aria-hidden> · </span>
            {formatPuzzleDate(activeNumber)}
          </>
        }
        completedAction={
          <button type="button" className="btn btn--ghost min-h-0 px-2 py-1 text-[0.8rem] font-semibold" onClick={onShowResults}>
            Results
          </button>
        }
        onPersist={onPersist}
        onComplete={onComplete}
        onShowResults={onShowResults}
      />
      {todayNumber > activeNumber && (
        <RolloverBanner puzzleNumber={todayNumber} onPlay={() => setActiveNumber(todayNumber)} />
      )}
    </div>
  )
}
