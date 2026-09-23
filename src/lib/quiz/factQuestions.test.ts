import { describe, expect, it } from 'vitest'
import { COUNTRIES, findCountryById } from '../../data/countries'
import { createFactQuestion, generateFactQuestions, type FactQuestion } from './factQuestions'
import { eligibleFactEntries, eligibleFactEntriesFor, resolveDistractors } from './facts'
import { FACT_ENTRIES } from './factsData'
import type { AnswerStyle, CountryPool } from './types'
import type { RandomSource } from './random'

const POOLS: CountryPool[] = ['familiar', 'explorer', 'world-expert']

/** Forces createFactQuestion() to pick `targetId` by excluding every other eligible country from the candidate set — same deterministic-force technique used throughout currencyQuestions.test.ts. */
function forQuestion(pool: CountryPool, answerStyle: AnswerStyle, targetId: string, random: RandomSource): FactQuestion {
  const avoidIds = eligibleFactEntriesFor(pool, answerStyle)
    .map((e) => e.countryId)
    .filter((id) => id !== targetId)
  return createFactQuestion(pool, answerStyle, avoidIds, random)
}

describe('FACT_ENTRIES data integrity', () => {
  it('has exactly one entry per canonical country (200/200 coverage)', () => {
    expect(FACT_ENTRIES).toHaveLength(200)
    const ids = new Set(FACT_ENTRIES.map((e) => e.countryId))
    expect(ids.size).toBe(200)
  })

  it('every entry\'s countryId and distractorIds resolve to real, distinct Country records', () => {
    for (const entry of FACT_ENTRIES) {
      const country = findCountryById(entry.countryId)
      expect(country, entry.countryId).toBeDefined()
      expect(entry.distractorIds, entry.countryId).toHaveLength(3)
      const distractorCountries = entry.distractorIds.map((id) => findCountryById(id))
      distractorCountries.forEach((c, i) => expect(c, `${entry.countryId} distractor ${i}`).toBeDefined())
      const allIds = [entry.countryId, ...entry.distractorIds]
      expect(new Set(allIds).size, `${entry.countryId} distractors must be unique and exclude the answer`).toBe(4)
    }
  })

  it('no empty questions, and every question is a distinct sentence (no duplicate questions)', () => {
    const questions = FACT_ENTRIES.map((e) => e.question)
    for (const q of questions) expect(q.trim().length).toBeGreaterThan(0)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('no question\'s text contains its own answer country\'s full name (answer-leak guard)', () => {
    // Congo is a deliberate, reviewed exception: its question names the
    // Congo River and "Democratic Republic of the Congo" (a DIFFERENT,
    // distinct country) as the fixed reference point — "Congo" appearing
    // there doesn't hand over the answer, since DR Congo is itself the
    // leading distractor (see its distractorIds) and the player still has
    // to know Brazzaville, not Kinshasa, is Congo's own capital.
    const reviewedExceptions = new Set(['congo'])
    for (const entry of FACT_ENTRIES) {
      if (reviewedExceptions.has(entry.countryId)) continue
      const country = findCountryById(entry.countryId)!
      expect(entry.question.toLowerCase(), entry.countryId).not.toContain(country.name.toLowerCase())
    }
  })

  it('every COUNTRIES entry has a matching FACT_ENTRIES row (no country silently excluded)', () => {
    const ids = new Set(FACT_ENTRIES.map((e) => e.countryId))
    for (const country of COUNTRIES) expect(ids.has(country.id), country.id).toBe(true)
  })
})

describe('eligibleFactEntries: tiers nest Easy ⊂ Medium ⊂ Expert', () => {
  it('familiar ⊆ explorer ⊆ world-expert, and world-expert is all 200', () => {
    const familiar = eligibleFactEntries('familiar')
    const explorer = eligibleFactEntries('explorer')
    const worldExpert = eligibleFactEntries('world-expert')
    expect(worldExpert).toHaveLength(200)
    const familiarIds = new Set(familiar.map((e) => e.countryId))
    const explorerIds = new Set(explorer.map((e) => e.countryId))
    for (const id of familiarIds) expect(explorerIds.has(id), id).toBe(true)
    expect(explorer.length).toBeGreaterThan(familiar.length)
    expect(worldExpert.length).toBeGreaterThan(explorer.length)
  })

  it('every pool has at least 10 questions for Multiple Choice (a full 10-question game with no repeats)', () => {
    for (const pool of POOLS) {
      expect(eligibleFactEntriesFor(pool, 'multiple-choice').length, pool).toBeGreaterThanOrEqual(10)
    }
  })

  it('every pool has at least 10 Type-Answer-eligible questions', () => {
    for (const pool of POOLS) {
      expect(eligibleFactEntriesFor(pool, 'type-answer').length, pool).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('createFactQuestion — Multiple Choice', () => {
  it('always has exactly 4 unique options with exactly 1 correct, and the prompt is the curated question', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'peru', Math.random)
    expect(q.country.id).toBe('peru')
    const entry = FACT_ENTRIES.find((e) => e.countryId === 'peru')!
    expect(q.prompt).toBe(entry.question)
    expect(q.choices).toHaveLength(4)
    expect(new Set(q.choices!.map((c) => c.label)).size).toBe(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('Peru')
  })

  it('choices are exactly the curated distractors plus the correct country (no generic random substitution) when all 3 curated distractors resolve', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'peru', Math.random)
    const entry = FACT_ENTRIES.find((e) => e.countryId === 'peru')!
    const expectedLabels = new Set([findCountryById(entry.countryId)!.name, ...resolveDistractors(entry).map((c) => c.name)])
    expect(new Set(q.choices!.map((c) => c.label))).toEqual(expectedLabels)
  })

  it('is deterministic for a fixed RandomSource (same seed -> same choice order)', () => {
    const seeded = (): RandomSource => {
      let i = 0
      const seq = [0.1, 0.9, 0.4, 0.6]
      return () => seq[i++ % seq.length]!
    }
    const q1 = forQuestion('world-expert', 'multiple-choice', 'peru', seeded())
    const q2 = forQuestion('world-expert', 'multiple-choice', 'peru', seeded())
    expect(q1.choices!.map((c) => c.label)).toEqual(q2.choices!.map((c) => c.label))
  })

  it('never shows the same option twice across every entry in the dataset', () => {
    for (const entry of FACT_ENTRIES) {
      const q = forQuestion('world-expert', 'multiple-choice', entry.countryId, Math.random)
      expect(new Set(q.choices!.map((c) => c.label)).size, entry.countryId).toBe(4)
    }
  })
})

describe('createFactQuestion — Type Answer', () => {
  it('accepts only the correct country name, reveals it on the question, and never shows a flag-relevant field', () => {
    const q = forQuestion('world-expert', 'type-answer', 'peru', Math.random)
    expect(q.acceptedCanonical).toEqual(['Peru'])
    expect(q.revealAnswer).toBe('Peru')
    expect(q.choices).toBeUndefined()
  })

  it('never generates a Type Answer question for a country excluded from typeAnswerEligible', () => {
    const excluded = FACT_ENTRIES.filter((e) => !e.typeAnswerEligible)
    expect(excluded.length).toBeGreaterThan(0) // sanity: the dataset does exclude some
    for (const entry of excluded) {
      // Force every OTHER eligible entry out of the pool; if the excluded
      // country were reachable, this would return it — it must not.
      const avoidIds = eligibleFactEntriesFor('world-expert', 'type-answer').map((e) => e.countryId)
      const q = createFactQuestion('world-expert', 'type-answer', avoidIds, Math.random)
      expect(q.country.id).not.toBe(entry.countryId)
    }
  })
})

describe('generateFactQuestions', () => {
  it('produces the requested count with no repeated country across a finite quiz', () => {
    const questions = generateFactQuestions({ countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 10 }, Math.random)
    expect(questions).toHaveLength(10)
    expect(new Set(questions.map((q) => q.country.id)).size).toBe(10)
  })

  it('respects Type Answer eligibility across a full generated quiz', () => {
    const eligibleIds = new Set(eligibleFactEntriesFor('world-expert', 'type-answer').map((e) => e.countryId))
    const questions = generateFactQuestions({ countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 10 }, Math.random)
    for (const q of questions) expect(eligibleIds.has(q.country.id)).toBe(true)
  })
})
