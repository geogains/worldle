import type { Country } from '../../data/countries'
import { getDistractors } from './distractors'
import { getLanguageDistractors, getLanguageSetDistractors } from './languageDistractors'
import { eligibleLanguageCountries, isUnambiguousLanguage, languagesOf } from './languages'
import { defaultRandom, pick, shuffle, type RandomSource } from './random'
import type { AnswerStyle, CountryPool } from './types'

/**
 * Which mechanic a given LanguageQuestion uses. Difficulty (CountryPool)
 * maps to a *mechanic*, not just a harder country pool — see each kind's
 * builder below and the module-level comment on createLanguageQuestion()
 * for the full difficulty -> mechanic matrix.
 */
export type LanguageQuestionKind =
  | 'individual' // Easy (either answer style), and the universal safe fallback for single-language countries at any difficulty
  | 'set' // Medium/Expert, multi-language countries, Multiple Choice
  | 'exclude' // Medium, multi-language countries, Type Answer
  | 'complete' // Expert, multi-language countries, Type Answer
  | 'reverse' // Medium/Expert, single-language countries whose language is unambiguous in the dataset

/**
 * One Languages question. Deliberately a single flat shape (like
 * FlagQuestion/CapitalQuestion) covering every mechanic, rather than a
 * discriminated union per kind — every consumer (the engine, the screen)
 * only needs a handful of fields regardless of which mechanic produced the
 * question:
 *
 *  - Multiple Choice: `choices` + `correctChoiceId` are set; `choices[].label`
 *    is either a single language (individual/reverse-on-language kinds) or
 *    a comma-joined set (set kind) or a country name (reverse kind).
 *  - Type Answer: `acceptedCanonical` (the canonical form(s) a submission is
 *    checked against, via isAcceptedLanguageAnswer/isAcceptedForAny) and
 *    `revealAnswer` (what "Correct answer: X" shows on a wrong submission)
 *    are set instead.
 *  - `displayedLanguages` is set only for the 'complete' kind: the still-
 *    visible partial list rendered above the Type Answer input.
 */
export interface LanguageQuestion {
  id: string
  country: Country
  kind: LanguageQuestionKind
  prompt: string
  displayedLanguages?: string[]
  choices?: { id: string; label: string }[]
  correctChoiceId?: string
  acceptedCanonical?: string[]
  revealAnswer?: string
}

const MC_OPTION_COUNT = 4
const SET_OPTION_COUNT = 4

function choiceId(prefix: string, index: number): string {
  return `${prefix}-${index}`
}

/** Easy (both answer styles), and the Tier-3 universal fallback for single-language countries at Medium/Expert. */
function buildIndividual(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource, promptVerb: 'which' | 'what'): LanguageQuestion {
  const languages = languagesOf(correct)
  const prompt = promptVerb === 'which' ? `Which is a language of ${correct.name}?` : `What is the language of ${correct.name}?`

  if (answerStyle === 'type-answer') {
    return {
      id: correct.id,
      country: correct,
      kind: 'individual',
      prompt: `Name a language of ${correct.name}`,
      acceptedCanonical: [...languages],
      revealAnswer: languages[0],
    }
  }

  const correctLanguage = pick(languages, random) ?? languages[0]!
  const distractors = getLanguageDistractors(correct, pool, MC_OPTION_COUNT - 1, random)
  const options = shuffle([correctLanguage, ...distractors], random)
  const choices = options.map((label, i) => ({ id: choiceId(correct.id, i), label }))
  const correctIndex = options.indexOf(correctLanguage)
  return { id: correct.id, country: correct, kind: 'individual', prompt, choices, correctChoiceId: choices[correctIndex]!.id }
}

/**
 * Medium/Expert Multiple Choice, multi-language countries: "which set
 * belongs to X" / "which are the languages of X". `maxSwaps` is the
 * Medium/Expert distinction (see getLanguageSetDistractors's own doc
 * comment): Medium (2) mixes one- and two-language near-misses so some
 * options are easier to eliminate than others; Expert (1) makes every
 * distractor a strict one-language near-miss, requiring precise knowledge
 * of the complete set.
 */
function buildSet(correct: Country, pool: CountryPool, random: RandomSource, prompt: string, maxSwaps: 1 | 2): LanguageQuestion {
  const languages = [...languagesOf(correct)]
  const distractorSets = getLanguageSetDistractors(languages, correct, pool, SET_OPTION_COUNT - 1, random, maxSwaps)
  const optionSets = shuffle([languages, ...distractorSets], random)
  const choices = optionSets.map((set, i) => ({ id: choiceId(correct.id, i), label: set.join(', ') }))
  const correctIndex = optionSets.findIndex((set) => set === languages)
  return { id: correct.id, country: correct, kind: 'set', prompt, choices, correctChoiceId: choices[correctIndex]!.id }
}

