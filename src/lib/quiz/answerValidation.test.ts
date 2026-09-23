import { describe, expect, it } from 'vitest'
import { classifyTypeAnswer, findTypoSuggestion, type AnswerDomainSpec, type DomainCandidate } from './answerValidation'

const CAPITAL_CANDIDATES: readonly DomainCandidate[] = [
  { display: 'Tokyo', keys: ['TOKYO'] },
  { display: 'Beijing', keys: ['BEIJING'] },
  { display: 'Seoul', keys: ['SEOUL'] },
  { display: 'Bangkok', keys: ['BANGKOK'] },
  { display: 'London', keys: ['LONDON'] },
  { display: 'Paris', keys: ['PARIS'] },
  { display: 'Berlin', keys: ['BERLIN'] },
]

function capitalDomain(correct: string): AnswerDomainSpec {
  const key = correct.toUpperCase()
  return {
    label: 'capital city',
    accepted: [{ display: correct, keys: [key] }],
    domainCandidates: CAPITAL_CANDIDATES,
    typoEnabled: true,
  }
}

describe('classifyTypeAnswer — precedence pipeline (domain-wide typo matching)', () => {
  it('exact accepted answer -> correct', () => {
    expect(classifyTypeAnswer('Tokyo', capitalDomain('Tokyo'))).toEqual({ kind: 'correct' })
  })

  it('case/whitespace-insensitive exact match -> correct', () => {
    expect(classifyTypeAnswer('  tokyo  ', capitalDomain('Tokyo'))).toEqual({ kind: 'correct' })
  })

  it('a typo of the CORRECT answer -> did-you-mean', () => {
    expect(classifyTypeAnswer('Tokoyo', capitalDomain('Tokyo'))).toEqual({ kind: 'did-you-mean', suggestion: 'Tokyo' })
  })

  it('THE INFORMATION-LEAK FIX: a typo of a domain value that is NOT correct for this question still gets a suggestion', () => {
    // "Landan" is nowhere near "Tokyo" (the correct answer) but IS a typo
    // of "London" (a different domain value) — the old, buggy behaviour
    // only searched the accepted answer and would have returned
    // invalid-domain here, which is exactly the leak this fixes.
    expect(classifyTypeAnswer('Landan', capitalDomain('Tokyo'))).toEqual({ kind: 'did-you-mean', suggestion: 'London' })
  })

  it('a real but different domain value (exact spelling) -> valid-incorrect, even though not close to the accepted answer', () => {
    expect(classifyTypeAnswer('Beijing', capitalDomain('Tokyo'))).toEqual({ kind: 'valid-incorrect' })
  })

  it('nonsense, not close to anything -> invalid-domain', () => {
    expect(classifyTypeAnswer('Birmingham', capitalDomain('Tokyo'))).toEqual({ kind: 'invalid-domain' })
  })

  it('a real domain value takes precedence over typo-matching even if it happens to be close to the accepted answer (step 2 before step 3)', () => {
    const domain: AnswerDomainSpec = {
      label: 'capital city',
      accepted: [{ display: 'Seol', keys: ['SEOL'] }], // contrived accepted spelling for this test only
      domainCandidates: [...CAPITAL_CANDIDATES, { display: 'Seol', keys: ['SEOL'] }],
      typoEnabled: true,
    }
    expect(classifyTypeAnswer('Seoul', domain)).toEqual({ kind: 'valid-incorrect' })
  })
})

describe('classifyTypeAnswer — accepting a wrong-but-suggested value is a genuine incorrect submission', () => {
  it('a suggestion that is NOT correct for this question, once submitted as-is, is a normal exact domain match (valid-incorrect) — the caller (TypeAnswerInput) resubmits the suggestion text through this same classifier', () => {
    const domain = capitalDomain('Tokyo')
    const first = classifyTypeAnswer('Landan', domain)
    expect(first).toEqual({ kind: 'did-you-mean', suggestion: 'London' })
    const accepted = classifyTypeAnswer((first as { suggestion: string }).suggestion, domain)
    expect(accepted).toEqual({ kind: 'valid-incorrect' })
  })

  it('a suggestion that IS correct for this question, once submitted, classifies as correct', () => {
    const domain = capitalDomain('Tokyo')
    const first = classifyTypeAnswer('Tokoyo', domain)
    expect(first).toEqual({ kind: 'did-you-mean', suggestion: 'Tokyo' })
    const accepted = classifyTypeAnswer((first as { suggestion: string }).suggestion, domain)
    expect(accepted).toEqual({ kind: 'correct' })
  })
})

