import { findCountryById, isEligibleAnswer, type Country } from '../../data/countries'
import { loadPractice, savePractice, type SavedPractice } from '../storage/schema'
import { pickPracticeAnswer } from './select'

export interface PracticeGame {
  answer: Country
  saved: SavedPractice
}

/**
 * Starts a fresh practice game (random eligible answer, never the same as
 * `previousAnswerId`) and persists it. This is the one "Play again" path,
 * shared by the Practice screen and the country results page so both start
 * a new game identically.
 */
export function createPracticeGame(previousAnswerId: string | null): PracticeGame {
  const answer = pickPracticeAnswer(previousAnswerId)
  const saved: SavedPractice = {
    answerId: answer.id,
    previousAnswerId,
    guesses: [],
    current: '',
    status: 'active',
    updatedAt: Date.now(),
  }
  savePractice(saved)
  return { answer, saved }
}

/** The persisted practice game if it points at a valid, eligible answer; otherwise null. */
export function loadPracticeGame(): PracticeGame | null {
  const saved = loadPractice()
  const answer = saved ? findCountryById(saved.answerId) : undefined
  if (saved && answer && isEligibleAnswer(answer)) return { answer, saved }
  return null
}

/** Restores the saved practice game or starts a new one (avoiding the stale answer). */
export function restoreOrCreatePracticeGame(): PracticeGame {
  return loadPracticeGame() ?? createPracticeGame(loadPractice()?.answerId ?? null)
}
