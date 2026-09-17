import { COUNTRY_RECORDS, formatCurrency, formatPopulation } from './countryRecords'
import type { CountryFactsRecord } from './types'

/**
 * Per-country educational records, keyed by country slug (= dataset id).
 * This is what buildCountryDetails() (index.ts) actually renders on
 * /results/:slug today — the flat, always-a-display-string shape.
 *
 * Every entry here is *derived* from COUNTRY_RECORDS (countryRecords.ts) via
 * toCountryFactsRecord(), not hand-typed — one source of truth, and adding a
 * new country is purely a matter of adding it to COUNTRY_RECORDS: this
 * derivation covers whatever's there automatically, with no per-country
 * listing needed here.
 *
 * The population fact shows only the formatted value — population.asOf is
 * intentionally not rendered anywhere (not appended as a note, not shown as
 * its own stat); it stays in CountryPopulation.asOf (countryRecords.ts) for
 * future maintenance/UI use. See formatPopulationNote() there if a future UI
 * wants it back as a genuinely separate, secondary note.
 *
 * `languages` is passed through as-is, including a genuinely empty array
 * (e.g. Australia has no official national language) — that is a verified
 * fact, not missing data; see hasValue() below and the languages fallback in
 * CountryResultCard.
 *
 * Every gameplay country not yet in COUNTRY_RECORDS intentionally has no
 * entry here. Any field left out (or a country absent entirely) resolves to
 * a "Coming soon" placeholder via getCountryDetails() — later batches will
 * populate the rest.
 *
 * Every key must be an existing country id (enforced by a test).
 */

function toCountryFactsRecord(record: (typeof COUNTRY_RECORDS)[string]): CountryFactsRecord {
  return {
    capital: record.capital,
    population: formatPopulation(record.population),
    continent: record.continent,
    currency: formatCurrency(record.currency),
    languages: record.languages,
    funFact: record.fact,
  }
}

export const COUNTRY_FACTS: Readonly<Record<string, CountryFactsRecord>> = Object.freeze(
  Object.fromEntries(
    Object.entries(COUNTRY_RECORDS).map(([slug, record]) => [slug, toCountryFactsRecord(record)]),
  ),
)
