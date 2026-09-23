import { describe, expect, it } from 'vitest'
import { classifyTypeAnswer } from './answerValidation'
import { buildCapitalAnswerDomain } from './capitals'
import { buildCountryAnswerDomain } from './countryAliases'
import { buildCurrencyAnswerDomain, buildCurrencyCodeAnswerDomain } from './currencyAliases'
import { buildLanguageAnswerDomain } from './languageAliases'

/**
 * "Actively try to break it" pass (see the conversation that specified
 * this feature). A scripted sweep over the full canonical dataset found
 * several real pairs of values that are within the typo-correction
 * distance of EACH OTHER: Gambia/Zambia, Iceland/Ireland, Iran/Iraq
 * (countries); Rome/Lomé, Kingston/Kingstown (capitals); North Korean
 * Won/South Korean Won (currencies); Pular/Pulaar, Javanese/Japanese
 * (languages). Every one of these must remain a genuine wrong answer, not
 * a "did you mean" rescue, because step 2 (exact domain match) always
 * runs before step 3 (typo match) — see answerValidation.ts's own doc
 * comment on the precedence order. This file proves that holds for each
 * discovered pair, plus a battery of other "make it too forgiving" probes.
 */
describe('Adversarial: real near-miss pairs never rescue each other via Did You Mean', () => {
  it.each([
    ['Gambia', 'Zambia'],
    ['Iceland', 'Ireland'],
    ['Iran', 'Iraq'],
    // Re-scanned after this pass's threshold widening (length-6+ now
    // allows distance 2, to support "Landan" -> "London" domain-wide) —
    // these additional real pairs surfaced and are proven safe the same
    // way: step 2 (exact domain match) always wins before step 3 runs.
    ['Slovakia', 'Slovenia'],
    ['North Korea', 'South Korea'],
    ['Rwanda', 'Uganda'],
  ])('country: typing "%s" for a "%s" question is valid-incorrect, never did-you-mean', (correct, typedInstead) => {
    const domain = buildCountryAnswerDomain(correct)
    expect(classifyTypeAnswer(typedInstead, domain)).toEqual({ kind: 'valid-incorrect' })
  })

  it.each([
    ['Rome', 'Lomé'],
    ['Kingston', 'Kingstown'],
    ['Manama', 'Manila'],
    ['Berlin', 'Bern'],
    ['Asmara', 'Ankara'],
  ])('capital: typing "%s" for a "%s" question is valid-incorrect, never did-you-mean', (correct, typedInstead) => {
    const domain = buildCapitalAnswerDomain(correct)
    expect(classifyTypeAnswer(typedInstead, domain)).toEqual({ kind: 'valid-incorrect' })
  })

  it('currency: typing "South Korean Won" for a "North Korean Won" question is valid-incorrect, never did-you-mean', () => {
    const domain = buildCurrencyAnswerDomain(['North Korean Won'])
    expect(classifyTypeAnswer('South Korean Won', domain)).toEqual({ kind: 'valid-incorrect' })
  })

  it.each([
    ['Pular', 'Pulaar'],
    ['Japanese', 'Javanese'],
    ['Spanish', 'Danish'],
    ['Kurdish', 'Turkish'],
    ['Bulgarian', 'Hungarian'],
  ])('language: typing "%s" for a "%s" question is valid-incorrect, never did-you-mean', (correct, typedInstead) => {
    const domain = buildLanguageAnswerDomain([correct])
    expect(classifyTypeAnswer(typedInstead, domain)).toEqual({ kind: 'valid-incorrect' })
  })
})

describe('Adversarial: prefixes and fragments never falsely accepted', () => {
  const domain = buildCountryAnswerDomain('Japan')
  it.each(['J', 'Ja', 'Jap', 'Japa'])('a prefix of the correct answer ("%s") is not correct and not a suggestion', (prefix) => {
    const result = classifyTypeAnswer(prefix, domain)
    expect(result.kind).not.toBe('correct')
    // Very short prefixes must never rescue via Did You Mean either
    // (typoThreshold(length<=3) === 0 backstops this structurally).
    if (prefix.length <= 3) expect(result.kind).not.toBe('did-you-mean')
  })

  it('a single letter fragment is invalid, not a suggestion', () => {
    expect(classifyTypeAnswer('J', domain)).toEqual({ kind: 'invalid-domain' })
  })
})

describe('Adversarial: an alias of a WRONG answer stays a genuine wrong answer, not a suggestion for the correct one', () => {
  it('RMB (an explicit alias of Renminbi) submitted for a Japan currency question is valid-incorrect', () => {
    const domain = buildCurrencyAnswerDomain(['Japanese Yen', 'Yen'])
    expect(classifyTypeAnswer('RMB', domain)).toEqual({ kind: 'valid-incorrect' })
  })

  it('Kiswahili (an explicit alias of Swahili) submitted for a non-Swahili language question is valid-incorrect', () => {
    const domain = buildLanguageAnswerDomain(['French'])
    expect(classifyTypeAnswer('Kiswahili', domain)).toEqual({ kind: 'valid-incorrect' })
  })
})

