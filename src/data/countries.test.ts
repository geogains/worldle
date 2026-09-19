import { describe, expect, it } from 'vitest'
import {
  adjacentCountries,
  ANSWER_POOL,
  COUNTRIES,
  countriesOfLength,
  findCountryById,
  findCountryByNormalized,
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
} from './countries'
import { auditCountries } from './audit'

describe('country dataset', () => {
  const audit = auditCountries()

  it('contains the 200-country set (195-country baseline + Taiwan + Kosovo + England + Scotland + Wales)', () => {
    expect(COUNTRIES.length).toBe(200)
    expect(audit.totalCountries).toBe(200)
  })
  it('includes Kosovo as a plain, unqualified, six-letter entry', () => {
    expect(findCountryById('kosovo')).toMatchObject({ name: 'Kosovo', normalized: 'KOSOVO', length: 6 })
    expect(findCountryByNormalized('KOSOVO')?.name).toBe('Kosovo')
    expect(ANSWER_POOL.some((c) => c.id === 'kosovo')).toBe(true)
  })
  it('has no duplicate names, ids or normalization collisions', () => {
    expect(audit.duplicateNames).toEqual([])
    expect(audit.duplicateIds).toEqual([])
    expect(audit.normalizationCollisions).toEqual([])
  })
  it('has no unexpected characters or broken normalization', () => {
    expect(audit.unexpectedCharacters).toEqual([])
    expect(audit.badNormalization).toEqual([])
  })
  it('computes normalized lengths correctly', () => {
    expect(findCountryById('costa-rica')).toMatchObject({ normalized: 'COSTARICA', length: 9 })
    expect(findCountryById('timor-leste')).toMatchObject({ normalized: 'TIMORLESTE', length: 10 })
    expect(findCountryById('chad')).toMatchObject({ normalized: 'CHAD', length: 4 })
    expect(findCountryById('dr-congo')).toMatchObject({ normalized: 'DRCONGO', length: 7 })
    expect(findCountryById('congo')).toMatchObject({ normalized: 'CONGO', length: 5 })
  })
  it('includes Taiwan as a plain, unqualified, six-letter entry', () => {
    expect(findCountryById('taiwan')).toMatchObject({ name: 'Taiwan', normalized: 'TAIWAN', length: 6 })
    expect(findCountryByNormalized('TAIWAN')?.name).toBe('Taiwan')
    expect(ANSWER_POOL.some((c) => c.id === 'taiwan')).toBe(true)
  })
  it('includes England, Scotland and Wales as plain, unqualified entries, each resolving uniquely', () => {
    expect(findCountryById('england')).toMatchObject({ name: 'England', normalized: 'ENGLAND', length: 7 })
    expect(findCountryById('scotland')).toMatchObject({ name: 'Scotland', normalized: 'SCOTLAND', length: 8 })
    expect(findCountryById('wales')).toMatchObject({ name: 'Wales', normalized: 'WALES', length: 5 })
    expect(findCountryByNormalized('ENGLAND')?.name).toBe('England')
    expect(findCountryByNormalized('SCOTLAND')?.name).toBe('Scotland')
    expect(findCountryByNormalized('WALES')?.name).toBe('Wales')
    expect(ANSWER_POOL.some((c) => c.id === 'england')).toBe(true)
    expect(ANSWER_POOL.some((c) => c.id === 'scotland')).toBe(true)
    expect(ANSWER_POOL.some((c) => c.id === 'wales')).toBe(true)
  })
  it('Ireland is unchanged and remains a distinct entry from England/Scotland/Wales', () => {
    expect(findCountryById('ireland')).toMatchObject({ name: 'Ireland', normalized: 'IRELAND', length: 7 })
    expect(findCountryByNormalized('IRELAND')?.name).toBe('Ireland')
  })
  it('United Kingdom remains a separate, non-playable entry (normalized length > 10) and is not merged with England/Scotland/Wales', () => {
    const uk = findCountryById('united-kingdom')!
    expect(uk).toMatchObject({ name: 'United Kingdom', normalized: 'UNITEDKINGDOM', length: 13 })
    expect(uk.length).toBeGreaterThan(MAX_ANSWER_LENGTH)
    expect(ANSWER_POOL.some((c) => c.id === 'united-kingdom')).toBe(false)
  })
  it('"Great Britain" and "Northern Ireland" do not exist as canonical entries', () => {
    expect(findCountryByNormalized('GREATBRITAIN')).toBeUndefined()
    expect(findCountryByNormalized('NORTHERNIRELAND')).toBeUndefined()
    expect(findCountryById('great-britain')).toBeUndefined()
    expect(findCountryById('northern-ireland')).toBeUndefined()
  })
  it('every answer-pool entry is within 4–10 letters', () => {
    for (const c of ANSWER_POOL) {
      expect(c.length).toBeGreaterThanOrEqual(MIN_ANSWER_LENGTH)
      expect(c.length).toBeLessThanOrEqual(MAX_ANSWER_LENGTH)
    }
    expect(ANSWER_POOL.length).toBe(audit.eligibleCountries)
  })
  it('seven-letter countries are one of the largest groups', () => {
    const seven = audit.countsByLength[7] ?? 0
    const max = Math.max(...Object.values(audit.countsByLength))
    expect(seven).toBeGreaterThanOrEqual(max * 0.7)
  })
  it('lookups work', () => {
    expect(findCountryByNormalized('SPAIN')?.name).toBe('Spain')
    expect(findCountryByNormalized('NOPE')).toBeUndefined()
    expect(countriesOfLength(4).map((c) => c.name)).toContain('Peru')
  })

  describe('adjacentCountries (Study Previous/Next, same COUNTRIES order the grid renders)', () => {
    it('resolves a middle-of-the-list country to its immediate alphabetical neighbours', () => {
      // Albania, Algeria, Andorra, Angola are consecutive in COUNTRIES.
      expect(adjacentCountries('algeria')).toEqual({
        previous: findCountryById('albania'),
        next: findCountryById('andorra'),
      })
      expect(adjacentCountries('andorra')).toEqual({
        previous: findCountryById('algeria'),
        next: findCountryById('angola'),
      })
    })
    it('loops from the first country to the last, and vice versa', () => {
      const first = COUNTRIES[0] as (typeof COUNTRIES)[number]
      const second = COUNTRIES[1] as (typeof COUNTRIES)[number]
      const last = COUNTRIES[COUNTRIES.length - 1] as (typeof COUNTRIES)[number]
      const penultimate = COUNTRIES[COUNTRIES.length - 2] as (typeof COUNTRIES)[number]
      expect(adjacentCountries(first.id)).toEqual({ previous: last, next: second })
      expect(adjacentCountries(last.id)).toEqual({ previous: penultimate, next: first })
    })
    it('returns null for an id not in COUNTRIES', () => {
      expect(adjacentCountries('not-a-real-country')).toBeNull()
    })
  })
})
