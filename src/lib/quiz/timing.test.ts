import { describe, expect, it } from 'vitest'
import {
  QUIZ_FEEDBACK_DELAY_INCORRECT_MS,
  QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED,
  QUIZ_FEEDBACK_DELAY_MS,
  QUIZ_FEEDBACK_DELAY_MS_REDUCED,
  quizFeedbackDelay,
} from './timing'

describe('quizFeedbackDelay', () => {
  it('correct answers use the original, unchanged full-motion delay', () => {
    expect(quizFeedbackDelay(false, true)).toBe(QUIZ_FEEDBACK_DELAY_MS)
    expect(quizFeedbackDelay(false)).toBe(QUIZ_FEEDBACK_DELAY_MS) // isCorrect defaults to true
  })

  it('correct answers use the original, unchanged reduced-motion delay', () => {
    expect(quizFeedbackDelay(true, true)).toBe(QUIZ_FEEDBACK_DELAY_MS_REDUCED)
  })

  it('incorrect answers get a longer full-motion delay than correct, within the requested 1.5-2x range', () => {
    expect(quizFeedbackDelay(false, false)).toBe(QUIZ_FEEDBACK_DELAY_INCORRECT_MS)
    const ratio = QUIZ_FEEDBACK_DELAY_INCORRECT_MS / QUIZ_FEEDBACK_DELAY_MS
    expect(ratio).toBeGreaterThanOrEqual(1.5)
    expect(ratio).toBeLessThanOrEqual(2)
  })

  it('incorrect answers get a longer reduced-motion delay than correct, within the requested 1.5-2x range', () => {
    expect(quizFeedbackDelay(true, false)).toBe(QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED)
    const ratio = QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED / QUIZ_FEEDBACK_DELAY_MS_REDUCED
    expect(ratio).toBeGreaterThanOrEqual(1.5)
    expect(ratio).toBeLessThanOrEqual(2)
  })

  it('reduced motion is always shorter than full motion, for both correct and incorrect', () => {
    expect(QUIZ_FEEDBACK_DELAY_MS_REDUCED).toBeLessThan(QUIZ_FEEDBACK_DELAY_MS)
    expect(QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED).toBeLessThan(QUIZ_FEEDBACK_DELAY_INCORRECT_MS)
  })
})
