import type { Country } from '../../data/countries'
import { getDistractors } from './distractors'
import { resolveCountryPool } from './pools'
import { defaultRandom, pick, shuffle, type RandomSource } from './random'
import type { AnswerStyle, CountryPool } from './types'

/**
 * One Flags question: identify `country` from its flag. `choices` is
 * present (and already shuffled, correct answer's position randomized)
 * only for `answerStyle: 'multiple-choice'` — a `'type-answer'` question
 * has no choices, since the player types the name instead.
 */
export interface FlagQuestion {
  id: string
  country: Country
  choices?: Country[]
}

const DISTRACTOR_COUNT = 3

function buildQuestion(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): FlagQuestion {
  if (answerStyle === 'type-answer') return { id: correct.id, country: correct }
  const distractors = getDistractors(correct, pool, DISTRACTOR_COUNT, random)
  const choices = shuffle([correct, ...distractors], random)
  return { id: correct.id, country: correct, choices }
}

/**
 * One question, excluding any country id in `avoidIds` when possible. Used
 * directly for Unlimited (called once per question, avoiding only the
 * immediately preceding country) and internally by generateFlagQuestions()
 * for finite quizzes (avoiding every country already used this quiz).
 * Falls back to ignoring `avoidIds` only if that would leave zero
 * candidates (i.e. the pool is smaller than the exclusion set) — a repeat
 * is preferable to failing to produce a question at all.
 */
export function createFlagQuestion(
  pool: CountryPool,
  answerStyle: AnswerStyle,
  avoidIds: readonly string[],
  random: RandomSource = defaultRandom,
): FlagQuestion {
  const all = resolveCountryPool(pool)
  const avoid = new Set(avoidIds)
  const candidates = all.filter((c) => !avoid.has(c.id))
  const correct = pick(candidates.length > 0 ? candidates : all, random)
  if (!correct) throw new Error(`No countries available in pool "${pool}" to generate a Flags question`)
  return buildQuestion(correct, pool, answerStyle, random)
}

export interface GenerateFlagQuestionsConfig {
  countryPool: CountryPool
  answerStyle: AnswerStyle
  /** Finite question count only — Unlimited uses createFlagQuestion() directly, one at a time. */
  questionCount: 5 | 10
}

/**
 * A full finite quiz's worth of questions, generated up front. Avoids
 * repeating the same correct country within the quiz as long as the pool
 * has enough countries (every pool does, by a wide margin, for 5 or 10
 * questions); if it somehow didn't, createFlagQuestion()'s own fallback
 * allows a repeat rather than throwing.
 */
export function generateFlagQuestions(config: GenerateFlagQuestionsConfig, random: RandomSource = defaultRandom): FlagQuestion[] {
  const { countryPool, answerStyle, questionCount } = config
  const used: string[] = []
  const questions: FlagQuestion[] = []
  for (let i = 0; i < questionCount; i++) {
    const question = createFlagQuestion(countryPool, answerStyle, used, random)
    used.push(question.country.id)
    questions.push(question)
  }
  return questions
}
