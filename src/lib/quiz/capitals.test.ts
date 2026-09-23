import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../data/countries'
import { getCountryDetails } from '../../data/countryDetails'
import { classifyTypeAnswer } from './answerValidation'
import { buildCapitalAnswerDomain, capitalOf, eligibleCapitalCountries } from './capitals'
import { resolveCountryPool } from './pools'

describe('capitalOf', () => {
  it('returns the canonical capital from country-detail data', () => {
    const tanzania = resolveCountryPool('world-expert').find((c) => c.id === 'tanzania')!
    expect(capitalOf(tanzania)).toBe('Dodoma')
  })
})

describe('eligibleCapitalCountries', () => {
  for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
    it(`[${pool}] every returned country has usable (verified) capital data`, () => {
      const countries = eligibleCapitalCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      for (const country of countries) {
        const details = getCountryDetails(country.id)
        expect(details, country.id).not.toBeNull()
        expect(details!.verified.capital, country.id).toBe(true)
      }
    })
    it(`[${pool}] is a subset of the resolved pool`, () => {
      const poolIds = new Set(resolveCountryPool(pool).map((c) => c.id))
      for (const country of eligibleCapitalCountries(pool)) expect(poolIds.has(country.id)).toBe(true)
    })
  }

  it('world-expert includes all 200 countries, since every canonical country has verified capital data today', () => {
    expect(eligibleCapitalCountries('world-expert')).toHaveLength(200)
  })
})

describe('buildCapitalAnswerDomain — the exact Capitals "Tokyo" scenario', () => {
  const domain = buildCapitalAnswerDomain('Tokyo')

  it('Tokyo -> correct', () => {
    expect(classifyTypeAnswer('Tokyo', domain)).toEqual({ kind: 'correct' })
  })
  it('Tokoyo -> did you mean Tokyo', () => {
    expect(classifyTypeAnswer('Tokoyo', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Tokyo' })
  })
  it('Beijing (a real capital, wrong for this question) -> valid-incorrect', () => {
    expect(classifyTypeAnswer('Beijing', domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('Birmingham -> invalid-domain', () => {
    expect(classifyTypeAnswer('Birmingham', domain)).toEqual({ kind: 'invalid-domain' })
  })
  it('Cophenhagen (a typo of a DIFFERENT, wrong-for-this-question capital) -> did you mean Copenhagen — domain-wide, not accepted-only', () => {
    // THE information-leak fix, proven directly: "Cophenhagen" is nowhere
    // near "Tokyo" (the correct answer) but IS a typo of "Copenhagen" (a
    // different real capital) — this must still produce a suggestion, or
    // receiving one would leak "your input was close to correct".
    expect(classifyTypeAnswer('Cophenhagen', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Copenhagen' })
  })
  it('accepting a wrong-but-suggested capital is a genuine incorrect submission, not auto-correct', () => {
    const suggestion = (classifyTypeAnswer('Cophenhagen', domain) as { suggestion: string }).suggestion
    expect(classifyTypeAnswer(suggestion, domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('a correct-typo and a wrong-typo produce an identically-shaped classification before acceptance (no styling/behavior leak)', () => {
    const correctTypo = classifyTypeAnswer('Tokoyo', domain)
    const wrongTypo = classifyTypeAnswer('Cophenhagen', domain)
    expect(correctTypo.kind).toBe('did-you-mean')
    expect(wrongTypo.kind).toBe('did-you-mean')
  })
  it('label is "capital city"', () => {
    expect(domain.label).toBe('capital city')
  })
})

describe('buildCapitalAnswerDomain — "Landan": a real, documented ambiguity discovered in the actual dataset (not a bug)', () => {
  // "Landan" turns out to be EQUALLY close (distance 2) to two different
  // real capitals: "London" (United Kingdom) AND "Luanda" (Angola) — a
  // genuine property of this 199-capital dataset, not a defect. Per the
  // conservative-ambiguity rule (never guess on a tie, see
  // answerValidation.ts's findTypoSuggestion), this correctly returns
  // invalid-domain rather than arbitrarily picking one — including when
  // London genuinely IS the correct answer, since step 3b's fallback only
  // ever considers accepted answers EXCLUDED from the domain-wide pool
  // (see classifyTypeAnswer's own doc comment), and London is very much
  // IN the domain-wide pool. This is reported here rather than silently
  // worked around, per this refinement's own instructions not to weaken
  // the ambiguity-safety guarantee just to force one illustrative example
  // to resolve — see the final report's "remaining edge cases" section.
  it('is genuinely tied between London and Luanda in the real dataset', () => {
    expect(classifyTypeAnswer('Landan', buildCapitalAnswerDomain('Tokyo'))).toEqual({ kind: 'invalid-domain' })
  })
  it('stays invalid-domain (no guess) even when London IS the correct answer for this question', () => {
    expect(classifyTypeAnswer('Landan', buildCapitalAnswerDomain('London'))).toEqual({ kind: 'invalid-domain' })
  })
  it('stays invalid-domain (no guess) even when Luanda IS the correct answer for this question — proving the tie is not secretly broken in favour of whichever answer happens to be correct', () => {
    expect(classifyTypeAnswer('Landan', buildCapitalAnswerDomain('Luanda'))).toEqual({ kind: 'invalid-domain' })
  })
})

describe('buildCapitalAnswerDomain — dataset-wide invariant', () => {
  it('every one of the 200 canonical capitals is recognized as a valid domain value for a DIFFERENT country\'s question', () => {
    const domain = buildCapitalAnswerDomain('Tokyo')
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const capital = capitalOf(country)
      if (!capital || capital === 'Tokyo') continue
      const result = classifyTypeAnswer(capital, domain)
      if (result.kind !== 'valid-incorrect') failures.push(`${country.id} (${capital}): ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('every one of the 200 canonical capitals is correctly classified for its OWN question', () => {
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const capital = capitalOf(country)
      if (!capital) continue
      const domain = buildCapitalAnswerDomain(capital)
      const result = classifyTypeAnswer(capital, domain)
      if (result.kind !== 'correct') failures.push(`${country.id} (${capital}): ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})
