import { COUNTRIES, type Country } from '../countries'
import { COUNTRY_CODES } from './flags'

export interface FlagAudit {
  totalCountries: number
  totalMappings: number
  /** Gameplay countries with no entry in COUNTRY_CODES. */
  missingMappings: string[]
  /** Mapping keys that are not a real gameplay country id (should never happen; enforced by a test). */
  invalidMappingKeys: string[]
  /**
   * Mapping values that are not a well-formed flag code: either a plain
   * ISO 3166-1 alpha-2 country code ("GB") or a real ISO 3166-2 subdivision
   * code ("GB-ENG") for a non-sovereign entity like England/Scotland/Wales.
   */
  malformedCodes: { slug: string; code: string }[]
  /** Mapped `<CODE>.png` files that do not exist in the given asset list. */
  missingAssets: { slug: string; code: string }[]
}

/**
 * Pure audit of the flag mapping — no filesystem access, so it can run
 * anywhere COUNTRY_CODES can (including the browser-only src/data tests).
 * `assetFilenames` (e.g. `TZ.png`) is supplied by the caller: the CLI script
 * and its accompanying test read the real public/flags directory; other
 * callers can pass a synthetic list to test the audit logic itself.
 */
export function auditFlags(
  countries: readonly Country[] = COUNTRIES,
  countryCodes: Readonly<Record<string, string>> = COUNTRY_CODES,
  assetFilenames?: ReadonlySet<string>,
): FlagAudit {
  const countryIds = new Set(countries.map((c) => c.id))
  const missingMappings = countries.filter((c) => !(c.id in countryCodes)).map((c) => c.id)
  const invalidMappingKeys = Object.keys(countryCodes).filter((slug) => !countryIds.has(slug))
  // ISO 3166-1 alpha-2 ("GB"), optionally suffixed with a real ISO 3166-2
  // subdivision part ("GB-ENG") for a non-sovereign entity.
  const malformedCodes = Object.entries(countryCodes)
    .filter(([, code]) => !/^[A-Z]{2}(-[A-Z]{2,3})?$/.test(code))
    .map(([slug, code]) => ({ slug, code }))
  const missingAssets = assetFilenames
    ? Object.entries(countryCodes)
        .filter(([, code]) => !assetFilenames.has(`${code}.png`))
        .map(([slug, code]) => ({ slug, code }))
    : []

  return {
    totalCountries: countries.length,
    totalMappings: Object.keys(countryCodes).length,
    missingMappings,
    invalidMappingKeys,
    malformedCodes,
    missingAssets,
  }
}

export function formatFlagAuditReport(audit: FlagAudit): string {
  const lines: string[] = []
  lines.push(`Gameplay countries: ${audit.totalCountries}`)
  lines.push(`Flag mappings: ${audit.totalMappings}`)
  lines.push(
    `Missing mappings (${audit.missingMappings.length}): ${
      audit.missingMappings.length ? audit.missingMappings.join(', ') : 'none'
    }`,
  )
  lines.push(
    `Invalid mapping keys (${audit.invalidMappingKeys.length}): ${
      audit.invalidMappingKeys.length ? audit.invalidMappingKeys.join(', ') : 'none'
    }`,
  )
  lines.push(
    `Malformed codes (${audit.malformedCodes.length}): ${
      audit.malformedCodes.length ? audit.malformedCodes.map((m) => `${m.slug}->${m.code}`).join(', ') : 'none'
    }`,
  )
  lines.push(
    `Mapped assets missing from public/flags (${audit.missingAssets.length}): ${
      audit.missingAssets.length
        ? audit.missingAssets.map((m) => `${m.slug}->${m.code}.png`).join(', ')
        : 'none'
    }`,
  )
  return lines.join('\n')
}
