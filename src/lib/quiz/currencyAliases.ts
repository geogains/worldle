import { COUNTRIES } from '../../data/countries'
import type { AnswerDomainSpec, DomainCandidate } from './answerValidation'
import { currencyOf } from './currencies'
import { normalizeCountryName } from '../text/normalize'

/**
 * Explicit alternative names accepted for a Type Answer submission, keyed
 * by the exact canonical `currency.name` string in countryRecords.ts.
 * Small, curated, explicit — not fuzzy matching — mirroring
 * languageAliases.ts's LANGUAGE_ALIASES exactly. Sourced from the two
 * currency-data audits (Sept 2026), which verified each of these against
 * the ISO 4217 registry and treated them as legitimate display-name
 * variants, not errors.
 *
 * "Zloty" and "Dong" are included for a structural reason, not a naming
 * preference: normalizeCountryName() strips any character outside A-Z
 * after NFD decomposition, which correctly turns a composed accent (e.g.
 * Guaraní's í, Córdoba's ó) into a bare letter, but Ł and Đ are standalone
 * letters with no NFD decomposition, so they're deleted rather than
 * replaced — "Polish Złoty" alone would normalize to "POLISHZOTY" (no L)
 * and "Vietnamese Đồng" to "VIETNAMESEONG" (no D). Explicit ASCII aliases
 * close that gap without touching the shared normalizer. Every other
 * diacritic in the dataset (Guaraní, Colón, Córdoba, Króna, Tögrög,
 * Bolívar, Paʻanga) decomposes correctly and needs no alias — see
 * currencyAliases.test.ts.
 */
const CURRENCY_NAME_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'United States Dollar': ['US Dollar', 'USD'],
  'Pound Sterling': ['British Pound', 'Sterling'],
  Renminbi: ['Yuan', 'Chinese Yuan', 'RMB'],
  'Czech Koruna': ['Czech Crown'],
  'Russian Ruble': ['Russian Rouble'],
  'Belarusian Ruble': ['Belarusian Rouble'],
  'United Arab Emirates Dirham': ['UAE Dirham', 'Emirati Dirham'],
  'Israeli New Shekel': ['New Israeli Shekel', 'NIS'],
  'Polish Złoty': ['Zloty'],
  'Vietnamese Đồng': ['Dong'],
}

/**
 * Country-scoped currency-type shorthand (e.g. "Japanese Yen" -> "Yen",
 * "Nigerian Naira" -> "Naira") for forward Type Answer questions — the
 * canonical name's last word, which is the genuine currency-type/proper
 * -noun term for every multi-word name in this dataset (verified during
 * the currency audits). This is NEVER exported as a cross-dataset alias:
 * a caller only ever adds it to ONE question's own acceptedCanonical array
 * (see currencyQuestions.ts's buildForward), so a bare term like "Dollar"
 * or "Franc" is safe here even though many different currencies share that
 * last word dataset-wide — Type Answer validation only ever checks the
 * current question's own accepted set (isAcceptedForAny), never a global
 * lookup across countries. Excluded: single-word names (Euro, Renminbi —
 * already the shortest form) and "Zimbabwe Gold" ("Gold" is not a genuine
 * currency-type noun and would be a misleading accepted answer).
 */
const SHORTHAND_EXCLUDED_NAMES: ReadonlySet<string> = new Set(['Zimbabwe Gold'])

export function currencyTypeShorthand(canonicalName: string): string | null {
  if (SHORTHAND_EXCLUDED_NAMES.has(canonicalName)) return null
  const words = canonicalName.trim().split(/\s+/)
  if (words.length < 2) return null
  return words[words.length - 1]!
}

export function acceptedNormalizedForms(canonical: string): Set<string> {
  const forms = new Set<string>()
  const add = (s: string) => {
    const key = normalizeCountryName(s)
    if (key) forms.add(key)
  }
  add(canonical)
  for (const alias of CURRENCY_NAME_ALIASES[canonical] ?? []) add(alias)
  return forms
}

/** True if `input` is an accepted Type Answer submission for the currency `canonical`. */
export function isAcceptedCurrencyAnswer(input: string, canonical: string): boolean {
  return acceptedNormalizedForms(canonical).has(normalizeCountryName(input))
}

