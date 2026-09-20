import type { Country } from '../../data/countries'
import { capitalOf, eligibleCapitalCountries } from './capitals'
import { continentOf } from './distractors'
import { defaultRandom, shuffle, type RandomSource } from './random'
import { getSimilarCapitalCountryIds } from './similarCapitals'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

function byId(pool: readonly Country[]): Map<string, Country> {
  return new Map(pool.map((c) => [c.id, c]))
}

/**
 * V1 Multiple Choice capital-distractor strategy — mirrors distractors.ts's
 * getDistractors() tiering (best distractor first, shuffled within each
 * tier), but over *capitals* rather than flags:
 *
 *  - Familiar: the whole Familiar pool (with usable capital data) is one
 *    broad tier — accessible recognition, no attempt at plausibility.
 *  - Explorer: same-continent Explorer countries first, then the rest of
 *    the Explorer pool.
 *  - World Expert: curated commonly-confused capitals first
 *    (similarCapitals.ts), then same-continent World Expert countries, then
 *    the rest of the full pool.
 *
 * Always excludes the correct country and never returns a duplicate
 * country. Also never returns two countries whose *visible capital text*
 * is identical (e.g. England and the United Kingdom both have "London") —
 * deduplication is by normalized capital string, not just country id, so
 * the same city name can never appear twice as an option, and can never
 * duplicate the correct answer's own capital either.
 */
export function getCapitalDistractors(
  correct: Country,
  pool: CountryPool,
  count: number,
  random: RandomSource = defaultRandom,
): Country[] {
  const correctCapital = capitalOf(correct)
  const correctKey = correctCapital ? normalizeCountryName(correctCapital) : null

  const eligible = eligibleCapitalCountries(pool).filter((c) => c.id !== correct.id)
  const eligibleById = byId(eligible)

  const tiers: Country[][] = []

  if (pool === 'familiar') {
    tiers.push(shuffle(eligible, random))
  } else if (pool === 'explorer') {
    const correctContinent = continentOf(correct.id)
    const sameContinent = eligible.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    tiers.push(shuffle(sameContinent, random))
    tiers.push(shuffle(eligible, random))
  } else {
    const curatedIds = getSimilarCapitalCountryIds(correct.id)
    const curated = curatedIds.map((id) => eligibleById.get(id)).filter((c): c is Country => c !== undefined)
    tiers.push(shuffle(curated, random))

    const correctContinent = continentOf(correct.id)
    const sameContinent = eligible.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    tiers.push(shuffle(sameContinent, random))

    tiers.push(shuffle(eligible, random))
  }

  const result: Country[] = []
  const usedIds = new Set<string>()
  const usedCapitalKeys = new Set<string>(correctKey ? [correctKey] : [])
  for (const tier of tiers) {
    for (const candidate of tier) {
      if (result.length >= count) break
      if (usedIds.has(candidate.id)) continue
      const capital = capitalOf(candidate)
      if (!capital) continue
      const key = normalizeCountryName(capital)
      if (usedCapitalKeys.has(key)) continue
      usedIds.add(candidate.id)
      usedCapitalKeys.add(key)
      result.push(candidate)
    }
    if (result.length >= count) break
  }
  return result
}
