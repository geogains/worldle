import { MAX_ATTEMPTS, type GameStatus } from '../game/types'
import { createEmptyStats, type Stats } from '../stats/stats'
import {
  isNonNegativeInt,
  isNumberArray,
  isRecord,
  isStringArray,
  readJSON,
  writeJSON,
} from './storage'

/* ------------------------------ key names ------------------------------ */

export const KEYS = {
  daily: 'daily',
  stats: 'stats',
  prefs: 'prefs',
  practice: 'practice',
  archive: 'archive',
  lastResult: 'lastResult',
} as const

/* ------------------------------ shared ------------------------------ */

const STATUSES: readonly GameStatus[] = ['active', 'won', 'lost']

function isStatus(v: unknown): v is GameStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v)
}

function isGuessList(v: unknown): v is string[] {
  return isStringArray(v) && v.length <= MAX_ATTEMPTS && v.every((g) => /^[A-Z]*$/.test(g))
}

/** Persisted progress for a single game (any mode). */
export interface SavedGame {
  guesses: string[]
  current: string
  /** Derived from guesses on load; stored for convenience (archive list). */
  status: GameStatus
  updatedAt: number
}

export function parseSavedGame(raw: unknown): SavedGame | null {
  if (!isRecord(raw)) return null
  if (!isGuessList(raw.guesses)) return null
  const current = typeof raw.current === 'string' && /^[A-Z]*$/.test(raw.current) ? raw.current : ''
  const status = isStatus(raw.status) ? raw.status : 'active'
  const updatedAt = isNonNegativeInt(raw.updatedAt) ? raw.updatedAt : 0
  return { guesses: raw.guesses, current, status, updatedAt }
}

/* ------------------------------ daily ------------------------------ */

export interface SavedDaily extends SavedGame {
  puzzleNumber: number
}

export function parseSavedDaily(raw: unknown): SavedDaily | null {
  const game = parseSavedGame(raw)
  if (!game || !isRecord(raw)) return null
  if (!isNonNegativeInt(raw.puzzleNumber) || raw.puzzleNumber < 1) return null
  return { ...game, puzzleNumber: raw.puzzleNumber }
}

export function loadDaily(): SavedDaily | null {
  return readJSON(KEYS.daily, parseSavedDaily)
}

export function saveDaily(value: SavedDaily): void {
  writeJSON(KEYS.daily, value)
}

/* ------------------------------ practice ------------------------------ */

export interface SavedPractice extends SavedGame {
  answerId: string
  /** Previous answer id, used to avoid an immediate repeat on Play Again. */
  previousAnswerId: string | null
}

export function parseSavedPractice(raw: unknown): SavedPractice | null {
  const game = parseSavedGame(raw)
  if (!game || !isRecord(raw)) return null
  if (typeof raw.answerId !== 'string' || raw.answerId.length === 0) return null
  const previousAnswerId = typeof raw.previousAnswerId === 'string' ? raw.previousAnswerId : null
  return { ...game, answerId: raw.answerId, previousAnswerId }
}

export function loadPractice(): SavedPractice | null {
  return readJSON(KEYS.practice, parseSavedPractice)
}

export function savePractice(value: SavedPractice): void {
  writeJSON(KEYS.practice, value)
}

/* ------------------------------ archive ------------------------------ */

/** Replay progress keyed by puzzle number (string keys because JSON). */
export type SavedArchive = Record<string, SavedGame>

export function parseSavedArchive(raw: unknown): SavedArchive | null {
  if (!isRecord(raw)) return null
  const out: SavedArchive = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) continue
    const game = parseSavedGame(value)
    if (game) out[key] = game
  }
  return out
}

export function loadArchive(): SavedArchive {
  return readJSON(KEYS.archive, parseSavedArchive) ?? {}
}

export function saveArchiveGame(puzzleNumber: number, game: SavedGame): void {
  const archive = loadArchive()
  archive[String(puzzleNumber)] = game
  writeJSON(KEYS.archive, archive)
}

