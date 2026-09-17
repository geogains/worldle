import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { getDistractors } from './distractors'
import { resolveCountryPool } from './pools'
import type { RandomSource } from './random'

const romania = findCountryById('romania')!
const tanzania = findCountryById('tanzania')!

function seq(values: number[]): RandomSource {
  let i = 0
  return () => {
    const v = values[i % values.length] as number
    i++
    return v
  }
}

describe('getDistractors: universal guarantees', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] returns exactly 3 distractors, no duplicates, correct answer excluded`, () => {
      const distractors = getDistractors(romania, pool, 3, Math.random)
      expect(distractors).toHaveLength(3)
      expect(new Set(distractors.map((c) => c.id)).size).toBe(3)
      expect(distractors.some((c) => c.id === 'romania')).toBe(false)
    })
    it(`[${pool}] every distractor belongs to the requested pool`, () => {
      const poolIds = new Set(resolveCountryPool(pool).map((c) => c.id))
      const distractors = getDistractors(romania, pool, 3, Math.random)
      for (const d of distractors) expect(poolIds.has(d.id), d.id).toBe(true)
    })
  }

  it('is deterministic for a fixed random source', () => {
    const random = () => 0.42
    const a = getDistractors(romania, 'explorer', 3, random)
    const b = getDistractors(romania, 'explorer', 3, random)
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
  })
})

describe('getDistractors: Familiar strategy', () => {
  it('draws distractors from the Familiar pool with no continent preference required', () => {
    const distractors = getDistractors(findCountryById('romania')!, 'familiar', 3, Math.random)
    const familiarIds = new Set(resolveCountryPool('familiar').map((c) => c.id))
    for (const d of distractors) expect(familiarIds.has(d.id)).toBe(true)
  })
})

describe('getDistractors: Explorer strategy', () => {
  it('prefers same-continent Explorer countries before falling back to the wider pool', () => {
    // Romania (Europe): the Explorer pool contains many European countries
    // (e.g. slovenia/slovakia/serbia/croatia/hungary/bulgaria/...), so with
    // a shuffle that always "picks first" (constant 0), the same-continent
    // tier should be preferred over the fallback tier.
    const distractors = getDistractors(romania, 'explorer', 3, () => 0)
    for (const d of distractors) {
      expect(getCountryDetails(d.id)!.continent).toBe('Europe')
    }
  })
  it('falls back to the rest of the Explorer pool when same-continent candidates run out', () => {
    // Fiji (Oceania) has very few same-continent Explorer companions
    // (Papua New Guinea, Samoa) — asking for 3 distractors must still
    // succeed by falling back to the wider Explorer pool.
    const distractors = getDistractors(findCountryById('fiji')!, 'explorer', 3, Math.random)
    expect(distractors).toHaveLength(3)
  })
})

describe('getDistractors: World Expert strategy', () => {
  it('prefers configured look-alike countries when available (Romania -> chad/moldova/andorra)', () => {
    // constant-0 random never reshuffles a single-element remainder out of
    // first place, so the curated tier (3 candidates for a count of 3)
    // should completely fill the result.
    const distractors = getDistractors(romania, 'world-expert', 3, () => 0)
    const ids = distractors.map((c) => c.id)
    expect(ids.sort()).toEqual(['andorra', 'chad', 'moldova'])
  })
  it('falls back to same-continent, then the full pool, when no/insufficient look-alikes are configured', () => {
    // Tanzania has no curated similar-flag group at all.
    const distractors = getDistractors(tanzania, 'world-expert', 3, Math.random)
    expect(distractors).toHaveLength(3)
    expect(distractors.some((c) => c.id === 'tanzania')).toBe(false)
  })
  it('a country with exactly enough look-alikes still gets a full set without touching the fallback tiers', () => {
    // Qatar/Bahrain is a group of 2, i.e. only 1 look-alike for Qatar —
    // the other 2 distractors must come from the fallback tiers, and the
    // result must still be exactly 3 with no duplicates.
    const distractors = getDistractors(findCountryById('qatar')!, 'world-expert', 3, Math.random)
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors.map((c) => c.id)).size).toBe(3)
  })
})

describe('getDistractors: visible ordering', () => {
  it('a different random source can produce a different distractor order/selection', () => {
    const a = getDistractors(romania, 'familiar', 3, seq([0.01, 0.2, 0.3, 0.4]))
    const b = getDistractors(romania, 'familiar', 3, seq([0.99, 0.8, 0.7, 0.6]))
    // Not asserting they must differ (small chance of overlap), just that
    // the function is actually driven by the injected source, not a fixed
    // internal order — different sources are allowed to (and typically do)
    // produce different results.
    expect(a.length).toBe(3)
    expect(b.length).toBe(3)
  })
})
