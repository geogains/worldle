import { useCallback, useState } from 'react'
import { GameView } from '../components/game/GameView'
import { ResultModal } from '../components/modals/ResultModal'
import { branding } from '../config/branding'
import { findCountryById, type Country } from '../data/countries'
import { useRouter } from '../hooks/useRouter'
import type { GameCompletion } from '../hooks/useGameEngine'
import { pickPracticeAnswer } from '../lib/practice/select'
import { PATHS } from '../lib/router/routes'
import type { GameStatus } from '../lib/game/types'
import { loadPractice, savePractice, type SavedPractice } from '../lib/storage/schema'

interface PracticeGame {
  round: number
  answer: Country
  saved: SavedPractice
}

function newGame(round: number, previousAnswerId: string | null): PracticeGame {
  const answer = pickPracticeAnswer(previousAnswerId)
  const saved: SavedPractice = {
    answerId: answer.id,
    previousAnswerId,
    guesses: [],
    current: '',
    status: 'active',
    updatedAt: Date.now(),
  }
  savePractice(saved)
  return { round, answer, saved }
}

function restoreOrCreate(): PracticeGame {
  const saved = loadPractice()
  const answer = saved ? findCountryById(saved.answerId) : undefined
  if (saved && answer && answer.length >= 4 && answer.length <= 10) return { round: 0, answer, saved }
  return newGame(0, saved?.answerId ?? null)
}

export function PracticeScreen() {
  const [game, setGame] = useState<PracticeGame>(restoreOrCreate)
  const [completion, setCompletion] = useState<GameCompletion | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const { navigate } = useRouter()

  const onPersist = useCallback(
    (snap: { guesses: string[]; current: string; status: GameStatus }) => {
      savePractice({
        answerId: game.answer.id,
        previousAnswerId: game.saved.previousAnswerId,
        ...snap,
        updatedAt: Date.now(),
      })
    },
    [game.answer.id, game.saved.previousAnswerId],
  )

  const playAgain = useCallback(() => {
    setResultsOpen(false)
    setCompletion(null)
    setGame((g) => newGame(g.round + 1, g.answer.id))
  }, [])

  const restoredCompletion: GameCompletion | null =
    completion ??
    (game.saved.status !== 'active'
      ? { status: game.saved.status, guesses: game.saved.guesses, attempts: game.saved.guesses.length, answer: game.answer }
      : null)

  return (
    <>
      <GameView
        key={`practice-${game.round}-${game.answer.id}`}
        answer={game.answer}
        initialGuesses={game.saved.guesses}
        initialCurrent={game.saved.current}
        label={
          <>
            <span className="font-semibold text-ink">Practice</span>
            <span aria-hidden> · </span>
            Unlimited, doesn't affect stats
          </>
        }
        completedAction={
          <span className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn--ghost min-h-0 px-2 py-1 text-[0.8rem] font-semibold"
              onClick={() => setResultsOpen(true)}
            >
              Results
            </button>
            <button type="button" className="btn btn--ghost min-h-0 px-2 py-1 text-[0.8rem] font-semibold" onClick={playAgain}>
              Play again
            </button>
          </span>
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
          title="Practice"
          mode="practice"
          answer={game.answer}
          guesses={restoredCompletion.guesses}
          won={restoredCompletion.status === 'won'}
          shareLabel={`${branding.name} Practice`}
          actions={
            <>
              <button type="button" className="btn btn--primary" onClick={playAgain} data-autofocus>
                Play again
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => navigate(PATHS.daily)}>
                Back to today's puzzle
              </button>
            </>
          }
        />
      )}
    </>
  )
}
