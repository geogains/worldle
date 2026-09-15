import { describe, expect, it } from 'vitest'
import {
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

  it('contains the 195-country set', () => {
    expect(COUNTRIES.length).toBe(195)
    expect(audit.totalCountries).toBe(195)
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
})