/**
 * True if `input` matches ANY of `canonicalOptions` (each checked via
 * isAcceptedCurrencyAnswer). Mirrors languageAliases.ts's
 * isAcceptedForAny() — used wherever a question's acceptedCanonical array
 * has more than one valid entry (e.g. the canonical name plus its
 * country-scoped shorthand).
 */
export function isAcceptedForAnyCurrency(input: string, canonicalOptions: readonly string[]): boolean {
  return canonicalOptions.some((c) => isAcceptedCurrencyAnswer(input, c))
}

/**
 * ISO currency-code Type Answer validation (Expert "enter the code" form)
 * — deliberately separate from isAcceptedCurrencyAnswer: codes are always
 * plain 3-letter ASCII, so this is a trimmed, case-insensitive EXACT
 * match, never fuzzy and never alias-expanded ("CHF"/"chf"/"Chf" all
 * accepted; nothing else is).
 */
export function isAcceptedCurrencyCode(input: string, canonicalCode: string): boolean {
  return normalizeCountryName(input) === normalizeCountryName(canonicalCode)
}

/**
 * Every canonical currency name (deduped — many countries share EUR, USD,
 * XOF...) plus every EXPLICIT alias, each as its OWN separate candidate
 * (display = that exact name/alias, not folded into the canonical value's
 * key set) — so a typo of an alias suggests the alias itself (e.g. a typo
 * of "Yuan" suggests "Yuan", not "Renminbi"; see currencyAliases.test.ts
 * and the conversation this was specified in). Deliberately does NOT
 * include currencyTypeShorthand()'s mechanically-derived bare terms
 * ("Krone", "Franc", "Dollar"...) in general — see
 * CURRENCY_UNIQUE_SHORTHAND_CANDIDATES below for the one narrow exception.
 */
function canonicalAndAliasCandidates(): DomainCandidate[] {
  const seen = new Map<string, DomainCandidate>()
  for (const country of COUNTRIES) {
    const currency = currencyOf(country)
    if (!currency) continue
    const canonicalKey = normalizeCountryName(currency.name)
    if (!seen.has(canonicalKey)) seen.set(canonicalKey, { display: currency.name, keys: [canonicalKey] })
    for (const alias of CURRENCY_NAME_ALIASES[currency.name] ?? []) {
      const aliasKey = normalizeCountryName(alias)
      if (!seen.has(aliasKey)) seen.set(aliasKey, { display: alias, keys: [aliasKey] })
    }
  }
  return [...seen.values()]
}

/**
 * Currency-type shorthand words (see currencyTypeShorthand()) that are
 * UNIQUE across the dataset — i.e. exactly one currency's last word
 * normalizes to this value — added to the domain-wide pool as their own
 * candidates (e.g. "Naira", "Złoty", "Yen": nothing else in the dataset
 * ends in those words). Shorthand shared by two or more DIFFERENT
 * currencies ("Krone" — Denmark AND Norway; "Dollar", "Franc", "Pound",
 * "Peso", "Dinar", "Rupee", "Won", "Kwacha", "Manat", "Som", "Leu" — each
 * shared by several real, different currencies in this dataset) is
 * deliberately EXCLUDED: including one of them would mean arbitrarily
 * picking a single currency to represent an inherently ambiguous term,
 * exactly what the domain-wide matcher must never do (see
 * answerValidation.ts's step 2/3 doc comment and the "Dolar" example in
 * this module's own test file). This exclusion is what preserves the
 * Denmark "Krona" -> "Krone" case: since bare "Krone" isn't a domain-wide
 * candidate, typing it (or a typo of it) never short-circuits to
 * "valid-but-incorrect" for an unrelated currency, and the domain-wide
 * typo search (step 3a) never finds it either — classifyTypeAnswer's step
 * 3b (a narrow fallback that searches only the CURRENT question's own
 * accepted answers, which include the contextual shorthand) is what
 * actually resolves "Krona" -> "Krone" for a Denmark question specifically
 * — see that function's own doc comment for the full mechanism and
 * currencyAliases.test.ts for the documented trade-off this accepts.
 */