/* ------------------------------ last result ------------------------------ */

export type ResultSource = 'daily' | 'practice' | 'archive'

const RESULT_SOURCES: readonly ResultSource[] = ['daily', 'practice', 'archive']

/**
 * Pointer to the completed game the player most recently carried into a
 * `/results/:slug` page. Not a copy of the game — the practice/daily/archive
 * stores stay the single source of truth for guesses — just enough to know
 * *which* of them to show when the same country was completed in more than
 * one mode, and to survive a refresh of the results URL.
 */
export interface SavedResultPointer {
  source: ResultSource
  countryId: string
  puzzleNumber: number | null
  at: number
}

export function parseResultPointer(raw: unknown): SavedResultPointer | null {
  if (!isRecord(raw)) return null
  if (typeof raw.source !== 'string' || !(RESULT_SOURCES as readonly string[]).includes(raw.source)) return null
  if (typeof raw.countryId !== 'string' || raw.countryId.length === 0) return null
  const puzzleNumber = isNonNegativeInt(raw.puzzleNumber) && raw.puzzleNumber > 0 ? raw.puzzleNumber : null
  const at = isNonNegativeInt(raw.at) ? raw.at : 0
  return { source: raw.source as ResultSource, countryId: raw.countryId, puzzleNumber, at }
}

export function loadResultPointer(): SavedResultPointer | null {
  return readJSON(KEYS.lastResult, parseResultPointer)
}

export function saveResultPointer(value: SavedResultPointer): void {
  writeJSON(KEYS.lastResult, value)
}

/* ------------------------------ stats ------------------------------ */

export function parseStats(raw: unknown): Stats | null {
  if (!isRecord(raw)) return null
  const base = createEmptyStats()
  const distribution =
    isNumberArray(raw.distribution) && raw.distribution.length === MAX_ATTEMPTS
      ? raw.distribution.map((n) => Math.max(0, Math.floor(n)))
      : base.distribution
  const completedPuzzles = isNumberArray(raw.completedPuzzles)
    ? Array.from(new Set(raw.completedPuzzles.filter((n) => Number.isInteger(n) && n > 0))).sort(
        (a, b) => a - b,
      )
    : base.completedPuzzles
  const nullableInt = (v: unknown): number | null => (isNonNegativeInt(v) && v > 0 ? v : null)
  return {
    played: isNonNegativeInt(raw.played) ? raw.played : base.played,
    wins: isNonNegativeInt(raw.wins) ? raw.wins : base.wins,
    currentStreak: isNonNegativeInt(raw.currentStreak) ? raw.currentStreak : base.currentStreak,
    maxStreak: isNonNegativeInt(raw.maxStreak) ? raw.maxStreak : base.maxStreak,
    distribution,
    lastCompletedPuzzle: nullableInt(raw.lastCompletedPuzzle),
    lastWonPuzzle: nullableInt(raw.lastWonPuzzle),
    completedPuzzles,
  }
}

export function loadStats(): Stats {
  return readJSON(KEYS.stats, parseStats) ?? createEmptyStats()
}

export function saveStats(stats: Stats): void {
  writeJSON(KEYS.stats, stats)
}

/* ------------------------------ prefs ------------------------------ */

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Prefs {
  theme: ThemePreference
  hasSeenHelp: boolean
}

export function createDefaultPrefs(): Prefs {
  return { theme: 'system', hasSeenHelp: false }
}

export function parsePrefs(raw: unknown): Prefs | null {
  if (!isRecord(raw)) return null
  const theme =
    raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? raw.theme : 'system'
  return { theme, hasSeenHelp: raw.hasSeenHelp === true }
}

export function loadPrefs(): Prefs {
  return readJSON(KEYS.prefs, parsePrefs) ?? createDefaultPrefs()
}

export function savePrefs(prefs: Prefs): void {
  writeJSON(KEYS.prefs, prefs)
}
