import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../data/countries'
import { classifyTypeAnswer } from './answerValidation'
import {
  buildCurrencyAnswerDomain,
  buildCurrencyCodeAnswerDomain,
  currencyTypeShorthand,
  isAcceptedCurrencyAnswer,
  isAcceptedCurrencyCode,
  isAcceptedForAnyCurrency,
} from './currencyAliases'
import { currencyOf } from './currencies'

describe('isAcceptedCurrencyAnswer', () => {
  it('accepts the exact canonical name', () => {
    expect(isAcceptedCurrencyAnswer('Japanese Yen', 'Japanese Yen')).toBe(true)
  })

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(isAcceptedCurrencyAnswer('  japanese yen  ', 'Japanese Yen')).toBe(true)
  })

  it('rejects an unrelated currency name', () => {
    expect(isAcceptedCurrencyAnswer('South Korean Won', 'Japanese Yen')).toBe(false)
  })

  it.each([
    ['United States Dollar', 'US Dollar'],
    ['United States Dollar', 'USD'],
    ['Pound Sterling', 'British Pound'],
    ['Pound Sterling', 'Sterling'],
    ['Renminbi', 'Yuan'],
    ['Renminbi', 'Chinese Yuan'],
    ['Renminbi', 'RMB'],
    ['Czech Koruna', 'Czech Crown'],
    ['Russian Ruble', 'Russian Rouble'],
    ['Belarusian Ruble', 'Belarusian Rouble'],
    ['United Arab Emirates Dirham', 'UAE Dirham'],
    ['United Arab Emirates Dirham', 'Emirati Dirham'],
    ['Israeli New Shekel', 'New Israeli Shekel'],
    ['Israeli New Shekel', 'NIS'],
  ])('explicit alias: %s accepts %s', (canonical, alias) => {
    expect(isAcceptedCurrencyAnswer(alias, canonical)).toBe(true)
  })

  it.each([
    ['Costa Rican Colón', 'Costa Rican Colon'],
    ['Paraguayan Guaraní', 'Paraguayan Guarani'],
    ['Nicaraguan Córdoba', 'Nicaraguan Cordoba'],
    ['Icelandic Króna', 'Icelandic Krona'],
    ['Mongolian Tögrög', 'Mongolian Togrog'],
    ['Venezuelan Bolívar', 'Venezuelan Bolivar'],
    ['Tongan Paʻanga', 'Tongan Paanga'],
  ])('diacritic-insensitive automatically (no explicit alias needed): %s accepts %s', (canonical, asciiForm) => {
    expect(isAcceptedCurrencyAnswer(asciiForm, canonical)).toBe(true)
  })

  it.each([
    ['Polish Złoty', 'Zloty'],
    ['Vietnamese Đồng', 'Dong'],
  ])('explicit ASCII alias for a non-decomposable special letter: %s accepts %s', (canonical, asciiAlias) => {
    expect(isAcceptedCurrencyAnswer(asciiAlias, canonical)).toBe(true)
  })

  it('still accepts the exact accented shorthand form for Złoty/Đồng, the way buildForward actually assembles acceptedCanonical (full name + shorthand, each checked independently)', () => {
    expect(isAcceptedForAnyCurrency('Złoty', ['Polish Złoty', currencyTypeShorthand('Polish Złoty')!])).toBe(true)
    expect(isAcceptedForAnyCurrency('Đồng', ['Vietnamese Đồng', currencyTypeShorthand('Vietnamese Đồng')!])).toBe(true)
  })

  it('does not cross-accept between similarly-spelled but genuinely different currencies (Rial vs Riyal)', () => {
    expect(isAcceptedCurrencyAnswer('Saudi Rial', 'Saudi Riyal')).toBe(false)
    expect(isAcceptedCurrencyAnswer('Iranian Riyal', 'Iranian Rial')).toBe(false)
  })
})

describe('isAcceptedForAnyCurrency', () => {
  it('true if input matches any option in the list', () => {
    expect(isAcceptedForAnyCurrency('Yen', ['Japanese Yen', 'Yen'])).toBe(true)
  })
  it('false if input matches none', () => {
    expect(isAcceptedForAnyCurrency('Won', ['Japanese Yen', 'Yen'])).toBe(false)
  })
})