describe('INFORMATION-LEAK INVARIANT: the domain-wide suggestion for a given input never depends on which answer is correct', () => {
  it('findSuggestion("Landan", capitalDomain) -> London, regardless of which capital is actually correct for the question', () => {
    // "Landan" is a MISSPELLING of London, never an exact match — so this
    // always resolves via step 3 (did-you-mean), never step 1 (correct),
    // even for the one case where London genuinely is the right answer.
    // Step 1 only ever fires for an EXACT/normalized match; typo-closeness
    // to the correct answer is not the same thing, and conflating them
    // would itself be a subtle leak (an "instant correct" for typos of the
    // right answer, but not of wrong ones).
    for (const correct of ['Tokyo', 'Paris', 'London', 'Berlin', 'Beijing', 'Seoul', 'Bangkok']) {
      const result = classifyTypeAnswer('Landan', capitalDomain(correct))
      expect(result, `correct=${correct}`).toEqual({ kind: 'did-you-mean', suggestion: 'London' })
    }
  })

  it('findTypoSuggestion itself takes no "correct answer" parameter at all — same input + same candidate list always produces the same result', () => {
    const a = findTypoSuggestion('LANDAN', CAPITAL_CANDIDATES)
    const b = findTypoSuggestion('LANDAN', CAPITAL_CANDIDATES)
    expect(a).toBe('London')
    expect(a).toBe(b)
  })

  it('domain-wide typo matching finds different, unrelated capitals depending purely on the input spelling, never on question correctness', () => {
    expect(findTypoSuggestion('TOKOYO', CAPITAL_CANDIDATES)).toBe('Tokyo')
    expect(findTypoSuggestion('BEJING', CAPITAL_CANDIDATES)).toBe('Beijing')
    expect(findTypoSuggestion('PARISS', CAPITAL_CANDIDATES)).toBe('Paris')
    expect(findTypoSuggestion('LANDAN', CAPITAL_CANDIDATES)).toBe('London')
  })
})

describe('classifyTypeAnswer — no correctness leak through styling/kind: correct-typo and wrong-typo look identical up to acceptance', () => {
  it('both classifications are the exact same shape ({ kind: "did-you-mean", suggestion }) whether the suggestion would end up correct or wrong', () => {
    const correctTypo = classifyTypeAnswer('Tokoyo', capitalDomain('Tokyo')) // suggestion will be correct
    const wrongTypo = classifyTypeAnswer('Landan', capitalDomain('Tokyo')) // suggestion will be wrong
    expect(correctTypo.kind).toBe('did-you-mean')
    expect(wrongTypo.kind).toBe('did-you-mean')
    expect(Object.keys(correctTypo).sort()).toEqual(Object.keys(wrongTypo).sort())
  })
})

describe('classifyTypeAnswer — ambiguous typo candidates', () => {
  it('two different domain candidates equally close to the input -> no suggestion, falls through to invalid-domain', () => {
    // "Danish" and "Vanish" each differ from "Xanish" by exactly one
    // substitution (the first letter) — a genuine, deliberately-contrived
    // tie, not a realistic pair of capital names.
    const equidistant: AnswerDomainSpec = {
      label: 'capital city',
      accepted: [{ display: 'Berlin', keys: ['BERLIN'] }],
      domainCandidates: [
        { display: 'Danish', keys: ['DANISH'] },
        { display: 'Vanish', keys: ['VANISH'] },
      ],
      typoEnabled: true,
    }
    expect(classifyTypeAnswer('Xanish', equidistant)).toEqual({ kind: 'invalid-domain' })
  })

  it('a strictly closer candidate wins over a farther one that still clears the threshold (not ambiguous)', () => {
    const domain: AnswerDomainSpec = {
      label: 'language',
      accepted: [{ display: 'French', keys: ['FRENCH'] }],
      domainCandidates: [
        { display: 'French', keys: ['FRENCH'] }, // distance 1 from "Frnch"
        { display: 'Finnish', keys: ['FINNISH'] }, // distance >1 from "Frnch"
      ],
      typoEnabled: true,
    }
    expect(classifyTypeAnswer('Frnch', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'French' })
  })

  it('duplicate candidate entries (same display, appearing twice) never count as an ambiguous tie', () => {
    const domain: AnswerDomainSpec = {
      label: 'language',
      accepted: [{ display: 'French', keys: ['FRENCH'] }],
      domainCandidates: [
        { display: 'French', keys: ['FRENCH'] },
        { display: 'French', keys: ['FRENCH', 'FRANCAIS'] }, // same answer, differently-derived key set
      ],
      typoEnabled: true,
    }
    expect(classifyTypeAnswer('Frnch', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'French' })
  })
})

