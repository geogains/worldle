import { describe, expect, it } from 'vitest'
import { COUNTRIES, findCountryById } from '../../data/countries'
import {
  EXPLORER_COUNTRY_IDS,
  EXPLORER_EXTRA_COUNTRY_IDS,
  FAMILIAR_COUNTRY_IDS,
  resolveCountryPool,
} from './pools'

describe('FAMILIAR_COUNTRY_IDS', () => {
  it('every id resolves to a real canonical country', () => {
    for (const id of FAMILIAR_COUNTRY_IDS) expect(findCountryById(id), id).toBeDefined()
  })
  it('has no duplicates', () => {
    expect(new Set(FAMILIAR_COUNTRY_IDS).size).toBe(FAMILIAR_COUNTRY_IDS.length)
  })
  it('is within the ~40-60 target size', () => {
    expect(FAMILIAR_COUNTRY_IDS.length).toBeGreaterThanOrEqual(40)
    expect(FAMILIAR_COUNTRY_IDS.length).toBeLessThanOrEqual(60)
  })
  it('includes clearly recognisable countries such as United Kingdom, France, Japan, Brazil', () => {
    for (const id of ['united-kingdom', 'france', 'japan', 'brazil', 'united-states', 'india']) {
      expect(FAMILIAR_COUNTRY_IDS, id).toContain(id)
    }
  })
})

describe('resolveCountryPool("familiar")', () => {
  it('resolves to exactly the Familiar ids, as real Country objects', () => {
    const resolved = resolveCountryPool('familiar')
    expect(resolved.map((c) => c.id).sort()).toEqual([...FAMILIAR_COUNTRY_IDS].sort())
  })
})

describe('EXPLORER_COUNTRY_IDS (Explorer pool)', () => {
  it('contains every Familiar country (Familiar ⊂ Explorer)', () => {
    for (const id of FAMILIAR_COUNTRY_IDS) expect(EXPLORER_COUNTRY_IDS, id).toContain(id)
  })
  it('is exactly Familiar plus its extras, with no accidental overlap between the two lists', () => {
    const overlap = EXPLORER_EXTRA_COUNTRY_IDS.filter((id) => FAMILIAR_COUNTRY_IDS.includes(id))
    expect(overlap).toEqual([])
    expect(EXPLORER_COUNTRY_IDS.length).toBe(FAMILIAR_COUNTRY_IDS.length + EXPLORER_EXTRA_COUNTRY_IDS.length)
  })
  it('every id resolves to a real canonical country', () => {
    for (const id of EXPLORER_COUNTRY_IDS) expect(findCountryById(id), id).toBeDefined()
  })
  it('has no duplicates', () => {
    expect(new Set(EXPLORER_COUNTRY_IDS).size).toBe(EXPLORER_COUNTRY_IDS.length)
  })
  it('is within the ~100-140 target size', () => {
    expect(EXPLORER_COUNTRY_IDS.length).toBeGreaterThanOrEqual(100)
    expect(EXPLORER_COUNTRY_IDS.length).toBeLessThanOrEqual(140)
  })
  it('includes moderately-less-obvious countries such as Senegal, Slovenia, Mongolia', () => {
    for (const id of ['senegal', 'slovenia', 'mongolia', 'bolivia', 'jordan']) {
      expect(EXPLORER_COUNTRY_IDS, id).toContain(id)
    }
  })
})

describe('resolveCountryPool("explorer")', () => {
  it('resolves to exactly the Explorer ids (Familiar + extras), as real Country objects', () => {
    const resolved = resolveCountryPool('explorer')
    expect(resolved.map((c) => c.id).sort()).toEqual([...EXPLORER_COUNTRY_IDS].sort())
  })
  it('every Familiar country is present in the resolved Explorer pool', () => {
    const ids = new Set(resolveCountryPool('explorer').map((c) => c.id))
    for (const id of FAMILIAR_COUNTRY_IDS) expect(ids.has(id), id).toBe(true)
  })
})

describe('resolveCountryPool("world-expert")', () => {
  it('resolves to the complete canonical COUNTRIES array — all 200, not a separate hand-maintained list', () => {
    const resolved = resolveCountryPool('world-expert')
    expect(resolved).toBe(COUNTRIES)
    expect(resolved).toHaveLength(200)
  })
  it('is a strict superset of Explorer, which is a strict superset of Familiar (Familiar ⊂ Explorer ⊂ World Expert)', () => {
    const familiar = new Set(resolveCountryPool('familiar').map((c) => c.id))
    const explorer = new Set(resolveCountryPool('explorer').map((c) => c.id))
    const worldExpert = new Set(resolveCountryPool('world-expert').map((c) => c.id))
    for (const id of familiar) expect(explorer.has(id), id).toBe(true)
    for (const id of explorer) expect(worldExpert.has(id), id).toBe(true)
    expect(explorer.size).toBeGreaterThan(familiar.size)
    expect(worldExpert.size).toBeGreaterThan(explorer.size)
  })
})
