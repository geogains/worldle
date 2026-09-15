import { describe, expect, it } from 'vitest'
import { normalizeCountryName, isLetter } from './normalize'

describe('normalizeCountryName', () => {
  it('uppercases and strips spaces', () => {
    expect(normalizeCountryName('Costa Rica')).toBe('COSTARICA')
    expect(normalizeCountryName('New Zealand')).toBe('NEWZEALAND')
    expect(normalizeCountryName('South Korea')).toBe('SOUTHKOREA')
  })
  it('strips hyphens and apostrophes', () => {
    expect(normalizeCountryName('Timor-Leste')).toBe('TIMORLESTE')
    expect(normalizeCountryName('Guinea-Bissau')).toBe('GUINEABISSAU')
    expect(normalizeCountryName("Côte d'Ivoire")).toBe('COTEDIVOIRE')
  })
  it('strips diacritics', () => {
    expect(normalizeCountryName('São Tomé and Príncipe')).toBe('SAOTOMEANDPRINCIPE')
    expect(normalizeCountryName('Curaçao')).toBe('CURACAO')
  })
  it('handles arbitrary punctuation and lowercase input', () => {
    expect(normalizeCountryName('  ivory coast. ')).toBe('IVORYCOAST')
    expect(normalizeCountryName('')).toBe('')
  })
  it('isLetter accepts only single ASCII letters', () => {
    expect(isLetter('a')).toBe(true)
    expect(isLetter('Z')).toBe(true)
    expect(isLetter('1')).toBe(false)
    expect(isLetter('ab')).toBe(false)
    expect(isLetter('é')).toBe(false)
  })
})
