/**
 * Developer utility: prints a report about the country dataset.
 *   npm run audit:countries
 * Exits non-zero if the dataset has duplicates, collisions or bad normalization.
 */
import { auditCountries, formatAuditReport } from '../src/data/audit'

const audit = auditCountries()
console.log(formatAuditReport(audit))

const problems =
  audit.duplicateNames.length +
  audit.duplicateIds.length +
  audit.normalizationCollisions.length +
  audit.unexpectedCharacters.length +
  audit.badNormalization.length

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`)
  process.exit(1)
}
console.log('\nDataset OK.')
