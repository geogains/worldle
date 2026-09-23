import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { currencyOf } from './currencies'
import { getCurrencyDistractors } from './currencyDistractors'
import { normalizeCountryName } from '../text/normalize'

const japan = findCountryById('japan')!
const senegal = findCountryById('senegal')! // West African CFA Franc — shared by 8 countries
const switzerland = findCountryById('switzerland')!

describe('getCurrencyDistractors', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] returns exactly 3 name distractors, no duplicates, none equal to the correct answer`, () => {
      const distractors = getCurrencyDistractors(japan, pool, 3, Math.random, 'name')
      expect(distractors).toHaveLength(3)
      expect(new Set(distractors.map(normalizeCountryName)).size).toBe(3)
      expect(distractors.map(normalizeCountryName)).not.toContain(normalizeCountryName('Japanese Yen'))
    })

    it(`[${pool}] returns exactly 3 code distractors, no duplicates, none equal to the correct code`, () => {
      const distractors = getCurrencyDistractors(switzerland, pool, 3, Math.random, 'code')
      expect(distractors).toHaveLength(3)
      expect(new Set(distractors.map(normalizeCountryName)).size).toBe(3)
      expect(distractors).not.toContain('CHF')
    })
  }

  it('is deterministic for a fixed random source', () => {
    const random = () => 0.42
    const a = getCurrencyDistractors(japan, 'explorer', 3, random)
    const b = getCurrencyDistractors(japan, 'explorer', 3, random)
    expect(a).toEqual(b)
  })

  it('excludes every country sharing the correct answer\'s currency, not just the correct country itself (Senegal/XOF has 7 other member countries)', () => {
    const correctName = currencyOf(senegal)!.name
    for (let i = 0; i < 15; i++) {
      const distractors = getCurrencyDistractors(senegal, 'world-expert', 3, Math.random, 'name')
      expect(distractors.map(normalizeCountryName)).not.toContain(normalizeCountryName(correctName))
    }
  })

  it('[explorer/world-expert] prefers same-continent currencies before falling back to the wider pool', () => {
    // Japan (Asia): with a shuffle that always "picks first" (constant 0),
    // the same-continent tier should be exhausted before falling back.
    const distractors = getCurrencyDistractors(japan, 'world-expert', 3, () => 0, 'name')
    expect(distractors).toHaveLength(3)
  })

  it('progressively broadens to the full World Expert pool if the requested pool alone is insufficient, rather than returning fewer than requested', () => {
    // Vatican City (Familiar pool has very few EUR-adjacent alternatives to exclude against) —
    // exercise a small pool with a large exclusion set to confirm broadening still reaches `count`.
    const vatican = findCountryById('vatican-city')!
    const distractors = getCurrencyDistractors(vatican, 'familiar', 3, Math.random, 'name')
    expect(distractors).toHaveLength(3)
  })
})
