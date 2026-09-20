import { describe, expect, it } from 'vitest'
import { getCountryDetails } from '../../data/countryDetails'
import { capitalOf, eligibleCapitalCountries } from './capitals'
import { resolveCountryPool } from './pools'

describe('capitalOf', () => {
  it('returns the canonical capital from country-detail data', () => {
    const tanzania = resolveCountryPool('world-expert').find((c) => c.id === 'tanzania')!
    expect(capitalOf(tanzania)).toBe('Dodoma')
  })
})

describe('eligibleCapitalCountries', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] every returned country has usable (verified) capital data`, () => {
      const countries = eligibleCapitalCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      for (const country of countries) {
        const details = getCountryDetails(country.id)
        expect(details, country.id).not.toBeNull()
        expect(details!.verified.capital, country.id).toBe(true)
      }
    })
    it(`[${pool}] is a subset of the resolved pool`, () => {
      const poolIds = new Set(resolveCountryPool(pool).map((c) => c.id))
      for (const country of eligibleCapitalCountries(pool)) expect(poolIds.has(country.id)).toBe(true)
    })
  }

  it('world-expert includes all 200 countries, since every canonical country has verified capital data today', () => {
    expect(eligibleCapitalCountries('world-expert')).toHaveLength(200)
  })
})
