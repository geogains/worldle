import { COUNTRIES, type Country } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { resolveCountryPool } from './pools'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

/**
 * A country's canonical Principal Languages (see countryRecords.ts's
 * `languages` field doc comment for the policy behind this list), or an
 * empty array if the country isn't in the gameplay dataset at all, or its
 * languages fact isn't verified yet. Every one of the 200 canonical
 * countries currently has a verified, non-empty languages array, but this
 * stays a real lookup (not an assumption) — matches the capitalOf()/
 * languagesOf() pattern already established for Capitals.
 */
export function languagesOf(country: Country): readonly string[] {
  const details = getCountryDetails(country.id)
  if (!details || !details.verified.languages) return []
  return details.languages
}

/** Every country in `pool` that has usable language data. */
export function eligibleLanguageCountries(pool: CountryPool): Country[] {
  return resolveCountryPool(pool).filter((c) => languagesOf(c).length > 0)
}

/**
 * True if `language` (compared case/diacritic-insensitively via the same
 * normalizer used throughout lib/quiz) appears in exactly one canonical
 * country's languages array, and that country is `countryId`. This is
 * computed against the FULL canonical dataset (COUNTRIES), not just the
 * current pool — a language's ambiguity is a fact about the dataset, not
 * about which difficulty tier happens to be selected.
 *
 * Used to gate the single-language-country "reverse" question fallback:
 * a reverse question ("Which country has {language} as its language?")
 * must never be asked for a language shared by more than one country, or
 * the "single correct country" premise the question relies on would be
 * false. See languageQuestions.ts.
 */
export function isUnambiguousLanguage(language: string, countryId: string): boolean {
  const key = normalizeCountryName(language)
  const owners = COUNTRIES.filter((c) => languagesOf(c).some((l) => normalizeCountryName(l) === key))
  return owners.length === 1 && owners[0]!.id === countryId
}
