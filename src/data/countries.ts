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
 * Canonical V1 dataset: the commonly recognised 195-country set
 * (193 UN member states + Palestine + Vatican City), using practical English
 * names rather than formal diplomatic names.
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
 *
 * IMPORTANT: the daily schedule is derived from the eligible pool built from
 * this list. Adding, removing or renaming an entry changes the eligible pool
 * and therefore future daily answers. A snapshot test guards against
 * accidental changes; see src/lib/daily/select.test.ts.
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
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

export function toCountryId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

export function countriesOfLength(length: number): Country[] {
  return COUNTRIES.filter((c) => c.length === length)
}
