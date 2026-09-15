import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Country } from '../data/countries'
import { deriveStatus, validateGuess, validationMessage } from '../lib/game/validate'
import { MAX_ATTEMPTS, type GameStatus } from '../lib/game/types'
import { computeKeyStates } from '../lib/game/keyboard'
import { evaluateGuess } from '../lib/game/evaluate'

/* ------------------------------------------------------------------ */
/* Timing                                                               */
/* ------------------------------------------------------------------ */
export interface RevealTiming {
  flipDuration: number
  flipStagger: number
  /** Delay after the last tile settles before a win celebration starts. */
  celebrateDelay: number
  /** Total length of the win bounce (all tiles). */
  celebrateDuration: number
  /** Delay after the sixth reveal before the answer is revealed on loss. */
  lossRevealDelay: number
  /** Delay from completion until the results modal opens. */
  resultsDelay: number
}

export const FULL_MOTION: RevealTiming = {
  flipDuration: 520,
  flipStagger: 280,
  celebrateDelay: 120,
  celebrateDuration: 1400,
  lossRevealDelay: 350,
  resultsDelay: 1900,
}

export const REDUCED_MOTION: RevealTiming = {
  flipDuration: 160,
  flipStagger: 70,
  celebrateDelay: 0,
  celebrateDuration: 0,
  lossRevealDelay: 200,
  resultsDelay: 900,
}

