import { findCountryBySlug, type Country } from '../countries'
import { countryCodeForSlug, flagUrlForCode } from './flags'
import { COUNTRY_FACTS } from './records'
import type { CountryDetails, CountryFactKey, CountryFactsRecord } from './types'

export type { CountryDetails, CountryFactKey, CountryFactsRecord } from './types'
export { COUNTRY_CODES, FLAG_ASSET, flagUrlForCode } from './flags'
export { COUNTRY_FACTS } from './records'

/** Placeholder copy shown for any educational field that is not populated yet. */
export const PLACEHOLDER = Object.freeze({
  value: 'Coming soon',
  funFact: 'Country fact coming soon.',
})

const FACT_KEYS: readonly CountryFactKey[] = ['capital', 'population', 'continent', 'currency', 'languages', 'funFact']

function hasValue(v: unknown): boolean {
  if (typeof v === 'string') return v.trim().length > 0
  // An array field counts as verified once it's *present*, even if empty —
  // e.g. `languages: []` is a real, verified fact (no official national
  // language), not missing data. `undefined` (the field left out of the
  // record entirely) is Array.isArray(undefined) === false, so that case
  // still correctly falls through to "not verified" below.
  if (Array.isArray(v)) return v.every((s) => typeof s === 'string' && s.trim().length > 0)
  return false
}

/**
 * Builds the resolved details for a canonical country. Name and slug come
 * from the gameplay dataset (the single source of truth for which countries
 * exist), the flag from the code mapping, and the educational fields from
 * the records table — each falling back to a placeholder independently.
 */
export function buildCountryDetails(country: Country, record: CountryFactsRecord = {}): CountryDetails {
  const countryCode = countryCodeForSlug(country.id)
  const verified = Object.fromEntries(FACT_KEYS.map((k) => [k, hasValue(record[k])])) as Record<
    CountryFactKey,
    boolean
  >
  return {
    slug: country.id,
    name: country.name,
    countryCode,
    flagUrl: countryCode ? flagUrlForCode(countryCode) : null,
    capital: verified.capital ? (record.capital as string) : PLACEHOLDER.value,
    population: verified.population ? (record.population as string) : PLACEHOLDER.value,
    continent: verified.continent ? (record.continent as string) : PLACEHOLDER.value,
    currency: verified.currency ? (record.currency as string) : PLACEHOLDER.value,
    languages: verified.languages ? [...(record.languages as string[])] : [PLACEHOLDER.value],
    funFact: verified.funFact ? (record.funFact as string) : PLACEHOLDER.funFact,
    verified,
  }
}

/**
 * slug -> CountryDetails. Returns null only when the slug is not a gameplay
 * country at all; a valid country with no metadata yet resolves to
 * placeholders, so every one of the 200 countries has a results page today.
 */
export function getCountryDetails(slug: string): CountryDetails | null {
  const country = findCountryBySlug(slug)
  if (!country) return null
  return buildCountryDetails(country, COUNTRY_FACTS[country.id])
}

/** Convenience for callers that already hold a Country (e.g. a completed game). */
export function getCountryDetailsFor(country: Country): CountryDetails {
  return buildCountryDetails(country, COUNTRY_FACTS[country.id])
}
