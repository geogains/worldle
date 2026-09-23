import type { Country } from '../../data/countries'
import { getDistractors } from './distractors'
import { currencyTypeShorthand } from './currencyAliases'
import { getCurrencyDistractors } from './currencyDistractors'
import { currencyOf, eligibleCurrencyCountries, isUniqueCurrency } from './currencies'
import { defaultRandom, pick, shuffle, type RandomSource } from './random'
import type { AnswerStyle, CountryPool } from './types'

/**
 * Which mechanic a given CurrencyQuestion uses. Difficulty (CountryPool)
 * maps to a *mechanic*, not just a harder country pool — see each kind's
 * builder below and the module-level comment on createCurrencyQuestion()
 * for the full difficulty -> mechanic matrix.
 */
export type CurrencyQuestionKind =
  | 'forward' // Easy (always), and Medium's fallback for shared currencies: country -> currency name
  | 'reverse' // Medium, currency unique to one country: currency name -> country
  | 'code-forward' // Expert Form A: country -> ISO code
  | 'code-reverse' // Expert Form B: ISO code -> currency name

/**
 * One Currencies question. Deliberately a single flat shape (like
 * LanguageQuestion/CapitalQuestion), covering every mechanic rather than a
 * discriminated union per kind:
 *
 *  - Multiple Choice: `choices` + `correctChoiceId` are set; `choices[].label`
 *    is a currency name (forward/code-reverse), a country name (reverse),
 *    or an ISO code (code-forward).
 *  - Type Answer: `acceptedCanonical` + `revealAnswer` are set instead —
 *    a currency name (forward/code-reverse, alias-checked), a country name
 *    (reverse, plain country-name match), or an ISO code (code-forward,
 *    exact case-insensitive match) depending on `kind`. The screen decides
 *    which validator to use based on `kind` — see CurrenciesQuizScreen.tsx.
 */
export interface CurrencyQuestion {
  id: string
  country: Country
  kind: CurrencyQuestionKind
  prompt: string
  choices?: { id: string; label: string }[]
  correctChoiceId?: string
  acceptedCanonical?: string[]
  revealAnswer?: string
}

const MC_OPTION_COUNT = 4

function choiceId(prefix: string, index: number): string {
  return `${prefix}-${index}`
}

/**
 * Country -> currency name. Used for Easy (both answer styles, always) and
 * for Medium's fallback when the country's currency is shared by more
 * than one Worldle country (see buildQuestion's difficulty matrix) — the
 * same builder serves both, since the mechanic is identical; only the
 * prompt wording and distractor pool (driven by `pool`, exactly like
 * getDistractors()/getLanguageDistractors() already do) differ.
 */
function buildForward(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource, prompt: string, typePrompt: string): CurrencyQuestion {
  const currency = currencyOf(correct)!

  if (answerStyle === 'type-answer') {
    const shorthand = currencyTypeShorthand(currency.name)
    return {
      id: correct.id,
      country: correct,
      kind: 'forward',
      prompt: typePrompt,
      acceptedCanonical: shorthand ? [currency.name, shorthand] : [currency.name],
      revealAnswer: currency.name,
    }
  }

  const distractors = getCurrencyDistractors(correct, pool, MC_OPTION_COUNT - 1, random, 'name')
  const options = shuffle([currency.name, ...distractors], random)
  const choices = options.map((label, i) => ({ id: choiceId(correct.id, i), label }))
  const correctIndex = options.indexOf(currency.name)
  return { id: correct.id, country: correct, kind: 'forward', prompt, choices, correctChoiceId: choices[correctIndex]!.id }
}

/** Medium, currency unique to one Worldle country: "which country uses X?" */
function buildReverse(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): CurrencyQuestion {
  const currency = currencyOf(correct)!
  const prompt = `Which country uses the ${currency.name}?`

  if (answerStyle === 'type-answer') {
    return {
      id: correct.id,
      country: correct,
      kind: 'reverse',
      prompt,
      acceptedCanonical: [correct.name],
      revealAnswer: correct.name,
    }
  }

  let distractorCountries = getDistractors(correct, pool, MC_OPTION_COUNT - 1, random)
  // Exactly 4 options is a gameplay invariant (see the module doc comment
  // on createCurrencyQuestion()) — broaden to the full World Expert
  // country pool if the requested pool came up short.
  if (distractorCountries.length < MC_OPTION_COUNT - 1 && pool !== 'world-expert') {
    distractorCountries = getDistractors(correct, 'world-expert', MC_OPTION_COUNT - 1, random)
  }
  const options = shuffle([correct, ...distractorCountries], random)
  const choices = options.map((c, i) => ({ id: choiceId(`${correct.id}-rev`, i), label: c.name }))
  const correctIndex = options.findIndex((c) => c.id === correct.id)
  return { id: correct.id, country: correct, kind: 'reverse', prompt, choices, correctChoiceId: choices[correctIndex]!.id }
}

/** Expert Form A: country -> ISO code. Safe for every country regardless of whether its currency/code is shared — the country is explicitly given, so the answer is never ambiguous. */
function buildCodeForward(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): CurrencyQuestion {
  const currency = currencyOf(correct)!

  if (answerStyle === 'type-answer') {
    return {
      id: correct.id,
      country: correct,
      kind: 'code-forward',
      prompt: `Enter the currency code for ${correct.name}`,
      acceptedCanonical: [currency.code],
      revealAnswer: currency.code,
    }
  }

  const distractors = getCurrencyDistractors(correct, pool, MC_OPTION_COUNT - 1, random, 'code')
  const options = shuffle([currency.code, ...distractors], random)
  const choices = options.map((label, i) => ({ id: choiceId(correct.id, i), label }))
  const correctIndex = options.indexOf(currency.code)
  return {
    id: correct.id,
    country: correct,
    kind: 'code-forward',
    prompt: `What is ${correct.name}'s currency code?`,
    choices,
    correctChoiceId: choices[correctIndex]!.id,
  }
}

