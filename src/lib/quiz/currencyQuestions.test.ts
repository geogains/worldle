import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { currencyOf, eligibleCurrencyCountries, isUniqueCurrency } from './currencies'
import { createCurrencyQuestion, generateCurrencyQuestions, type CurrencyQuestion } from './currencyQuestions'
import { isAcceptedCurrencyCode, isAcceptedForAnyCurrency } from './currencyAliases'
import type { AnswerStyle } from './types'
import type { RandomSource } from './random'
import { normalizeCountryName } from '../text/normalize'

/** Forces createCurrencyQuestion() to pick `targetId` by excluding every other eligible country in the pool from the candidate set — same deterministic-force technique used throughout languageQuestions.test.ts. */
function forQuestion(pool: 'familiar' | 'explorer' | 'world-expert', answerStyle: AnswerStyle, targetId: string, random: RandomSource): CurrencyQuestion {
  const avoidIds = eligibleCurrencyCountries(pool)
    .map((c) => c.id)
    .filter((id) => id !== targetId)
  return createCurrencyQuestion(pool, answerStyle, avoidIds, random)
}

describe('Easy (familiar) — forward, country -> currency name', () => {
  it('Multiple Choice: exactly 4 options, exactly 1 correct, prompt names the country', () => {
    const q = forQuestion('familiar', 'multiple-choice', 'japan', Math.random)
    expect(q.kind).toBe('forward')
    expect(q.prompt).toBe('What is the currency of Japan?')
    expect(q.choices).toHaveLength(4)
    expect(new Set(q.choices!.map((c) => c.label)).size).toBe(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('Japanese Yen')
  })

  it('Type Answer: prompt, canonical answer, and country-scoped shorthand are all correct', () => {
    const q = forQuestion('familiar', 'type-answer', 'japan', Math.random)
    expect(q.kind).toBe('forward')
    expect(q.prompt).toBe('Name the currency of Japan')
    expect(q.acceptedCanonical).toEqual(['Japanese Yen', 'Yen'])
    expect(q.revealAnswer).toBe('Japanese Yen')
    expect(isAcceptedForAnyCurrency('Japanese Yen', q.acceptedCanonical!)).toBe(true)
    expect(isAcceptedForAnyCurrency('Yen', q.acceptedCanonical!)).toBe(true)
    expect(isAcceptedForAnyCurrency('Won', q.acceptedCanonical!)).toBe(false)
  })

  it('forward questions always carry the correct `country` for flag display', () => {
    const q = forQuestion('familiar', 'multiple-choice', 'japan', Math.random)
    expect(q.country.id).toBe('japan')
  })
})

describe('Medium (explorer) — reverse for unique currencies', () => {
  it('Multiple Choice: unique currency reverses to currency -> country, no flag-relevant data leaks the country as `kind`', () => {
    // Poland's złoty is unique in-dataset — safe for a reverse question.
    expect(isUniqueCurrency(currencyOf(findCountryById('poland')!)!.code, 'poland')).toBe(true)
    const q = forQuestion('explorer', 'multiple-choice', 'poland', Math.random)
    expect(q.kind).toBe('reverse')
    expect(q.prompt).toBe('Which country uses the Polish Złoty?')
    expect(q.choices).toHaveLength(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('Poland')
  })

  it('Type Answer: accepts the country name via plain normalization', () => {
    const q = forQuestion('explorer', 'type-answer', 'poland', Math.random)
    expect(q.kind).toBe('reverse')
    expect(q.acceptedCanonical).toEqual(['Poland'])
    expect(normalizeCountryName('poland')).toBe(normalizeCountryName(q.acceptedCanonical![0]!))
  })

  it('never generates a reverse question for a shared-currency country', () => {
    // Only countries that are actually Explorer-pool members (Medium always
    // draws from Explorer) — Dominica/England/Liechtenstein/Palestine are
    // World-Expert-only in this dataset's pools, so they're covered by the
    // "shared code across all three difficulties" invariant test below
    // instead, not this Medium-specific one.
    for (const id of ['senegal', 'france', 'united-states', 'cameroon', 'australia', 'switzerland', 'israel', 'united-kingdom']) {
      const q = forQuestion('explorer', 'multiple-choice', id, Math.random)
      expect(q.kind, id).not.toBe('reverse')
    }
  })
})

describe('Medium (explorer) — forward fallback for shared currencies', () => {
  it('Multiple Choice: shared-currency country falls back to forward (country -> currency), flag shown', () => {
    const q = forQuestion('explorer', 'multiple-choice', 'senegal', Math.random)
    expect(q.kind).toBe('forward')
    expect(q.prompt).toBe('What currency does Senegal use?')
    expect(q.choices).toHaveLength(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('West African CFA Franc')
  })

  it('Type Answer: same fallback, canonical + shorthand accepted', () => {
    const q = forQuestion('explorer', 'type-answer', 'senegal', Math.random)
    expect(q.kind).toBe('forward')
    expect(q.acceptedCanonical).toEqual(['West African CFA Franc', 'Franc'])
  })

  it('every one of the 66 shared-currency countries produces a forward fallback (never reverse) at Medium', () => {
    for (const country of eligibleCurrencyCountries('explorer')) {
      const currency = currencyOf(country)!
      if (isUniqueCurrency(currency.code, country.id)) continue
      const q = forQuestion('explorer', 'multiple-choice', country.id, Math.random)
      expect(q.kind, country.id).toBe('forward')
    }
  })
})

describe('Expert (world-expert) — ISO currency codes', () => {
  it('Form A (code-forward) Multiple Choice: country -> code, exactly 4 code options', () => {
    // random=0 always resolves pick(['code-forward','code-reverse']) to the first form.
    const q = forQuestion('world-expert', 'multiple-choice', 'switzerland', () => 0)
    expect(q.kind).toBe('code-forward')
    expect(q.prompt).toBe("What is Switzerland's currency code?")
    expect(q.choices).toHaveLength(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('CHF')
  })

  it('Form A Type Answer: exact case-insensitive code match, no fuzzy matching', () => {
    const q = forQuestion('world-expert', 'type-answer', 'switzerland', () => 0)
    expect(q.kind).toBe('code-forward')
    expect(q.prompt).toBe('Enter the currency code for Switzerland')
    expect(q.acceptedCanonical).toEqual(['CHF'])
    expect(isAcceptedCurrencyCode('chf', q.acceptedCanonical![0]!)).toBe(true)
    expect(isAcceptedCurrencyCode('SEK', q.acceptedCanonical![0]!)).toBe(false)
  })

  it('Form B (code-reverse) Multiple Choice: code -> currency name, exactly 4 name options', () => {
    // random=0.99 resolves pick() to the second form (code-reverse) — see random.ts's pick(): Math.floor(0.99 * 2) = 1.
    const q = forQuestion('world-expert', 'multiple-choice', 'switzerland', () => 0.99)
    expect(q.kind).toBe('code-reverse')
    expect(q.prompt).toBe('Which currency does CHF represent?')
    expect(q.choices).toHaveLength(4)
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
    expect(correct?.label).toBe('Swiss Franc')
  })

  it('Form B Type Answer: currency-name aliases apply', () => {
    const q = forQuestion('world-expert', 'type-answer', 'switzerland', () => 0.99)
    expect(q.kind).toBe('code-reverse')
    expect(q.acceptedCanonical).toEqual(['Swiss Franc', 'Franc'])
  })

  it.each(['france', 'united-states', 'senegal', 'cameroon', 'dominica', 'australia', 'united-kingdom', 'liechtenstein', 'israel'])(
    'Form B works for %s even though its currency/code is shared by multiple countries — the code always maps to exactly one currency',
    (id) => {
      const q = forQuestion('world-expert', 'multiple-choice', id, () => 0.99)
      expect(q.kind).toBe('code-reverse')
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices!.map((c) => c.label)).size).toBe(4)
      const correct = q.choices!.find((c) => c.id === q.correctChoiceId)
      expect(correct?.label).toBe(currencyOf(findCountryById(id)!)!.name)
    },
  )

  it('both Expert forms are reachable from the same seeded random source (deterministic form selection, not excluded)', () => {
    const kinds = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const random = () => (i + 0.5) / 10
      const q = forQuestion('world-expert', 'multiple-choice', 'switzerland', random)
      kinds.add(q.kind)
    }
    expect(kinds.has('code-forward')).toBe(true)
    expect(kinds.has('code-reverse')).toBe(true)
  })
})

describe('Flag-relevant kind classification', () => {
  it('forward and code-forward kinds explicitly name the country (flag-eligible)', () => {
    expect(forQuestion('familiar', 'multiple-choice', 'japan', Math.random).kind).toBe('forward')
    expect(forQuestion('world-expert', 'multiple-choice', 'switzerland', () => 0).kind).toBe('code-forward')
  })
  it('reverse and code-reverse kinds have the country/currency as the answer (no flag)', () => {
    expect(forQuestion('explorer', 'multiple-choice', 'poland', Math.random).kind).toBe('reverse')
    expect(forQuestion('world-expert', 'multiple-choice', 'switzerland', () => 0.99).kind).toBe('code-reverse')
  })
})

describe('generateCurrencyQuestions', () => {
  it('produces the requested number of questions, each excluding the immediately-preceding country', () => {
    const questions = generateCurrencyQuestions({ countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 }, Math.random)
    expect(questions).toHaveLength(5)
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i]!.country.id).not.toBe(questions[i - 1]!.country.id)
    }
  })
})

