import { describe, expect, it } from 'vitest'
import { getHelpExamples } from './helpExamples'
import { findCountryByNormalized } from '../../data/countries'

describe('getHelpExamples', () => {
  it('never uses the excluded answer and only uses real countries', () => {
    for (const excluded of ['SPAIN', 'ITALY', 'GHANA', null]) {
      const ex = getHelpExamples(excluded)
      expect(ex).toHaveLength(3)
      for (const e of ex) {
        expect(e.word).not.toBe(excluded)
        expect(findCountryByNormalized(e.word)).toBeDefined()
      }
    }
  })
})
