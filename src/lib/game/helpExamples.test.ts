import { describe, expect, it } from 'vitest'
import { getHelpExamples } from './helpExamples'
import { findCountryByNormalized } from '../../data/countries'

describe('getHelpExamples', () => {
  it('never uses the excluded answer and only uses real countries', () => {
    for (const excluded of ['COSTARICA', 'SINGAPORE', 'ARGENTINA', null]) {
      const ex = getHelpExamples(excluded)
      expect(ex).toHaveLength(3)
      for (const e of ex) {
        expect(e.word).not.toBe(excluded)
        expect(findCountryByNormalized(e.word)).toBeDefined()
      }
    }
  })
  it('every example is exactly 9 letters, matching a real 9-letter country', () => {
    for (const e of getHelpExamples(null)) {
      expect(e.word).toHaveLength(9)
      expect(findCountryByNormalized(e.word)?.length).toBe(9)
    }
  })
  it('the highlighted letter actually occurs at the stated index of the word', () => {
    for (const e of getHelpExamples(null)) {
      expect(e.word[e.index]).toBe(e.text[0])
    }
  })
})
