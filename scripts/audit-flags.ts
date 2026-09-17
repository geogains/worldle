/**
 * Developer utility: prints a report about the country -> flag mapping.
 *   npm run audit:flags
 * Exits non-zero if any gameplay country is unmapped, any mapping key/code
 * is invalid, or a mapped asset is missing from public/flags.
 *
 * mauritania -> MR was the last gap (no public/flags/MR.png existed) until
 * that asset was added and the mapping completed; no documented exception
 * remains.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { auditFlags, formatFlagAuditReport } from '../src/data/countryDetails/audit'
import { COUNTRY_CODES } from '../src/data/countryDetails/flags'

const assetFiles = new Set(readdirSync(join(import.meta.dirname, '..', 'public', 'flags')))
const audit = auditFlags(undefined, COUNTRY_CODES, assetFiles)

console.log(formatFlagAuditReport(audit))

const problems =
  audit.missingMappings.length + audit.invalidMappingKeys.length + audit.malformedCodes.length + audit.missingAssets.length

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`)
  if (audit.missingMappings.length) console.error(`Missing mappings: ${audit.missingMappings.join(', ')}`)
  process.exit(1)
}
console.log(`\nFlag mapping OK — all ${audit.totalCountries} gameplay countries mapped.`)
