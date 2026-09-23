import { COUNTRIES, type Country } from '../../data/countries'
import { COUNTRY_RECORDS, type CountryCurrency } from '../../data/countryDetails/countryRecords'
import { resolveCountryPool } from './pools'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

export type { CountryCurrency }

/**
 * The canonical `{ name, code, symbol }` for a country, or null if the
 * country isn't in the gameplay dataset at all. Reads COUNTRY_RECORDS
 * directly (not getCountryDetails()'s formatted display string, which
 * collapses name/code/symbol into one "Japanese Yen (JPY) · ¥" string for
 * the results page) — the quiz needs the three fields separately, and
 * countryRecords.ts remains the single authored source either way.
 *
 * Two currency-data audits (Sept 2026) verified every one of the 200
 * canonical countries has a complete, non-empty currency record, so this
 * stays a real lookup (matching capitalOf()/languagesOf()'s defensive
 * pattern) without actually being expected to return null in practice.
 */
export function currencyOf(country: Country): CountryCurrency | null {
  const currency = COUNTRY_RECORDS[country.id]?.currency
  if (!currency || !currency.name.trim() || !currency.code.trim()) return null
  return currency
}

/** Every country in `pool` that has usable currency data. */
export function eligibleCurrencyCountries(pool: CountryPool): Country[] {
  return resolveCountryPool(pool).filter((c) => currencyOf(c) !== null)
}

/**
 * Every canonical country (full dataset, not just the current pool) whose
 * currency code matches `code` (case-insensitively). A currency's
 * ownership is a fact about the dataset, not about which difficulty tier
 * happens to be selected — same reasoning as isUnambiguousLanguage() in
 * languages.ts, which this mirrors.
 */
export function countriesUsingCurrencyCode(code: string): Country[] {
  const key = normalizeCountryName(code)
  return COUNTRIES.filter((c) => {
    const currency = currencyOf(c)
    return currency !== null && normalizeCountryName(currency.code) === key
  })
}

/**
 * True if `code` maps to exactly one canonical country, and that country
 * is `countryId`. Gates the Medium "currency -> country" reverse question:
 * it must never be asked for a currency shared by more than one Worldle
 * country (EUR, XOF, USD, XAF, XCD, AUD, GBP, CHF, ILS — 9 groups, 66
 * countries per the Sept 2026 audit), or the "single correct country"
 * premise would be false. See currencyQuestions.ts.
 *
 * Deliberately NOT used to gate "code -> currency" questions (Expert Form
 * B) — a code always maps to exactly one CURRENCY by construction (that's
 * what makes it a distinct code), regardless of how many countries share
 * it. Only the "which COUNTRY" direction is actually ambiguous for a
 * shared currency; see currencyQuestions.ts's own comment on this.
 */
export function isUniqueCurrency(code: string, countryId: string): boolean {
  const owners = countriesUsingCurrencyCode(code)
  return owners.length === 1 && owners[0]!.id === countryId
}
