import { describe, expect, it } from 'vitest'
import { damerauLevenshteinDistance, isCloseTypo, typoThreshold } from './typo'

describe('damerauLevenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    expect(damerauLevenshteinDistance('TOKYO', 'TOKYO')).toBe(0)
  })
  it('is the length of the other string when one is empty', () => {
    expect(damerauLevenshteinDistance('', 'TOKYO')).toBe(5)
    expect(damerauLevenshteinDistance('TOKYO', '')).toBe(5)
  })
  it('counts a single insertion as distance 1', () => {
    expect(damerauLevenshteinDistance('TOKOYO', 'TOKYO')).toBe(1) // "Tokoyo"
  })
  it('counts a single deletion as distance 1', () => {
    expect(damerauLevenshteinDistance('JPAN', 'JAPAN')).toBe(1) // "Jpan"
  })
  it('counts a single substitution as distance 1', () => {
    expect(damerauLevenshteinDistance('KRONA', 'KRONE')).toBe(1)
  })
  it('counts an adjacent transposition as distance 1, not 2', () => {
    expect(damerauLevenshteinDistance('TKOYO', 'TOKYO')).toBe(1) // swapped O/K
  })
  it('counts two unrelated-position edits as distance 2', () => {
    expect(damerauLevenshteinDistance('CHF', 'EUR')).toBe(3) // fully different, sanity check upper bound
    expect(damerauLevenshteinDistance('XOF', 'XAF')).toBe(1) // genuinely different real codes, one letter apart
  })
  it('is symmetric', () => {
    expect(damerauLevenshteinDistance('PORTUGESE', 'PORTUGUESE')).toBe(damerauLevenshteinDistance('PORTUGUESE', 'PORTUGESE'))
  })
})

describe('typoThreshold', () => {
  it('is 0 for length <= 3 (also the currency-code backstop)', () => {
    expect(typoThreshold(0)).toBe(0)
    expect(typoThreshold(1)).toBe(0)
    expect(typoThreshold(3)).toBe(0)
  })
  it('is 1 for length 4-5', () => {
    expect(typoThreshold(4)).toBe(1) // "Jpan"
    expect(typoThreshold(5)).toBe(1) // "Krona"
  })
  it('is 2 for length 6+ (widened to cover domain-wide examples like "Landan" -> "London", distance 2 at length 6)', () => {
    expect(typoThreshold(6)).toBe(2)
    expect(typoThreshold(9)).toBe(2) // "Portugese" only needs 1, but the bucket is uniformly 2 for 6+
    expect(typoThreshold(11)).toBe(2) // "Cophenhagen"
    expect(typoThreshold(12)).toBe(2)
    expect(typoThreshold(13)).toBe(2)
    expect(typoThreshold(40)).toBe(2)
  })
})

describe('isCloseTypo', () => {
  it('exact match is always close', () => {
    expect(isCloseTypo('TOKYO', 'TOKYO')).toBe(true)
  })
  it.each([
    ['TOKOYO', 'TOKYO'],
    ['JPAN', 'JAPAN'],
    ['PORTUGESE', 'PORTUGUESE'],
    ['KRONA', 'KRONE'],
    ['ZLOTTY', 'ZLOTY'],
    ['COPHENHAGEN', 'COPENHAGEN'],
    ['LANDAN', 'LONDON'], // distance 2 — the domain-wide-matching motivating example
    ['NARRIA', 'NAIRA'], // distance 2
  ])('accepts the motivating example: %s ~ %s', (input, candidate) => {
    expect(isCloseTypo(input, candidate)).toBe(true)
  })

  it.each([
    ['BEIJING', 'TOKYO'],
    ['CHINA', 'JAPAN'],
    ['ENGLISH', 'PORTUGUESE'],
    ['DOLLAR', 'JAPANESEYEN'],
  ])('rejects real-but-different words: %s !~ %s', (input, candidate) => {
    expect(isCloseTypo(input, candidate)).toBe(false)
  })

  it('rejects any correction for length <= 3 strings (currency-code backstop)', () => {
    expect(isCloseTypo('CHG', 'CHF')).toBe(false) // 1 edit, but too short to safely correct
    expect(isCloseTypo('XOF', 'XAF')).toBe(false)
  })
})
