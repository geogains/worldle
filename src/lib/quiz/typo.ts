/**
 * Small, deterministic typo-distance helper for Type Answer's "Did you
 * mean?" system (see answerValidation.ts). Not fuzzy matching — this is
 * one narrow tool (edit distance) used behind a conservative, length-aware
 * threshold, never to "find something vaguely similar."
 */

/**
 * Restricted Damerau-Levenshtein distance (a.k.a. "optimal string
 * alignment"): insertion, deletion, substitution and adjacent-transposition
 * each cost 1. The transposition term is what lets a common human typo
 * like "Tkoyo" (swapped letters) rival "Tokoyo" (an extra letter) in cost,
 * rather than scoring an adjacent swap as two substitutions.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  const d: number[][] = Array.from({ length: al + 1 }, () => new Array<number>(bl + 1).fill(0))
  for (let i = 0; i <= al; i++) d[i]![0] = i
  for (let j = 0; j <= bl; j++) d[0]![j] = j

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        d[i - 1]![j]! + 1, // deletion
        d[i]![j - 1]! + 1, // insertion
        d[i - 1]![j - 1]! + cost, // substitution
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, d[i - 2]![j - 2]! + 1) // adjacent transposition
      }
      d[i]![j] = value
    }
  }
  return d[al]![bl]!
}

/**
 * The maximum edit distance that still counts as "a spelling mistake, not
 * a different word" — conservative and length-aware, not a flat constant:
 *
 *  - length <= 3: 0 (no correction at all). Deliberately strict — this is
 *    also the backstop for currency codes even if a caller mistakenly left
 *    typo matching enabled for them, since every code is exactly 3
 *    characters and a 1-edit "correction" there is usually a different
 *    real code (e.g. XOF -> XAF), not a typo — see currencyAliases.ts's
 *    own doc comment on why code typo-matching is disabled entirely.
 *  - length 4-5: 1 ("Jpan" -> "Japan", "Krona" -> "Krone", "Euor" -> "Euro").
 *  - length 6+: 2 — recalibrated up from a flat "1" once domain-wide
 *    matching (not just this question's own accepted answer) needed to
 *    cover "Landan" -> "London" (distance 2 at length 6), one of this
 *    feature's own required examples. Still every other length-6..12
 *    example ("Tokoyo", "Bejing", "Pariss", "Portugese", "Spanihs",
 *    "Englih", "Zlotty") only actually needs distance 1, so this widening
 *    is verified safe against the real dataset in typo.test.ts (no
 *    dataset-wide false-positive collision introduced by the wider
 *    allowance — see answerValidation.adversarial.test.ts's re-run of the
 *    near-miss-pair scan at this threshold) rather than assumed.
 *
 * `length` should be the length of the NORMALIZED (letters-only) input,
 * matching what damerauLevenshteinDistance is actually computed over.
 */
export function typoThreshold(length: number): number {
  if (length <= 3) return 0
  if (length <= 5) return 1
  return 2
}

/** True if `input` is within the conservative typo threshold of `candidate` (both already normalized). */
export function isCloseTypo(input: string, candidate: string): boolean {
  if (input === candidate) return true // exact match is never "a typo" — callers should already treat this as correct, but stay safe/inclusive here too
  const threshold = typoThreshold(input.length)
  if (threshold === 0) return false
  return damerauLevenshteinDistance(input, candidate) <= threshold
}
