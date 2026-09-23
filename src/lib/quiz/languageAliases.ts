import { COUNTRIES } from '../../data/countries'
import type { AnswerDomainSpec, DomainCandidate } from './answerValidation'
import { languagesOf } from './languages'
import { normalizeCountryName } from '../text/normalize'

/**
 * Explicit alternative names accepted for a Type Answer submission, keyed
 * by the exact canonical string as it appears in a country's `languages`
 * array (see countryRecords.ts). Deliberately a small, curated list of
 * well-established alternative English names/endonyms/spellings — not
 * broad fuzzy matching, which could turn a wrong answer into a correct
 * one. Two different countries can safely use overlapping alias sets
 * (e.g. Ivory Coast's Dioula and Guinea's Pular are never aliased to each
 * other) since a Type Answer question only ever checks the current
 * question's own canonical language(s), never across countries.
 */
const LANGUAGE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Swahili: ['Kiswahili'],
  'Standard Chinese (Putonghua)': ['Mandarin', 'Chinese', 'Putonghua', 'Standard Chinese'],
  Bangla: ['Bengali'],
  Persian: ['Farsi'],
  isiZulu: ['Zulu'],
  isiXhosa: ['Xhosa'],
  Setswana: ['Tswana'],
  Sesotho: ['Sotho'],
  siSwati: ['Swazi', 'Siswati'],
  Ndebele: ['isiNdebele', 'Sindebele'],
  Chichewa: ['Nyanja'],
  Kirundi: ['Rundi'],
  Dhivehi: ['Maldivian'],
  Tetum: ['Tetun'],
  Maninka: ['Malinke', 'Mandingo'],
  Luganda: ['Ganda'],
  Kikuyu: ['Gikuyu'],
  iTaukei: ['Fijian'],
  Sinhala: ['Sinhalese'],
  Oromo: ['Afaan Oromo', 'Oromiffa'],
  Filipino: ['Tagalog'],
  'South African Sign Language': ['SASL'],
  'New Zealand Sign Language': ['NZSL'],
  'Papua New Guinean Sign Language': ['Papua New Guinea Sign Language', 'PNG Sign Language', 'PNGSL'],
  'Solomon Islands Pijin': ['Pijin'],
  'Seychellois Creole': ['Seselwa'],
  'Mauritian Creole': ['Morisyen'],
  'Haitian Creole': ['Kreyol', 'Kreyòl'],
  'Cabo Verdean Creole': ['Kabuverdianu', 'Cape Verdean Creole'],
  'Guinea-Bissau Creole': ['Kriol'],
}

/**
 * Every normalized form a Type Answer submission may take to count as a
 * correct match for `canonical`. Beyond the explicit alias list above,
 * two safe *structural* forms are derived automatically:
 *
 *  - slash-separated canonical values (e.g. "Hoklo/Taiwanese") accept
 *    either individual side of the slash, not just the full string;
 *  - a trailing parenthetical (e.g. "Standard Chinese (Putonghua)")
 *    accepts the part before the parenthesis, the part inside it, or the
 *    full string.
 *
 * All comparison is via normalizeCountryName() (diacritic-stripping,
 * case-insensitive, letters-only) — the same normalizer already used for
 * country-name and capital-name Type Answer matching elsewhere in
 * lib/quiz, reused here rather than duplicated.
 */
export function acceptedNormalizedForms(canonical: string): Set<string> {
  const forms = new Set<string>()
  const add = (s: string) => {
    const key = normalizeCountryName(s)
    if (key) forms.add(key)
  }

  add(canonical)
  for (const part of canonical.split('/')) add(part)

  const parenMatch = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(canonical)
  if (parenMatch) {
    add(parenMatch[1]!)
    add(parenMatch[2]!)
  }

  for (const alias of LANGUAGE_ALIASES[canonical] ?? []) add(alias)

  return forms
}