describe('classifyTypeAnswer — typoEnabled: false (currency codes)', () => {
  const codeDomain: AnswerDomainSpec = {
    label: 'currency code',
    accepted: [{ display: 'CHF', keys: ['CHF'] }],
    domainCandidates: [
      { display: 'CHF', keys: ['CHF'] },
      { display: 'EUR', keys: ['EUR'] },
      { display: 'USD', keys: ['USD'] },
    ],
    typoEnabled: false,
  }
  it('exact match still works', () => {
    expect(classifyTypeAnswer('CHF', codeDomain)).toEqual({ kind: 'correct' })
  })
  it('a real different code -> valid-incorrect', () => {
    expect(classifyTypeAnswer('EUR', codeDomain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('a close-but-wrong non-real code never produces a suggestion, even at distance 1', () => {
    expect(classifyTypeAnswer('CHG', codeDomain)).toEqual({ kind: 'invalid-domain' })
  })
})

describe('classifyTypeAnswer — multiple accepted answers for one question (Languages-style)', () => {
  const domain: AnswerDomainSpec = {
    label: 'language',
    accepted: [
      { display: 'Dutch', keys: ['DUTCH'] },
      { display: 'French', keys: ['FRENCH'] },
    ],
    domainCandidates: [
      { display: 'Dutch', keys: ['DUTCH'] },
      { display: 'French', keys: ['FRENCH'] },
      { display: 'German', keys: ['GERMAN'] },
    ],
    typoEnabled: true,
  }
  it('correct against either accepted answer', () => {
    expect(classifyTypeAnswer('Dutch', domain)).toEqual({ kind: 'correct' })
    expect(classifyTypeAnswer('French', domain)).toEqual({ kind: 'correct' })
  })
  it('a typo of the SECOND accepted answer still suggests that one specifically, not the first', () => {
    expect(classifyTypeAnswer('Frnch', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'French' })
  })
  it('a typo of the FIRST accepted answer suggests that one', () => {
    expect(classifyTypeAnswer('Dutc', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Dutch' })
  })
  it('a typo of a domain value that is neither accepted answer still gets a suggestion (domain-wide, not leak-prone)', () => {
    expect(classifyTypeAnswer('Germen', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'German' })
  })
})

describe('classifyTypeAnswer — step 3b narrow fallback (contextual accepted-only typo, e.g. Denmark "Krona")', () => {
  it('a term excluded from the domain-wide pool is still typo-matchable against the CURRENT question\'s own accepted answers', () => {
    const domain: AnswerDomainSpec = {
      label: 'currency',
      accepted: [
        { display: 'Danish Krone', keys: ['DANISHKRONE'] },
        { display: 'Krone', keys: ['KRONE'] },
      ],
      // "Krone" is deliberately NOT a domain-wide candidate here (mirrors
      // currencyAliases.ts excluding ambiguous shorthand) — only step 3b
      // (accepted-only fallback) can resolve "Krona" for this question.
      domainCandidates: [
        { display: 'Danish Krone', keys: ['DANISHKRONE'] },
        { display: 'Euro', keys: ['EURO'] },
      ],
      typoEnabled: true,
    }
    expect(classifyTypeAnswer('Krona', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Krone' })
  })

  it('the fallback never fires if the domain-wide search (3a) already found something', () => {
    const domain: AnswerDomainSpec = {
      label: 'currency',
      accepted: [{ display: 'Krone', keys: ['KRONE'] }],
      domainCandidates: [
        { display: 'Krone', keys: ['KRONE'] }, // present in the domain-wide pool this time
        { display: 'Krona', keys: ['KRONA'] }, // a different, equally-plausible domain value
      ],
      typoEnabled: true,
    }
    // Both "Krone" and "Krona" are equally close to "Kroni" — genuinely
    // ambiguous at the domain-wide stage, so no suggestion, and the
    // accepted-only fallback must NOT be used to break the tie in favour
    // of the correct answer (that would reintroduce the leak).
    expect(classifyTypeAnswer('Kroni', domain)).toEqual({ kind: 'invalid-domain' })
  })
})
