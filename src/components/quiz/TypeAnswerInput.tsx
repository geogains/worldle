import { useEffect, useRef, useState } from 'react'
import type { QuizPhase } from '../../hooks/useQuizEngine'
import { classifyTypeAnswer, type AnswerDomainSpec } from '../../lib/quiz/answerValidation'
import { Keyboard } from '../keyboard/Keyboard'

export interface TypeAnswerInputProps {
  phase: QuizPhase
  lastSubmission: { isCorrect: boolean; selectedId: string | null } | null
  /** The correct display name, shown only after an incorrect submission. */
  correctLabel: string
  /** Called only for a genuine correct/incorrect submission (including Skip, which always calls this with `false`) — never for a Did You Mean or invalid-domain helper state, which never reach the quiz engine at all. See classifyTypeAnswer(). */
  onSubmit: (isCorrect: boolean) => void
  inputLabel: string
  /** Defaults to the original Flags copy so every existing call site is unaffected. */
  placeholder?: string
  /** What counts as correct/valid/nonsense for the current question — see answerValidation.ts. Built by each mode's own domain module (countryAliases.ts, capitals.ts, languageAliases.ts, currencyAliases.ts). */
  answerDomain: AnswerDomainSpec
}

type Helper = { kind: 'did-you-mean'; suggestion: string } | { kind: 'invalid'; message: string } | { kind: 'confirm-skip' }

const EMPTY_KEY_STATES = Object.freeze({})

/**
 * Generic type-to-answer input — not Flags-specific, reusable by any future
 * quiz mode with a free-text answer. Submits on Enter only (physical
 * keyboard or the on-screen one) via submit() — there is no visible Submit
 * button; the button beside the input is Skip (see skip() below). Locks
 * (disabled input + Skip + on-screen keyboard) as soon as `phase` leaves
 * 'answering', matching the multiple-choice lock behaviour.
 *
 * Every submission first goes through classifyTypeAnswer() (see
 * answerValidation.ts) rather than straight to `onSubmit`:
 *
 *  - 'correct' / 'valid-incorrect' -> onSubmit(isCorrect) exactly as
 *    before — the real quiz-engine submission, with its score/progress/
 *    timer/feedback consequences, completely unchanged.
 *  - 'did-you-mean' / 'invalid-domain' -> a local helper is shown instead;
 *    onSubmit is never called, so the question stays active, the input
 *    stays editable, and no engine state changes at all (see
 *    useQuizEngine.ts's submitText — it's simply never invoked for these
 *    two outcomes).
 *
 * A visible Did You Mean suggestion is "armed": pressing Enter again with
 * the input UNCHANGED accepts it directly via acceptSuggestion() — which
 * re-classifies the suggestion text through the exact same pipeline a
 * fresh submission would, rather than assuming it's correct. A suggestion
 * is domain-wide, not "this question's accepted
 * answers only" (see answerValidation.ts), so it may easily be a real but
 * WRONG value — Did You Mean corrects spelling, it never implies
 * correctness. Editing the input at all (typing, backspacing, via physical
 * keyboard or the on-screen one) immediately clears any stale helper,
 * since it no longer describes what's currently typed.
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
 *
 * The Skip button (see skip()/confirmSkip() below) is implemented here —
 * once — rather than in each of the four quiz screens, so every current
 * Type Answer mode (Flags/Capitals/Languages/Currencies) and any future
 * one automatically gets it for free. Multiple Choice has no equivalent
 * because MultipleChoiceAnswers.tsx is a completely separate component
 * that never imports this one. Skip occupies the old Submit button's slot
 * beside the input, so clicking it doesn't immediately concede the
 * question — it arms a "Are you sure?" confirmation first, reusing the
 * exact same `helper` state slot (and visual family) as Did You Mean /
 * invalid-domain, so all three are mutually exclusive by construction.
 */