describe('currencyTypeShorthand (country-scoped, mechanical last-word derivation)', () => {
  it.each([
    ['Japanese Yen', 'Yen'],
    ['Nigerian Naira', 'Naira'],
    ['Polish Złoty', 'Złoty'],
    ['Swiss Franc', 'Franc'],
    ['West African CFA Franc', 'Franc'],
    ['Central African CFA Franc', 'Franc'],
    ['East Caribbean Dollar', 'Dollar'],
    ['Trinidad and Tobago Dollar', 'Dollar'],
    ['United Arab Emirates Dirham', 'Dirham'],
    ['Bosnia and Herzegovina Convertible Mark', 'Mark'],
    ['São Tomé and Príncipe Dobra', 'Dobra'],
    ['Israeli New Shekel', 'Shekel'],
  ])('%s -> %s', (canonical, expected) => {
    expect(currencyTypeShorthand(canonical)).toBe(expected)
  })

  it('single-word canonical names have no shorthand (already the shortest form)', () => {
    expect(currencyTypeShorthand('Euro')).toBeNull()
    expect(currencyTypeShorthand('Renminbi')).toBeNull()
  })

  it('"Zimbabwe Gold" is explicitly excluded ("Gold" is not a genuine currency-type noun)', () => {
    expect(currencyTypeShorthand('Zimbabwe Gold')).toBeNull()
  })

  it('never produces a global cross-currency ambiguity problem because it is only ever used scoped to one question (not exported as a lookup table)', () => {
    // "Franc" is the shorthand for many different, unrelated currencies —
    // this is fine BECAUSE each is only ever checked against its own
    // question's acceptedCanonical array, never against a shared map.
    expect(currencyTypeShorthand('Swiss Franc')).toBe('Franc')
    expect(currencyTypeShorthand('West African CFA Franc')).toBe('Franc')
    expect(currencyTypeShorthand('Guinean Franc')).toBe('Franc')
  })
})

describe('isAcceptedCurrencyCode', () => {
  it('accepts the exact code', () => {
    expect(isAcceptedCurrencyCode('CHF', 'CHF')).toBe(true)
  })
  it('is case-insensitive', () => {
    expect(isAcceptedCurrencyCode('chf', 'CHF')).toBe(true)
    expect(isAcceptedCurrencyCode('Chf', 'CHF')).toBe(true)
  })
  it('tolerates surrounding whitespace', () => {
    expect(isAcceptedCurrencyCode('  chf  ', 'CHF')).toBe(true)
  })
  it('rejects a different code, even a plausible-looking one', () => {
    expect(isAcceptedCurrencyCode('CHE', 'CHF')).toBe(false)
    expect(isAcceptedCurrencyCode('SEK', 'CHF')).toBe(false)
  })
  it('does not fuzzy/approximate-match', () => {
    expect(isAcceptedCurrencyCode('CH', 'CHF')).toBe(false)
    expect(isAcceptedCurrencyCode('CHFF', 'CHF')).toBe(false)
  })
})

