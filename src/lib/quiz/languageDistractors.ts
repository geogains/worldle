import type { Country } from '../../data/countries'
import { continentOf } from './distractors'
import { eligibleLanguageCountries, languagesOf } from './languages'
import { defaultRandom, shuffle, type RandomSource } from './random'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

/**
 * V1 Multiple Choice individual-language distractor strategy — mirrors
 * getDistractors()/getCapitalDistractors()'s tiering (best distractor
 * first, shuffled within each tier), but over *language strings* rather
 * than Country/capital objects:
 *
 *  - Familiar (Easy): every other language in the pool is one broad tier.
 *  - Explorer/World Expert (Medium/Expert): same-continent countries'
 *    languages first, then the rest of the pool.
 *
 * If the requested `pool` doesn't contain enough distinct candidate
 * languages (checked, not assumed — see the invariant test in
 * languageQuestions.test.ts), this broadens to the full World Expert pool
 * as a final tier, since exactly 4 Multiple Choice options is a gameplay
 * invariant, not a best-effort target — see languageQuestions.ts's
 * doc comment on that invariant.
 *
 * Always excludes every language already valid for `correct` (so a
 * distractor can never accidentally also be a right answer for this
 * country — the single most important invariant for Easy MC) and never
 * returns a duplicate language, comparing by normalized form so case/
 * diacritic variants of the same language can't both appear.
 */
export function getLanguageDistractors(
  correct: Country,
  pool: CountryPool,
  count: number,
  random: RandomSource = defaultRandom,
): string[] {
  const correctKeys = new Set(languagesOf(correct).map(normalizeCountryName))

  const collect = (countries: readonly Country[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of countries) {
      for (const lang of languagesOf(c)) {
        const key = normalizeCountryName(lang)
        if (correctKeys.has(key) || seen.has(key)) continue
        seen.add(key)
        out.push(lang)
      }
    }
    return out
  }

  const tiersFor = (p: CountryPool): string[][] => {
    const eligible = eligibleLanguageCountries(p).filter((c) => c.id !== correct.id)
    if (p === 'familiar') return [shuffle(collect(eligible), random)]
    const correctContinent = continentOf(correct.id)
    const sameContinent = eligible.filter((c) => correctContinent && continentOf(c.id) === correctContinent)
    return [shuffle(collect(sameContinent), random), shuffle(collect(eligible), random)]
  }

  const take = (tiers: string[][], into: string[], used: Set<string>) => {
    for (const tier of tiers) {
      for (const lang of tier) {
        if (into.length >= count) return
        const key = normalizeCountryName(lang)
        if (used.has(key)) continue
        used.add(key)
        into.push(lang)
      }
    }
  }

  const result: string[] = []
  const used = new Set<string>()
  take(tiersFor(pool), result, used)
  // Progressive broadening: exactly `count` options is a gameplay
  // invariant (see module doc comment), not a best-effort target — if the
  // requested pool came up short, widen to the full World Expert language
  // pool before giving up.
  if (result.length < count && pool !== 'world-expert') {
    take(tiersFor('world-expert'), result, used)
  }
  return result
}

function normalizeSet(languages: readonly string[]): string {
  return languages.map(normalizeCountryName).sort().join('|')
}

/**
 * `count` variant sets of `correct`'s language set for Medium/Expert
 * "which set belongs to this country" Multiple Choice. `maxSwaps`
 * controls how different a variant is allowed to be from the real set —
 * this is the deliberate Medium/Expert distinction:
 *
 *  - Expert (maxSwaps=1, the default): every distractor swaps EXACTLY one
 *    member of the real set for a plausible substitute — a genuine
 *    "near-miss" requiring precise knowledge of the complete set.
 *  - Medium (maxSwaps=2): each distractor independently swaps either one
 *    OR two members, so some distractors are one-language near-misses
 *    (like Expert) while others differ more — "moderately distinguishable",
 *    per the design brief, rather than uniformly as hard as Expert.
 *
 * Substitutes are drawn from the same tiered, plausibility-ranked pool
 * getLanguageDistractors() uses (same-continent preferred for Explorer/
 * World Expert), and that function's own progressive-broadening guarantee
 * carries through here — a generous substitute pool is requested up
 * front, and if it's still not enough, this falls back to the full World
 * Expert substitute pool before giving up, so producing fewer than
 * `count` sets should be extraordinarily rare for this 200-country
 * dataset (see the dataset-wide invariant test in languageQuestions.test.ts).
 *
 * Every returned set has the same length as `correct`, contains no
 * duplicate language internally, and is distinct from the real set and
 * from every other returned set when compared as an unordered multiset
 * (normalizeSet) — so a reshuffled copy of an already-produced set, or of
 * the real set, is never counted as a new/different option.
 */
export function getLanguageSetDistractors(
  correct: readonly string[],
  correctCountry: Country,
  pool: CountryPool,
  count: number,
  random: RandomSource = defaultRandom,
  maxSwaps: 1 | 2 = 1,
): string[][] {
  const swapsCap = Math.min(maxSwaps, correct.length)
  const substitutePoolSize = Math.max(count * (swapsCap + 1) * 4, 20)

  let substitutes = shuffle(getLanguageDistractors(correctCountry, pool, substitutePoolSize, random), random)
  if (substitutes.length < count * swapsCap + 3 && pool !== 'world-expert') {
    substitutes = shuffle(getLanguageDistractors(correctCountry, 'world-expert', substitutePoolSize, random), random)
  }

  const correctKey = normalizeSet(correct)
  const results: string[][] = []
  const seenKeys = new Set<string>([correctKey])
  let subIndex = 0
  let attempts = 0
  const maxAttempts = Math.max(substitutes.length * correct.length * 3, 300)

  const allIndices = correct.map((_, i) => i)

  while (results.length < count && attempts < maxAttempts && subIndex < substitutes.length) {
    attempts++
    const numSwaps = 1 + Math.floor(random() * swapsCap)
    // Fisher-Yates (bounded, no retry-until-unique loop — see random.ts)
    // rather than "sample a random index until we have N distinct ones":
    // that pattern can never terminate if `random` ever returns the same
    // value on consecutive calls, which a fixed/seeded test source (or a
    // pathological real one) legitimately can.
    const indicesToSwap = shuffle(allIndices, random).slice(0, Math.min(numSwaps, correct.length))

    const candidate = correct.slice()
    let ranOutOfSubstitutes = false
    for (const idx of indicesToSwap) {
      const substitute = substitutes[subIndex]
      subIndex++
      if (!substitute) {
        ranOutOfSubstitutes = true
        break
      }
      candidate[idx] = substitute
    }
    if (ranOutOfSubstitutes) break

    if (new Set(candidate.map(normalizeCountryName)).size !== candidate.length) continue // would duplicate an existing member
    const key = normalizeSet(candidate)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    results.push(candidate)
  }
  return results
}
