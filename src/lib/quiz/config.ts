import {
  MIXED_CATEGORIES,
  type AnswerStyle,
  type CountryPool,
  type MixedCategory,
  type QuestionCount,
  type QuizConfig,
  type QuizMode,
} from './types'

/** What `/quiz` shows pre-selected on first open (see QuizScreen). */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  mode: 'flags',
  countryPool: 'familiar',
  answerStyle: 'multiple-choice',
  questionCount: 10,
}

export interface QuizModeOption {
  id: QuizMode
  label: string
  description: string
}

/**
 * Facts is deliberately not described as multiple-choice-only — its future
 * question phrasing puts the country itself as the answer (e.g. "Which
 * country is home to Mount Kilimanjaro?" -> "Tanzania"), and like every
 * other mode it must support both AnswerStyle values.
 */
export const QUIZ_MODE_OPTIONS: readonly QuizModeOption[] = [
  { id: 'flags', label: 'Flags', description: 'Identify countries from their flags.' },
  { id: 'capitals', label: 'Capitals', description: 'Test your knowledge of world capitals.' },
  { id: 'currencies', label: 'Currencies', description: 'Test your knowledge of country currencies.' },
  { id: 'languages', label: 'Languages', description: 'Test your knowledge of languages spoken around the world.' },
  { id: 'facts', label: 'Facts', description: 'Guess the country from a fact about it.' },
  { id: 'mixed', label: 'Mixed', description: 'A balanced mix of flags, capitals, currencies, languages and facts.' },
]

export interface CountryPoolOption {
  id: CountryPool
  label: string
  description: string
}

export const COUNTRY_POOL_OPTIONS: readonly CountryPoolOption[] = [
  { id: 'familiar', label: 'Familiar', description: 'The most recognisable, widely known countries.' },
  { id: 'explorer', label: 'Explorer', description: 'A balanced mix of familiar and less obvious countries.' },
  { id: 'world-expert', label: 'World Expert', description: 'The full supported country pool.' },
]

export interface AnswerStyleOption {
  id: AnswerStyle
  label: string
  description: string
}

export const ANSWER_STYLE_OPTIONS: readonly AnswerStyleOption[] = [
  { id: 'multiple-choice', label: 'Multiple Choice', description: 'Pick the right answer from a few options.' },
  { id: 'type-answer', label: 'Type Answer', description: 'Type the answer yourself.' },
]

export interface QuestionCountOption {
  id: QuestionCount
  label: string
}

export const QUESTION_COUNT_OPTIONS: readonly QuestionCountOption[] = [
  { id: 5, label: '5' },
  { id: 10, label: '10' },
  { id: 'unlimited', label: 'Unlimited' },
]

function labelFor<T extends { id: unknown; label: string }>(options: readonly T[], id: T['id']): string {
  return options.find((o) => o.id === id)?.label ?? String(id)
}

/**
 * "Flags · Familiar · Multiple Choice · 10 Questions", or "... · Unlimited"
 * when questionCount is 'unlimited' (no "Questions" suffix in that case).
 * Pure function of the config, so the setup screen can call it on every
 * selection change with no extra state.
 */
export function formatQuizSummary(config: QuizConfig): string {
  const mode = labelFor(QUIZ_MODE_OPTIONS, config.mode)
  const pool = labelFor(COUNTRY_POOL_OPTIONS, config.countryPool)
  const style = labelFor(ANSWER_STYLE_OPTIONS, config.answerStyle)
  const count = config.questionCount === 'unlimited' ? 'Unlimited' : `${config.questionCount} Questions`
  return `${mode} · ${pool} · ${style} · ${count}`
}

/**
 * Balanced per-category question counts for a future Mixed quiz generator
 * (not built yet — see MixedCategory/QuestionGenerator in types.ts). Splits
 * `total` as evenly as possible across the 5 MIXED_CATEGORIES, handing any
 * remainder to the first categories in order (e.g. 12 -> 3,3,2,2,2) so the
 * counts always sum back to `total` exactly.
 *
 * 'unlimited' has no fixed total and is intentionally not accepted here —
 * a future unlimited Mixed generator should instead round-robin through
 * MIXED_CATEGORIES continuously (e.g. `MIXED_CATEGORIES[i % 5]`) for a
 * continuously-balanced stream, which needs no total up front.
 */
export function distributeMixedCounts(total: number): Record<MixedCategory, number> {
  const n = MIXED_CATEGORIES.length
  const base = Math.floor(total / n)
  const remainder = total % n
  const counts = {} as Record<MixedCategory, number>
  MIXED_CATEGORIES.forEach((category, i) => {
    counts[category] = base + (i < remainder ? 1 : 0)
  })
  return counts
}
