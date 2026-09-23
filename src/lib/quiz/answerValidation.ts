import { normalizeCountryName } from '../text/normalize'
import { damerauLevenshteinDistance, typoThreshold } from './typo'

/**
 * One recognized value — either "an accepted answer for the current
 * question" or "one candidate in the domain-wide typo pool" (see
 * AnswerDomainSpec below; both use this same shape). `keys` is every
 * normalized form that should count as an exact match for it (the value's
 * own key, plus any alias-derived forms a mode's own alias module already
 * produces — slash-separated language forms, ASCII fallbacks for
 * non-decomposable letters, etc). `display` is what a Did You Mean
 * suggestion shows if this candidate turns out to be the closest one —
 * always a real player-facing string, never an internal key.
 */
export interface DomainCandidate {
  display: string
  keys: readonly string[]
}

/**
 * Everything the shared Type Answer classifier needs to evaluate one
 * question, built by each mode's own domain module (countryAliases.ts,
 * capitals.ts, languageAliases.ts, currencyAliases.ts) from that mode's
 * existing canonical data + alias infrastructure — this module itself has
 * zero geography-specific knowledge.
 */
export interface AnswerDomainSpec {
  /** Used in "Please enter a valid {label}." — e.g. "country name", "capital city", "language", "currency", "currency code". */
  label: string
  /** The accepted answer(s) for THIS question only — used for the step-1 exact-match check, and as a narrow step-3b typo fallback (see classifyTypeAnswer's doc comment). */
  accepted: readonly DomainCandidate[]
  /**
   * Every recognized value across the WHOLE domain (not just this
   * question) — every canonical value, deduped, plus safe/unambiguous
   * aliases, one candidate per distinct display form. Used for both the
   * step-2 exact "real but wrong" check and the step-3a domain-wide typo
   * search. Built ONCE per domain (a module-level constant), completely
   * independent of any particular question — this is what makes typo
   * matching correctness-blind: the same `domainCandidates` reference is
   * reused for every question in the domain, so it cannot know or favor
   * whichever value happens to be correct right now.
   */
  domainCandidates: readonly DomainCandidate[]
  /** False disables Did You Mean entirely for this domain (used for currency codes — see currencyAliases.ts). */
  typoEnabled: boolean
}

export type AnswerClassification =
  | { kind: 'correct' }
  | { kind: 'did-you-mean'; suggestion: string }
  | { kind: 'valid-incorrect' }
  | { kind: 'invalid-domain' }

/**
 * Classifies one Type Answer submission against `domain` for the CURRENT
 * question.
 *
 * STEP 1 — exact/normalized/alias match against one of THIS question's
 * accepted answers -> 'correct'.
 *
 * STEP 2 — exact/normalized match against ANY value in the domain-wide
 * candidate pool (a real answer, just not the right one for this
 * question) -> 'valid-incorrect'. Runs BEFORE typo matching so a genuine
 * alternate answer (e.g. "Beijing" for a Japan capital question) is never
 * rescued into a "did you mean" — a real wrong answer must stay wrong,
 * never a free typo correction.
 *
 * STEP 3 — a conservative typo (see typo.ts) of something in the domain.
 * Two-phase, in order:
 *   3a. Search the domain-WIDE candidate pool. This search is
 *       correctness-blind by construction: `domain.domainCandidates` is a
 *       module-level constant, the exact same object for every question in
 *       the domain, so it has no way to know or favor whichever answer is
 *       correct right now — see findTypoSuggestion's own doc comment and
 *       answerValidation.test.ts's information-leak invariant tests. THIS
 *       is what fixes the original information leak: a typo now gets a
 *       suggestion whenever it's close to ANY real domain value, whether
 *       that value happens to be correct or not, so receiving a suggestion
 *       no longer implies correctness.
 *   3b. Only if 3a found nothing: search THIS question's own accepted
 *       answers, but ONLY the ones whose key is NOT already present
 *       anywhere in the domain-wide pool. This exclusivity filter is the
 *       safety-critical part: it stops 3b from ever re-litigating a
 *       domain-wide tie (or near-miss) using a narrower comparison, which
 *       would let the correct answer "win" merely by being correct —
 *       exactly the leak this system exists to prevent (see
 *       answerValidation.test.ts's dedicated regression test for this).
 *       Which accepted answers are excluded from the domain-wide pool is
 *       decided once, by the domain builder itself, never by anything
 *       input-dependent — currencyAliases.ts deliberately leaves ambiguous
 *       shorthand ("Krone", "Dollar", "Franc"...) out of
 *       CURRENCY_DOMAIN_CANDIDATES because it's ambiguous across multiple
 *       different real currencies, so 3a alone would never find it; 3b is
 *       what preserves the Denmark "Krona" -> "Krone" case for exactly
 *       that reason. For every other domain (Country/Capital/Language, and
 *       Currency's own canonical names and explicit aliases), every
 *       accepted answer is already IN the domain-wide pool, so it gets
 *       filtered out of `exclusiveAccepted` and 3b is a structural no-op.
 *       See currencyAliases.test.ts for the documented residual trade-off
 *       this narrow fallback accepts.
 *
 * STEP 4 — otherwise -> 'invalid-domain'.
 *
 * `input` should already be trimmed and non-empty — callers (TypeAnswerInput)
 * gate empty/whitespace-only submissions before this is ever called, so
 * "please enter a valid X" is never shown for simply not having typed
 * anything yet.
 */