/** True if `input` is an accepted Type Answer submission for `canonical`. */
export function isAcceptedLanguageAnswer(input: string, canonical: string): boolean {
  return acceptedNormalizedForms(canonical).has(normalizeCountryName(input))
}

/**
 * True if `input` matches ANY of `canonicalOptions` (each checked via
 * isAcceptedLanguageAnswer). Used for Easy Type Answer (any language in
 * the country's array is correct) and the Medium exclusion mechanic's
 * accepted set (every remaining language after the excluded one).
 */
export function isAcceptedForAny(input: string, canonicalOptions: readonly string[]): boolean {
  return canonicalOptions.some((c) => isAcceptedLanguageAnswer(input, c))
}

/**
 * Every individually-suggestible display form of `canonical` — its own
 * spelling, each side of a slash-separated value, each part of a trailing
 * parenthetical, and each explicit alias — as SEPARATE strings rather than
 * one string with many keys. This is what lets a domain-wide Did You Mean
 * suggestion be the most natural player-facing form: a typo of the alias
 * "Kiswahili" should suggest "Kiswahili", not force the canonical "Swahili"
 * on the player, and a typo of "Mandarin" (an alias of "Standard Chinese
 * (Putonghua)") should suggest "Mandarin", not the full parenthetical
 * canonical string. Exact-match correctness checking (isAcceptedLanguageAnswer)
 * is unaffected — it still uses acceptedNormalizedForms's single merged key
 * set per canonical value.
 */
function displayVariants(canonical: string): string[] {
  const variants = [canonical]
  for (const part of canonical.split('/')) if (part !== canonical) variants.push(part)
  const parenMatch = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(canonical)
  if (parenMatch) {
    variants.push(parenMatch[1]!)
    variants.push(parenMatch[2]!)
  }
  for (const alias of LANGUAGE_ALIASES[canonical] ?? []) variants.push(alias)
  return variants
}

/**
 * Every principal language across the full canonical dataset, expanded
 * into one candidate per distinct display variant (deduped by normalized
 * form) — the language Type Answer domain, used for both the "real but
 * wrong" check and domain-wide Did You Mean matching. A module-level
 * constant, built once and reused unchanged for every question — this is
 * what makes domain-wide typo matching correctness-blind (see
 * answerValidation.ts's own doc comment): the same pool is searched
 * whether the current question is about Brazil, Belgium, or anything else.
 */
const LANGUAGE_DOMAIN_CANDIDATES: readonly DomainCandidate[] = (() => {
  const seen = new Map<string, DomainCandidate>()
  for (const country of COUNTRIES) {
    for (const language of languagesOf(country)) {
      for (const variant of displayVariants(language)) {
        const key = normalizeCountryName(variant)
        if (key && !seen.has(key)) seen.set(key, { display: variant, keys: [key] })
      }
    }
  }
  return [...seen.values()]
})()

/**
 * Builds the language AnswerDomainSpec for a Languages Type Answer
 * question. `acceptedCanonical` is that question's own accepted answer(s)
 * exactly as languageQuestions.ts already produces them (one or more
 * canonical language strings — Easy accepts any language of the country,
 * Medium's exclusion mechanic accepts every remaining language) — each is
 * expanded into its own alias-derived key set via acceptedNormalizedForms,
 * matching isAcceptedForAny()'s existing behaviour exactly for the
 * "is this correct" check. The domain-wide candidate pool is always the
 * full dataset, regardless of which language(s) happen to be correct here.
 */
export function buildLanguageAnswerDomain(acceptedCanonical: readonly string[]): AnswerDomainSpec {
  const accepted: DomainCandidate[] = acceptedCanonical.map((canonical) => ({
    display: canonical,
    keys: [...acceptedNormalizedForms(canonical)],
  }))
  return {
    label: 'language',
    accepted,
    domainCandidates: LANGUAGE_DOMAIN_CANDIDATES,
    typoEnabled: true,
  }
}
