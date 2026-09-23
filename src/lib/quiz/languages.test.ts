import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { eligibleLanguageCountries, isUnambiguousLanguage, languagesOf } from './languages'
import { resolveCountryPool } from './pools'

describe('languagesOf', () => {
  it('returns the canonical Principal Languages array from country-detail data', () => {
    const nigeria = findCountryById('nigeria')!
    expect(languagesOf(nigeria)).toEqual(['English', 'Hausa', 'Yoruba', 'Igbo'])
  })
  it('returns a single-entry array for a single-language country', () => {
    expect(languagesOf(findCountryById('mali')!)).toEqual(['Bambara'])
  })
})

describe('eligibleLanguageCountries', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] every returned country has usable (verified) language data`, () => {
      const countries = eligibleLanguageCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      for (const country of countries) {
        const details = getCountryDetails(country.id)
        expect(details, country.id).not.toBeNull()
        expect(details!.verified.languages, country.id).toBe(true)
      }
    })
    it(`[${pool}] is a subset of the resolved pool`, () => {
      const poolIds = new Set(resolveCountryPool(pool).map((c) => c.id))
      for (const country of eligibleLanguageCountries(pool)) expect(poolIds.has(country.id)).toBe(true)
    })
  }

  it('world-expert includes all 200 countries, since every canonical country has a verified languages array today', () => {
    expect(eligibleLanguageCountries('world-expert')).toHaveLength(200)
  })
})

describe('isUnambiguousLanguage', () => {
  it('is true for a language unique to one country in the canonical dataset (Mali -> Bambara)', () => {
    expect(isUnambiguousLanguage('Bambara', 'mali')).toBe(true)
  })
  it('is true for another unique language (Montenegro -> Montenegrin)', () => {
    expect(isUnambiguousLanguage('Montenegrin', 'montenegro')).toBe(true)
  })
  it('is false for a language shared by multiple countries (Spanish)', () => {
    expect(isUnambiguousLanguage('Spanish', 'argentina')).toBe(false)
    expect(isUnambiguousLanguage('Spanish', 'mexico')).toBe(false)
  })
  it('is false for English, shared by dozens of countries', () => {
    expect(isUnambiguousLanguage('English', 'australia')).toBe(false)
  })
  it('is false for Hausa, shared by exactly two countries (Niger and Nigeria)', () => {
    expect(isUnambiguousLanguage('Hausa', 'niger')).toBe(false)
    expect(isUnambiguousLanguage('Hausa', 'nigeria')).toBe(false)
  })
  it('is case/diacritic-insensitive when matching', () => {
    expect(isUnambiguousLanguage('bambara', 'mali')).toBe(true)
    expect(isUnambiguousLanguage('BAMBARA', 'mali')).toBe(true)
  })
})
