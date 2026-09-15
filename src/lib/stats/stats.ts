import { MAX_ATTEMPTS } from '../game/types'

export interface Stats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** Index 0 = solved in 1 guess … index 5 = solved in 6. */
  distribution: number[]
  /** Highest puzzle number that was completed (won or lost). */
  lastCompletedPuzzle: number | null
  /** Highest puzzle number that was won. */
  lastWonPuzzle: number | null
  /** Every daily puzzle number that has been completed, for idempotency. */
  completedPuzzles: number[]
}

export function createEmptyStats(): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array<number>(MAX_ATTEMPTS).fill(0),
    lastCompletedPuzzle: null,
    lastWonPuzzle: null,
    completedPuzzles: [],
  }
}

export interface DailyResult {
  puzzleNumber: number
  won: boolean
  /** Number of guesses used (1–6). Required when won. */
  attempts: number
}

/**
 * Applies a completed *daily* result. Idempotent: applying the same puzzle
 * number twice returns the input unchanged. Practice and archive games must
 * never call this.
 *
 * Streak rules (Wordle-style):
 *  - a win extends the streak only if the previous puzzle number was also won;
 *  - a loss resets the streak to zero;
 *  - skipping a day is treated as a break (see getCurrentStreak for display).
 */
export function applyDailyResult(stats: Stats, result: DailyResult): Stats {
  const { puzzleNumber, won, attempts } = result
  if (stats.completedPuzzles.includes(puzzleNumber)) return stats

  const distribution = stats.distribution.slice()
  let currentStreak: number
  if (won) {
    const consecutive = stats.lastWonPuzzle === puzzleNumber - 1
    currentStreak = consecutive ? stats.currentStreak + 1 : 1
    const bucket = Math.min(Math.max(attempts, 1), MAX_ATTEMPTS) - 1
    distribution[bucket] = (distribution[bucket] ?? 0) + 1
  } else {
    currentStreak = 0
  }

  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastCompletedPuzzle: Math.max(stats.lastCompletedPuzzle ?? 0, puzzleNumber),
    lastWonPuzzle: won ? Math.max(stats.lastWonPuzzle ?? 0, puzzleNumber) : stats.lastWonPuzzle,
    completedPuzzles: [...stats.completedPuzzles, puzzleNumber].sort((a, b) => a - b),
  }
}

/**
 * The streak to *display* for `todayPuzzleNumber`. A stored streak survives
 * only while the last win was yesterday (today still open) or today.
 */
export function getCurrentStreak(stats: Stats, todayPuzzleNumber: number): number {
  if (stats.lastWonPuzzle === null) return 0
  if (stats.lastWonPuzzle >= todayPuzzleNumber - 1) return stats.currentStreak
  return 0
}

export function getWinPercentage(stats: Stats): number {
  if (stats.played === 0) return 0
  return Math.round((stats.wins / stats.played) * 100)
}

export function hasCompletedPuzzle(stats: Stats, puzzleNumber: number): boolean {
  return stats.completedPuzzles.includes(puzzleNumber)
}
