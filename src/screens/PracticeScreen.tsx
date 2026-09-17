import { useCallback, useState } from 'react'
import { GameView } from '../components/game/GameView'
import { useRouter } from '../hooks/useRouter'
import type { GameCompletion } from '../hooks/useGameEngine'
import { createPracticeGame, restoreOrCreatePracticeGame, type PracticeGame } from '../lib/practice/session'
import { rememberResultSource } from '../lib/results/context'
import { PATHS } from '../lib/router/routes'
import type { GameStatus } from '../lib/game/types'
import { savePractice } from '../lib/storage/schema'

interface PracticeRound extends PracticeGame {
  round: number
}

export function PracticeScreen() {
  const [game, setGame] = useState<PracticeRound>(() => ({ round: 0, ...restoreOrCreatePracticeGame() }))
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
    setGame((g) => ({ round: g.round + 1, ...createPracticeGame(g.answer.id) }))
  }, [])

  // One completion flow: the finished game (already persisted by onPersist)
  // continues on its own country results page. Called after the final
  // reveal/celebration, and again by the Results button for a restored game.
  const showResults = useCallback(
    (_completion?: GameCompletion) => {
      rememberResultSource('practice', game.answer)
      navigate(PATHS.results(game.answer.id))
    },
    [game.answer, navigate],
  )

  return (
    <GameView
      key={`practice-${game.round}-${game.answer.id}`}
      answer={game.answer}
      initialGuesses={game.saved.guesses}
      initialCurrent={game.saved.current}
      label={
        <>
          <span className="eyebrow eyebrow--pill">Practice</span>
          <span>
            Unlimited games <span aria-hidden>·</span> Doesn't affect stats
          </span>
        </>
      }
      completedAction={
        <>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => showResults()}>
            Results
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={playAgain}>
            Play again
          </button>
        </>
      }
      onPersist={onPersist}
      onShowResults={showResults}
    />
  )
}