describe('Determinism', () => {
  it('the same seed/config produces the exact same question', () => {
    const random = () => 0.37
    const a = createCurrencyQuestion('explorer', 'multiple-choice', [], random)
    const b = createCurrencyQuestion('explorer', 'multiple-choice', [], random)
    expect(a).toEqual(b)
  })
})

describe('Dataset-wide invariant: every Multiple Choice question has exactly 4 unique options and exactly 1 correct answer', () => {
  const POOLS = ['familiar', 'explorer', 'world-expert'] as const

  for (const pool of POOLS) {
    it(`[${pool}] holds for every eligible country in this pool`, () => {
      const countries = eligibleCurrencyCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      const failures: string[] = []
      for (const country of countries) {
        for (const random of [Math.random, () => 0, () => 0.99] as const) {
          const q = forQuestion(pool, 'multiple-choice', country.id, random)
          if (!q.choices || q.choices.length !== 4) {
            failures.push(`${country.id} [${pool}]: expected 4 options, got ${q.choices?.length ?? 0}`)
            continue
          }
          const labels = q.choices.map((c) => c.label)
          if (new Set(labels).size !== 4) {
            failures.push(`${country.id} [${pool}]: duplicate option labels — ${JSON.stringify(labels)}`)
          }
          if (!q.correctChoiceId || !q.choices.some((c) => c.id === q.correctChoiceId)) {
            failures.push(`${country.id} [${pool}]: correctChoiceId does not match any rendered option`)
          }
        }
      }
      expect(failures, failures.join('\n')).toHaveLength(0)
    })
  }

  it('holds specifically for every shared-currency group (EUR, XOF, USD, XAF, XCD, AUD, GBP, CHF, ILS), tested at every difficulty each member country is actually eligible for', () => {
    const sharedCurrencyCountryIds = [
      'france', 'germany', // EUR
      'senegal', 'mali', // XOF
      'united-states', 'ecuador', // USD
      'cameroon', 'chad', // XAF
      'dominica', 'grenada', // XCD
      'australia', 'kiribati', // AUD
      'united-kingdom', 'england', // GBP
      'switzerland', 'liechtenstein', // CHF
      'israel', 'palestine', // ILS
    ]
    const failures: string[] = []
    for (const id of sharedCurrencyCountryIds) {
      for (const pool of POOLS) {
        // Skip a (pool, country) pair the country isn't actually eligible
        // for (e.g. Dominica/England/Liechtenstein/Palestine are World-
        // Expert-only in this dataset's pools) — createCurrencyQuestion()
        // would otherwise silently fall back to a different country, which
        // would test the invariant but not actually exercise this `id`.
        if (!eligibleCurrencyCountries(pool).some((c) => c.id === id)) continue
        for (const random of [() => 0, () => 0.5, () => 0.99] as const) {
          const q = forQuestion(pool, 'multiple-choice', id, random)
          if (q.country.id !== id) {
            failures.push(`${id} [${pool}]: forQuestion resolved to a different country (${q.country.id})`)
            continue
          }
          if (!q.choices || q.choices.length !== 4 || new Set(q.choices.map((c) => c.label)).size !== 4) {
            failures.push(`${id} [${pool}]: ${JSON.stringify(q.choices?.map((c) => c.label))}`)
          }
        }
      }
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('holds with a variety of fixed random sources too, not just Math.random (world-expert pool)', () => {
    const failures: string[] = []
    for (const random of [() => 0, () => 0.25, () => 0.5, () => 0.75, () => 0.999]) {
      for (const country of eligibleCurrencyCountries('world-expert')) {
        const q = forQuestion('world-expert', 'multiple-choice', country.id, random)
        if (!q.choices || q.choices.length !== 4 || new Set(q.choices.map((c) => c.label)).size !== 4) {
          failures.push(`${country.id} @ random=${random()}`)
        }
      }
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})