/**
 * Explicit overrides for the Medium exclusion mechanic's "obvious/default
 * language to exclude" — for the two countries an audit of all 79
 * multi-language records found where languages[0] does NOT read as the
 * language a quiz player would most readily assume, which would defeat
 * the "excluding the obvious one forces deeper knowledge" goal:
 *
 *  - Botswana: languages[0] is "English" (the administrative language,
 *    but comparatively obscure internationally). "Setswana" is the
 *    country's namesake language and the home language of ~78% of the
 *    population — overwhelmingly the more obvious guess, and excluding
 *    it (not English) is what actually requires deeper knowledge.
 *  - Ireland: languages[0] is "Irish" (constitutionally "the national and
 *    first official language"). "English" is what Ireland is
 *    overwhelmingly, globally known for — grouped with the UK/US/
 *    Australia/Canada as a native-English country in almost every
 *    general-knowledge context — so excluding Irish (as array order alone
 *    would suggest) leaves the trivially obvious "English" as the
 *    answer, adding no difficulty; excluding English is what tests the
 *    less commonly known fact.
 *
 * The Principal Languages rebuild's array order reflects which languages
 * qualify as principal, not an intentional "quiz difficulty" ordering —
 * see the field's own doc comment in countryRecords.ts — so this override
 * map, not an assumption about array position, is the source of truth for
 * this mechanic specifically. Every other multi-language country's
 * languages[0] was checked against real-world prominence and found
 * suitable as the default exclusion target — see languageQuestions.test.ts.
 */
const EXCLUDED_LANGUAGE_OVERRIDES: Readonly<Record<string, string>> = {
  botswana: 'Setswana',
  ireland: 'English',
}

/** The "obvious/default" language to exclude for the Medium exclusion mechanic — see EXCLUDED_LANGUAGE_OVERRIDES above for the two exceptions. */
function anchorLanguage(languages: readonly string[], countryId: string): string {
  const override = EXCLUDED_LANGUAGE_OVERRIDES[countryId]
  if (override && languages.includes(override)) return override
  return languages[0]!
}

/** Medium Type Answer, multi-language countries: "name a language of X other than {anchor}". */
function buildExclude(correct: Country): LanguageQuestion {
  const languages = languagesOf(correct)
  const anchor = anchorLanguage(languages, correct.id)
  const remaining = languages.filter((l) => l !== anchor)
  return {
    id: correct.id,
    country: correct,
    kind: 'exclude',
    prompt: `Name a language of ${correct.name} other than ${anchor}`,
    acceptedCanonical: remaining,
    revealAnswer: remaining[0],
  }
}

/** Expert Type Answer, multi-language countries: "complete X's languages: A, B, ____". */
function buildComplete(correct: Country, random: RandomSource): LanguageQuestion {
  const languages = languagesOf(correct)
  const omittedIndex = Math.floor(random() * languages.length)
  const omitted = languages[omittedIndex]!
  const shown = languages.filter((_, i) => i !== omittedIndex)
  return {
    id: correct.id,
    country: correct,
    kind: 'complete',
    prompt: `Complete ${correct.name}'s languages`,
    displayedLanguages: shown,
    acceptedCanonical: [omitted],
    revealAnswer: omitted,
  }
}

/** Medium/Expert, single-language countries whose language is unambiguous: reverse-direction question. */
function buildReverse(correct: Country, language: string, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): LanguageQuestion {
  if (answerStyle === 'type-answer') {
    return {
      id: correct.id,
      country: correct,
      kind: 'reverse',
      prompt: `Which country has ${language} as its language?`,
      acceptedCanonical: [correct.name],
      revealAnswer: correct.name,
    }
  }
  let distractorCountries = getDistractors(correct, pool, MC_OPTION_COUNT - 1, random)
  // Exactly 4 options is a gameplay invariant (see the module doc comment
  // on createLanguageQuestion()) — broaden to the full World Expert
  // country pool if the requested pool came up short.
  if (distractorCountries.length < MC_OPTION_COUNT - 1 && pool !== 'world-expert') {
    distractorCountries = getDistractors(correct, 'world-expert', MC_OPTION_COUNT - 1, random)
  }
  const options = shuffle([correct, ...distractorCountries], random)
  const choices = options.map((c, i) => ({ id: choiceId(`${correct.id}-rev`, i), label: c.name }))
  const correctIndex = options.findIndex((c) => c.id === correct.id)
  return {
    id: correct.id,
    country: correct,
    kind: 'reverse',
    prompt: `${language} is the language of which country?`,
    choices,
    correctChoiceId: choices[correctIndex]!.id,
  }
}

