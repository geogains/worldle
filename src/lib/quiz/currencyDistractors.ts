import type { Country } from '../../data/countries'
import { continentOf } from './distractors'
import { currencyOf, eligibleCurrencyCountries } from './currencies'
import { defaultRandom, shuffle, type RandomSource } from './random'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

type CurrencyField = 'name' | 'code'

/**
 * V1 Multiple Choice distractor strategy for Currencies — mirrors
 * getDistractors()/getLanguageDistractors()'s tiering (same-continent-
 * first plausibility, shuffled within each tier, progressively broadened
 * to the full World Expert pool if the requested pool comes up short —
 * exactly 4 options is a gameplay invariant, not a best-effort target, see
 * currencyQuestions.ts's module comment), reused rather than reinvented:
 *
 *  - Familiar (Easy): every other country's currency in the pool is one
 *    broad tier.
 *  - Explorer/World Expert (Medium fallback/Expert): same-continent
 *    countries' currencies first, then the rest of the pool.
 *
 * `field` selects which part of the candidate's currency becomes the
 * distractor label — `'name'` for forward/code-reverse questions,
 * `'code'` for code-forward questions — so this one helper serves both
 * "country -> currency name", "country -> code" and "code -> currency
 * name" without duplicating the tiering logic three times.
 *
 * Always excludes every country whose currency matches `correct`'s own on
 * the requested field (not just `correct` itself) — other countries can
 * legitimately share the same currency (e.g. Senegal and Mali are both
 * West African CFA Franc), and including one as a "distractor" would
 * silently produce an option identical to the correct answer, the same
 * invariant getLanguageDistractors() enforces for shared languages.
 */
export function getCurrencyDistractors(
  correct: Country,
  pool: CountryPool,
  count: number,
  random: RandomSource = defaultRandom,
  field: CurrencyField = 'name',
): string[] {
  const correctCurrency = currencyOf(correct)
  const correctKey = correctCurrency ? normalizeCountryName(correctCurrency[field]) : ''

  const collect = (countries: readonly Country[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of countries) {
      const currency = currencyOf(c)
      if (!currency) continue
      const label = currency[field]
      const key = normalizeCountryName(label)
      if (key === correctKey || seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
    return out
  }

  const tiersFor = (p: CountryPool): string[][] => {
    const eligible = eligibleCurrencyCountries(p).filter((c) => c.id !== correct.id)
    if (p === 'familiar') return [shuffle(collect(eligible), random)]
    const correctContinent = continentOf(correct.id)
    const sameContinent = eligible.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    return [shuffle(collect(sameContinent), random), shuffle(collect(eligible), random)]
  }

  const take = (tiers: string[][], into: string[], used: Set<string>) => {
    for (const tier of tiers) {
      for (const label of tier) {
        if (into.length >= count) return
        const key = normalizeCountryName(label)
        if (used.has(key)) continue
        used.add(key)
        into.push(label)
      }
    }
  }

  const result: string[] = []
  const used = new Set<string>([correctKey])
  take(tiersFor(pool), result, used)
  // Progressive broadening: exactly `count` options is a gameplay
  // invariant, not a best-effort target — if the requested pool came up
  // short, widen to the full World Expert pool before giving up. With 143
  // unique currencies/codes across 200 countries, this should be
  // extraordinarily rare in practice — see the dataset-wide invariant test
  // in currencyQuestions.test.ts.
  if (result.length < count && pool !== 'world-expert') {
    take(tiersFor('world-expert'), result, used)
  }
  return result
}
