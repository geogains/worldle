import { COUNTRIES, ANSWER_POOL, MAX_ANSWER_LENGTH, MIN_ANSWER_LENGTH, type Country } from './countries'

export interface DatasetAudit {
  totalCountries: number
  eligibleCountries: number
  countsByLength: Record<number, number>
  eligibleCountsByLength: Record<number, number>
  duplicateNames: string[]
  duplicateIds: string[]
  normalizationCollisions: { normalized: string; names: string[] }[]
  /** Display names containing characters outside letters, spaces, hyphens, apostrophes. */
  unexpectedCharacters: { name: string; chars: string[] }[]
  /** Countries whose normalized form is not pure A–Z or whose length is wrong. */
  badNormalization: string[]
  ineligible: string[]
}

/** Pure audit of the dataset; used by the CLI script and by tests. */
export function auditCountries(countries: readonly Country[] = COUNTRIES): DatasetAudit {
  const countsByLength: Record<number, number> = {}
  const eligibleCountsByLength: Record<number, number> = {}
  const seenNames = new Map<string, number>()
  const seenIds = new Map<string, number>()
  const byNormalized = new Map<string, string[]>()
  const unexpectedCharacters: DatasetAudit['unexpectedCharacters'] = []
  const badNormalization: string[] = []

  for (const c of countries) {
    countsByLength[c.length] = (countsByLength[c.length] ?? 0) + 1
    if (c.length >= MIN_ANSWER_LENGTH && c.length <= MAX_ANSWER_LENGTH) {
      eligibleCountsByLength[c.length] = (eligibleCountsByLength[c.length] ?? 0) + 1
    }
    seenNames.set(c.name, (seenNames.get(c.name) ?? 0) + 1)
    seenIds.set(c.id, (seenIds.get(c.id) ?? 0) + 1)
    byNormalized.set(c.normalized, [...(byNormalized.get(c.normalized) ?? []), c.name])

    const stripped = c.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const odd = Array.from(new Set(stripped.replace(/[A-Za-z '-]/g, '').split('')))
    if (odd.length) unexpectedCharacters.push({ name: c.name, chars: odd })

    if (!/^[A-Z]+$/.test(c.normalized) || c.normalized.length !== c.length) {
      badNormalization.push(c.name)
    }
  }

  return {
    totalCountries: countries.length,
    eligibleCountries: countries.filter(
      (c) => c.length >= MIN_ANSWER_LENGTH && c.length <= MAX_ANSWER_LENGTH,
    ).length,
    countsByLength,
    eligibleCountsByLength,
    duplicateNames: [...seenNames].filter(([, n]) => n > 1).map(([name]) => name),
    duplicateIds: [...seenIds].filter(([, n]) => n > 1).map(([id]) => id),
    normalizationCollisions: [...byNormalized]
      .filter(([, names]) => names.length > 1)
      .map(([normalized, names]) => ({ normalized, names })),
    unexpectedCharacters,
    badNormalization,
    ineligible: countries
      .filter((c) => c.length < MIN_ANSWER_LENGTH || c.length > MAX_ANSWER_LENGTH)
      .map((c) => `${c.name} (${c.length})`),
  }
}

export function formatAuditReport(audit: DatasetAudit = auditCountries()): string {
  const lines: string[] = []
  lines.push(`Total canonical countries: ${audit.totalCountries}`)
  lines.push(
    `Eligible daily answers (${MIN_ANSWER_LENGTH}–${MAX_ANSWER_LENGTH} letters): ${audit.eligibleCountries}`,
  )
  lines.push('')
  lines.push('Counts by normalized length:')
  const lengths = Object.keys(audit.countsByLength)
    .map(Number)
    .sort((a, b) => a - b)
  for (const len of lengths) {
    const n = audit.countsByLength[len] ?? 0
    const eligible = len >= MIN_ANSWER_LENGTH && len <= MAX_ANSWER_LENGTH
    lines.push(`  ${String(len).padStart(2)}: ${String(n).padStart(3)} ${eligible ? '' : '(not eligible)'}`)
  }
  lines.push('')
  lines.push(`Duplicate names: ${audit.duplicateNames.length ? audit.duplicateNames.join(', ') : 'none'}`)
  lines.push(`Duplicate ids: ${audit.duplicateIds.length ? audit.duplicateIds.join(', ') : 'none'}`)
  lines.push(
    `Normalization collisions: ${
      audit.normalizationCollisions.length
        ? audit.normalizationCollisions.map((c) => `${c.normalized} <- ${c.names.join(' / ')}`).join('; ')
        : 'none'
    }`,
  )
  lines.push(
    `Unexpected characters: ${
      audit.unexpectedCharacters.length
        ? audit.unexpectedCharacters.map((u) => `${u.name} [${u.chars.join('')}]`).join('; ')
        : 'none'
    }`,
  )
  lines.push(`Bad normalization: ${audit.badNormalization.length ? audit.badNormalization.join(', ') : 'none'}`)
  lines.push('')
  lines.push(`Ineligible for daily (${audit.ineligible.length}):`)
  for (const name of audit.ineligible) lines.push(`  - ${name}`)
  return lines.join('\n')
}

export { ANSWER_POOL }
