/**
 * Quiz domain types — Phase 1 (foundation only).
 *
 * This module defines the shared, typed configuration model for the Quiz
 * system (see the `/quiz` setup screen) plus the *scaffolding* interfaces
 * a future shared quiz engine will plug into. No gameplay, question
 * generation, scoring or results UI is implemented against these yet —
 * they exist so later phases (Flags/Capitals/Currencies/Languages/Facts/
 * Mixed gameplay) can be built without re-deriving this shape or
 * duplicating it per quiz mode.
 */

/** The six selectable quiz types on the `/quiz` setup screen. */
export type QuizMode = 'flags' | 'capitals' | 'currencies' | 'languages' | 'facts' | 'mixed'

export const QUIZ_MODES: readonly QuizMode[] = ['flags', 'capitals', 'currencies', 'languages', 'facts', 'mixed']

export function isQuizMode(value: unknown): value is QuizMode {
  return typeof value === 'string' && (QUIZ_MODES as readonly string[]).includes(value)
}

/**
 * Which countries a quiz may draw from. Deliberately named for the country
 * *pool*, not answering difficulty — see AnswerStyle below, which is an
 * independent axis (e.g. "World Expert + Multiple Choice" and
 * "Familiar + Type Answer" are both valid configurations).
 */
export type CountryPool = 'familiar' | 'explorer' | 'world-expert'

export const COUNTRY_POOLS: readonly CountryPool[] = ['familiar', 'explorer', 'world-expert']

export function isCountryPool(value: unknown): value is CountryPool {
  return typeof value === 'string' && (COUNTRY_POOLS as readonly string[]).includes(value)
}

/** How a question is answered — independent of CountryPool. */
export type AnswerStyle = 'multiple-choice' | 'type-answer'

export const ANSWER_STYLES: readonly AnswerStyle[] = ['multiple-choice', 'type-answer']

export function isAnswerStyle(value: unknown): value is AnswerStyle {
  return typeof value === 'string' && (ANSWER_STYLES as readonly string[]).includes(value)
}

/**
 * Number of questions in a quiz. 'unlimited' is a distinct typed value
 * (not, e.g., `Infinity` or `-1`) so callers can never mistake it for a
 * literal question count — see QUESTION_COUNTS/isQuestionCount below.
 */
export type QuestionCount = 5 | 10 | 'unlimited'

export const QUESTION_COUNTS: readonly QuestionCount[] = [5, 10, 'unlimited']

export function isQuestionCount(value: unknown): value is QuestionCount {
  return value === 5 || value === 10 || value === 'unlimited'
}

/** The full, persisted configuration for one quiz — the single shared shape every quiz-related screen reads/writes. */
export interface QuizConfig {
  mode: QuizMode
  countryPool: CountryPool
  answerStyle: AnswerStyle
  questionCount: QuestionCount
}

/**
 * The five substantive categories a Mixed quiz eventually draws from.
 * 'mixed' is deliberately excluded — it is the combination, not a category
 * of its own. See distributeMixedCounts() in config.ts for how a future
 * Mixed generator should balance questions across these.
 */
export type MixedCategory = Exclude<QuizMode, 'mixed'>

export const MIXED_CATEGORIES: readonly MixedCategory[] = ['flags', 'capitals', 'currencies', 'languages', 'facts']

/**
 * Per-category correct/total tally for a future Mixed quiz's results
 * breakdown (e.g. "Capitals 2/2"). A single-category quiz result has no use
 * for this — see QuizResult.breakdown below, which is only ever present for
 * a 'mixed' result.
 */
export interface CategoryScore {
  correct: number
  total: number
}

export type MixedBreakdown = Record<MixedCategory, CategoryScore>

/**
 * The outcome of one completed quiz — not produced anywhere yet (no
 * gameplay exists in this phase), but shaped now so the future shared
 * Quiz Results screen (Play Again / Change Quiz, and a category breakdown
 * for Mixed) has a stable contract to render against from day one.
 */
export interface QuizResult {
  config: QuizConfig
  correct: number
  total: number
  /** Present only when config.mode === 'mixed'. */
  breakdown?: MixedBreakdown
}

/**
 * One question as the future shared engine will consume it. `Prompt` and
 * `Answer` are left generic here — each quiz mode's own generator (not
 * built yet) will supply its own concrete shapes (e.g. a flag prompt is an
 * image URL, a capitals prompt is a country name; a multiple-choice answer
 * is one of several offered strings, a type-answer answer is free text).
 */
export interface QuizQuestion<Prompt = unknown, Answer = unknown> {
  category: MixedCategory
  prompt: Prompt
  answer: Answer
}

/**
 * The contract each quiz mode will implement to plug into the future
 * shared engine (current question / progress / score / answer validation /
 * next-question / completion / replay — none of which exists yet). A
 * 'mixed' quiz composes one generator per MIXED_CATEGORIES entry, drawn in
 * the balance distributeMixedCounts() computes, rather than being its own
 * generator.
 */
export interface QuestionGenerator<Prompt = unknown, Answer = unknown> {
  category: MixedCategory
  next(pool: CountryPool): QuizQuestion<Prompt, Answer>
}