/**
 * Difficulty (CountryPool) -> mechanic matrix:
 *
 *  Easy (familiar):    always 'individual' — pick/name any one valid language.
 *  Medium (explorer):  multi-language country -> 'set' (MC) / 'exclude' (Type);
 *                       single-language country -> single-language fallback below.
 *  Expert (world-expert): multi-language country -> 'set' (MC) / 'complete' (Type);
 *                       single-language country -> single-language fallback below.
 *
 * Single-language fallback (Medium & Expert, both answer styles): if the
 * country's one language is unambiguous in the full canonical dataset
 * (isUnambiguousLanguage), ask a 'reverse' question — this is the harder,
 * difficulty-appropriate fallback the spec calls for. If the language is
 * ambiguous (shared with other countries, e.g. Spanish/English/Arabic),
 * a reverse question would have no single correct answer, so this
 * cascades one step further to 'individual' — always well-defined
 * regardless of difficulty or ambiguity, and never produces a broken or
 * misleading question.
 */
function buildQuestion(correct: Country, pool: CountryPool, answerStyle: AnswerStyle, random: RandomSource): LanguageQuestion {
  const languages = languagesOf(correct)
  if (languages.length === 0) throw new Error(`Country "${correct.id}" has no usable language data`)

  if (pool === 'familiar') {
    return buildIndividual(correct, pool, answerStyle, random, 'which')
  }

  const difficultyLabel = pool === 'explorer' ? 'Medium' : 'Expert'
  if (languages.length >= 2) {
    if (answerStyle === 'multiple-choice') {
      const prompt = difficultyLabel === 'Medium' ? `Which set of languages belongs to ${correct.name}?` : `Which are the languages of ${correct.name}?`
      // Medium mixes 1- and 2-language swaps (some options easier to
      // eliminate); Expert is strictly 1-language near-misses throughout.
      return buildSet(correct, pool, random, prompt, difficultyLabel === 'Medium' ? 2 : 1)
    }
    return difficultyLabel === 'Medium' ? buildExclude(correct) : buildComplete(correct, random)
  }

  // Single-language fallback cascade.
  const soleLanguage = languages[0]!
  if (isUnambiguousLanguage(soleLanguage, correct.id)) {
    return buildReverse(correct, soleLanguage, pool, answerStyle, random)
  }
  return buildIndividual(correct, pool, answerStyle, random, 'what')
}

/**
 * One question, excluding any country id in `avoidIds` when possible —
 * same contract as createFlagQuestion()/createCapitalQuestion().
 *
 * GAMEPLAY INVARIANT: every Multiple Choice question this produces
 * (`individual`, `set`, or `reverse` kind) always has exactly 4 unique
 * options with exactly 1 correct — never fewer. Distractor generation
 * (getLanguageDistractors/getLanguageSetDistractors in
 * languageDistractors.ts, and getDistractors() for `reverse`) always
 * progressively broadens to the full World Expert pool if the requested
 * difficulty's pool comes up short, rather than silently rendering a
 * thinner question — see the dataset-wide invariant test in
 * languageQuestions.test.ts, which checks this across every eligible
 * country at every difficulty.
 */
export function createLanguageQuestion(
  pool: CountryPool,
  answerStyle: AnswerStyle,
  avoidIds: readonly string[],
  random: RandomSource = defaultRandom,
): LanguageQuestion {
  const all = eligibleLanguageCountries(pool)
  const avoid = new Set(avoidIds)
  const candidates = all.filter((c) => !avoid.has(c.id))
  const correct = pick(candidates.length > 0 ? candidates : all, random)
  if (!correct) throw new Error(`No countries with usable language data in pool "${pool}" to generate a Languages question`)
  return buildQuestion(correct, pool, answerStyle, random)
}

export interface GenerateLanguageQuestionsConfig {
  countryPool: CountryPool
  answerStyle: AnswerStyle
  questionCount: 5 | 10
}

/** A full finite quiz's worth of questions, generated up front — same contract as generateFlagQuestions()/generateCapitalQuestions(). */
export function generateLanguageQuestions(config: GenerateLanguageQuestionsConfig, random: RandomSource = defaultRandom): LanguageQuestion[] {
  const { countryPool, answerStyle, questionCount } = config
  const used: string[] = []
  const questions: LanguageQuestion[] = []
  for (let i = 0; i < questionCount; i++) {
    const question = createLanguageQuestion(countryPool, answerStyle, used, random)
    used.push(question.country.id)
    questions.push(question)
  }
  return questions
}