export function classifyTypeAnswer(input: string, domain: AnswerDomainSpec): AnswerClassification {
  const key = normalizeCountryName(input)

  if (domain.accepted.some((a) => a.keys.includes(key))) return { kind: 'correct' }

  if (domain.domainCandidates.some((c) => c.keys.includes(key))) return { kind: 'valid-incorrect' }

  if (domain.typoEnabled) {
    const domainSuggestion = findTypoSuggestion(key, domain.domainCandidates)
    if (domainSuggestion) return { kind: 'did-you-mean', suggestion: domainSuggestion }

    // Step 3b fallback: only ever considers accepted answers that are NOT
    // already part of the domain-wide pool — critically, this must never
    // re-litigate a domain-wide tie using a narrower comparison, or the
    // correct answer could "win" a tie merely by being correct (the exact
    // leak this whole system exists to prevent). Which accepted answers
    // are excluded from the domain-wide pool is decided once, by the
    // domain builder itself (e.g. currencyAliases.ts deliberately leaves
    // ambiguous shorthand like "Krone" out of CURRENCY_DOMAIN_CANDIDATES),
    // never by anything input-dependent — so this filter can never favor
    // one question's answer over another's based on the current typo.
    const domainKeys = new Set(domain.domainCandidates.flatMap((c) => c.keys))
    const exclusiveAccepted = domain.accepted.filter((a) => !a.keys.some((k) => domainKeys.has(k)))
    const fallbackSuggestion = findTypoSuggestion(key, exclusiveAccepted)
    if (fallbackSuggestion) return { kind: 'did-you-mean', suggestion: fallbackSuggestion }
  }

  return { kind: 'invalid-domain' }
}

/**
 * The single strongest typo candidate among `candidates`, or null if
 * nothing clears the conservative threshold OR if two DIFFERENT candidates
 * are equally close (ambiguous — do not guess; a strictly-closer candidate
 * always wins over a farther one that still happens to clear the
 * threshold, this only refuses to guess on a genuine tie).
 *
 * DELIBERATELY correctness-blind: this function has no parameter for "the
 * correct answer" and no way to know which of `candidates` (if any) is
 * correct for whatever question called it — it purely measures spelling
 * distance. Callers achieve "search the whole domain" vs "search just this
 * question's accepted answers" by passing a different `candidates` array
 * (see classifyTypeAnswer's step 3a/3b), never by biasing the ranking
 * itself. This structural separation is what the information-leak
 * invariant tests in answerValidation.test.ts pin down: the same input
 * against the same domain-wide candidate list always produces the same
 * suggestion, regardless of which question asked.
 */
export function findTypoSuggestion(inputKey: string, candidates: readonly DomainCandidate[]): string | null {
  // Dedupe by normalized display first — the same value can legitimately
  // appear more than once (e.g. a language question's acceptedCanonical,
  // or a currency shared by several countries), and that must never look
  // like "two different equally-close candidates".
  const distanceByCandidate = new Map<string, { display: string; distance: number }>()
  for (const candidate of candidates) {
    const distance = Math.min(...candidate.keys.map((k) => damerauLevenshteinDistance(inputKey, k)))
    const dedupeKey = normalizeCountryName(candidate.display)
    const existing = distanceByCandidate.get(dedupeKey)
    if (!existing || distance < existing.distance) {
      distanceByCandidate.set(dedupeKey, { display: candidate.display, distance })
    }
  }

  let minDistance = Infinity
  for (const { distance } of distanceByCandidate.values()) {
    if (distance < minDistance) minDistance = distance
  }
  if (!Number.isFinite(minDistance) || minDistance > typoThreshold(inputKey.length)) return null

  const winners = [...distanceByCandidate.values()].filter((v) => v.distance === minDistance)
  return winners.length === 1 ? winners[0]!.display : null
}
