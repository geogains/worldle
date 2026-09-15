import { evaluateGuess } from './evaluate'
import type { KeyStatus, TileStatus } from './types'

const PRIORITY: Record<KeyStatus, number> = { unused: 0, absent: 1, present: 2, correct: 3 }

export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

/**
 * Aggregates knowledge from revealed guesses into per-letter key states.
 * A key never downgrades: GREEN > YELLOW > GRAY > UNUSED.
 */
export function computeKeyStates(
  revealedGuesses: readonly string[],
  answer: string,
): Record<string, KeyStatus> {
  const states: Record<string, KeyStatus> = {}
  for (const guess of revealedGuesses) {
    const statuses: TileStatus[] = evaluateGuess(guess, answer)
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i] as string
      const next = statuses[i] as TileStatus
      const prev = states[letter] ?? 'unused'
      if (PRIORITY[next] > PRIORITY[prev]) states[letter] = next
    }
  }
  return states
}
