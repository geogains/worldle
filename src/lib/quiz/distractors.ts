import type { Country } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { resolveCountryPool } from './pools'
import { defaultRandom, shuffle, type RandomSource } from './random'
import { getSimilarCountryIds } from './similarFlags'
import type { CountryPool } from './types'

export function continentOf(id: string): string | null {
  const details = getCountryDetails(id)
  // Every canonical country has a real continent value (Phase 1 data
  // population is complete) — the null case only guards a country that
  // somehow isn't in the gameplay dataset at all.
  return details ? details.continent : null
}

function byId(pool: readonly Country[]): Map<string, Country> {
  return new Map(pool.map((c) => [c.id, c]))
}

/**
 * V1 Multiple Choice distractor strategy — deliberately not a visual
 * similarity engine. Builds an ordered list of candidate tiers (best
 * distractor first) appropriate to `pool`, then takes the first `count`
 * unique candidates, shuffling within each tier so the exact picks still
 * vary between quizzes:
 *
 *  - Familiar: the whole Familiar pool (excluding the correct answer) is
 *    one broad tier — accessible recognition, no attempt at plausibility.
 *  - Explorer: same-continent Explorer countries first, then the rest of
 *    the Explorer pool.
 *  - World Expert: curated look-alike countries first (similarFlags.ts),
 *    then same-continent World Expert countries, then the rest of the
 *    full pool.
 *
 * Always excludes the correct country and never returns a duplicate.
 * Returns fewer than `count` only if the pool itself doesn't contain
 * enough other countries (impossible in practice — even Familiar has ~44
 * other countries for 3 distractors).
 */
export function getDistractors(
  correct: Country,
  pool: CountryPool,
  count: number,
  random: RandomSource = defaultRandom,
): Country[] {
  const poolCountries = resolveCountryPool(pool).filter((c) => c.id !== correct.id)
  const poolById = byId(poolCountries)

  const tiers: Country[][] = []

  if (pool === 'familiar') {
    tiers.push(shuffle(poolCountries, random))
  } else if (pool === 'explorer') {
    const correctContinent = continentOf(correct.id)
    const sameContinent = poolCountries.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    tiers.push(shuffle(sameContinent, random))
    tiers.push(shuffle(poolCountries, random))
  } else {
    const similarIds = getSimilarCountryIds(correct.id)
    const similar = similarIds.map((id) => poolById.get(id)).filter((c): c is Country => c !== undefined)
    tiers.push(shuffle(similar, random))

    const correctContinent = continentOf(correct.id)
    const sameContinent = poolCountries.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    tiers.push(shuffle(sameContinent, random))

    tiers.push(shuffle(poolCountries, random))
  }

  const result: Country[] = []
  const used = new Set<string>()
  for (const tier of tiers) {
    for (const candidate of tier) {
      if (result.length >= count) break
      if (used.has(candidate.id)) continue
      used.add(candidate.id)
      result.push(candidate)
    }
    if (result.length >= count) break
  }
  return result
}
