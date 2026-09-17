import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { SIMILAR_FLAG_GROUPS, getSimilarCountryIds } from './similarFlags'

describe('SIMILAR_FLAG_GROUPS', () => {
  it('every id in every group resolves to a real canonical country', () => {
    for (const group of SIMILAR_FLAG_GROUPS) {
      for (const id of group) expect(findCountryById(id), id).toBeDefined()
    }
  })
  it('every group has at least 2 members (a group of 1 can never produce a distractor)', () => {
    for (const group of SIMILAR_FLAG_GROUPS) expect(group.length).toBeGreaterThanOrEqual(2)
  })
})

describe('getSimilarCountryIds', () => {
  it('returns the other members of a group, excluding the country itself', () => {
    const ids = getSimilarCountryIds('romania')
    expect(ids).toContain('chad')
    expect(ids).toContain('moldova')
    expect(ids).toContain('andorra')
    expect(ids).not.toContain('romania')
  })
  it('unions across multiple groups the same country appears in (russia)', () => {
    const ids = getSimilarCountryIds('russia')
    // From the Netherlands/Luxembourg/Russia/France group.
    expect(ids).toContain('netherlands')
    expect(ids).toContain('luxembourg')
    expect(ids).toContain('france')
    // From the Slovenia/Slovakia/Russia/Serbia/Croatia group.
    expect(ids).toContain('slovenia')
    expect(ids).toContain('slovakia')
    expect(ids).toContain('serbia')
    expect(ids).toContain('croatia')
    expect(ids).not.toContain('russia')
  })
  it('the Nordic cross group cross-references all five countries', () => {
    for (const id of ['norway', 'iceland', 'denmark', 'sweden', 'finland']) {
      const others = ['norway', 'iceland', 'denmark', 'sweden', 'finland'].filter((x) => x !== id)
      const ids = getSimilarCountryIds(id)
      for (const other of others) expect(ids, `${id} -> ${other}`).toContain(other)
    }
  })
  it('returns an empty array for a country with no curated confusion group', () => {
    expect(getSimilarCountryIds('tanzania')).toEqual([])
  })
  it('never includes the id itself', () => {
    for (const group of SIMILAR_FLAG_GROUPS) {
      for (const id of group) expect(getSimilarCountryIds(id)).not.toContain(id)
    }
  })
})
