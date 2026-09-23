import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../data/countries'
import { classifyTypeAnswer } from './answerValidation'
import { buildLanguageAnswerDomain, isAcceptedForAny, isAcceptedLanguageAnswer } from './languageAliases'
import { languagesOf } from './languages'

describe('isAcceptedLanguageAnswer: exact and normalized matches', () => {
  it('accepts the exact canonical string', () => {
    expect(isAcceptedLanguageAnswer('Hausa', 'Hausa')).toBe(true)
  })
  it('is case-insensitive', () => {
    expect(isAcceptedLanguageAnswer('hausa', 'Hausa')).toBe(true)
    expect(isAcceptedLanguageAnswer('HAUSA', 'Hausa')).toBe(true)
  })
  it('trims surrounding whitespace', () => {
    expect(isAcceptedLanguageAnswer('  Hausa  ', 'Hausa')).toBe(true)
  })
  it('strips diacritics (Baoulé / Baoule)', () => {
    expect(isAcceptedLanguageAnswer('Baoule', 'Baoulé')).toBe(true)
    expect(isAcceptedLanguageAnswer('baoule', 'Baoulé')).toBe(true)
  })
  it('rejects an unrelated language', () => {
    expect(isAcceptedLanguageAnswer('Zulu', 'Hausa')).toBe(false)
  })
})

describe('explicit alias list', () => {
  it('Swahili / Kiswahili', () => {
    expect(isAcceptedLanguageAnswer('Kiswahili', 'Swahili')).toBe(true)
    expect(isAcceptedLanguageAnswer('kiswahili', 'Swahili')).toBe(true)
  })
  it('isiZulu / Zulu (case normalization)', () => {
    expect(isAcceptedLanguageAnswer('Zulu', 'isiZulu')).toBe(true)
    expect(isAcceptedLanguageAnswer('Isizulu', 'isiZulu')).toBe(true)
    expect(isAcceptedLanguageAnswer('isizulu', 'isiZulu')).toBe(true)
  })
  it('isiXhosa / Xhosa', () => {
    expect(isAcceptedLanguageAnswer('Xhosa', 'isiXhosa')).toBe(true)
  })
  it('Bangla / Bengali', () => {
    expect(isAcceptedLanguageAnswer('Bengali', 'Bangla')).toBe(true)
  })
  it('Persian / Farsi', () => {
    expect(isAcceptedLanguageAnswer('Farsi', 'Persian')).toBe(true)
  })
  it('Filipino / Tagalog', () => {
    expect(isAcceptedLanguageAnswer('Tagalog', 'Filipino')).toBe(true)
  })
  it('sign-language abbreviations', () => {
    expect(isAcceptedLanguageAnswer('SASL', 'South African Sign Language')).toBe(true)
    expect(isAcceptedLanguageAnswer('NZSL', 'New Zealand Sign Language')).toBe(true)
    expect(isAcceptedLanguageAnswer('PNG Sign Language', 'Papua New Guinean Sign Language')).toBe(true)
    expect(isAcceptedLanguageAnswer('Papua New Guinea Sign Language', 'Papua New Guinean Sign Language')).toBe(true)
  })
  it('does not leak an alias onto an unrelated canonical value', () => {
    expect(isAcceptedLanguageAnswer('Kiswahili', 'Hausa')).toBe(false)
    expect(isAcceptedLanguageAnswer('Tagalog', 'Swahili')).toBe(false)
  })
})

describe('slash-separated canonical values', () => {
  it('Hoklo/Taiwanese accepts either side', () => {
    expect(isAcceptedLanguageAnswer('Hoklo', 'Hoklo/Taiwanese')).toBe(true)
    expect(isAcceptedLanguageAnswer('Taiwanese', 'Hoklo/Taiwanese')).toBe(true)
  })
  it('Hoklo/Taiwanese also accepts the full slash-joined string', () => {
    expect(isAcceptedLanguageAnswer('Hoklo/Taiwanese', 'Hoklo/Taiwanese')).toBe(true)
  })
  it('Bisaya/Binisaya accepts either side', () => {
    expect(isAcceptedLanguageAnswer('Bisaya', 'Bisaya/Binisaya')).toBe(true)
    expect(isAcceptedLanguageAnswer('Binisaya', 'Bisaya/Binisaya')).toBe(true)
  })
  it('does not accept an unrelated word for a slash-separated value', () => {
    expect(isAcceptedLanguageAnswer('Mandarin', 'Bisaya/Binisaya')).toBe(false)
  })
})

describe('parenthetical canonical values', () => {
  it('Standard Chinese (Putonghua) accepts the part before, the part inside, and Mandarin (explicit alias)', () => {
    expect(isAcceptedLanguageAnswer('Standard Chinese', 'Standard Chinese (Putonghua)')).toBe(true)
    expect(isAcceptedLanguageAnswer('Putonghua', 'Standard Chinese (Putonghua)')).toBe(true)
    expect(isAcceptedLanguageAnswer('Mandarin', 'Standard Chinese (Putonghua)')).toBe(true)
    expect(isAcceptedLanguageAnswer('Chinese', 'Standard Chinese (Putonghua)')).toBe(true)
  })
  it('Comorian (Shikomor) accepts either part', () => {
    expect(isAcceptedLanguageAnswer('Comorian', 'Comorian (Shikomor)')).toBe(true)
    expect(isAcceptedLanguageAnswer('Shikomor', 'Comorian (Shikomor)')).toBe(true)
  })
})

