import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { capitalOf, eligibleCapitalCountries } from './capitals'
import { getCapitalDistractors } from './capitalDistractors'
import { normalizeCountryName } from '../text/normalize'

const romania = findCountryById('romania')!
const tanzania = findCountryById('tanzania')!
const turkey = findCountryById('turkey')!
const england = findCountryById('england')!

describe('getCapitalDistractors: universal guarantees', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] returns exactly 3 distractors, no duplicate countries, correct country excluded`, () => {
      const distractors = getCapitalDistractors(romania, pool, 3, Math.random)
      expect(distractors).toHaveLength(3)
      expect(new Set(distractors.map((c) => c.id)).size).toBe(3)
      expect(distractors.some((c) => c.id === 'romania')).toBe(false)
    })
    it(`[${pool}] every distractor belongs to the requested pool and has a valid supported capital`, () => {
      const poolIds = new Set(eligibleCapitalCountries(pool).map((c) => c.id))
      const distractors = getCapitalDistractors(romania, pool, 3, Math.random)
      for (const d of distractors) {
        expect(poolIds.has(d.id), d.id).toBe(true)
        expect(capitalOf(d), d.id).not.toBeNull()
      }
    })
    it(`[${pool}] no distractor's capital text duplicates the correct capital or another distractor's`, () => {
      const correct = tanzania
      const distractors = getCapitalDistractors(correct, pool, 3, Math.random)
      const keys = [capitalOf(correct)!, ...distractors.map((d) => capitalOf(d)!)].map(normalizeCountryName)
      expect(new Set(keys).size).toBe(keys.length)
    })
  }

  it('England (capital London) never receives the United Kingdom (also capital London) as a distractor', () => {
    for (let i = 0; i < 20; i++) {
      const distractors = getCapitalDistractors(england, 'world-expert', 3, Math.random)
      expect(distractors.some((d) => d.id === 'united-kingdom')).toBe(false)
    }
  })
})

describe('getCapitalDistractors: Familiar strategy (Easy)', () => {
  it('draws distractors from the Familiar pool with no continent preference required', () => {
    const distractors = getCapitalDistractors(romania, 'familiar', 3, Math.random)
    const familiarIds = new Set(eligibleCapitalCountries('familiar').map((c) => c.id))
    for (const d of distractors) expect(familiarIds.has(d.id)).toBe(true)
  })
})

describe('getCapitalDistractors: Explorer strategy (Medium)', () => {
  it('prefers same-continent Explorer countries before falling back to the wider pool', () => {
    const distractors = getCapitalDistractors(romania, 'explorer', 3, () => 0)
    for (const d of distractors) {
      expect(getCountryDetails(d.id)!.continent).toBe('Europe')
    }
  })
  it('falls back to the rest of the Explorer pool when same-continent candidates run out', () => {
    const distractors = getCapitalDistractors(findCountryById('fiji')!, 'explorer', 3, Math.random)
    expect(distractors).toHaveLength(3)
  })
})

describe('getCapitalDistractors: World Expert strategy (curated confusion groups)', () => {
  it('prefers curated commonly-confused capitals when configured (Turkey -> Greece/Bulgaria/Georgia)', () => {
    const distractors = getCapitalDistractors(turkey, 'world-expert', 3, () => 0)
    const ids = distractors.map((c) => c.id)
    expect(ids.sort()).toEqual(['bulgaria', 'georgia', 'greece'])
  })
  it('curated distractors are always real capitals in the supported dataset, never non-capital cities', () => {
    const distractors = getCapitalDistractors(turkey, 'world-expert', 3, () => 0)
    for (const d of distractors) expect(capitalOf(d)).not.toBeNull()
  })
  it('falls back to same-continent, then the full pool, when no/insufficient curated candidates are configured', () => {
    const distractors = getCapitalDistractors(tanzania, 'world-expert', 3, Math.random)
    expect(distractors).toHaveLength(3)
    expect(distractors.some((c) => c.id === 'tanzania')).toBe(false)
  })
  it('a curated group with fewer than 3 entries still fills the remainder from the fallback tiers', () => {
    // Australia's curated group is just New Zealand (Sydney/Melbourne are
    // not capitals and are deliberately excluded) — the other 2 distractors
    // must come from the fallback tiers, and the result must still be
    // exactly 3 with no duplicates.
    const distractors = getCapitalDistractors(findCountryById('australia')!, 'world-expert', 3, Math.random)
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors.map((c) => c.id)).size).toBe(3)
  })
})