export function revealDuration(columns: number, timing: RevealTiming): number {
  return (columns - 1) * timing.flipStagger + timing.flipDuration
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */
export type Phase = 'active' | 'revealing' | 'won' | 'lost'

export interface EngineState {
  guesses: string[]
  /** Letters typed into the active row (named `input`, not `current`, so it is never mistaken for a ref). */
  input: string
  phase: Phase
  /** Incremented to trigger a shake on the active row. */
  shakeToken: number
  /** Index of the tile that was just typed (for the pop animation). */
  popIndex: number | null
  /** True while the winning row bounces. */
  celebrating: boolean
  /** Set once the completion effects (stats, modal) have been triggered. */
  completionHandled: boolean
}

type Action =
  | { type: 'ADD_LETTER'; letter: string; maxLength: number }
  | { type: 'DELETE_LETTER' }
  | { type: 'SHAKE' }
  | { type: 'SUBMIT'; guess: string }
  | { type: 'REVEAL_DONE'; answer: string }
  | { type: 'CELEBRATE_DONE' }
  | { type: 'COMPLETION_HANDLED' }

export function createEngineState(guesses: readonly string[], current: string, answer: string): EngineState {
  const status = deriveStatus(guesses, answer)
  return {
    guesses: guesses.slice(0, MAX_ATTEMPTS),
    input: status === 'active' ? current.slice(0, answer.length) : '',
    phase: status,
    shakeToken: 0,
    popIndex: null,
    celebrating: false,
    // Restored complete games must not re-trigger completion side effects.
    completionHandled: status !== 'active',
  }
}

export function engineReducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'ADD_LETTER': {
      if (state.phase !== 'active') return state
      if (state.input.length >= action.maxLength) return state
      return { ...state, input: state.input + action.letter, popIndex: state.input.length }
    }
    case 'DELETE_LETTER': {
      if (state.phase !== 'active' || state.input.length === 0) return state
      return { ...state, input: state.input.slice(0, -1), popIndex: null }
    }
    case 'SHAKE':
      return { ...state, shakeToken: state.shakeToken + 1, popIndex: null }
    case 'SUBMIT': {
      if (state.phase !== 'active') return state
      return {
        ...state,
        guesses: [...state.guesses, action.guess],
        input: '',
        phase: 'revealing',
        popIndex: null,
      }
    }
    case 'REVEAL_DONE': {
      if (state.phase !== 'revealing') return state
      const status: GameStatus = deriveStatus(state.guesses, action.answer)
      return {
        ...state,
        phase: status,
        celebrating: status === 'won',
      }
    }
    case 'CELEBRATE_DONE':
      return state.celebrating ? { ...state, celebrating: false } : state
    case 'COMPLETION_HANDLED':
      return state.completionHandled ? state : { ...state, completionHandled: true }
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */
export interface GameCompletion {
  status: 'won' | 'lost'
  guesses: string[]
  attempts: number
  answer: Country
}

export interface UseGameEngineOptions {
  answer: Country
  initialGuesses?: readonly string[]
  initialCurrent?: string
  timing: RevealTiming
  /** Called on rejected submissions with a user-facing message. */
  onInvalid?: (message: string) => void
  /** Called whenever persisted fields change (guesses, current, status). */
  onPersist?: (snapshot: { guesses: string[]; current: string; status: GameStatus }) => void
  /**
   * Called once when the game transitions to won/lost during this session.
   * Not called for games restored in a completed state.
   */
  onComplete?: (completion: GameCompletion) => void
}

export function useGameEngine(options: UseGameEngineOptions) {
  const { answer, timing, onInvalid, onPersist, onComplete } = options
  const [state, dispatch] = useReducer(
    engineReducer,
    undefined,
    () => createEngineState(options.initialGuesses ?? [], options.initialCurrent ?? '', answer.normalized),
  )
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const columns = answer.length

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  useEffect(() => {
    const list = timers.current
    return () => {
      for (const id of list) clearTimeout(id)
      list.length = 0
    }
  }, [])

  const status: GameStatus = state.phase === 'revealing' ? 'active' : state.phase

  /* Keep the latest callbacks in refs so effects don't re-run when callers re-render. */
  const persistRef = useRef(onPersist)
  const completeRef = useRef(onComplete)
  useEffect(() => {
    persistRef.current = onPersist
    completeRef.current = onComplete
  })

  /* Persist. Guesses already include the guess being revealed. */
  useEffect(() => {
    persistRef.current?.({ guesses: state.guesses, current: state.input, status })
  }, [state.guesses, state.input, status])

  /* Completion side effects (exactly once per session). */
  useEffect(() => {
    if (state.completionHandled) return
    if (state.phase !== 'won' && state.phase !== 'lost') return
    dispatch({ type: 'COMPLETION_HANDLED' })
    completeRef.current?.({
      status: state.phase,
      guesses: state.guesses,
      attempts: state.guesses.length,
      answer,
    })
  }, [state.phase, state.completionHandled, state.guesses, answer])

  const addLetter = useCallback(
    (letter: string) => dispatch({ type: 'ADD_LETTER', letter: letter.toUpperCase(), maxLength: columns }),
    [columns],
  )
  const deleteLetter = useCallback(() => dispatch({ type: 'DELETE_LETTER' }), [])

  const submit = useCallback(() => {
    if (state.phase !== 'active') return
    const validation = validateGuess(state.input, columns)
    if (!validation.ok) {
      dispatch({ type: 'SHAKE' })
      onInvalid?.(validationMessage(validation.reason, columns))
      return
    }
    const guess = validation.country.normalized
    dispatch({ type: 'SUBMIT', guess })
    later(() => {
      dispatch({ type: 'REVEAL_DONE', answer: answer.normalized })
      later(() => dispatch({ type: 'CELEBRATE_DONE' }), timing.celebrateDelay + timing.celebrateDuration)
    }, revealDuration(columns, timing))
  }, [state.phase, state.input, columns, onInvalid, later, answer.normalized, timing])

  const revealedGuesses = useMemo(
    () => (state.phase === 'revealing' ? state.guesses.slice(0, -1) : state.guesses),
    [state.phase, state.guesses],
  )
  const keyStates = useMemo(
    () => computeKeyStates(revealedGuesses, answer.normalized),
    [revealedGuesses, answer.normalized],
  )
  const evaluations = useMemo(
    () => state.guesses.map((g) => evaluateGuess(g, answer.normalized)),
    [state.guesses, answer.normalized],
  )

  return {
    state,
    status,
    columns,
    evaluations,
    keyStates,
    revealedCount: revealedGuesses.length,
    inputLocked: state.phase !== 'active',
    addLetter,
    deleteLetter,
    submit,
  }
}

export type GameEngine = ReturnType<typeof useGameEngine>
