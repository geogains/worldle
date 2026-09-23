import { findCountryById, type Country } from '../../data/countries'
import { getDistractors } from './distractors'
import { eligibleFactEntriesFor, resolveDistractors } from './facts'
import type { FactEntry } from './factsData'
import { defaultRandom, pick, shuffle, type RandomSource } from './random'
import type { AnswerStyle, CountryPool } from './types'

/**
 * One Facts question. The answer is always a country (see config.ts's
 * QUIZ_MODE_OPTIONS doc comment: "its future question phrasing puts the
 * country itself as the answer"), so — unlike Languages/Currencies, which
 * have several `kind`s — Facts only ever has one mechanic: read the curated
 * trivia sentence, pick/type the country it's about. Multiple Choice sets
 * `choices` + `correctChoiceId`; Type Answer sets `acceptedCanonical` +
 * `revealAnswer` instead, same flat-shape convention as every other mode.
 */
export interface FactQuestion {
  id: string
  country: Country
  prompt: string
  choices?: { id: string; label: string }[]
  correctChoiceId?: string
  acceptedCanonical?: string[]
  revealAnswer?: string
}

const MC_OPTION_COUNT = 4

function buildQuestion(entry: FactEntry, country: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): FactQuestion {
  if (answerStyle === 'type-answer') {
    return {
      id: country.id,
      country,
      prompt: entry.question,
      acceptedCanonical: [country.name],
      revealAnswer: country.name,
    }
  }

  // Curated semantic distractors are the norm — every entry ships exactly
  // 3 (see factsData.ts/factQuestions.test.ts). getDistractors() is only a
  // defensive fallback for the situation none of the 200 curated entries
  // are actually in (a distractor id somehow failing to resolve), so the
  // "exactly 4 options" gameplay invariant every other mode guarantees
  // still holds here — it is never what picks Facts' real distractors.
  let distractorCountries = resolveDistractors(entry)
  if (distractorCountries.length < MC_OPTION_COUNT - 1) {
    const extra = getDistractors(country, pool, MC_OPTION_COUNT - 1 - distractorCountries.length, random)
    const usedIds = new Set([country.id, ...distractorCountries.map((c) => c.id)])
    distractorCountries = [...distractorCountries, ...extra.filter((c) => !usedIds.has(c.id))]
  }

  const options = shuffle([country, ...distractorCountries], random)
  const choices = options.map((c, i) => ({ id: `${country.id}-${i}`, label: c.name }))
  const correctIndex = options.findIndex((c) => c.id === country.id)
  return { id: country.id, country, prompt: entry.question, choices, correctChoiceId: choices[correctIndex]!.id }
}

/**
 * One question, excluding any country id in `avoidIds` when possible —
 * same contract as createFlagQuestion()/createCapitalQuestion()/
 * createLanguageQuestion()/createCurrencyQuestion().
 */
export function createFactQuestion(
  pool: CountryPool,
  answerStyle: AnswerStyle,
  avoidIds: readonly string[],
  random: RandomSource = defaultRandom,
): FactQuestion {
  const eligible = eligibleFactEntriesFor(pool, answerStyle)
  const avoid = new Set(avoidIds)
  const candidates = eligible.filter((e) => !avoid.has(e.countryId))
  const entry = pick(candidates.length > 0 ? candidates : eligible, random)
  if (!entry) throw new Error(`No Facts questions available for pool "${pool}" / answer style "${answerStyle}"`)
  const country = findCountryById(entry.countryId)
  if (!country) throw new Error(`Facts entry "${entry.countryId}" has no matching Country record`)
  return buildQuestion(entry, country, pool, answerStyle, random)
}

export interface GenerateFactQuestionsConfig {
  countryPool: CountryPool
  answerStyle: AnswerStyle
  questionCount: 5 | 10
}

/** A full finite quiz's worth of questions, generated up front — same contract as generateLanguageQuestions()/generateCurrencyQuestions(). */
export function generateFactQuestions(config: GenerateFactQuestionsConfig, random: RandomSource = defaultRandom): FactQuestion[] {
  const { countryPool, answerStyle, questionCount } = config
  const used: string[] = []
  const questions: FactQuestion[] = []
  for (let i = 0; i < questionCount; i++) {
    const question = createFactQuestion(countryPool, answerStyle, used, random)
    used.push(question.country.id)
    questions.push(question)
  }
  return questions
}
