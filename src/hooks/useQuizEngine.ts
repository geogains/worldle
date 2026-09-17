import { useCallback, useEffect, useReducer, useRef } from 'react'
import { quizFeedbackDelay } from '../lib/quiz/timing'

/**
 * Shared quiz engine — reusable across every future quiz mode (Flags is
 * the first consumer; Capitals/Currencies/Languages/Facts/Mixed plug into
 * this same hook later). Deliberately generic over `TQuestion`: the engine
 * only ever deals with question *ids* and correctness, never anything
 * flags/capitals/currency-specific — that content lives in the question
 * objects the caller supplies and in the screen that renders them. This
 * mirrors useGameEngine.ts's own split (pure exported reducer + a hook that
 * adds timers/effects), including the same "guard in the reducer, not just
 * the UI" approach to preventing double submission.
 */

export interface EngineQuestion {
  id: string
}

export type QuizPhase = 'answering' | 'feedback' | 'complete'

export interface QuizEngineState<TQuestion extends EngineQuestion> {
  questions: TQuestion[]
  index: number
  phase: QuizPhase
  correctCount: number
  totalAnswered: number
  /** The most recent submission's outcome, for feedback rendering; null before the first answer. */
  lastSubmission: { isCorrect: boolean; selectedId: string | null } | null
  /** null for an Unlimited session (no fixed length). */
  totalQuestions: number | null
}

type Action<TQuestion extends EngineQuestion> =
  | { type: 'SUBMIT'; isCorrect: boolean; selectedId: string | null }
  | { type: 'ADVANCE'; nextQuestion?: TQuestion }
  | { type: 'END_QUIZ' }

export function createQuizEngineState<TQuestion extends EngineQuestion>(
  questions: TQuestion[],
  totalQuestions: number | null,
): QuizEngineState<TQuestion> {
  return {
    questions,
    index: 0,
    phase: 'answering',
    correctCount: 0,
    totalAnswered: 0,
    lastSubmission: null,
    totalQuestions,
  }
}

export function quizEngineReducer<TQuestion extends EngineQuestion>(
  state: QuizEngineState<TQuestion>,
  action: Action<TQuestion>,
): QuizEngineState<TQuestion> {
  switch (action.type) {
    case 'SUBMIT': {
      // The core double-submission guard: once phase leaves 'answering',
      // every further SUBMIT is a no-op, regardless of how many times a UI
      // event fires (double-click, repeated Enter, a stale closure calling
      // submit again) — score can never be incremented twice for one
      // question, and a second submission can never overwrite the first
      // one's feedback.
      if (state.phase !== 'answering') return state
      return {
        ...state,
        phase: 'feedback',
        correctCount: state.correctCount + (action.isCorrect ? 1 : 0),
        totalAnswered: state.totalAnswered + 1,
        lastSubmission: { isCorrect: action.isCorrect, selectedId: action.selectedId },
      }
    }
    case 'ADVANCE': {
      // Symmetric guard: advancing only ever does something once per
      // feedback phase, so a timer that somehow fired twice (or a manual
      // + automatic advance racing) cannot skip two questions or complete
      // the quiz early.
      if (state.phase !== 'feedback') return state
      const atEnd = state.totalQuestions !== null && state.index + 1 >= state.totalQuestions
      if (atEnd) return { ...state, phase: 'complete' }
      const questions = action.nextQuestion ? [...state.questions, action.nextQuestion] : state.questions
      return { ...state, questions, index: state.index + 1, phase: 'answering', lastSubmission: null }
    }
    case 'END_QUIZ':
      return state.phase === 'complete' ? state : { ...state, phase: 'complete' }
  }
}

export interface UseQuizEngineOptions<TQuestion extends EngineQuestion> {
  getCorrectAnswerId: (question: TQuestion) => string
  reducedMotion: boolean
  /** For Unlimited only: produces the next question when advancing past the current one. Ignored for finite quizzes. */
  nextQuestion?: (previous: TQuestion) => TQuestion
}

export function useQuizEngine<TQuestion extends EngineQuestion>(
  initialQuestions: TQuestion[],
  totalQuestions: number | null,
  options: UseQuizEngineOptions<TQuestion>,
) {
  const { getCorrectAnswerId, reducedMotion, nextQuestion } = options
  const [state, dispatch] = useReducer(
    quizEngineReducer<TQuestion>,
    undefined,
    () => createQuizEngineState(initialQuestions, totalQuestions),
  )

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const list = timers.current
    return () => {
      for (const id of list) clearTimeout(id)
      list.length = 0
    }
  }, [])

  const nextQuestionRef = useRef(nextQuestion)
  useEffect(() => {
    nextQuestionRef.current = nextQuestion
  })

  const currentQuestion = state.questions[state.index]

  // Exactly one ADVANCE timer per feedback-phase entry: this effect's
  // dependency array only changes when the engine actually transitions
  // into 'feedback' (a fresh index/phase pair), so no code path can
  // schedule two competing advance timers for the same question.
  useEffect(() => {
    if (state.phase !== 'feedback') return
    const delay = quizFeedbackDelay(reducedMotion)
    const id = setTimeout(() => {
      if (state.totalQuestions !== null) {
        dispatch({ type: 'ADVANCE' })
        return
      }
      const prev = state.questions[state.index]
      const generated = prev && nextQuestionRef.current ? nextQuestionRef.current(prev) : undefined
      dispatch({ type: 'ADVANCE', nextQuestion: generated })
    }, delay)
    timers.current.push(id)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.index, reducedMotion])

  const submitChoice = useCallback(
    (selectedId: string) => {
      if (state.phase !== 'answering' || !currentQuestion) return
      dispatch({ type: 'SUBMIT', isCorrect: selectedId === getCorrectAnswerId(currentQuestion), selectedId })
    },
    [state.phase, currentQuestion, getCorrectAnswerId],
  )

  const submitText = useCallback(
    (isCorrect: boolean) => {
      if (state.phase !== 'answering') return
      dispatch({ type: 'SUBMIT', isCorrect, selectedId: null })
    },
    [state.phase],
  )

  const endQuiz = useCallback(() => dispatch({ type: 'END_QUIZ' }), [])

  return {
    state,
    currentQuestion,
    correctAnswerId: currentQuestion ? getCorrectAnswerId(currentQuestion) : null,
    submitChoice,
    submitText,
    endQuiz,
  }
}
