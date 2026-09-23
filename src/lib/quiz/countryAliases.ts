import { COUNTRIES } from '../../data/countries'
import { normalizeCountryName } from '../text/normalize'
import type { AnswerDomainSpec, DomainCandidate } from './answerValidation'

/**
 * Explicit alternative country names, following the same small/explicit
 * philosophy as languageAliases.ts/currencyAliases.ts. Currently empty:
 * an audit of Flags/Capitals/the Daily game found no pre-existing
 * country-name alias system anywhere in the project — Type Answer country
 * matching has always been a direct normalized-name comparison (see
 * data/countries.ts's `normalized` field and findCountryByNormalized()).
 * This map exists so a future addition (e.g. "UK" for United Kingdom) has
 * an obvious, tested home rather than being bolted on ad hoc; it is
 * intentionally not populated with invented aliases as part of this
 * Type-Answer-typo-assistance change.
 */
const COUNTRY_ALIASES: Readonly<Record<string, readonly string[]>> = {}

function candidateFor(countryName: string): DomainCandidate {
  const keys = new Set<string>()
  keys.add(normalizeCountryName(countryName))
  for (const alias of COUNTRY_ALIASES[countryName] ?? []) keys.add(normalizeCountryName(alias))
  return { display: countryName, keys: [...keys] }
}

/**
 * Every country name (+ any future aliases) across the full canonical
 * dataset, one candidate per country — the country Type Answer domain.
 * A module-level constant, built once and reused unchanged for every
 * question: this is what makes domain-wide typo matching correctness-blind
 * (see answerValidation.ts's own doc comment) — the same 200-country pool
 * is searched whether the current flag is Japan, France, or anything else.
 */
const COUNTRY_DOMAIN_CANDIDATES: readonly DomainCandidate[] = COUNTRIES.map((c) => candidateFor(c.name))

/**
 * Builds the country-name AnswerDomainSpec for a single-answer "name this
 * country" question (Flags' own gameplay, and Currencies' Medium reverse
 * kind — see currencyQuestions.ts). `correctCountryName` is the one
 * accepted answer for this specific question; the domain-wide candidate
 * pool (what makes an input "a real country, just wrong" vs "nonsense", and
 * what Did You Mean searches) is always the full 200-country dataset,
 * regardless of difficulty/pool or which country is actually correct.
 */
export function buildCountryAnswerDomain(correctCountryName: string): AnswerDomainSpec {
  return {
    label: 'country name',
    accepted: [candidateFor(correctCountryName)],
    domainCandidates: COUNTRY_DOMAIN_CANDIDATES,
    typoEnabled: true,
  }
}
