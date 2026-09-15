import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameView } from '../components/game/GameView'
import { ResultModal } from '../components/modals/ResultModal'
import { branding } from '../config/branding'
import { useRouter } from '../hooks/useRouter'
import type { GameCompletion } from '../hooks/useGameEngine'
import { formatPuzzleDate } from '../lib/daily/date'
import { getDailyAnswer } from '../lib/daily/select'
import { PATHS } from '../lib/router/routes'
import type { GameStatus } from '../lib/game/types'
import { loadArchive, saveArchiveGame } from '../lib/storage/schema'
import { NotFoundScreen } from './NotFoundScreen'

export function ArchiveGameScreen({ puzzleNumber, todayNumber }: { puzzleNumber: number; todayNumber: number }) {
  const { navigate } = useRouter()
  const isToday = puzzleNumber === todayNumber
  const valid = Number.isInteger(puzzleNumber) && puzzleNumber >= 1 && puzzleNumber < todayNumber

  useEffect(() => {
    if (isToday) navigate(PATHS.daily, { replace: true })
  }, [isToday, navigate])

  if (isToday) return null
  if (!valid) {
    return (
      <NotFoundScreen
        title="That puzzle isn't available"
        message={
          puzzleNumber >= todayNumber
            ? 'Future puzzles are kept secret until their day arrives.'
            : "We couldn't find that puzzle number."
        }
      />
    )
  }
  return <ArchiveGame puzzleNumber={puzzleNumber} />
}

function ArchiveGame({ puzzleNumber }: { puzzleNumber: number }) {
  const { navigate } = useRouter()
  const answer = useMemo(() => getDailyAnswer(puzzleNumber), [puzzleNumber])
  const saved = useMemo(() => loadArchive()[String(puzzleNumber)] ?? null, [puzzleNumber])
  const [completion, setCompletion] = useState<GameCompletion | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  const onPersist = useCallback(
    (snap: { guesses: string[]; current: string; status: GameStatus }) => {
      saveArchiveGame(puzzleNumber, { ...snap, updatedAt: Date.now() })
    },
    [puzzleNumber],
  )

  const restoredCompletion: GameCompletion | null =
    completion ??
    (saved && saved.status !== 'active'
      ? { status: saved.status, guesses: saved.guesses, attempts: saved.guesses.length, answer }
      : null)

  return (
    <>
      <GameView
        key={`archive-${puzzleNumber}`}
        answer={answer}
        initialGuesses={saved?.guesses}
        initialCurrent={saved?.current}
        label={
          <>
            <span className="font-semibold text-ink">Archive #{puzzleNumber}</span>
            <span aria-hidden> · </span>
            {formatPuzzleDate(puzzleNumber)} · Replay
          </>
        }
        completedAction={
          <button
            type="button"
            className="btn btn--ghost min-h-0 px-2 py-1 text-[0.8rem] font-semibold"
            onClick={() => setResultsOpen(true)}
          >
            Results
          </button>
        }
        onPersist={onPersist}
        onShowResults={(c) => {
          setCompletion(c)
          setResultsOpen(true)
        }}
      />
      {restoredCompletion && (
        <ResultModal
          open={resultsOpen}
          onClose={() => setResultsOpen(false)}
          title={`Archive · #${puzzleNumber}`}
          mode="archive"
          answer={answer}
          guesses={restoredCompletion.guesses}
          won={restoredCompletion.status === 'won'}
          shareLabel={`${branding.name} Archive`}
          sharePuzzleNumber={puzzleNumber}
          actions={
            <>
              <button type="button" className="btn btn--primary" onClick={() => navigate(PATHS.archive)} data-autofocus>
                Back to archive
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => navigate(PATHS.daily)}>
                Today's puzzle
              </button>
            </>
          }
        />
      )}
    </>
  )
}
