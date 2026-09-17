import { describe, expect, it } from 'vitest'
import { COUNTRIES, findCountryById } from '../countries'
import { auditFlags } from './audit'
import { COUNTRY_CODES, flagUrlForCode } from './flags'
import { getCountryDetails } from './index'

/**
 * Mapping-only checks (coverage, key validity, code format) that need no
 * filesystem access, so they run anywhere this browser-only module does.
 * The asset-existence check (every mapped `/flags/XX.png` is a real file)
 * needs the real public/flags directory and lives in
 * scripts/audit-flags.test.ts, which shares this same auditFlags() logic —
 * see src/data/countryDetails/audit.ts.
 */

describe('flag mapping (COUNTRY_CODES)', () => {
  it('maps every gameplay country — no exceptions (mauritania -> MR closed the last gap once public/flags/MR.png was added)', () => {
    const audit = auditFlags()
    expect(audit.missingMappings).toEqual([])
  })

  it('maps all 200 gameplay countries', () => {
    expect(COUNTRIES.length).toBe(200)
    expect(Object.keys(COUNTRY_CODES).length).toBe(200)
  })

  it('every mapping key is a real gameplay country id (never derived from public/flags)', () => {
    const audit = auditFlags()
    expect(audit.invalidMappingKeys).toEqual([])
    for (const slug of Object.keys(COUNTRY_CODES)) {
      expect(findCountryById(slug), `"${slug}" is not a gameplay country`).toBeDefined()
    }
  })

  it('every mapped code is a well-formed ISO 3166-1 alpha-2 code, or an ISO 3166-2 subdivision code for a non-sovereign entity', () => {
    const audit = auditFlags()
    expect(audit.malformedCodes).toEqual([])
  })

  it('resolves flagUrl for every mapped country through the existing lookup, not a parallel system', () => {
    for (const [slug, code] of Object.entries(COUNTRY_CODES)) {
      const details = getCountryDetails(slug)
      expect(details?.countryCode).toBe(code)
      expect(details?.flagUrl).toBe(flagUrlForCode(code))
    }
  })

  it('mauritania resolves its real flag now that public/flags/MR.png exists (the former documented exception is closed)', () => {
    const details = getCountryDetails('mauritania')
    expect(details?.countryCode).toBe('MR')
    expect(details?.flagUrl).toBe('/flags/MR.png')
  })

  it('England, Scotland and Wales each resolve their own distinct ISO 3166-2 flag — none fabricated, none sharing the United Kingdom\'s plain GB code', () => {
    expect(COUNTRY_CODES.england).toBe('GB-ENG')
    expect(COUNTRY_CODES.scotland).toBe('GB-SCT')
    expect(COUNTRY_CODES.wales).toBe('GB-WLS')
    expect(COUNTRY_CODES['united-kingdom']).toBe('GB')
    // All four codes are pairwise distinct — none of the three constituent
    // countries silently collapses onto the UK's own flag or each other's.
    const codes = [COUNTRY_CODES.england, COUNTRY_CODES.scotland, COUNTRY_CODES.wales, COUNTRY_CODES['united-kingdom']]
    expect(new Set(codes).size).toBe(codes.length)

    expect(getCountryDetails('england')).toMatchObject({ countryCode: 'GB-ENG', flagUrl: '/flags/GB-ENG.png' })
    expect(getCountryDetails('scotland')).toMatchObject({ countryCode: 'GB-SCT', flagUrl: '/flags/GB-SCT.png' })
    expect(getCountryDetails('wales')).toMatchObject({ countryCode: 'GB-WLS', flagUrl: '/flags/GB-WLS.png' })
    expect(getCountryDetails('united-kingdom')).toMatchObject({ countryCode: 'GB', flagUrl: '/flags/GB.png' })
  })

  it('spot-checks the special/ambiguous mappings called out in the task', () => {
    expect(COUNTRY_CODES.mauritania).toBe('MR')
    expect(COUNTRY_CODES.taiwan).toBe('TW')
    expect(COUNTRY_CODES.tanzania).toBe('TZ')
    expect(COUNTRY_CODES.palestine).toBe('PS')
    expect(COUNTRY_CODES['vatican-city']).toBe('VA')
    expect(COUNTRY_CODES['dr-congo']).toBe('CD')
    expect(COUNTRY_CODES.congo).toBe('CG')
    expect(COUNTRY_CODES.congo).not.toBe(COUNTRY_CODES['dr-congo'])
    expect(COUNTRY_CODES['south-korea']).toBe('KR')
    expect(COUNTRY_CODES['north-korea']).toBe('KP')
    expect(COUNTRY_CODES['ivory-coast']).toBe('CI')
    expect(COUNTRY_CODES['cabo-verde']).toBe('CV')
    expect(COUNTRY_CODES.eswatini).toBe('SZ')
    expect(COUNTRY_CODES.micronesia).toBe('FM')
    expect(COUNTRY_CODES.turkey).toBe('TR')
    expect(COUNTRY_CODES['timor-leste']).toBe('TL')
    expect(COUNTRY_CODES.bahamas).toBe('BS')
    expect(COUNTRY_CODES.gambia).toBe('GM')
    // Kosovo has no official ISO 3166-1 code; XK is the user-assigned code
    // the actual asset in public/flags/ uses (see flags.ts).
    expect(COUNTRY_CODES.kosovo).toBe('XK')
  })
})
