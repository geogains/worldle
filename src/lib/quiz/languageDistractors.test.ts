import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { languagesOf } from './languages'
import { getLanguageDistractors, getLanguageSetDistractors } from './languageDistractors'
import { normalizeCountryName } from '../text/normalize'

const nigeria = findCountryById('nigeria')!
const bolivia = findCountryById('bolivia')!
const southAfrica = findCountryById('south-africa')!

describe('getLanguageDistractors', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] returns exactly 3 distractors, no duplicates`, () => {
      const distractors = getLanguageDistractors(nigeria, pool, 3, Math.random)
      expect(distractors).toHaveLength(3)
      expect(new Set(distractors.map(normalizeCountryName)).size).toBe(3)
    })
    it(`[${pool}] never returns a language that is valid for the correct country (no accidental second right answer)`, () => {
      const correctKeys = new Set(languagesOf(nigeria).map(normalizeCountryName))
      const distractors = getLanguageDistractors(nigeria, pool, 3, Math.random)
      for (const d of distractors) expect(correctKeys.has(normalizeCountryName(d)), d).toBe(false)
    })
  }

  it('is deterministic for a fixed random source', () => {
    const random = () => 0.42
    const a = getLanguageDistractors(nigeria, 'explorer', 3, random)
    const b = getLanguageDistractors(nigeria, 'explorer', 3, random)
    expect(a).toEqual(b)
  })

  it('[explorer/world-expert] prefers same-continent languages before falling back to the wider pool', () => {
    // Nigeria (Africa): with a shuffle that always "picks first" (constant
    // 0), the same-continent tier should be exhausted before falling back.
    const distractors = getLanguageDistractors(nigeria, 'world-expert', 3, () => 0)
    expect(distractors).toHaveLength(3)
  })

  it('never includes any of the correct country languages even for a heavily multi-language country (South Africa, 5 languages)', () => {
    const correctKeys = new Set(languagesOf(southAfrica).map(normalizeCountryName))
    for (let i = 0; i < 10; i++) {
      const distractors = getLanguageDistractors(southAfrica, 'world-expert', 3, Math.random)
      for (const d of distractors) expect(correctKeys.has(normalizeCountryName(d))).toBe(false)
    }
  })
})

describe('getLanguageSetDistractors', () => {
  it('returns sets that differ from the correct set and from each other', () => {
    const correct = [...languagesOf(bolivia)]
    const sets = getLanguageSetDistractors(correct, bolivia, 'explorer', 3, Math.random)
    expect(sets.length).toBeGreaterThan(0)
    const keys = sets.map((s) => [...s].map(normalizeCountryName).sort().join('|'))
    const correctKey = [...correct].map(normalizeCountryName).sort().join('|')
    for (const key of keys) expect(key).not.toBe(correctKey)
    expect(new Set(keys).size).toBe(keys.length) // no two distractor sets are identical (as unordered multisets)
  })

  it('every distractor set has no duplicate language within itself', () => {
    const correct = [...languagesOf(southAfrica)]
    const sets = getLanguageSetDistractors(correct, southAfrica, 'world-expert', 3, Math.random)
    for (const set of sets) {
      expect(new Set(set.map(normalizeCountryName)).size, set.join(',')).toBe(set.length)
    }
  })

  it('every distractor set has the same length as the correct set (exactly one member swapped)', () => {
    const correct = [...languagesOf(nigeria)]
    const sets = getLanguageSetDistractors(correct, nigeria, 'explorer', 3, Math.random)
    for (const set of sets) expect(set).toHaveLength(correct.length)
  })

  it('a distractor set differing from the correct set only by order is never produced (order is not a valid distinguishing feature)', () => {
    const correct = [...languagesOf(bolivia)]
    const sets = getLanguageSetDistractors(correct, bolivia, 'world-expert', 5, Math.random)
    const correctKey = [...correct].map(normalizeCountryName).sort().join('|')
    for (const set of sets) {
      const key = [...set].map(normalizeCountryName).sort().join('|')
      expect(key).not.toBe(correctKey)
    }
  })

  it('is deterministic for a fixed random source', () => {
    const correct = [...languagesOf(nigeria)]
    const random = () => 0.3
    const a = getLanguageSetDistractors(correct, nigeria, 'world-expert', 3, random)
    const b = getLanguageSetDistractors(correct, nigeria, 'world-expert', 3, random)
    expect(a).toEqual(b)
  })
})

/** How many members of `correct` do not appear (by normalized form) in `candidate` — the number of swapped positions, since both are the same length with no internal duplicates. */
function swapDistance(correct: readonly string[], candidate: readonly string[]): number {
  const candidateKeys = new Set(candidate.map(normalizeCountryName))
  return correct.filter((l) => !candidateKeys.has(normalizeCountryName(l))).length
}

describe('Medium vs Expert distractor strategy (maxSwaps)', () => {
  const ethiopia = findCountryById('ethiopia')! // 5 languages — enough room to distinguish 1- vs 2-swap distractors
  const southAfricaCorrect = () => [...languagesOf(southAfrica)]
  const ethiopiaCorrect = () => [...languagesOf(ethiopia)]

  it('Expert (maxSwaps=1, the default): every distractor differs from the correct set by exactly one language', () => {
    for (let seed = 0; seed < 20; seed++) {
      const random = () => (seed + 0.5) / 20
      const sets = getLanguageSetDistractors(ethiopiaCorrect(), ethiopia, 'world-expert', 3, random)
      for (const set of sets) {
        expect(swapDistance(ethiopiaCorrect(), set), JSON.stringify(set)).toBe(1)
      }
    }
  })

  it('Expert explicitly passing maxSwaps=1 behaves identically to the default', () => {
    const random = () => 0.42
    const withDefault = getLanguageSetDistractors(southAfricaCorrect(), southAfrica, 'world-expert', 3, random)
    const withExplicit1 = getLanguageSetDistractors(southAfricaCorrect(), southAfrica, 'world-expert', 3, () => 0.42, 1)
    expect(withDefault).toEqual(withExplicit1)
  })

  it('Medium (maxSwaps=2): distractors may differ by one OR two languages — never zero, never more than two', () => {
    const distances = new Set<number>()
    for (let seed = 0; seed < 30; seed++) {
      const random = () => (seed + 0.5) / 30
      const sets = getLanguageSetDistractors(ethiopiaCorrect(), ethiopia, 'world-expert', 3, random, 2)
      for (const set of sets) {
        const d = swapDistance(ethiopiaCorrect(), set)
        expect(d, JSON.stringify(set)).toBeGreaterThanOrEqual(1)
        expect(d, JSON.stringify(set)).toBeLessThanOrEqual(2)
        distances.add(d)
      }
    }
    // Medium must actually exercise both distances across enough draws —
    // if it only ever produced 1-swap sets it would be indistinguishable
    // from Expert, which is exactly what this refinement pass requires.
    expect(distances.has(1), 'Medium never produced a 1-swap (easier) distractor').toBe(true)
    expect(distances.has(2), 'Medium never produced a 2-swap (harder-to-mistake-for-correct, easier-to-eliminate) distractor').toBe(true)
  })

  it('Medium is not accidentally using the exact Expert algorithm: across many draws, Medium produces at least one 2-swap set that Expert (maxSwaps=1) could never produce', () => {
    let mediumProducedTwoSwap = false
    for (let seed = 0; seed < 30; seed++) {
      const random = () => (seed + 0.5) / 30
      const mediumSets = getLanguageSetDistractors(southAfricaCorrect(), southAfrica, 'world-expert', 3, random, 2)
      if (mediumSets.some((s) => swapDistance(southAfricaCorrect(), s) === 2)) mediumProducedTwoSwap = true
    }
    expect(mediumProducedTwoSwap).toBe(true)
  })
})
