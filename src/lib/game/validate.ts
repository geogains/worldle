import { findCountryByNormalized, type Country } from '../../data/countries'
import { MAX_ATTEMPTS, type GameStatus } from './types'

export type GuessValidation =
  | { ok: true; country: Country }
  | { ok: false; reason: 'too-short' | 'wrong-length' | 'not-a-country' }

/**
 * A guess is valid only when it is a known country whose normalized name has
 * exactly `answerLength` letters. Ordinary words are never accepted.
 */
export function validateGuess(normalizedGuess: string, answerLength: number): GuessValidation {
  if (normalizedGuess.length < answerLength) {
    return { ok: false, reason: 'too-short' }
  }
  const country = findCountryByNormalized(normalizedGuess)
  if (!country) {
    return { ok: false, reason: 'not-a-country' }
  }
  if (country.length !== answerLength) {
    return { ok: false, reason: 'wrong-length' }
  }
  return { ok: true, country }
}

export function validationMessage(
  reason: Exclude<GuessValidation, { ok: true }>['reason'],
  answerLength: number,
): string {
  switch (reason) {
    case 'too-short':
      return 'Not enough letters'
    case 'wrong-length':
      return `Country must contain ${answerLength} letters`
    case 'not-a-country':
      return 'Not a valid country'
  }
}

/** Derives the game status purely from submitted guesses. */
export function deriveStatus(guesses: readonly string[], answer: string): GameStatus {
  if (guesses.length > 0 && guesses[guesses.length - 1] === answer) return 'won'
  if (guesses.length >= MAX_ATTEMPTS) return 'lost'
  return 'active'
}
