import { COUNTRIES, type Country } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import type { AnswerDomainSpec, DomainCandidate } from './answerValidation'
import { resolveCountryPool } from './pools'
import { normalizeCountryName } from '../text/normalize'
import type { CountryPool } from './types'

/**
 * The canonical capital for a country, or null if the country isn't in the
 * gameplay dataset at all, or its capital fact isn't verified yet (see
 * CountryDetails.verified in data/countryDetails/types.ts). Every one of the
 * 200 canonical countries currently has a verified capital, but this stays
 * a real lookup (not an assumption) so a future country added without a
 * populated record is excluded from Capitals question generation rather
 * than surfacing "Coming soon" as if it were a real answer — see the
 * eligibility-filtering requirement this centralizes.
 */
export function capitalOf(country: Country): string | null {
  const details = getCountryDetails(country.id)
  if (!details || !details.verified.capital) return null
  return details.capital
}

/**
 * Every country in `pool` that has usable capital data, i.e. the pool
 * resolution Capitals question generation is allowed to draw from. Centralizes
 * the "exclude countries without a clean single capital answer" rule in one
 * place rather than scattering the capitalOf() !== null check through the
 * generator/distractor code.
 */
export function eligibleCapitalCountries(pool: CountryPool): Country[] {
  return resolveCountryPool(pool).filter((c) => capitalOf(c) !== null)
}

/**
 * Every capital across the full canonical dataset, one candidate per
 * distinct capital (deduped by normalized form, in case two countries ever
 * share an identical capital name) — the capital Type Answer domain, used
 * for both the "real but wrong" check and domain-wide Did You Mean
 * matching. A module-level constant, built once and reused unchanged for
 * every question — this is what makes domain-wide typo matching
 * correctness-blind (see answerValidation.ts's own doc comment): the same
 * pool is searched whether the current question is about Japan, France, or
 * anything else. No alias system exists for capitals in this project (same
 * finding as countryAliases.ts) — each capital's only accepted form is its
 * own canonical spelling.
 */
const CAPITAL_DOMAIN_CANDIDATES: readonly DomainCandidate[] = (() => {
  const seen = new Map<string, DomainCandidate>()
  for (const country of COUNTRIES) {
    const capital = capitalOf(country)
    if (!capital) continue
    const key = normalizeCountryName(capital)
    if (!seen.has(key)) seen.set(key, { display: capital, keys: [key] })
  }
  return [...seen.values()]
})()

/** Builds the capital-city AnswerDomainSpec for a "what is the capital of X?" question. */
export function buildCapitalAnswerDomain(correctCapital: string): AnswerDomainSpec {
  return {
    label: 'capital city',
    accepted: [{ display: correctCapital, keys: [normalizeCountryName(correctCapital)] }],
    domainCandidates: CAPITAL_DOMAIN_CANDIDATES,
    typoEnabled: true,
  }
}
