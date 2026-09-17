import { isRecord, readJSON, writeJSON } from '../storage/storage'
import { DEFAULT_QUIZ_CONFIG } from './config'
import { isAnswerStyle, isCountryPool, isQuestionCount, isQuizMode, type QuizConfig } from './types'

/**
 * Persisted quiz configuration — the simplest storage that supports every
 * Phase 1 requirement: Start Quiz reads the current selections, a future
 * Play Again reuses the exact same config, and Change Quiz (back to
 * `/quiz`) reopens with the previous selections still made, because they
 * were never cleared. Uses the same namespaced localStorage primitives as
 * every other saved slice (prefs/daily/practice/archive — see
 * lib/storage/storage.ts and schema.ts), under its own key so it can't
 * collide with those.
 */
const KEY = 'quizConfig'

export function parseQuizConfig(raw: unknown): QuizConfig | null {
  if (!isRecord(raw)) return null
  if (!isQuizMode(raw.mode)) return null
  if (!isCountryPool(raw.countryPool)) return null
  if (!isAnswerStyle(raw.answerStyle)) return null
  if (!isQuestionCount(raw.questionCount)) return null
  return { mode: raw.mode, countryPool: raw.countryPool, answerStyle: raw.answerStyle, questionCount: raw.questionCount }
}

/** Falls back to DEFAULT_QUIZ_CONFIG when nothing (valid) is saved yet. */
export function loadQuizConfig(): QuizConfig {
  return readJSON(KEY, parseQuizConfig) ?? DEFAULT_QUIZ_CONFIG
}

export function saveQuizConfig(config: QuizConfig): void {
  writeJSON(KEY, config)
}
