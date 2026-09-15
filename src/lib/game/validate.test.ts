import { describe, expect, it } from 'vitest'
import { deriveStatus, validateGuess, validationMessage } from './validate'

describe('validateGuess', () => {
  it('accepts a valid same-length country', () => {
    const r = validateGuess('SPAIN', 5)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.country.name).toBe('Spain')
  })
  it('rejects short input', () => {
    expect(validateGuess('SPA', 5)).toEqual({ ok: false, reason: 'too-short' })
    expect(validationMessage('too-short', 5)).toBe('Not enough letters')
  })
  it('rejects ordinary words', () => {
    expect(validateGuess('HOUSE', 5)).toEqual({ ok: false, reason: 'not-a-country' })
    expect(validationMessage('not-a-country', 5)).toBe('Not a valid country')
  })
  it('rejects a real country of the wrong length', () => {
    expect(validateGuess('GERMANY', 5)).toEqual({ ok: false, reason: 'wrong-length' })
    expect(validationMessage('wrong-length', 7)).toBe('Country must contain 7 letters')
  })
  it('accepts multi-word and hyphenated countries in normalized form', () => {
    expect(validateGuess('COSTARICA', 9).ok).toBe(true)
    expect(validateGuess('TIMORLESTE', 10).ok).toBe(true)
    expect(validateGuess('DRCONGO', 7).ok).toBe(true)
  })
})

describe('deriveStatus', () => {
  it('active with no guesses', () => expect(deriveStatus([], 'SPAIN')).toBe('active'))
  it('won when last guess matches', () => expect(deriveStatus(['CHILE', 'SPAIN'], 'SPAIN')).toBe('won'))
  it('lost after six misses', () =>
    expect(deriveStatus(['CHILE', 'CHILE', 'CHILE', 'CHILE', 'CHILE', 'CHILE'], 'SPAIN')).toBe('lost'))
  it('won on the sixth guess', () =>
    expect(deriveStatus(['CHILE', 'CHILE', 'CHILE', 'CHILE', 'CHILE', 'SPAIN'], 'SPAIN')).toBe('won'))
})
