/**
 * Daily boundary policy (V1): the puzzle day is the **UTC calendar date**.
 *
 * Every player in the world switches to the next puzzle at the same instant
 * (00:00 UTC). This avoids browser-timezone quirks changing the answer, at the
 * cost of the reset not being at local midnight. The countdown in the results
 * modal uses the same functions, so the two can never disagree.
 *
 * Puzzle #1 is EPOCH_UTC. Puzzle number = whole UTC days since epoch + 1.
 */

export const DAY_MS = 86_400_000

/** First puzzle date, as a UTC timestamp. Do not change once launched. */
export const EPOCH_UTC = Date.UTC(2026, 8, 15) // 2026-09-15

/** Returns the start (00:00 UTC) of the UTC day containing `timestamp`. */
export function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_MS) * DAY_MS
}

/** 1-based puzzle number for a timestamp. Before the epoch this clamps to 1. */
export function getPuzzleNumber(timestamp: number = Date.now()): number {
  const days = Math.floor((startOfUtcDay(timestamp) - EPOCH_UTC) / DAY_MS)
  return Math.max(1, days + 1)
}

/** UTC start timestamp of a given puzzle number. */
export function getPuzzleStart(puzzleNumber: number): number {
  return EPOCH_UTC + (puzzleNumber - 1) * DAY_MS
}

/** Timestamp of the next daily reset after `timestamp`. */
export function getNextResetTime(timestamp: number = Date.now()): number {
  return startOfUtcDay(timestamp) + DAY_MS
}

export function msUntilNextReset(timestamp: number = Date.now()): number {
  return Math.max(0, getNextResetTime(timestamp) - timestamp)
}

/** "YYYY-MM-DD" key for the UTC day of a puzzle. */
export function getPuzzleDateKey(puzzleNumber: number): string {
  return new Date(getPuzzleStart(puzzleNumber)).toISOString().slice(0, 10)
}

/** Human-readable UTC date for a puzzle, e.g. "15 Sep 2026". */
export function formatPuzzleDate(puzzleNumber: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(getPuzzleStart(puzzleNumber)))
}

export interface Countdown {
  hours: number
  minutes: number
  seconds: number
}

export function splitCountdown(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function formatCountdown(ms: number): string {
  const { hours, minutes, seconds } = splitCountdown(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
