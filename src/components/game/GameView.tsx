import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Country } from '../../data/countries'
import { useOverlays } from '../../hooks/useOverlays'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import {
  FULL_MOTION,
  REDUCED_MOTION,
  useGameEngine,
  type GameCompletion,
} from '../../hooks/useGameEngine'
import { useToast } from '../../hooks/useToast'
import { isLetter } from '../../lib/text/normalize'
import type { GameStatus } from '../../lib/game/types'
import { Board } from './Board'
import { Keyboard } from '../keyboard/Keyboard'

export interface GameViewProps {
  answer: Country
  initialGuesses?: readonly string[]
  initialCurrent?: string
  /** Small label above the board, e.g. "Daily Worldle #12 · 26 Sep 2026". */
  label: ReactNode
  /** Action shown next to the label once the game is complete. */
  completedAction?: ReactNode
  onPersist?: (snapshot: { guesses: string[]; current: string; status: GameStatus }) => void
  onComplete?: (completion: GameCompletion) => void
  /** Called after the completion animation when the results should open. */
  onShowResults?: (completion: GameCompletion) => void
}

const STATUS_WORD = { correct: 'correct', present: 'present', absent: 'absent' } as const

export function GameView(props: GameViewProps) {
  const { answer, label, completedAction, onPersist, onComplete, onShowResults } = props
  const reduced = usePrefersReducedMotion()
  const timing = reduced ? REDUCED_MOTION : FULL_MOTION
  const { showToast } = useToast()
  const { openCount } = useOverlays()
  const showResultsRef = useRef(onShowResults)
  useEffect(() => {
    showResultsRef.current = onShowResults
  })

  const handleComplete = useCallback(
    (completion: GameCompletion) => {
      onComplete?.(completion)
      if (completion.status === 'lost') {
        setTimeout(() => showToast(`The country was ${answer.name}`, { duration: 4000 }), timing.lossRevealDelay)
      }
      setTimeout(() => showResultsRef.current?.(completion), timing.resultsDelay)
    },
    [onComplete, showToast, answer.name, timing],
  )

  const engine = useGameEngine({
    answer,
    initialGuesses: props.initialGuesses,
    initialCurrent: props.initialCurrent,
    timing,
    onInvalid: (message) => showToast(message),
    onPersist,
    onComplete: handleComplete,
  })
  const { state, columns, evaluations, keyStates, addLetter, deleteLetter, submit } = engine

  /* Screen-reader announcement for the most recently revealed row. */
  const revealedCount = engine.revealedCount
  const announcement = useMemo(() => {
    if (revealedCount === 0) return ''
    const guess = state.guesses[revealedCount - 1]
    const statuses = evaluations[revealedCount - 1]
    if (!guess || !statuses) return ''
    const detail = guess
      .split('')
      .map((l, i) => `${l} ${STATUS_WORD[statuses[i] ?? 'absent']}`)
      .join(', ')
    let msg = `Guess ${revealedCount} of 6: ${guess}. ${detail}.`
    if (state.phase === 'won') msg += ` Correct! You solved it in ${revealedCount}.`
    if (state.phase === 'lost') msg += ` Game over. The country was ${answer.name}.`
    return msg
  }, [revealedCount, state.phase, state.guesses, evaluations, answer.name])

  const onKey = useCallback(
    (key: string) => {
      if (key === 'ENTER') submit()
      else if (key === 'BACKSPACE') deleteLetter()
      else if (isLetter(key)) addLetter(key)
    },
    [submit, deleteLetter, addLetter],
  )

  /* Physical keyboard. */
  const inputEnabled = openCount === 0
  useEffect(() => {
    if (!inputEnabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('[data-onscreen-keyboard], input, textarea, select, [contenteditable]')) return
      // A focused button handles Enter/Space itself (e.g. header controls).
      if (target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        submit()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        deleteLetter()
      } else if (isLetter(e.key)) {
        addLetter(e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [inputEnabled, submit, deleteLetter, addLetter])

  const revealingRow = state.phase === 'revealing' ? state.guesses.length - 1 : null
  const celebratingRow = state.celebrating ? state.guesses.length - 1 : null
  const complete = state.phase === 'won' || state.phase === 'lost'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mx-auto flex h-9 w-full max-w-[500px] shrink-0 items-center justify-between px-3 text-[0.8rem] text-muted">
        <span className="truncate">{label}</span>
        {complete && completedAction}
      </div>

      <div className="min-h-0 flex-1 px-2 py-1.5">
        <Board
          columns={columns}
          guesses={state.guesses}
          evaluations={evaluations}
          current={state.input}
          revealingRow={revealingRow}
          celebratingRow={celebratingRow}
          shakeToken={state.shakeToken}
          popIndex={state.popIndex}
          timing={timing}
          active={state.phase === 'active'}
        />
      </div>

      <div className="shrink-0 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Keyboard keyStates={keyStates} onKey={onKey} />
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