describe('isAcceptedForAny', () => {
  it('accepts a match against any option in the list', () => {
    expect(isAcceptedForAny('Hausa', ['English', 'Hausa', 'Yoruba', 'Igbo'])).toBe(true)
    expect(isAcceptedForAny('Kiswahili', ['Swahili', 'English', 'Kikuyu'])).toBe(true)
  })
  it('rejects a language not present in the option list, even if it is a real language elsewhere', () => {
    expect(isAcceptedForAny('Zulu', ['English', 'Hausa', 'Yoruba', 'Igbo'])).toBe(false)
  })
  it('rejects when the option list is empty', () => {
    expect(isAcceptedForAny('English', [])).toBe(false)
  })
})

describe('buildLanguageAnswerDomain — the exact Brazil "Portuguese" scenario', () => {
  const domain = buildLanguageAnswerDomain(['Portuguese'])

  it('Portuguese -> correct', () => {
    expect(classifyTypeAnswer('Portuguese', domain)).toEqual({ kind: 'correct' })
  })
  it('Portugese -> did you mean Portuguese', () => {
    expect(classifyTypeAnswer('Portugese', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Portuguese' })
  })
  it('Spanish (a real language, wrong for this question) -> valid-incorrect', () => {
    expect(classifyTypeAnswer('Spanish', domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('Birmingham -> invalid-domain', () => {
    expect(classifyTypeAnswer('Birmingham', domain)).toEqual({ kind: 'invalid-domain' })
  })
  it('label is "language"', () => {
    expect(domain.label).toBe('language')
  })
  it('THE INFORMATION-LEAK FIX: a typo of a language that is WRONG for this question still gets a suggestion (Spanihs -> Spanish), identically shaped to a typo of the correct answer', () => {
    const correctTypo = classifyTypeAnswer('Portugese', domain)
    const wrongTypo = classifyTypeAnswer('Spanihs', domain)
    expect(correctTypo).toEqual({ kind: 'did-you-mean', suggestion: 'Portuguese' })
    expect(wrongTypo).toEqual({ kind: 'did-you-mean', suggestion: 'Spanish' })
  })
  it('accepting the wrong-but-suggested language (Spanish) is a genuine incorrect submission, not auto-correct', () => {
    const suggestion = (classifyTypeAnswer('Spanihs', domain) as { suggestion: string }).suggestion
    expect(classifyTypeAnswer(suggestion, domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it.each([
    ['Spanihs', 'Spanish'],
    ['Englih', 'English'],
  ])('domain-wide: %s -> %s, regardless of which language is actually accepted here (Portuguese)', (typo, expected) => {
    expect(classifyTypeAnswer(typo, domain)).toEqual({ kind: 'did-you-mean', suggestion: expected })
  })
})

describe('buildLanguageAnswerDomain — multiple accepted answers (a real multi-language country)', () => {
  const belgium = COUNTRIES.find((c) => c.id === 'belgium')!
  const belgiumLanguages = [...languagesOf(belgium)] // ['Dutch', 'French']

  it('Belgium has at least 2 accepted languages for this test to be meaningful', () => {
    expect(belgiumLanguages.length).toBeGreaterThanOrEqual(2)
  })

  it('a typo of the SECOND accepted language still suggests that specific one, not the first', () => {
    const domain = buildLanguageAnswerDomain(belgiumLanguages)
    const second = belgiumLanguages[1]!
    const typo = second.slice(0, -1) // drop the last letter — a safe 1-edit typo
    const result = classifyTypeAnswer(typo, domain)
    expect(result).toEqual({ kind: 'did-you-mean', suggestion: second })
  })

  it('either accepted language submits correct', () => {
    const domain = buildLanguageAnswerDomain(belgiumLanguages)
    for (const language of belgiumLanguages) {
      expect(classifyTypeAnswer(language, domain)).toEqual({ kind: 'correct' })
    }
  })
})

describe('buildLanguageAnswerDomain — dataset-wide invariant', () => {
  it('every principal language across the dataset is recognized as a valid domain value for a country that does NOT have it', () => {
    const domain = buildLanguageAnswerDomain(['Portuguese'])
    const failures: string[] = []
    for (const country of COUNTRIES) {
      for (const language of languagesOf(country)) {
        if (language === 'Portuguese') continue
        const result = classifyTypeAnswer(language, domain)
        if (result.kind !== 'valid-incorrect') failures.push(`${country.id} (${language}): ${JSON.stringify(result)}`)
      }
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('every country correctly classifies each of its own languages as correct', () => {
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const languages = [...languagesOf(country)]
      if (languages.length === 0) continue
      const domain = buildLanguageAnswerDomain(languages)
      for (const language of languages) {
        const result = classifyTypeAnswer(language, domain)
        if (result.kind !== 'correct') failures.push(`${country.id} (${language}): ${JSON.stringify(result)}`)
      }
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})
