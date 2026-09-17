import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditFlags } from '../src/data/countryDetails/audit'

/**
 * Filesystem-backed guard: reads the real public/flags directory (not an
 * assumption) and confirms every mapped code has a matching asset, and that
 * extra files in public/flags never silently become gameplay countries.
 * Lives here (not src/data) because it needs Node's fs, which the browser
 * tsconfig for src excludes; the mapping-only checks that don't need fs are
 * in src/data/countryDetails/flags.test.ts.
 */
const assetFiles = new Set(readdirSync(join(import.meta.dirname, '..', 'public', 'flags')))

describe('flag mapping vs. public/flags on disk', () => {
  it('every mapped code has a real asset file', () => {
    const audit = auditFlags(undefined, undefined, assetFiles)
    expect(audit.missingAssets).toEqual([])
  })

  it('has no remaining gap — MR.png now exists on disk and mauritania is mapped', () => {
    const audit = auditFlags(undefined, undefined, assetFiles)
    expect(audit.missingMappings).toEqual([])
    expect(assetFiles.has('MR.png')).toBe(true)
  })

  it('does not turn extra public/flags assets into gameplay countries', () => {
    // public/flags intentionally has more files than the gameplay dataset
    // (historical/unused flags like DE-DDR, a stray non-flag asset like
    // user.png, etc.) — coverage below confirms none of that leaks in.
    const audit = auditFlags(undefined, undefined, assetFiles)
    expect(assetFiles.size).toBeGreaterThan(audit.totalMappings)
    expect(audit.invalidMappingKeys).toEqual([])
  })

  it('reports exact totals', () => {
    const audit = auditFlags(undefined, undefined, assetFiles)
    expect(audit.totalCountries).toBe(200)
    expect(audit.totalMappings).toBe(200)
    expect(audit.missingMappings).toEqual([])
    expect(audit.missingAssets).toEqual([])
  })
})
