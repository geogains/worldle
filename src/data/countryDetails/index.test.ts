import { describe, expect, it } from 'vitest'
import { COUNTRIES, findCountryById } from '../countries'
import { COUNTRY_CODES, COUNTRY_FACTS, PLACEHOLDER, buildCountryDetails, getCountryDetails } from './index'

describe('getCountryDetails', () => {
  it('resolves the populated Tanzania test case (the country-data layer fixture)', () => {
    const d = getCountryDetails('tanzania')
    expect(d).not.toBeNull()
    expect(d).toMatchObject({
      slug: 'tanzania',
      name: 'Tanzania',
      countryCode: 'TZ',
      flagUrl: '/flags/TZ.png',
      capital: 'Dodoma',
      population: '69 million',
      continent: 'Africa',
      currency: 'Tanzanian Shilling (TZS) · TSh',
      languages: ['Swahili', 'English'],
      funFact: 'Tanzania is home to Mount Kilimanjaro, the highest mountain in Africa.',
    })
    expect(Object.values(d!.verified).every((v) => v === true)).toBe(true)
  })

  it('falls back to placeholder facts for a country with no facts record (mechanism test, not tied to any real gameplay country’s current data-population state)', () => {
    // Spain, then Thailand, then Zimbabwe, then Mauritania were this
    // fixture in successive batches — each was "the safe unpopulated
    // country" until its own batch (or, for Mauritania, its own
    // follow-up) populated it. Every playable country now has a real
    // COUNTRY_RECORDS entry, so no such fixture is left to borrow. Testing
    // buildCountryDetails() directly (bypassing COUNTRY_FACTS entirely, as
    // the "partial records" tests below already do) verifies the same
    // fallback mechanism without depending on which real country happens
    // to still be unpopulated.
    const spain = findCountryById('spain')!
    const d = buildCountryDetails(spain, {})
    expect(d).toMatchObject({ slug: 'spain', name: 'Spain', countryCode: 'ES', flagUrl: '/flags/ES.png' })
    expect(d.capital).toBe(PLACEHOLDER.value)
    expect(d.languages).toEqual([PLACEHOLDER.value])
    expect(d.funFact).toBe(PLACEHOLDER.funFact)
  })

  it('falls back to no flag for a country with no mapped asset (mechanism test — every real gameplay country, including mauritania, now has a flag mapping)', () => {
    // Mauritania was this fixture until its own follow-up added a real
    // public/flags/MR.png and completed COUNTRY_CODES.mauritania -> MR.
    // Every gameplay country is now mapped, so this tests the underlying
    // fallback via buildCountryDetails() with a synthetic id that
    // deliberately has no COUNTRY_CODES entry, rather than depending on a
    // real country staying unmapped.
    const fakeCountry = { id: 'not-a-real-country', name: 'Not A Real Country', normalized: 'NOTAREALCOUNTRY', length: 16 }
    const d = buildCountryDetails(fakeCountry, {})
    expect(d).toMatchObject({ slug: 'not-a-real-country', name: 'Not A Real Country', countryCode: null, flagUrl: null })
    expect(d.capital).toBe(PLACEHOLDER.value)
  })

  it('mauritania resolves with a real flag and real facts — the final playable country, completed in its own follow-up to Batch 16', () => {
    const d = getCountryDetails('mauritania')
    expect(d).toMatchObject({
      slug: 'mauritania',
      name: 'Mauritania',
      countryCode: 'MR',
      flagUrl: '/flags/MR.png',
      capital: 'Nouakchott',
      currency: 'Mauritanian Ouguiya (MRU) · UM',
      languages: ['Arabic'],
    })
    expect(d!.population).not.toBe(PLACEHOLDER.value)
    expect(d!.funFact).not.toBe(PLACEHOLDER.funFact)
    expect(Object.values(d!.verified).every((v) => v === true)).toBe(true)
  })

  it('resolves Kosovo with its real (XK) flag and real facts (Batch 9 populated it in COUNTRY_RECORDS)', () => {
    // Kosovo uses the project's existing non-ISO XK/XKS convention (see
    // COUNTRY_CODES in flags.ts) and was populated in countryRecords.ts
    // (Batch 9) — no longer placeholder-only.
    const d = getCountryDetails('kosovo')
    expect(d).toMatchObject({
      slug: 'kosovo',
      name: 'Kosovo',
      countryCode: 'XK',
      flagUrl: '/flags/XK.png',
      capital: 'Pristina',
      currency: 'Euro (EUR) · €',
      languages: ['Albanian', 'Serbian'],
    })
    expect(d!.population).not.toBe(PLACEHOLDER.value)
    expect(d!.funFact).not.toBe(PLACEHOLDER.funFact)
    expect(Object.values(d!.verified).every((v) => v === true)).toBe(true)
  })

  it('returns null for anything that is not a gameplay country', () => {
    expect(getCountryDetails('not-a-country')).toBeNull()
    expect(getCountryDetails('TANZANIA')).toBeNull()
    expect(getCountryDetails('')).toBeNull()
    // Flag files exist for these, but they are not in the gameplay dataset.
    expect(getCountryDetails('xk')).toBeNull()
  })

  it('resolves every canonical country without throwing', () => {
    for (const c of COUNTRIES) {
      const d = getCountryDetails(c.id)
      expect(d?.name).toBe(c.name)
    }
  })

  it('treats partial records field by field', () => {
    const spain = findCountryById('spain')!
    const d = buildCountryDetails(spain, { capital: 'X', funFact: '   ' })
    expect(d.capital).toBe('X')
    expect(d.verified.capital).toBe(true)
    // languages left out entirely (as opposed to an explicit []) is still
    // unverified/placeholder — see the next test for the empty-but-present case.
    expect(d.languages).toEqual([PLACEHOLDER.value])
    expect(d.verified.languages).toBe(false)
    // A whitespace-only string does not count as a value.
    expect(d.funFact).toBe(PLACEHOLDER.funFact)
    expect(d.verified.funFact).toBe(false)
  })

  it('treats a present-but-empty languages array as verified, not placeholder (e.g. no official language)', () => {
    const spain = findCountryById('spain')!
    const d = buildCountryDetails(spain, { capital: 'X', languages: [] })
    expect(d.verified.languages).toBe(true)
    expect(d.languages).toEqual([])
  })
})

describe('mapping integrity', () => {
  it('every flag code and facts record key is a canonical country id', () => {
    for (const slug of Object.keys(COUNTRY_CODES)) expect(findCountryById(slug), slug).toBeDefined()
    for (const slug of Object.keys(COUNTRY_FACTS)) expect(findCountryById(slug), slug).toBeDefined()
  })
  it('flag codes are a well-formed ISO 3166-1 alpha-2 code, or an ISO 3166-2 subdivision code for a non-sovereign entity', () => {
    for (const code of Object.values(COUNTRY_CODES)) expect(code).toMatch(/^[A-Z]{2}(-[A-Z]{2,3})?$/)
  })
  it('maps all 200 gameplay countries — no remaining gap (mauritania -> MR closed the last one; england/scotland/wales use ISO 3166-2 codes, not a fabricated GB-derived one)', () => {
    expect(Object.keys(COUNTRY_CODES)).toHaveLength(200)
    expect(COUNTRY_CODES.mauritania).toBe('MR')
    expect(COUNTRY_CODES.england).toBe('GB-ENG')
    expect(COUNTRY_CODES.scotland).toBe('GB-SCT')
    expect(COUNTRY_CODES.wales).toBe('GB-WLS')
    expect(COUNTRY_CODES['united-kingdom']).toBe('GB')
  })
})
