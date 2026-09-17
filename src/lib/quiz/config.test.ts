import { describe, expect, it } from 'vitest'
import {
  ANSWER_STYLE_OPTIONS,
  COUNTRY_POOL_OPTIONS,
  DEFAULT_QUIZ_CONFIG,
  QUESTION_COUNT_OPTIONS,
  QUIZ_MODE_OPTIONS,
  distributeMixedCounts,
  formatQuizSummary,
} from './config'
import { MIXED_CATEGORIES, type QuizConfig } from './types'

describe('DEFAULT_QUIZ_CONFIG', () => {
  it('is Flags / Familiar / Multiple Choice / 10, so Start Quiz works with zero configuration', () => {
    expect(DEFAULT_QUIZ_CONFIG).toEqual({
      mode: 'flags',
      countryPool: 'familiar',
      answerStyle: 'multiple-choice',
      questionCount: 10,
    })
  })
})

describe('option metadata', () => {
  it('has exactly 6 quiz mode options, 3 country pool options, 2 answer style options, 3 question count options', () => {
    expect(QUIZ_MODE_OPTIONS).toHaveLength(6)
    expect(COUNTRY_POOL_OPTIONS).toHaveLength(3)
    expect(ANSWER_STYLE_OPTIONS).toHaveLength(2)
    expect(QUESTION_COUNT_OPTIONS).toHaveLength(3)
  })
  it('Facts is described in country-is-the-answer terms, not as multiple-choice-only', () => {
    const facts = QUIZ_MODE_OPTIONS.find((o) => o.id === 'facts')!
    expect(facts.description.toLowerCase()).toContain('country')
  })
})

describe('formatQuizSummary', () => {
  it('formats a finite question count with the "Questions" suffix', () => {
    const config: QuizConfig = { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 10 }
    expect(formatQuizSummary(config)).toBe('Flags · Familiar · Multiple Choice · 10 Questions')
  })
  it('formats "unlimited" as just "Unlimited", no "Questions" suffix', () => {
    const config: QuizConfig = { mode: 'mixed', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 'unlimited' }
    expect(formatQuizSummary(config)).toBe('Mixed · World Expert · Type Answer · Unlimited')
  })
  it('updates independently for every axis', () => {
    const base: QuizConfig = { mode: 'capitals', countryPool: 'explorer', answerStyle: 'multiple-choice', questionCount: 5 }
    expect(formatQuizSummary(base)).toBe('Capitals · Explorer · Multiple Choice · 5 Questions')
    expect(formatQuizSummary({ ...base, answerStyle: 'type-answer' })).toBe('Capitals · Explorer · Type Answer · 5 Questions')
  })
})

describe('distributeMixedCounts (future Mixed generator scaffolding)', () => {
  it('splits 5 questions as 1 per category', () => {
    const counts = distributeMixedCounts(5)
    for (const category of MIXED_CATEGORIES) expect(counts[category]).toBe(1)
  })
  it('splits 10 questions as 2 per category', () => {
    const counts = distributeMixedCounts(10)
    for (const category of MIXED_CATEGORIES) expect(counts[category]).toBe(2)
  })
  it('always sums back to the requested total, distributing any remainder to the first categories', () => {
    for (const total of [1, 3, 7, 12, 23]) {
      const counts = distributeMixedCounts(total)
      const sum = MIXED_CATEGORIES.reduce((s, c) => s + counts[c], 0)
      expect(sum).toBe(total)
      // No category count differs from another by more than 1 (balanced).
      const values = MIXED_CATEGORIES.map((c) => counts[c])
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
    }
  })
})