describe('Adversarial: currency shorthand from a DIFFERENT question is a normal wrong answer, never auto-accepted or leak-suggested', () => {
  it('"Naira" (Nigeria\'s UNIQUE, unambiguous shorthand) submitted for a Japan currency question is a genuine wrong answer (valid-incorrect) — it is now a real domain-wide value, so this is more accurate than "invalid", but it is never "correct" and never a suggestion', () => {
    const domain = buildCurrencyAnswerDomain(['Japanese Yen', 'Yen'])
    const result = classifyTypeAnswer('Naira', domain)
    expect(result).toEqual({ kind: 'valid-incorrect' })
  })

  it('"Franc" (AMBIGUOUS across several real currencies — Swiss, CFA, Guinean, Burundian...) submitted for a Danish Krone question is invalid, not a suggestion — ambiguous shorthand is deliberately excluded from the domain-wide pool entirely', () => {
    const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])
    expect(classifyTypeAnswer('Franc', domain)).toEqual({ kind: 'invalid-domain' })
  })

  it('"Dolar" (a typo of the AMBIGUOUS "Dollar" shorthand) does not auto-resolve to one arbitrary Dollar currency for an unrelated question', () => {
    const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])
    const result = classifyTypeAnswer('Dolar', domain)
    expect(result.kind).not.toBe('correct')
    expect(result.kind).not.toBe('did-you-mean')
    expect(result).toEqual({ kind: 'invalid-domain' })
  })

  it('"Dolar" DOES resolve via the narrow contextual fallback when the current question\'s own shorthand is genuinely "Dollar" (mirrors the Krona/Krone case structurally)', () => {
    const domain = buildCurrencyAnswerDomain(['Australian Dollar', 'Dollar'])
    expect(classifyTypeAnswer('Dolar', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Dollar' })
  })
})

describe('Adversarial: unrelated real words never masquerade as a typo of the correct answer', () => {
  it.each([
    ['Beijing', 'Tokyo'],
    ['China', 'Japan'],
    ['English', 'Portuguese'],
    ['Dollar', 'Japanese Yen'],
  ])('"%s" is never suggested as a typo of "%s"', (input, correct) => {
    // Use a generic language-shaped domain since these are cross-domain
    // examples from the spec — the point is purely "never did-you-mean".
    const domain = buildLanguageAnswerDomain([correct])
    expect(classifyTypeAnswer(input, domain).kind).not.toBe('did-you-mean')
  })
})

describe('Adversarial: punctuation and casing variants of the correct answer still work', () => {
  it('trailing punctuation on an otherwise-correct capital still matches (normalizeCountryName strips non-letters)', () => {
    const domain = buildCapitalAnswerDomain('Washington, D.C.')
    expect(classifyTypeAnswer('Washington DC', domain)).toEqual({ kind: 'correct' })
    expect(classifyTypeAnswer('washington, d.c.', domain)).toEqual({ kind: 'correct' })
  })

  it('ALL CAPS and mixed case both still match exactly', () => {
    const domain = buildCountryAnswerDomain('France')
    expect(classifyTypeAnswer('FRANCE', domain)).toEqual({ kind: 'correct' })
    expect(classifyTypeAnswer('FrAnCe', domain)).toEqual({ kind: 'correct' })
  })
})

describe('Adversarial: currency-code near-misses among real codes never cross-suggest (typo disabled entirely)', () => {
  it('XOF vs XAF: two real, different, both-valid codes 1 edit apart never suggest each other', () => {
    const xofDomain = buildCurrencyCodeAnswerDomain('XOF')
    expect(classifyTypeAnswer('XAF', xofDomain)).toEqual({ kind: 'valid-incorrect' })
    const xafDomain = buildCurrencyCodeAnswerDomain('XAF')
    expect(classifyTypeAnswer('XOF', xafDomain)).toEqual({ kind: 'valid-incorrect' })
  })
})

describe('Section 25: domain-wide typo matching resolves to MULTIPLE DIFFERENT valid values (proves it is truly domain-wide, not accepted-only)', () => {
  it('country: several unrelated misspellings each resolve to their own distinct correct country, regardless of the current question', () => {
    // Every one of these is checked against a Japan question's domain —
    // Japan is never the answer, proving the matcher searches the whole
    // 200-country domain, not just Japan's own accepted answer.
    const domain = buildCountryAnswerDomain('Japan')
    expect(classifyTypeAnswer('Jpan', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Japan' })
    expect(classifyTypeAnswer('Chnia', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'China' })
    expect(classifyTypeAnswer('Frnace', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'France' })
  })

  it('capital: several unrelated misspellings each resolve to their own distinct correct capital, regardless of the current question', () => {
    const domain = buildCapitalAnswerDomain('Tokyo')
    expect(classifyTypeAnswer('Tokoyo', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Tokyo' })
    expect(classifyTypeAnswer('Bejing', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Beijing' })
    expect(classifyTypeAnswer('Cophenhagen', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Copenhagen' })
  })

  it('language: several unrelated misspellings each resolve to their own distinct correct language, regardless of the current question', () => {
    const domain = buildLanguageAnswerDomain(['Portuguese'])
    expect(classifyTypeAnswer('Portugese', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Portuguese' })
    expect(classifyTypeAnswer('Spanihs', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Spanish' })
    expect(classifyTypeAnswer('Englih', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'English' })
  })

  it('currency: several unrelated misspellings each resolve to their own distinct correct currency, regardless of the current question', () => {
    const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])
    expect(classifyTypeAnswer('Yenn', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Yen' })
    expect(classifyTypeAnswer('Narria', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Naira' })
    expect(classifyTypeAnswer('Euor', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Euro' })
  })
})
