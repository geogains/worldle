import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createQuizEngineState, quizEngineReducer, useQuizEngine, type EngineQuestion } from './useQuizEngine'

interface TestQuestion extends EngineQuestion {
  correctId: string
}

const q = (id: string): TestQuestion => ({ id, correctId: id })

describe('quizEngineReducer (pure, no React)', () => {
  it('starts in "answering" at index 0 with zero score', () => {
    const s = createQuizEngineState([q('a'), q('b')], 2)
    expect(s.phase).toBe('answering')
    expect(s.index).toBe(0)
    expect(s.correctCount).toBe(0)
    expect(s.totalAnswered).toBe(0)
  })

  it('SUBMIT (correct) increments both correctCount and totalAnswered, moves to feedback', () => {
    const s0 = createQuizEngineState([q('a'), q('b')], 2)
    const s1 = quizEngineReducer(s0, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    expect(s1.phase).toBe('feedback')
    expect(s1.correctCount).toBe(1)
    expect(s1.totalAnswered).toBe(1)
    expect(s1.lastSubmission).toEqual({ isCorrect: true, selectedId: 'a' })
  })

  it('SUBMIT (incorrect) increments only totalAnswered', () => {
    const s0 = createQuizEngineState([q('a')], 1)
    const s1 = quizEngineReducer(s0, { type: 'SUBMIT', isCorrect: false, selectedId: 'x' })
    expect(s1.correctCount).toBe(0)
    expect(s1.totalAnswered).toBe(1)
  })

  it('a second SUBMIT while already in "feedback" is a no-op (double-submission guard)', () => {
    const s0 = createQuizEngineState([q('a'), q('b')], 2)
    const s1 = quizEngineReducer(s0, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    const s2 = quizEngineReducer(s1, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    expect(s2).toBe(s1) // same reference: reducer returned early, no re-scoring
    expect(s2.correctCount).toBe(1)
    expect(s2.totalAnswered).toBe(1)
  })

  it('rapid repeated SUBMIT dispatches never score more than once for one question', () => {
    let s = createQuizEngineState([q('a'), q('b'), q('c')], 3)
    for (let i = 0; i < 5; i++) {
      s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    }
    expect(s.correctCount).toBe(1)
    expect(s.totalAnswered).toBe(1)
  })

  it('ADVANCE moves to the next question and back to "answering"', () => {
    let s = createQuizEngineState([q('a'), q('b')], 2)
    s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    s = quizEngineReducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('answering')
    expect(s.index).toBe(1)
    expect(s.lastSubmission).toBeNull()
  })

  it('ADVANCE while still "answering" is a no-op', () => {
    const s0 = createQuizEngineState([q('a'), q('b')], 2)
    const s1 = quizEngineReducer(s0, { type: 'ADVANCE' })
    expect(s1).toBe(s0)
  })

  it('a second ADVANCE after the first cannot skip an extra question', () => {
    let s = createQuizEngineState([q('a'), q('b'), q('c')], 3)
    s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    s = quizEngineReducer(s, { type: 'ADVANCE' })
    expect(s.index).toBe(1)
    const again = quizEngineReducer(s, { type: 'ADVANCE' })
    expect(again).toBe(s) // still answering question 2, guard blocks it
    expect(again.index).toBe(1)
  })

  it('finite quiz completes after the last question\'s feedback advances', () => {
    let s = createQuizEngineState([q('a'), q('b')], 2)
    s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    s = quizEngineReducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('answering')
    s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: false, selectedId: 'x' })
    s = quizEngineReducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('complete')
    expect(s.totalAnswered).toBe(2)
    expect(s.correctCount).toBe(1)
  })

  it('Unlimited (totalQuestions null) never auto-completes on ADVANCE, and appends the supplied next question', () => {
    let s = createQuizEngineState([q('a')], null)
    s = quizEngineReducer(s, { type: 'SUBMIT', isCorrect: true, selectedId: 'a' })
    s = quizEngineReducer(s, { type: 'ADVANCE', nextQuestion: q('b') })
    expect(s.phase).toBe('answering')
    expect(s.questions).toHaveLength(2)
    expect(s.index).toBe(1)
  })

  it('END_QUIZ completes the quiz regardless of phase, and is idempotent once complete', () => {
    const s0 = createQuizEngineState([q('a')], null)
    const s1 = quizEngineReducer(s0, { type: 'END_QUIZ' })
    expect(s1.phase).toBe('complete')
    const s2 = quizEngineReducer(s1, { type: 'END_QUIZ' })
    expect(s2).toBe(s1)
  })
})

describe('useQuizEngine (React hook: timers/effects)', () => {
  it('automatically advances after the feedback delay, exactly once', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useQuizEngine<TestQuestion>([q('a'), q('b')], 2, { getCorrectAnswerId: (x) => x.correctId, reducedMotion: true }),
    )
    act(() => result.current.submitChoice('a'))
    expect(result.current.state.phase).toBe('feedback')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.state.phase).toBe('answering')
    expect(result.current.state.index).toBe(1)
    vi.useRealTimers()
  })

  it('double-clicking submitChoice cannot double-score', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useQuizEngine<TestQuestion>([q('a'), q('b')], 2, { getCorrectAnswerId: (x) => x.correctId, reducedMotion: true }),
    )
    act(() => {
      result.current.submitChoice('a')
      result.current.submitChoice('a')
      result.current.submitChoice('a')
    })
    expect(result.current.state.correctCount).toBe(1)
    expect(result.current.state.totalAnswered).toBe(1)
    vi.useRealTimers()
  })

  it('submitting after the question has already locked (feedback phase) does nothing', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useQuizEngine<TestQuestion>([q('a'), q('b')], 2, { getCorrectAnswerId: (x) => x.correctId, reducedMotion: true }),
    )
    act(() => result.current.submitChoice('a'))
    expect(result.current.state.phase).toBe('feedback')
    act(() => result.current.submitChoice('wrong-but-ignored'))
    expect(result.current.state.totalAnswered).toBe(1)
    expect(result.current.state.lastSubmission).toEqual({ isCorrect: true, selectedId: 'a' })
    vi.useRealTimers()
  })

  it('Unlimited mode calls nextQuestion() to produce the next question on advance', () => {
    vi.useFakeTimers()
    const nextQuestion = vi.fn((prev: TestQuestion) => q(prev.id === 'a' ? 'b' : 'a'))
    const { result } = renderHook(() =>
      useQuizEngine<TestQuestion>([q('a')], null, {
        getCorrectAnswerId: (x) => x.correctId,
        reducedMotion: true,
        nextQuestion,
      }),
    )
    act(() => result.current.submitChoice('a'))
    act(() => vi.advanceTimersByTime(300))
    expect(nextQuestion).toHaveBeenCalledWith(q('a'))
    expect(result.current.state.questions).toHaveLength(2)
    expect(result.current.state.phase).toBe('answering')
    vi.useRealTimers()
  })

  it('endQuiz completes the quiz immediately, mid-question', () => {
    const { result } = renderHook(() =>
      useQuizEngine<TestQuestion>([q('a')], null, { getCorrectAnswerId: (x) => x.correctId, reducedMotion: true }),
    )
    act(() => result.current.endQuiz())
    expect(result.current.state.phase).toBe('complete')
  })
})
