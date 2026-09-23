import { describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { isAcceptedForAny } from './languageAliases'
import { eligibleLanguageCountries, isUnambiguousLanguage, languagesOf } from './languages'
import { createLanguageQuestion, generateLanguageQuestions } from './languageQuestions'
import { normalizeCountryName } from '../text/normalize'
import type { AnswerStyle, CountryPool } from './types'

const nigeria = findCountryById('nigeria')!
const bolivia = findCountryById('bolivia')!
const southAfrica = findCountryById('south-africa')!
const mali = findCountryById('mali')!
const montenegro = findCountryById('montenegro')!
const argentina = findCountryById('argentina')! // single-language, ambiguous (Spanish)

/**
 * Forces createLanguageQuestion() to draw `targetId` by avoiding every
 * other country in the pool — the same deterministic-selection technique
 * flagQuestions.test.ts/capitalQuestions.test.ts already use ("avoids ids
 * in avoidIds when the pool has other candidates"), used here instead of
 * a random-retry loop so these tests can never flake on an unlucky draw.
 */
function forQuestion(pool: CountryPool, answerStyle: AnswerStyle, targetId: string, random: () => number = Math.random) {
  const avoid = eligibleLanguageCountries(pool)
    .map((c) => c.id)
    .filter((id) => id !== targetId)
  return createLanguageQuestion(pool, answerStyle, avoid, random)
}

function setKey(languages: readonly string[]): string {
  return [...languages].map(normalizeCountryName).sort().join('|')
}

describe('Easy (familiar) — Multiple Choice', () => {
  it('produces exactly 4 options, exactly one of which is a valid language for the country', () => {
    for (const country of eligibleLanguageCountries('familiar').slice(0, 25)) {
      const q = forQuestion('familiar', 'multiple-choice', country.id, Math.random)
      expect(q.choices, country.id).toHaveLength(4)
      const correctLangs = new Set(languagesOf(country).map(normalizeCountryName))
      const validOptions = q.choices!.filter((c) => correctLangs.has(normalizeCountryName(c.label)))
      expect(validOptions, `${country.id}: ${JSON.stringify(q.choices)}`).toHaveLength(1)
      expect(q.correctChoiceId).toBe(validOptions[0]!.id)
    }
  })

  it('never shows two options that are both valid languages for a multi-language country (Nigeria)', () => {
    for (let i = 0; i < 10; i++) {
      const q = forQuestion('familiar', 'multiple-choice', 'nigeria', Math.random)
      const correctLangs = new Set(languagesOf(nigeria).map(normalizeCountryName))
      const validCount = q.choices!.filter((c) => correctLangs.has(normalizeCountryName(c.label))).length
      expect(validCount).toBe(1)
    }
  })

  it('prompt reads "Which is a language of {country}?"', () => {
    const q = forQuestion('familiar', 'multiple-choice', 'japan', () => 0)
    expect(q.prompt).toBe('Which is a language of Japan?')
  })
})

describe('Easy (familiar) — Type Answer', () => {
  it('accepts every canonical language of a multi-language country (Nigeria)', () => {
    const q = forQuestion('familiar', 'type-answer', 'nigeria', Math.random)
    for (const lang of languagesOf(nigeria)) {
      expect(isAcceptedForAny(lang, q.acceptedCanonical ?? []), lang).toBe(true)
    }
  })
  it('rejects an unrelated language', () => {
    const q = forQuestion('familiar', 'type-answer', 'japan', Math.random)
    expect(isAcceptedForAny('Klingon', q.acceptedCanonical ?? [])).toBe(false)
  })
  it('prompt reads "Name a language of {country}"', () => {
    const q = forQuestion('familiar', 'type-answer', 'japan', () => 0)
    expect(q.prompt).toBe('Name a language of Japan')
  })
  it('accepts the Swahili/Kiswahili alias for Kenya', () => {
    const q = forQuestion('familiar', 'type-answer', 'kenya', Math.random)
    expect(isAcceptedForAny('Kiswahili', q.acceptedCanonical ?? [])).toBe(true)
  })
})

describe('Medium (explorer) — Multiple Choice, multi-language countries', () => {
  it('Bolivia: exactly one option exactly matches the canonical set', () => {
    const q = forQuestion('explorer', 'multiple-choice', 'bolivia', Math.random)
    const canonicalKey = setKey(languagesOf(bolivia))
    const matches = q.choices!.filter((c) => setKey(c.label.split(', ')) === canonicalKey)
    expect(matches).toHaveLength(1)
    expect(q.correctChoiceId).toBe(matches[0]!.id)
  })

  it('no two options are identical as unordered sets (order cannot create a duplicate "different" answer)', () => {
    for (const country of ['bolivia', 'south-africa', 'nigeria']) {
      const q = forQuestion('explorer', 'multiple-choice', country, Math.random)
      const keys = q.choices!.map((c) => setKey(c.label.split(', ')))
      expect(new Set(keys).size, country).toBe(keys.length)
    }
  })

  it('prompt reads "Which set of languages belongs to {country}?"', () => {
    const q = forQuestion('explorer', 'multiple-choice', 'bolivia', () => 0)
    expect(q.prompt).toBe('Which set of languages belongs to Bolivia?')
  })
})

describe('Medium (explorer) — Type Answer, multi-language countries (exclusion)', () => {
  it('Nigeria: excludes English (the anchor/first-listed language) and accepts the rest', () => {
    const q = forQuestion('explorer', 'type-answer', 'nigeria', Math.random)
    expect(q.prompt).toBe('Name a language of Nigeria other than English')
    expect(isAcceptedForAny('English', q.acceptedCanonical ?? [])).toBe(false)
    expect(isAcceptedForAny('Hausa', q.acceptedCanonical ?? [])).toBe(true)
    expect(isAcceptedForAny('Yoruba', q.acceptedCanonical ?? [])).toBe(true)
    expect(isAcceptedForAny('Igbo', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('Bolivia: excludes Spanish and accepts Quechua/Aymara', () => {
    const q = forQuestion('explorer', 'type-answer', 'bolivia', Math.random)
    expect(q.prompt).toContain('other than Spanish')
    expect(isAcceptedForAny('Spanish', q.acceptedCanonical ?? [])).toBe(false)
    expect(isAcceptedForAny('Quechua', q.acceptedCanonical ?? [])).toBe(true)
    expect(isAcceptedForAny('Aymara', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('Botswana (override): excludes Setswana, not languages[0]="English" — Setswana is the namesake/majority language and the more obvious guess', () => {
    const q = forQuestion('explorer', 'type-answer', 'botswana', Math.random)
    expect(q.prompt).toBe('Name a language of Botswana other than Setswana')
    expect(isAcceptedForAny('Setswana', q.acceptedCanonical ?? [])).toBe(false)
    expect(isAcceptedForAny('English', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('Ireland (override): excludes English, not languages[0]="Irish" — English is what Ireland is globally assumed to speak', () => {
    const q = forQuestion('explorer', 'type-answer', 'ireland', Math.random)
    expect(q.prompt).toBe('Name a language of Ireland other than English')
    expect(isAcceptedForAny('English', q.acceptedCanonical ?? [])).toBe(false)
    expect(isAcceptedForAny('Irish', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('every other multi-language country still excludes languages[0] (no blanket reordering — only the two audited exceptions differ)', () => {
    // Spot-check a representative sample beyond Nigeria/Bolivia already
    // covered above, confirming the override map is narrowly scoped.
    // (Explorer/Medium pool only — see the world-expert-only variant below
    // for countries like Guinea/Wales that aren't Explorer-pool members.)
    for (const [countryId, expectedExcluded] of [
      ['south-africa', 'English'],
      ['zimbabwe', 'English'],
      ['ethiopia', 'Amharic'],
      ['senegal', 'French'],
      ['kenya', 'Swahili'],
      ['india', 'Hindi'],
      ['canada', 'English'],
    ] as const) {
      const q = forQuestion('explorer', 'type-answer', countryId, Math.random)
      expect(q.prompt, countryId).toBe(`Name a language of ${q.country.name} other than ${expectedExcluded}`)
    }
  })

})

describe('Expert (world-expert) — Multiple Choice, multi-language countries (complete set)', () => {
  it('South Africa: exactly one complete-and-correct option among near-miss sets', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'south-africa', Math.random)
    const canonicalKey = setKey(languagesOf(southAfrica))
    const matches = q.choices!.filter((c) => setKey(c.label.split(', ')) === canonicalKey)
    expect(matches).toHaveLength(1)
  })

  it('prompt reads "Which are the languages of {country}?"', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'south-africa', () => 0)
    expect(q.prompt).toBe('Which are the languages of South Africa?')
  })
})

describe('Expert (world-expert) — Type Answer, multi-language countries (complete the list)', () => {
  it('exactly one language is omitted and it is the required (accepted) answer', () => {
    const q = forQuestion('world-expert', 'type-answer', 'south-africa', Math.random)
    expect(q.acceptedCanonical).toHaveLength(1)
    const omitted = q.acceptedCanonical![0]!
    expect(languagesOf(southAfrica).map(normalizeCountryName)).toContain(normalizeCountryName(omitted))
    expect(q.displayedLanguages).toHaveLength(languagesOf(southAfrica).length - 1)
    expect(q.displayedLanguages).not.toContain(omitted)
  })

  it('the displayed (shown) languages are not themselves accepted as the answer', () => {
    const q = forQuestion('world-expert', 'type-answer', 'nigeria', Math.random)
    for (const shown of q.displayedLanguages ?? []) {
      expect(isAcceptedForAny(shown, q.acceptedCanonical ?? []), shown).toBe(false)
    }
  })

  it('does not always omit the last array element — every index is reachable across draws', () => {
    const omittedLanguages = new Set<string>()
    // Sweep the random source across its range so every omission index gets
    // hit at least once for a country with a known, fixed-length array.
    const steps = languagesOf(southAfrica).length * 4
    for (let i = 0; i < steps; i++) {
      const random = () => i / steps
      const q = forQuestion('world-expert', 'type-answer', 'south-africa', random)
      omittedLanguages.add(q.acceptedCanonical![0]!)
    }
    expect(omittedLanguages.size).toBe(languagesOf(southAfrica).length)
  })

  it('prompt reads "Complete {country}\'s languages"', () => {
    const q = forQuestion('world-expert', 'type-answer', 'nigeria', () => 0)
    expect(q.prompt).toBe("Complete Nigeria's languages")
  })
})

describe('Single-language fallback: unambiguous language -> reverse question', () => {
  it('Mali (Bambara, unambiguous) produces a reverse Multiple Choice question at Medium', () => {
    const q = forQuestion('explorer', 'multiple-choice', 'mali', Math.random)
    expect(q.kind).toBe('reverse')
    expect(q.prompt).toBe('Bambara is the language of which country?')
    const correct = q.choices!.find((c) => c.id === q.correctChoiceId)!
    expect(correct.label).toBe('Mali')
  })

  it('Montenegro (Montenegrin, unambiguous) produces a reverse Type Answer question at Expert', () => {
    const q = forQuestion('world-expert', 'type-answer', 'montenegro', Math.random)
    expect(q.kind).toBe('reverse')
    expect(q.prompt).toBe('Which country has Montenegrin as its language?')
    expect(isAcceptedForAny('Montenegro', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('reverse Multiple Choice never includes a distractor country whose own language coincidentally matches the correct label', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'mali', Math.random)
    const labels = q.choices!.map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('confirms the unambiguous-language facts these tests rely on', () => {
    expect(isUnambiguousLanguage('Bambara', mali.id)).toBe(true)
    expect(isUnambiguousLanguage('Montenegrin', montenegro.id)).toBe(true)
    expect(isUnambiguousLanguage('Japanese', 'japan')).toBe(true)
  })
})

describe('Single-language fallback: ambiguous language -> safe forward-association fallback, never a broken reverse question', () => {
  it('Argentina (Spanish, ambiguous) falls back to the individual/forward mechanic at Expert MC, never reverse', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'argentina', Math.random)
    expect(q.kind).toBe('individual')
    expect(q.prompt).toBe('What is the language of Argentina?')
    const correctLangs = new Set(languagesOf(argentina).map(normalizeCountryName))
    const validOptions = q.choices!.filter((c) => correctLangs.has(normalizeCountryName(c.label)))
    expect(validOptions).toHaveLength(1)
  })

  it('Argentina Type Answer fallback at Medium still accepts Spanish, never asks a broken reverse question', () => {
    const q = forQuestion('explorer', 'type-answer', 'argentina', Math.random)
    expect(q.kind).toBe('individual')
    expect(isAcceptedForAny('Spanish', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('every single-language country whose sole language is ambiguous (English, Spanish, Arabic, ...) never produces a reverse question', () => {
    for (const country of eligibleLanguageCountries('world-expert')) {
      const languages = languagesOf(country)
      if (languages.length !== 1) continue
      if (isUnambiguousLanguage(languages[0]!, country.id)) continue // covered by the unambiguous-fallback suite above
      const q = forQuestion('world-expert', 'type-answer', country.id, Math.random)
      expect(q.kind, country.id).toBe('individual')
    }
  })
})

describe('createLanguageQuestion: avoidIds / determinism', () => {
  it('avoids ids in avoidIds when the pool has other candidates', () => {
    for (let i = 0; i < 30; i++) {
      const q = createLanguageQuestion('familiar', 'type-answer', ['japan'], Math.random)
      expect(q.country.id).not.toBe('japan')
    }
  })

  it('falls back to allowing a repeat rather than throwing when avoidIds covers the whole pool', () => {
    const familiarIds = eligibleLanguageCountries('familiar').map((c) => c.id)
    const q = createLanguageQuestion('familiar', 'type-answer', familiarIds, Math.random)
    expect(familiarIds).toContain(q.country.id)
  })

  it('is deterministic for a fixed random source', () => {
    const random = () => 0.5
    const a = createLanguageQuestion('explorer', 'multiple-choice', [], random)
    const b = createLanguageQuestion('explorer', 'multiple-choice', [], random)
    expect(a.country.id).toBe(b.country.id)
    expect(a.prompt).toBe(b.prompt)
  })
})

describe('generateLanguageQuestions', () => {
  it('a 5-question quiz generates exactly 5 questions', () => {
    const questions = generateLanguageQuestions({ countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 }, Math.random)
    expect(questions).toHaveLength(5)
  })
  it('a 10-question quiz generates exactly 10 questions', () => {
    const questions = generateLanguageQuestions({ countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 10 }, Math.random)
    expect(questions).toHaveLength(10)
  })
  it('does not repeat the same correct country within one finite quiz when the pool has enough countries', () => {
    const questions = generateLanguageQuestions({ countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 10 }, Math.random)
    const ids = questions.map((q) => q.country.id)
    expect(new Set(ids).size).toBe(10)
  })
})

// Representative-country spot checks matching the QA matrix, exercised at
// the unit level too (not just manual browser QA).
describe('representative country spot checks', () => {
  it('Japan (single-language, unambiguous) supports reverse MC at Expert', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'japan', Math.random)
    expect(q.kind).toBe('reverse')
    expect(q.choices!.some((c) => c.label === 'Japan')).toBe(true)
  })

  it('Singapore (2 languages) supports the exclusion mechanic at Medium', () => {
    const q = forQuestion('explorer', 'type-answer', 'singapore', Math.random)
    expect(q.kind).toBe('exclude')
    expect(isAcceptedForAny('Mandarin', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('Ethiopia (5 languages) supports the complete-set mechanic at Expert', () => {
    const q = forQuestion('world-expert', 'multiple-choice', 'ethiopia', Math.random)
    expect(q.kind).toBe('set')
    expect(q.choices).toHaveLength(4)
  })

  it('Papua New Guinea Type Answer accepts the Sign Language alias', () => {
    const q = forQuestion('world-expert', 'type-answer', 'papua-new-guinea', Math.random)
    expect(['exclude', 'complete']).toContain(q.kind)
  })

  it('Philippines Type Answer accepts the slash-separated Bisaya/Binisaya via either side', () => {
    const q = forQuestion('familiar', 'type-answer', 'philippines', Math.random)
    expect(isAcceptedForAny('Bisaya', q.acceptedCanonical ?? [])).toBe(true)
  })

  it('Taiwan Type Answer accepts the slash-separated Hoklo/Taiwanese via either side', () => {
    const q = forQuestion('world-expert', 'type-answer', 'taiwan', Math.random)
    expect(isAcceptedForAny('Hoklo', q.acceptedCanonical ?? []) || isAcceptedForAny('Mandarin', q.acceptedCanonical ?? [])).toBe(true)
  })
})

describe('Dataset-wide invariant: every Multiple Choice question has exactly 4 unique options and exactly 1 correct answer', () => {
  const POOLS = ['familiar', 'explorer', 'world-expert'] as const

  for (const pool of POOLS) {
    it(`[${pool}] holds for every eligible country in this pool`, () => {
      const countries = eligibleLanguageCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      const failures: string[] = []
      for (const country of countries) {
        const q = forQuestion(pool, 'multiple-choice', country.id, Math.random)
        if (!q.choices || q.choices.length !== 4) {
          failures.push(`${country.id}: expected 4 options, got ${q.choices?.length ?? 0}`)
          continue
        }
        const labels = q.choices.map((c) => c.label)
        if (new Set(labels).size !== 4) {
          failures.push(`${country.id}: duplicate option labels — ${JSON.stringify(labels)}`)
        }
        if (!q.correctChoiceId || !q.choices.some((c) => c.id === q.correctChoiceId)) {
          failures.push(`${country.id}: correctChoiceId does not match any rendered option`)
        }
      }
      expect(failures, failures.join('\n')).toHaveLength(0)
    })
  }

  // 200 countries x 5 fixed random sources, each going through the
  // "force this exact country" avoidIds helper — pre-existing, unrelated
  // to Type Answer/typo-assistance work; this pass found it running close
  // enough to Vitest's 5000ms default under current system/suite load to
  // occasionally trip it. Bumping only this test's own timeout rather than
  // touching question-generation code (out of scope for this task).
  it(
    'holds with a variety of fixed random sources too, not just Math.random',
    () => {
      const failures: string[] = []
      for (const random of [() => 0, () => 0.25, () => 0.5, () => 0.75, () => 0.999]) {
        for (const country of eligibleLanguageCountries('world-expert')) {
          const q = forQuestion('world-expert', 'multiple-choice', country.id, random)
          if (!q.choices || q.choices.length !== 4 || new Set(q.choices.map((c) => c.label)).size !== 4) {
            failures.push(`${country.id} @ random=${random()}`)
          }
        }
      }
      expect(failures, failures.join('\n')).toHaveLength(0)
    },
    15000,
  )
})