function uniqueShorthandCandidates(): DomainCandidate[] {
  const shorthandOwners = new Map<string, Set<string>>() // normalized shorthand -> set of normalized canonical currency names using it
  const shorthandDisplay = new Map<string, string>() // normalized shorthand -> its own display spelling
  for (const country of COUNTRIES) {
    const currency = currencyOf(country)
    if (!currency) continue
    const shorthand = currencyTypeShorthand(currency.name)
    if (!shorthand) continue
    const shorthandKey = normalizeCountryName(shorthand)
    shorthandDisplay.set(shorthandKey, shorthand)
    if (!shorthandOwners.has(shorthandKey)) shorthandOwners.set(shorthandKey, new Set())
    shorthandOwners.get(shorthandKey)!.add(normalizeCountryName(currency.name))
  }
  const candidates: DomainCandidate[] = []
  for (const [shorthandKey, owners] of shorthandOwners) {
    if (owners.size !== 1) continue // ambiguous across multiple different currencies — excluded
    candidates.push({ display: shorthandDisplay.get(shorthandKey)!, keys: [shorthandKey] })
  }
  return candidates
}

/**
 * The full currency-NAME Type Answer domain: every canonical name, every
 * explicit alias, and every UNAMBIGUOUS shorthand term, each as its own
 * suggestible candidate. A module-level constant, built once and reused
 * unchanged for every question — this is what makes domain-wide typo
 * matching correctness-blind (see answerValidation.ts's own doc comment):
 * the same pool is searched whether the current question is about
 * Denmark, Japan, or anything else.
 */
const CURRENCY_DOMAIN_CANDIDATES: readonly DomainCandidate[] = [
  ...canonicalAndAliasCandidates(),
  ...uniqueShorthandCandidates(),
]

/** Every ISO code across the full 143-currency dataset, one candidate per unique code. */
const CURRENCY_CODE_DOMAIN_CANDIDATES: readonly DomainCandidate[] = (() => {
  const seen = new Map<string, DomainCandidate>()
  for (const country of COUNTRIES) {
    const currency = currencyOf(country)
    if (!currency) continue
    const key = normalizeCountryName(currency.code)
    if (!seen.has(key)) seen.set(key, { display: currency.code, keys: [key] })
  }
  return [...seen.values()]
})()

/**
 * Builds the currency-NAME AnswerDomainSpec for a Currencies Type Answer
 * question whose answer is a currency name ('forward' and 'code-reverse'
 * kinds — see currencyQuestions.ts). `acceptedCanonical` is that
 * question's own accepted answer(s) exactly as already produced (canonical
 * name, plus the country-scoped shorthand for 'forward' questions) — each
 * is expanded via acceptedNormalizedForms for the "is this correct" check,
 * matching isAcceptedForAnyCurrency()'s existing behaviour exactly. The
 * domain-wide candidate pool is always the full dataset, regardless of
 * which currency happens to be correct here.
 */
export function buildCurrencyAnswerDomain(acceptedCanonical: readonly string[]): AnswerDomainSpec {
  const accepted: DomainCandidate[] = acceptedCanonical.map((canonical) => ({
    display: canonical,
    keys: [...acceptedNormalizedForms(canonical)],
  }))
  return {
    label: 'currency',
    accepted,
    domainCandidates: CURRENCY_DOMAIN_CANDIDATES,
    typoEnabled: true,
  }
}

/**
 * Builds the currency-CODE AnswerDomainSpec for a Currencies 'code-forward'
 * Type Answer question ("enter the currency code for X"). Did You Mean is
 * deliberately DISABLED for this domain (`typoEnabled: false`), unchanged
 * by the domain-wide expansion of the name/country/capital/language
 * domains: every code is exactly 3 characters, and a 1-edit "correction"
 * at that length is usually a genuinely different real code, not a typo —
 * e.g. XOF (West African CFA Franc) and XAF (Central African CFA Franc)
 * differ by exactly one letter and are both real, different, correct
 * answers elsewhere in this dataset. Suggesting one as a "typo" of the
 * other would be actively wrong, not helpful, so this domain relies on
 * step 2 (valid-but-incorrect) and step 4 (invalid) only — a real code
 * that's wrong for this question stays a normal wrong answer; a non-code
 * stays invalid. See typo.ts's typoThreshold() for the length<=3 backstop
 * this decision also matches.
 */
export function buildCurrencyCodeAnswerDomain(correctCode: string): AnswerDomainSpec {
  return {
    label: 'currency code',
    accepted: [{ display: correctCode, keys: [normalizeCountryName(correctCode)] }],
    domainCandidates: CURRENCY_CODE_DOMAIN_CANDIDATES,
    typoEnabled: false,
  }
}
