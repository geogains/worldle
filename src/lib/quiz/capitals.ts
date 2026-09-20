import type { Country } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { resolveCountryPool } from './pools'
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