export function TypeAnswerInput({ phase, lastSubmission, correctLabel, onSubmit, inputLabel, placeholder = 'Type a country…', answerDomain }: TypeAnswerInputProps) {
  const [value, setValue] = useState('')
  const [helper, setHelper] = useState<Helper | null>(null)
  const locked = phase !== 'answering'
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const clearHelper = () => setHelper(null)

  /**
   * Skip sits in the old Submit button's slot beside the input, so an
   * accidental tap must not immediately concede the question — clicking it
   * only ARMS a confirmation, reusing the exact same single-slot `helper`
   * state Did You Mean / invalid-domain already use (so it structurally
   * cannot coexist with either of them: setting it here simply replaces
   * whatever helper, if any, was already showing). No onSubmit call yet,
   * so score/progress/timer/feedback are completely untouched until the
   * player explicitly confirms via confirmSkip() below.
   */
  const skip = () => {
    if (locked) return
    setHelper({ kind: 'confirm-skip' })
  }

  /**
   * "I don't know this answer" — a genuine concession, not a validated
   * submission. Deliberately bypasses classifyTypeAnswer() entirely rather
   * than faking an input string through it: Skip always resolves as
   * incorrect regardless of whatever partial/invalid/suggested text
   * happens to be sitting in the field, so there is nothing to classify.
   * Calling onSubmit(false) directly reuses the exact same engine path a
   * genuine wrong answer already takes — same scoring (0 points), same
   * progress increment, same feedback state, same
   * quizFeedbackDelay(..., false) timing, same correct-answer reveal — so
   * Skip needs no new engine API, no new feedback variant, and no new
   * timing constant. The reducer's own phase==='answering' guard (see
   * useQuizEngine.ts's SUBMIT case) already makes a second confirm a
   * no-op, so hiding the confirmation once locked is a UX nicety, not the
   * only thing preventing double-submission.
   */
  const confirmSkip = () => {
    if (locked) return
    setHelper(null)
    onSubmit(false)
  }

  /**
   * A Did You Mean suggestion does NOT imply correctness — it only
   * corrects spelling against the whole domain, and the domain-wide
   * candidate a typo resolves to may easily be wrong for this question
   * (e.g. Denmark's "Krona" -> "Krone" is right, but "Euor" -> "Euro" is a
   * real currency that's still wrong for Denmark). So accepting a
   * suggestion re-enters the exact same classifyTypeAnswer() pipeline a
   * fresh submission would, rather than assuming 'correct' — it always
   * resolves to 'correct' or 'valid-incorrect' by construction (the
   * suggestion is itself a domain candidate), never back to
   * 'did-you-mean'/'invalid-domain', but onSubmit is still driven by
   * whichever of the two it actually is.
   */
  const acceptSuggestion = (suggestion: string) => {
    setValue(suggestion)
    setHelper(null)
    const classification = classifyTypeAnswer(suggestion, answerDomain)
    onSubmit(classification.kind === 'correct')
  }

  const submit = () => {
    if (locked) return

    // Enter always means "I'm not confirming Skip" — the player pressing
    // Enter (rather than clicking "Yes, skip") is explicitly them changing
    // their mind, so this clears the confirmation and falls through to
    // ordinary submission below (which does nothing further if the input
    // is still empty, exactly like Enter on an empty field always has).
    if (helper?.kind === 'confirm-skip') {
      setHelper(null)
    } else if (helper?.kind === 'did-you-mean') {
      // A visible suggestion with the input still exactly as typed means
      // the player is confirming it (pressing Enter again) — accept it
      // directly rather than re-classifying the original typo, which
      // would just re-show the same suggestion forever.
      acceptSuggestion(helper.suggestion)
      return
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) return

    const classification = classifyTypeAnswer(trimmed, answerDomain)
    switch (classification.kind) {
      case 'correct':
        setHelper(null)
        onSubmit(true)
        return
      case 'valid-incorrect':
        setHelper(null)
        onSubmit(false)
        return
      case 'did-you-mean':
        setHelper({ kind: 'did-you-mean', suggestion: classification.suggestion })
        return
      case 'invalid-domain':
        setHelper({ kind: 'invalid', message: `Please enter a valid ${answerDomain.label}.` })
        return
    }
  }

  const onKey = (key: string) => {
    if (locked) return
    if (key === 'ENTER') {
      submit()
      return
    }
    if (key === 'BACKSPACE') {
      clearHelper()
      setValue((v) => v.slice(0, -1))
      return
    }
    // The shared Keyboard stays visually uppercase (matching Daily) — this
    // is purely the Quiz integration layer choosing to insert lowercase,
    // so typed answers read naturally. Physical typing is untouched: it
    // goes through the input's own onChange below, not through here.
    clearHelper()
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
          onChange={(e) => {
            clearHelper()
            setValue(e.target.value)
          }}
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
        <button type="button" className="btn quiz-type-answer__skip" onClick={skip} disabled={locked}>
          Skip
        </button>
      </div>

      {!locked && helper?.kind === 'did-you-mean' && (
        <p className="quiz-type-answer__helper quiz-type-answer__helper--suggestion" role="status">
          Did you mean{' '}
          <button type="button" className="quiz-type-answer__suggestion" onClick={() => acceptSuggestion(helper.suggestion)}>
            {helper.suggestion}
          </button>
          ?
        </p>
      )}
      {!locked && helper?.kind === 'invalid' && (
        <p className="quiz-type-answer__helper quiz-type-answer__helper--invalid" role="status">
          {helper.message}
        </p>
      )}
      {!locked && helper?.kind === 'confirm-skip' && (
        <p className="quiz-type-answer__helper quiz-type-answer__helper--confirm-skip" role="status">
          Are you sure you want to skip this question?{' '}
          <button type="button" className="quiz-type-answer__suggestion" onClick={confirmSkip}>
            Yes, skip
          </button>
        </p>
      )}

      {locked && lastSubmission && (
        <p className={`quiz-type-answer__feedback ${lastSubmission.isCorrect ? 'quiz-type-answer__feedback--correct' : 'quiz-type-answer__feedback--incorrect'}`}>
          {lastSubmission.isCorrect ? 'Correct!' : `Correct answer: ${correctLabel}`}
        </p>
      )}
      <div className="quiz-type-answer__keyboard">
        <Keyboard keyStates={EMPTY_KEY_STATES} onKey={onKey} disabled={locked} />
      </div>
    </div>
  )
}
