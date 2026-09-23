import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../data/countries'
import { classifyTypeAnswer } from './answerValidation'
import { buildCountryAnswerDomain } from './countryAliases'

describe('buildCountryAnswerDomain — the exact Flags "Japan" scenario', () => {
  const domain = buildCountryAnswerDomain('Japan')

  it('Japan -> correct', () => {
    expect(classifyTypeAnswer('Japan', domain)).toEqual({ kind: 'correct' })
  })
  it('Jpan -> did you mean Japan', () => {
    expect(classifyTypeAnswer('Jpan', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Japan' })
  })
  it('China (a real country, wrong for this question) -> valid-incorrect', () => {
    expect(classifyTypeAnswer('China', domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('Birmingham -> invalid-domain', () => {
    expect(classifyTypeAnswer('Birmingham', domain)).toEqual({ kind: 'invalid-domain' })
  })
  it('label is "country name"', () => {
    expect(domain.label).toBe('country name')
  })
  it('THE INFORMATION-LEAK FIX: a typo of a country that is WRONG for this question still gets a suggestion (Chnia -> China), identically shaped to a typo of the correct answer', () => {
    // "Chnia" is nowhere near "Japan" (the correct answer) but IS a typo
    // of "China" (a different real country) — before this fix, receiving
    // no suggestion here (vs. one for "Jpan") would leak "Jpan was close to
    // correct, Chnia wasn't".
    const correctTypo = classifyTypeAnswer('Jpan', domain)
    const wrongTypo = classifyTypeAnswer('Chnia', domain)
    expect(correctTypo).toEqual({ kind: 'did-you-mean', suggestion: 'Japan' })
    expect(wrongTypo).toEqual({ kind: 'did-you-mean', suggestion: 'China' })
  })
  it('accepting the wrong-but-suggested country (China) is a genuine incorrect submission, not auto-correct', () => {
    const suggestion = (classifyTypeAnswer('Chnia', domain) as { suggestion: string }).suggestion
    expect(classifyTypeAnswer(suggestion, domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it.each([
    ['Chnia', 'China'],
    ['Frnace', 'France'],
    ['Germnay', 'Germany'],
    ['Argentnia', 'Argentina'],
  ])('domain-wide: %s -> %s, regardless of which country is actually correct here (Japan)', (typo, expected) => {
    expect(classifyTypeAnswer(typo, domain)).toEqual({ kind: 'did-you-mean', suggestion: expected })
  })
})

describe('buildCountryAnswerDomain — dataset-wide invariant', () => {
  it('every one of the 200 canonical countries is recognized as a valid domain value for a DIFFERENT country\'s question', () => {
    const domain = buildCountryAnswerDomain('Japan')
    const failures: string[] = []
    for (const country of COUNTRIES) {
      if (country.name === 'Japan') continue
      const result = classifyTypeAnswer(country.name, domain)
      if (result.kind !== 'valid-incorrect') failures.push(`${country.id}: ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('every one of the 200 canonical countries is correctly classified for its OWN question', () => {
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const domain = buildCountryAnswerDomain(country.name)
      const result = classifyTypeAnswer(country.name, domain)
      if (result.kind !== 'correct') failures.push(`${country.id}: ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})
