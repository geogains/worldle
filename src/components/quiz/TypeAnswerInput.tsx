import { useEffect, useRef, useState } from 'react'
import type { QuizPhase } from '../../hooks/useQuizEngine'
import { Keyboard } from '../keyboard/Keyboard'
import { CheckIcon, CloseIcon } from '../ui/icons'

export interface TypeAnswerInputProps {
  phase: QuizPhase
  lastSubmission: { isCorrect: boolean; selectedId: string | null } | null
  /** The correct display name, shown only after an incorrect submission. */
  correctLabel: string
  onSubmit: (text: string) => void
  inputLabel: string
  /** Defaults to the original Flags copy so every existing call site is unaffected. */
  placeholder?: string
}

const EMPTY_KEY_STATES = Object.freeze({})

/**
 * Generic type-to-answer input — not Flags-specific, reusable by any future
 * quiz mode with a free-text answer. Submits on Enter or the explicit
 * button (both call the same onSubmit, so there is exactly one submission
 * path to guard in the engine). Locks (disabled input + button + on-screen
 * keyboard) as soon as `phase` leaves 'answering', matching the
 * multiple-choice lock behaviour.
 *
 * Reuses the existing Daily/Practice Keyboard component as-is (same key
 * layout, styling, press interaction, accessibility) rather than building a
 * second on-screen keyboard — it already accepts a plain `onKey` callback
 * and an optional `disabled` flag with no Wordle-specific coupling. Passing
 * an empty `keyStates` map means every key resolves to its neutral
 * 'unused' state (see computeKeyStates's fallback), so no
 * green/yellow/grey letter-result colouring leaks into this quiz context.
 *
 * The caller remounts this component (via a `key` on the parent) whenever a
 * genuinely new question begins, so a mount-only focus effect is exactly
 * the right hook: it fires once when a fresh, answerable question appears
 * (never mid-question, never during the locked feedback phase, and
 * naturally covers the very first question and every Play Again replay
 * too, since those are remounts as well) without ever re-stealing focus
 * from a question the player is still actively answering.
 */
export function TypeAnswerInput({ phase, lastSubmission, correctLabel, onSubmit, inputLabel, placeholder = 'Type a country…' }: TypeAnswerInputProps) {
  const [value, setValue] = useState('')
  const locked = phase !== 'answering'
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    if (locked) return
    const trimmed = value.trim()
    if (trimmed.length === 0) return
    onSubmit(trimmed)
  }

  const onKey = (key: string) => {
    if (locked) return
    if (key === 'ENTER') {
      submit()
      return
    }
    if (key === 'BACKSPACE') {
      setValue((v) => v.slice(0, -1))
      return
    }
    // The shared Keyboard stays visually uppercase (matching Daily) — this
    // is purely the Quiz integration layer choosing to insert lowercase,
    // so typed answers read naturally. Physical typing is untouched: it
    // goes through the input's own onChange below, not through here.
    setValue((v) => v + key.toLowerCase())
  }

  return (
    <div className="quiz-type-answer">
      <label className="quiz-type-answer__label" htmlFor="quiz-type-answer-input">
        {inputLabel}
      </label>
      <div className="quiz-type-answer__row">
        <input
          ref={inputRef}
          id="quiz-type-answer-input"
          type="text"
          className="quiz-type-answer__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          disabled={locked}
          autoComplete="off"
          autoCapitalize="words"
          placeholder={placeholder}
        />
        <button type="button" className="btn btn--primary quiz-type-answer__submit" onClick={submit} disabled={locked}>
          Submit
        </button>
      </div>
      {locked && lastSubmission && (
        <p className={`quiz-type-answer__feedback ${lastSubmission.isCorrect ? 'quiz-type-answer__feedback--correct' : 'quiz-type-answer__feedback--incorrect'}`}>
          {lastSubmission.isCorrect ? (
            <>
              <CheckIcon size={16} /> Correct!
            </>
          ) : (
            <>
              <CloseIcon size={16} /> Correct answer: {correctLabel}
            </>
          )}
        </p>
      )}
      <div className="quiz-type-answer__keyboard">
        <Keyboard keyStates={EMPTY_KEY_STATES} onKey={onKey} disabled={locked} />
      </div>
    </div>
  )
}
