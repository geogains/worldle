/**
 * Injectable randomness for quiz question/distractor generation. Every
 * function in lib/quiz that needs randomness takes a `RandomSource`
 * (defaulting to `Math.random`) instead of calling `Math.random()` directly,
 * so tests can pass a seeded/deterministic source and assert exact output —
 * no snapshot-of-real-randomness flakiness, and no heavyweight PRNG
 * dependency needed for a v1.
 */
export type RandomSource = () => number

export const defaultRandom: RandomSource = Math.random

/** Fisher-Yates shuffle. Does not mutate `items`. */
export function shuffle<T>(items: readonly T[], random: RandomSource = defaultRandom): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}

/** One random element, or undefined for an empty array. */
export function pick<T>(items: readonly T[], random: RandomSource = defaultRandom): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random() * items.length)]
}

/** Up to `count` unique random elements (fewer if `items` is smaller), order randomized. */
export function sample<T>(items: readonly T[], count: number, random: RandomSource = defaultRandom): T[] {
  return shuffle(items, random).slice(0, Math.max(0, count))
}
