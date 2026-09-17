import { describe, expect, it } from 'vitest'
import { auditFlags, formatFlagAuditReport } from './audit'

/** Unit tests for the pure audit logic itself, independent of the real dataset. */
describe('auditFlags (pure logic)', () => {
  const countries = [
    { id: 'atlantis', name: 'Atlantis', normalized: 'ATLANTIS', length: 8 },
    { id: 'narnia', name: 'Narnia', normalized: 'NARNIA', length: 6 },
  ]

  it('flags a gameplay country with no mapping', () => {
    const audit = auditFlags(countries, { atlantis: 'AT' })
    expect(audit.missingMappings).toEqual(['narnia'])
  })

  it('flags a mapping key that is not a real gameplay country', () => {
    const audit = auditFlags(countries, { atlantis: 'AT', narnia: 'NA', gondor: 'GD' })
    expect(audit.invalidMappingKeys).toEqual(['gondor'])
  })

  it('flags a malformed code', () => {
    const audit = auditFlags(countries, { atlantis: 'atl', narnia: 'N4' })
    expect(audit.malformedCodes).toEqual([
      { slug: 'atlantis', code: 'atl' },
      { slug: 'narnia', code: 'N4' },
    ])
  })

  it('flags a mapped code with no matching asset, when an asset list is supplied', () => {
    const audit = auditFlags(countries, { atlantis: 'AT', narnia: 'NA' }, new Set(['AT.png']))
    expect(audit.missingAssets).toEqual([{ slug: 'narnia', code: 'NA' }])
  })

  it('is silent (no missingAssets) when no asset list is supplied', () => {
    const audit = auditFlags(countries, { atlantis: 'AT', narnia: 'NA' })
    expect(audit.missingAssets).toEqual([])
  })

  it('reports a clean audit with zero problems', () => {
    const audit = auditFlags(countries, { atlantis: 'AT', narnia: 'NA' }, new Set(['AT.png', 'NA.png']))
    expect(audit).toMatchObject({ missingMappings: [], invalidMappingKeys: [], malformedCodes: [], missingAssets: [] })
  })

  it('formats a human-readable report', () => {
    const report = formatFlagAuditReport(auditFlags(countries, { atlantis: 'AT' }))
    expect(report).toContain('Gameplay countries: 2')
    expect(report).toContain('Flag mappings: 1')
    expect(report).toContain('Missing mappings (1): narnia')
  })
})