describe('buildCurrencyAnswerDomain — THE Denmark "Krona" regression case (the real manual-QA scenario this feature was built for)', () => {
  // Mirrors exactly what currencyQuestions.ts's buildForward() constructs
  // for a Denmark Easy/Medium-fallback question: canonical name + the
  // country-scoped shorthand ("Krone").
  const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])

  it('Danish Krone -> correct', () => {
    expect(classifyTypeAnswer('Danish Krone', domain)).toEqual({ kind: 'correct' })
  })
  it('Krone (the accepted contextual shorthand) -> correct', () => {
    expect(classifyTypeAnswer('Krone', domain)).toEqual({ kind: 'correct' })
  })
  it('Krona -> DID YOU MEAN Krone (not silently accepted, not "valid but incorrect")', () => {
    const result = classifyTypeAnswer('Krona', domain)
    expect(result.kind).toBe('did-you-mean')
    expect(result).toEqual({ kind: 'did-you-mean', suggestion: 'Krone' })
  })
  it('accepting the suggestion ("Krone") then classifies as correct', () => {
    const suggestion = (classifyTypeAnswer('Krona', domain) as { suggestion: string }).suggestion
    expect(classifyTypeAnswer(suggestion, domain)).toEqual({ kind: 'correct' })
  })
  it('Euro (a real currency, wrong for Denmark) -> valid-incorrect, no suggestion', () => {
    expect(classifyTypeAnswer('Euro', domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('Bitcoin -> invalid-domain', () => {
    expect(classifyTypeAnswer('Bitcoin', domain)).toEqual({ kind: 'invalid-domain' })
  })
  it('label is "currency"', () => {
    expect(domain.label).toBe('currency')
  })
})

describe('buildCurrencyAnswerDomain — THE information-leak fix, proven for Denmark specifically (section 24)', () => {
  // Denmark's own accepted shorthand ("Krone") correctly produces a
  // suggestion via the narrow step-3b fallback (tested above). This proves
  // the OTHER half: a typo of a DIFFERENT, WRONG-for-Denmark currency
  // ("Euor" -> "Euro") must ALSO produce a suggestion, with the identical
  // shape, and accepting it must be a genuine incorrect submission — not
  // silently rescued, and not visually/behaviorally distinguishable from
  // the Krona/Krone case before acceptance.
  const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])

  it('Euor -> did you mean Euro (domain-wide match, not scoped to Denmark\'s own accepted answers)', () => {
    expect(classifyTypeAnswer('Euor', domain)).toEqual({ kind: 'did-you-mean', suggestion: 'Euro' })
  })
  it('accepting "Euro" is a genuine incorrect submission for Denmark, revealing Danish Krone', () => {
    const suggestion = (classifyTypeAnswer('Euor', domain) as { suggestion: string }).suggestion
    expect(classifyTypeAnswer(suggestion, domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('"Krona"->"Krone" (correct) and "Euor"->"Euro" (wrong) are identically shaped before acceptance', () => {
    const correctTypo = classifyTypeAnswer('Krona', domain)
    const wrongTypo = classifyTypeAnswer('Euor', domain)
    expect(correctTypo.kind).toBe('did-you-mean')
    expect(wrongTypo.kind).toBe('did-you-mean')
    expect(Object.keys(correctTypo).sort()).toEqual(Object.keys(wrongTypo).sort())
  })
})

describe('buildCurrencyAnswerDomain — domain-wide typo examples named in the spec (section 8)', () => {
  const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone']) // an unrelated (Denmark) question in every case
  it.each([
    ['Yenn', 'Yen'],
    ['Narria', 'Naira'],
    ['Euor', 'Euro'],
    ['Zlotty', 'Zloty'], // resolves to the closest recognized display form (the ASCII alias) — see section 18
  ])('%s -> %s, regardless of which currency is actually correct here (Danish Krone)', (typo, expected) => {
    expect(classifyTypeAnswer(typo, domain)).toEqual({ kind: 'did-you-mean', suggestion: expected })
  })
})

describe('buildCurrencyAnswerDomain — why "Krona" works: AMBIGUOUS currency-type shorthand is scoped-only, never a domain-wide value; UNAMBIGUOUS shorthand is', () => {
  it('"Krona" and "Krone" are NOT themselves domain-wide values for an unrelated question (Krone is ambiguous: Denmark AND Norway both use it)', () => {
    const unrelatedDomain = buildCurrencyAnswerDomain(['Japanese Yen', 'Yen'])
    expect(classifyTypeAnswer('Krona', unrelatedDomain).kind).toBe('invalid-domain')
    expect(classifyTypeAnswer('Krone', unrelatedDomain).kind).toBe('invalid-domain')
  })
  it.each(['Dollar', 'Franc', 'Pound', 'Peso', 'Dinar', 'Rupee', 'Won'])(
    'ambiguous shorthand "%s" (shared by multiple different real currencies) is never a domain-wide value',
    (shorthand) => {
      const unrelatedDomain = buildCurrencyAnswerDomain(['Japanese Yen', 'Yen'])
      expect(classifyTypeAnswer(shorthand, unrelatedDomain).kind).not.toBe('valid-incorrect')
    },
  )
  it('but "Naira" (Nigeria\'s UNIQUE shorthand — no other currency ends in "Naira") IS a domain-wide value', () => {
    const unrelatedDomain = buildCurrencyAnswerDomain(['Japanese Yen', 'Yen'])
    expect(classifyTypeAnswer('Naira', unrelatedDomain)).toEqual({ kind: 'valid-incorrect' })
  })
})

describe('buildCurrencyAnswerDomain — contextual shorthand scenarios named in the spec', () => {
  it.each([
    ['Japan', ['Japanese Yen', 'Yen'], 'Yen'],
    ['Nigeria', ['Nigerian Naira', 'Naira'], 'Naira'],
    ['Poland', ['Polish Złoty', 'Złoty'], 'Złoty'],
    ['Switzerland', ['Swiss Franc', 'Franc'], 'Franc'],
  ])('%s: contextual shorthand "%s" is accepted as correct for that question only', (_country, accepted, shorthand) => {
    const domain = buildCurrencyAnswerDomain(accepted)
    expect(classifyTypeAnswer(shorthand, domain)).toEqual({ kind: 'correct' })
  })
})

describe('buildCurrencyAnswerDomain — dataset-wide invariant', () => {
  it('every canonical currency name is recognized as a valid domain value for a DIFFERENT currency\'s question', () => {
    const domain = buildCurrencyAnswerDomain(['Danish Krone', 'Krone'])
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const currency = currencyOf(country)
      if (!currency || currency.name === 'Danish Krone') continue
      const result = classifyTypeAnswer(currency.name, domain)
      if (result.kind !== 'valid-incorrect') failures.push(`${country.id} (${currency.name}): ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('every country correctly classifies its own canonical currency name as correct', () => {
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const currency = currencyOf(country)
      if (!currency) continue
      const domain = buildCurrencyAnswerDomain([currency.name])
      const result = classifyTypeAnswer(currency.name, domain)
      if (result.kind !== 'correct') failures.push(`${country.id} (${currency.name}): ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})

describe('buildCurrencyCodeAnswerDomain — the exact Switzerland "CHF" scenario', () => {
  const domain = buildCurrencyCodeAnswerDomain('CHF')

  it('CHF -> correct', () => {
    expect(classifyTypeAnswer('CHF', domain)).toEqual({ kind: 'correct' })
  })
  it('chf (lowercase) -> correct', () => {
    expect(classifyTypeAnswer('chf', domain)).toEqual({ kind: 'correct' })
  })
  it('EUR (a real code, wrong for Switzerland) -> valid-incorrect', () => {
    expect(classifyTypeAnswer('EUR', domain)).toEqual({ kind: 'valid-incorrect' })
  })
  it('ABC -> invalid-domain', () => {
    expect(classifyTypeAnswer('ABC', domain)).toEqual({ kind: 'invalid-domain' })
  })
  it('label is "currency code"', () => {
    expect(domain.label).toBe('currency code')
  })
  it('typoEnabled is false — Did You Mean is deliberately disabled for currency codes', () => {
    expect(domain.typoEnabled).toBe(false)
  })
  it('a close-but-wrong non-real code (e.g. "CHG", 1 edit from CHF) is invalid, never a suggestion — 3-letter codes are too short to safely typo-correct (XOF vs XAF is a real example of two different, both-valid codes 1 edit apart)', () => {
    expect(classifyTypeAnswer('CHG', domain)).toEqual({ kind: 'invalid-domain' })
  })
})

describe('buildCurrencyCodeAnswerDomain — dataset-wide invariant', () => {
  it('every canonical currency code is recognized as a valid domain value for a DIFFERENT code\'s question', () => {
    const domain = buildCurrencyCodeAnswerDomain('CHF')
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const currency = currencyOf(country)
      if (!currency || currency.code === 'CHF') continue
      const result = classifyTypeAnswer(currency.code, domain)
      if (result.kind !== 'valid-incorrect') failures.push(`${country.id} (${currency.code}): ${JSON.stringify(result)}`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('every country correctly classifies its own currency code as correct, case-insensitively', () => {
    const failures: string[] = []
    for (const country of COUNTRIES) {
      const currency = currencyOf(country)
      if (!currency) continue
      const domain = buildCurrencyCodeAnswerDomain(currency.code)
      if (classifyTypeAnswer(currency.code, domain).kind !== 'correct') failures.push(`${country.id} (${currency.code}) uppercase`)
      if (classifyTypeAnswer(currency.code.toLowerCase(), domain).kind !== 'correct') failures.push(`${country.id} (${currency.code}) lowercase`)
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})
