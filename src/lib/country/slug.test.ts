import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../data/countries'
import { normalizeCountryName } from '../text/normalize'
import { isWellFormedCountrySlug, toCountrySlug } from './slug'

describe('toCountrySlug', () => {
  it('produces human-readable, hyphenated slugs', () => {
    expect(toCountrySlug('Tanzania')).toBe('tanzania')
    expect(toCountrySlug('Costa Rica')).toBe('costa-rica')
    expect(toCountrySlug('South Korea')).toBe('south-korea')
    expect(toCountrySlug('DR Congo')).toBe('dr-congo')
    expect(toCountrySlug('Timor-Leste')).toBe('timor-leste')
    expect(toCountrySlug('São Tomé and Príncipe')).toBe('sao-tome-and-principe')
    expect(toCountrySlug('Bosnia and Herzegovina')).toBe('bosnia-and-herzegovina')
  })
  it('is stable against surrounding whitespace and punctuation', () => {
    expect(toCountrySlug('  Costa  Rica! ')).toBe('costa-rica')
    expect(toCountrySlug("Côte d'Ivoire")).toBe('cote-d-ivoire')
  })
  it('never matches the gameplay normalization format', () => {
    for (const c of COUNTRIES) {
      expect(toCountrySlug(c.name)).not.toBe(normalizeCountryName(c.name))
    }
  })
  it('matches every canonical country id (ids are the public slugs)', () => {
    for (const c of COUNTRIES) expect(toCountrySlug(c.name)).toBe(c.id)
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(COUNTRIES.length)
  })
})

describe('isWellFormedCountrySlug', () => {
  it('accepts lowercase hyphenated slugs only', () => {
    expect(isWellFormedCountrySlug('tanzania')).toBe(true)
    expect(isWellFormedCountrySlug('costa-rica')).toBe(true)
    expect(isWellFormedCountrySlug('Tanzania')).toBe(false)
    expect(isWellFormedCountrySlug('costa--rica')).toBe(false)
    expect(isWellFormedCountrySlug('-tanzania')).toBe(false)
    expect(isWellFormedCountrySlug('COSTARICA')).toBe(false)
    expect(isWellFormedCountrySlug('')).toBe(false)
  })
})
