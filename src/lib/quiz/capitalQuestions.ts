import type { Country } from '../../data/countries'
import { capitalOf, eligibleCapitalCountries } from './capitals'
import { getCapitalDistractors } from './capitalDistractors'
import { defaultRandom, pick, shuffle, type RandomSource } from './random'
import type { AnswerStyle, CountryPool } from './types'

/**
 * One Capitals question: identify `capital` from `country`. `choices` is
 * present (and already shuffled, correct answer's position randomized)
 * only for `answerStyle: 'multiple-choice'` — a `'type-answer'` question
 * has no choices, since the player types the capital instead. Each choice
 * is a full Country (not just a capital string) so the engine can key
 * correctness off `country.id`, exactly like FlagQuestion — the capital
 * text to render per choice is looked up via capitalOf() at render time.
 */
export interface CapitalQuestion {
  id: string
  country: Country
  capital: string
  choices?: Country[]
}

const DISTRACTOR_COUNT = 3

function buildQuestion(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): CapitalQuestion {
  const capital = capitalOf(correct)
  // Every candidate this function is ever called with already passed
  // eligibleCapitalCountries()'s filter (see createCapitalQuestion below),
  // so this is unreachable in practice — guards against a future caller
  // bypassing that filter rather than silently asking an unanswerable question.
  if (!capital) throw new Error(`Country "${correct.id}" has no usable capital data`)
  if (answerStyle === 'type-answer') return { id: correct.id, country: correct, capital }
  const distractors = getCapitalDistractors(correct, pool, DISTRACTOR_COUNT, random)
  const choices = shuffle([correct, ...distractors], random)
  return { id: correct.id, country: correct, capital, choices }
}

/**
 * One question, excluding any country id in `avoidIds` when possible. Used
 * directly for Unlimited (called once per question, avoiding only the
 * immediately preceding country) and internally by generateCapitalQuestions()
 * for finite quizzes (avoiding every country already used this quiz).
 * Falls back to ignoring `avoidIds` only if that would leave zero
 * candidates — a repeat is preferable to failing to produce a question at all.
 */
export function createCapitalQuestion(
  pool: CountryPool,
  answerStyle: AnswerStyle,
  avoidIds: readonly string[],
  random: RandomSource = defaultRandom,
): CapitalQuestion {
  const all = eligibleCapitalCountries(pool)
  const avoid = new Set(avoidIds)
  const candidates = all.filter((c) => !avoid.has(c.id))
  const correct = pick(candidates.length > 0 ? candidates : all, random)
  if (!correct) throw new Error(`No countries with usable capital data in pool "${pool}" to generate a Capitals question`)
  return buildQuestion(correct, pool, answerStyle, random)
}

export interface GenerateCapitalQuestionsConfig {
  countryPool: CountryPool
  answerStyle: AnswerStyle
  /** Finite question count only — Unlimited uses createCapitalQuestion() directly, one at a time. */
  questionCount: 5 | 10
}

/**
 * A full finite quiz's worth of questions, generated up front. Avoids
 * repeating the same correct country within the quiz as long as the pool
 * has enough eligible countries; if it somehow didn't, createCapitalQuestion()'s
 * own fallback allows a repeat rather than throwing.
 */
export function generateCapitalQuestions(config: GenerateCapitalQuestionsConfig, random: RandomSource = defaultRandom): CapitalQuestion[] {
  const { countryPool, answerStyle, questionCount } = config
  const used: string[] = []
  const questions: CapitalQuestion[] = []
  for (let i = 0; i < questionCount; i++) {
    const question = createCapitalQuestion(countryPool, answerStyle, used, random)
    used.push(question.country.id)
    questions.push(question)
  }
  return questions
}