/**
 * Expert Form B: ISO code -> currency name. Safe for ALL 143 unique
 * codes regardless of country sharing — a code always maps to exactly one
 * CURRENCY by construction (that's what makes it a distinct code; verified
 * 1:1 against 143 unique names in the Sept 2026 audits). The underlying
 * `correct` Country is just whichever country the code happened to be
 * drawn from; the answer ("Euro", "United States Dollar", etc.) is
 * identical no matter which of that currency's countries was picked, so
 * this never needs the isUniqueCurrency() gate buildReverse() uses.
 */
function buildCodeReverse(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): CurrencyQuestion {
  const currency = currencyOf(correct)!
  const prompt = `Which currency does ${currency.code} represent?`

  if (answerStyle === 'type-answer') {
    const shorthand = currencyTypeShorthand(currency.name)
    return {
      id: correct.id,
      country: correct,
      kind: 'code-reverse',
      prompt,
      acceptedCanonical: shorthand ? [currency.name, shorthand] : [currency.name],
      revealAnswer: currency.name,
    }
  }

  const distractors = getCurrencyDistractors(correct, pool, MC_OPTION_COUNT - 1, random, 'name')
  const options = shuffle([currency.name, ...distractors], random)
  const choices = options.map((label, i) => ({ id: choiceId(correct.id, i), label }))
  const correctIndex = options.indexOf(currency.name)
  return { id: correct.id, country: correct, kind: 'code-reverse', prompt, choices, correctChoiceId: choices[correctIndex]!.id }
}

/**
 * Difficulty (CountryPool) -> mechanic matrix:
 *
 *  Easy (familiar):    always 'forward' — country -> currency name.
 *  Medium (explorer):  currency unique to this country in-dataset -> 'reverse'
 *                       (currency -> country); shared currency -> 'forward'
 *                       fallback (harder distractors via the explorer pool).
 *  Expert (world-expert): deterministic coin-flip between 'code-forward'
 *                       (country -> code) and 'code-reverse' (code ->
 *                       currency name) — both are always safe (see each
 *                       builder's own comment), so no gating is needed here.
 */
function buildQuestion(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): CurrencyQuestion {
  const currency = currencyOf(correct)
  if (!currency) throw new Error(`Country "${correct.id}" has no usable currency data`)

  if (pool === 'familiar') {
    return buildForward(correct, pool, answerStyle, random, `What is the currency of ${correct.name}?`, `Name the currency of ${correct.name}`)
  }

  if (pool === 'explorer') {
    if (isUniqueCurrency(currency.code, correct.id)) {
      return buildReverse(correct, pool, answerStyle, random)
    }
    const prompt = `What currency does ${correct.name} use?`
    return buildForward(correct, pool, answerStyle, random, prompt, prompt)
  }

  // Expert: deterministic seeded selection between the two question forms,
  // not Math.random() directly — same injectable-RandomSource contract as
  // every other quiz generator in lib/quiz.
  const form = pick(['code-forward', 'code-reverse'] as const, random) ?? 'code-forward'
  return form === 'code-forward' ? buildCodeForward(correct, pool, answerStyle, random) : buildCodeReverse(correct, pool, answerStyle, random)
}

/**
 * One question, excluding any country id in `avoidIds` when possible —
 * same contract as createFlagQuestion()/createCapitalQuestion()/
 * createLanguageQuestion().
 *
 * GAMEPLAY INVARIANT: every Multiple Choice question this produces
 * (`forward`, `reverse`, `code-forward` or `code-reverse` kind) always has
 * exactly 4 unique options with exactly 1 correct — never fewer.
 * Distractor generation (getCurrencyDistractors in currencyDistractors.ts,
 * and getDistractors() for `reverse`) always progressively broadens to the
 * full World Expert pool if the requested difficulty's pool comes up
 * short, rather than silently rendering a thinner question — see the
 * dataset-wide invariant test in currencyQuestions.test.ts, which checks
 * this across every eligible country at every difficulty.
 */
export function createCurrencyQuestion(
  pool: CountryPool,
  answerStyle: AnswerStyle,
  avoidIds: readonly string[],
  random: RandomSource = defaultRandom,
): CurrencyQuestion {
  const all = eligibleCurrencyCountries(pool)
  const avoid = new Set(avoidIds)
  const candidates = all.filter((c) => !avoid.has(c.id))
  const correct = pick(candidates.length > 0 ? candidates : all, random)
  if (!correct) throw new Error(`No countries with usable currency data in pool "${pool}" to generate a Currencies question`)
  return buildQuestion(correct, pool, answerStyle, random)
}

export interface GenerateCurrencyQuestionsConfig {
  countryPool: CountryPool
  answerStyle: AnswerStyle
  questionCount: 5 | 10
}

/** A full finite quiz's worth of questions, generated up front — same contract as generateLanguageQuestions()/generateCapitalQuestions(). */
export function generateCurrencyQuestions(config: GenerateCurrencyQuestionsConfig, random: RandomSource = defaultRandom): CurrencyQuestion[] {
  const { countryPool, answerStyle, questionCount } = config
  const used: string[] = []
  const questions: CurrencyQuestion[] = []
  for (let i = 0; i < questionCount; i++) {
    const question = createCurrencyQuestion(countryPool, answerStyle, used, random)
    used.push(question.country.id)
    questions.push(question)
  }
  return questions
}
