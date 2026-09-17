import { toCountrySlug } from '../lib/country/slug'
import { normalizeCountryName } from '../lib/text/normalize'

export interface Country {
  /** Stable slug identifier, e.g. "costa-rica". Never changes once shipped. */
  id: string
  /** Display name, e.g. "Costa Rica". Shown only after a game is complete. */
  name: string
  /** Gameplay form, e.g. "COSTARICA". */
  normalized: string
  /** normalized.length — the board width for this country. */
  length: number
}

/**
 * Canonical V1 dataset: the commonly recognised 193 UN member states +
 * Palestine + Vatican City + Taiwan + Kosovo + England + Scotland + Wales
 * (200 entries), using practical English names rather than formal
 * diplomatic names.
 *
 * Taiwan and Kosovo are deliberate departures from the original 195-entry
 * baseline (193 UN members + Palestine + Vatican City): both are partially
 * recognised, disputed-status entities that are nonetheless included for
 * gameplay purposes, under their plain common name ("Taiwan", "Kosovo")
 * with no political qualifier, and treated identically to every other entry
 * by normalization, validation and answer eligibility. This dataset does
 * not use UN membership as a strict inclusion test — it is a deliberate,
 * curated gameplay list, and future disputed/partially-recognised entities
 * can be added the same way: add the plain name here (see the historical/
 * tail note below for how the daily schedule absorbs it safely) and wire it
 * into the flag mapping (data/countryDetails/flags.ts) if an asset exists.
 *
 * England, Scotland and Wales are a further departure in the same spirit:
 * constituent countries of the United Kingdom, not sovereign ISO 3166-1
 * states, included under their plain common names and treated identically
 * to every other entry by normalization, validation and answer eligibility.
 * "United Kingdom" itself remains a separate, distinct entry (too long to
 * be a playable answer, but still a valid guess) — adding these three does
 * not merge, alias or replace it. Northern Ireland is deliberately NOT a
 * standalone canonical entry here (and none is planned) — it is mentioned
 * only where it belongs, as part of the United Kingdom's own factual data
 * (officialName / fact text in countryRecords.ts), never as its own country,
 * flag mapping or Study entry.
 * See data/countryDetails/countryRecords.ts for how their results-page
 * records omit iso2/iso3 (no ISO 3166-1 code exists for a constituent
 * country) and data/countryDetails/flags.ts for how their flags use real
 * ISO 3166-2 subdivision codes (GB-ENG/GB-SCT/GB-WLS) rather than sharing
 * the United Kingdom's plain GB code.
 *
 * Naming decisions worth knowing about:
 *  - "Congo" is the Republic of the Congo; "DR Congo" is the Democratic
 *    Republic of the Congo. Both are distinct after normalization.
 *  - "Ivory Coast", "Turkey", "Czechia", "Eswatini", "Cabo Verde",
 *    "Timor-Leste", "Myanmar", "North Macedonia" per the product spec.
 *  - "São Tomé and Príncipe" keeps its diacritics for display; normalization
 *    strips them (SAOTOMEANDPRINCIPE).
 *  - "Micronesia" is the Federated States of Micronesia.
 *  - "Bahamas" and "Gambia" are used without the leading article.
 *  - "Taiwan" and "Kosovo" are included without qualifiers; see above.
 *
 * IMPORTANT: the daily schedule is derived from the eligible pool built from
 * this list, but it is NOT simply "reshuffle whenever the list changes" — see
 * the historical/tail split in src/lib/daily/select.ts, which lets this list
 * grow (as it did for Taiwan, then Kosovo, then England/Scotland/Wales)
 * without disturbing already-scheduled puzzles.
 * Renaming or removing an existing entry is not covered by that safeguard
 * and would still change its historical mapping; a snapshot test guards
 * against accidental changes either way — see src/lib/daily/select.test.ts.
 */
const RAW_COUNTRY_NAMES: readonly string[] = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'DR Congo',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'England',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Ivory Coast',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'São Tomé and Príncipe',
  'Saudi Arabia',
  'Scotland',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Wales',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

/**
 * Stable identifier = the public country slug (lib/country/slug.ts), so
 * `/results/:slug` resolves straight back to a dataset entry by id.
 */
export function toCountryId(name: string): string {
  return toCountrySlug(name)
}

export function buildCountry(name: string): Country {
  const normalized = normalizeCountryName(name)
  return { id: toCountryId(name), name, normalized, length: normalized.length }
}

/** Every canonical country, in alphabetical display order. */
export const COUNTRIES: readonly Country[] = Object.freeze(
  RAW_COUNTRY_NAMES.map(buildCountry),
)

/** Minimum / maximum normalized length eligible as a daily/practice answer in V1. */
export const MIN_ANSWER_LENGTH = 4
export const MAX_ANSWER_LENGTH = 10

export function isEligibleAnswer(country: Country): boolean {
  return country.length >= MIN_ANSWER_LENGTH && country.length <= MAX_ANSWER_LENGTH
}

/**
 * Countries that may appear as answers. Any country (of the matching length)
 * remains a valid *guess* regardless of eligibility.
 */
export const ANSWER_POOL: readonly Country[] = Object.freeze(
  COUNTRIES.filter(isEligibleAnswer),
)

const BY_NORMALIZED: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((c) => [c.normalized, c]),
)
const BY_ID: ReadonlyMap<string, Country> = new Map(COUNTRIES.map((c) => [c.id, c]))

export function findCountryByNormalized(normalized: string): Country | undefined {
  return BY_NORMALIZED.get(normalized)
}

export function findCountryById(id: string): Country | undefined {
  return BY_ID.get(id)
}

/** Public URL slug -> country. Alias of findCountryById; slugs and ids are the same value. */
export function findCountryBySlug(slug: string): Country | undefined {
  return BY_ID.get(slug)
}

export function countriesOfLength(length: number): Country[] {
  return COUNTRIES.filter((c) => c.length === length)
}
