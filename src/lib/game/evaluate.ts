import type { TileStatus } from './types'

/**
 * Classic two-pass Wordle evaluation with correct duplicate-letter handling.
 *
 * Pass 1: exact matches are marked correct and their answer letters consumed.
 * Pass 2: remaining guess letters are marked present only while an unconsumed
 * occurrence of that letter still exists in the answer; otherwise absent.
 *
 * Both inputs must already be normalized and of equal length.
 */
export function evaluateGuess(guess: string, answer: string): TileStatus[] {
  if (guess.length !== answer.length) {
    throw new Error(
      `evaluateGuess: guess length ${guess.length} does not match answer length ${answer.length}`,
    )
  }

  const result: TileStatus[] = new Array<TileStatus>(guess.length).fill('absent')
  const remaining = new Map<string, number>()

  for (let i = 0; i < guess.length; i++) {
    const g = guess[i] as string
    const a = answer[i] as string
    if (g === a) {
      result[i] = 'correct'
    } else {
      remaining.set(a, (remaining.get(a) ?? 0) + 1)
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue
    const g = guess[i] as string
    const left = remaining.get(g) ?? 0
    if (left > 0) {
      result[i] = 'present'
      remaining.set(g, left - 1)
    }
  }

  return result
}

export function isWinningGuess(guess: string, answer: string): boolean {
  return guess === answer
}
