import { describe, expect, it } from 'vitest'
import { capitalOf, eligibleCapitalCountries } from './capitals'
import { createCapitalQuestion, generateCapitalQuestions } from './capitalQuestions'

describe('createCapitalQuestion', () => {
  it('multiple-choice: produces exactly 4 choices including the correct country, position randomized', () => {
    const seenCorrectIndex = new Set<number>()
    for (let i = 0; i < 30; i++) {
      const q = createCapitalQuestion('familiar', 'multiple-choice', [], Math.random)
      expect(q.choices).toBeDefined()
      expect(q.choices).toHaveLength(4)
      expect(q.choices!.map((c) => c.id)).toContain(q.country.id)
      expect(new Set(q.choices!.map((c) => c.id)).size).toBe(4)
      seenCorrectIndex.add(q.choices!.findIndex((c) => c.id === q.country.id))
    }
    expect(seenCorrectIndex.size).toBeGreaterThan(1)
  })

  it('every multiple-choice option is a valid supported capital, and none duplicate visible capital text', () => {
    const q = createCapitalQuestion('world-expert', 'multiple-choice', [], Math.random)
    const capitals = q.choices!.map((c) => capitalOf(c))
    for (const capital of capitals) expect(capital).not.toBeNull()
    expect(new Set(capitals).size).toBe(capitals.length)
  })

  it('type-answer: has no choices, and the capital matches the country\'s canonical data', () => {
    const q = createCapitalQuestion('familiar', 'type-answer', [], Math.random)
    expect(q.choices).toBeUndefined()
    expect(q.country).toBeDefined()
    expect(q.capital).toBe(capitalOf(q.country))
  })

  it('avoids ids in avoidIds when the pool has other candidates', () => {
    const familiarIds = eligibleCapitalCountries('familiar').map((c) => c.id)
    const avoid = familiarIds.slice(1)
    const q = createCapitalQuestion('familiar', 'type-answer', avoid, Math.random)
    expect(q.country.id).toBe(familiarIds[0])
  })

  it('falls back to allowing a repeat rather than throwing when avoidIds covers the whole pool', () => {
    const familiarIds = eligibleCapitalCountries('familiar').map((c) => c.id)
    const q = createCapitalQuestion('familiar', 'type-answer', familiarIds, Math.random)
    expect(familiarIds).toContain(q.country.id)
  })
})

describe('generateCapitalQuestions', () => {
  it('a 5-question quiz generates exactly 5 questions', () => {
    const questions = generateCapitalQuestions({ countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 }, Math.random)
    expect(questions).toHaveLength(5)
  })
  it('a 10-question quiz generates exactly 10 questions', () => {
    const questions = generateCapitalQuestions({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 10 }, Math.random)
    expect(questions).toHaveLength(10)
  })
  it('does not repeat the same correct country within one finite quiz when the pool has enough countries', () => {
    const questions = generateCapitalQuestions({ countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 10 }, Math.random)
    const ids = questions.map((q) => q.country.id)
    expect(new Set(ids).size).toBe(10)
  })
  it('every question is a valid multiple-choice question when answerStyle is multiple-choice', () => {
    const questions = generateCapitalQuestions({ countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 10 }, Math.random)
    for (const q of questions) {
      expect(q.choices).toHaveLength(4)
      expect(q.choices!.map((c) => c.id)).toContain(q.country.id)
    }
  })
})
