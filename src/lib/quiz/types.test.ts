import { describe, expect, it } from 'vitest'
import {
  ANSWER_STYLES,
  COUNTRY_POOLS,
  MIXED_CATEGORIES,
  QUESTION_COUNTS,
  QUIZ_MODES,
  isAnswerStyle,
  isCountryPool,
  isQuestionCount,
  isQuizMode,
} from './types'

describe('QuizMode', () => {
  it('has exactly the six specified quiz types', () => {
    expect(QUIZ_MODES).toEqual(['flags', 'capitals', 'currencies', 'languages', 'facts', 'mixed'])
  })
  it('isQuizMode accepts every listed mode and rejects anything else', () => {
    for (const mode of QUIZ_MODES) expect(isQuizMode(mode)).toBe(true)
    expect(isQuizMode('flag')).toBe(false)
    expect(isQuizMode('')).toBe(false)
    expect(isQuizMode(null)).toBe(false)
    expect(isQuizMode(5)).toBe(false)
  })
})

describe('CountryPool', () => {
  it('has exactly Familiar/Explorer/World Expert, not Easy/Medium/Hard', () => {
    expect(COUNTRY_POOLS).toEqual(['familiar', 'explorer', 'world-expert'])
  })
  it('isCountryPool accepts every listed pool and rejects anything else', () => {
    for (const pool of COUNTRY_POOLS) expect(isCountryPool(pool)).toBe(true)
    expect(isCountryPool('easy')).toBe(false)
    expect(isCountryPool('hard')).toBe(false)
    expect(isCountryPool(undefined)).toBe(false)
  })
})

describe('AnswerStyle', () => {
  it('has exactly Multiple Choice and Type Answer, independent of CountryPool', () => {
    expect(ANSWER_STYLES).toEqual(['multiple-choice', 'type-answer'])
  })
  it('isAnswerStyle accepts every listed style and rejects anything else', () => {
    for (const style of ANSWER_STYLES) expect(isAnswerStyle(style)).toBe(true)
    expect(isAnswerStyle('easy')).toBe(false)
  })
})

describe('QuestionCount', () => {
  it('has exactly 5, 10 and the typed "unlimited" value (not a magic number)', () => {
    expect(QUESTION_COUNTS).toEqual([5, 10, 'unlimited'])
  })
  it('isQuestionCount accepts 5, 10 and "unlimited", rejects other numbers/strings', () => {
    expect(isQuestionCount(5)).toBe(true)
    expect(isQuestionCount(10)).toBe(true)
    expect(isQuestionCount('unlimited')).toBe(true)
    expect(isQuestionCount(15)).toBe(false)
    expect(isQuestionCount(-1)).toBe(false)
    expect(isQuestionCount('Unlimited')).toBe(false)
    expect(isQuestionCount(Infinity)).toBe(false)
  })
})

describe('MixedCategory', () => {
  it('is exactly the five substantive categories, excluding "mixed" itself', () => {
    expect(MIXED_CATEGORIES).toEqual(['flags', 'capitals', 'currencies', 'languages', 'facts'])
    expect(MIXED_CATEGORIES).not.toContain('mixed')
  })
})
