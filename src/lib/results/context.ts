import { findCountryById, type Country } from '../../data/countries'
import { getDailyAnswer } from '../daily/select'
import { deriveStatus } from '../game/validate'
import {
  loadArchive,
  loadDaily,
  loadPractice,
  loadResultPointer,
  saveResultPointer,
  type ResultSource,
  type SavedGame,
} from '../storage/schema'

export type { ResultSource } from '../storage/schema'

/**
 * Everything a country results page knows about how the player got there.
 * Absent (null) when the URL was reached without a matching completed game,
 * in which case the page renders as a standalone country page and never
 * shows performance data.
 */
export interface ResultContext {
  source: ResultSource
  country: Country
  status: 'won' | 'lost'
  guesses: string[]
  attempts: number
  /** Daily / archive puzzle number; null for practice. */
  puzzleNumber: number | null
}

interface Candidate extends ResultContext {
  updatedAt: number
}

function completed(game: SavedGame, country: Country): 'won' | 'lost' | null {
  // Re-derive from the guesses rather than trusting the stored status, so a
  // tampered or stale record can never show a fake result.
  const status = deriveStatus(game.guesses, country.normalized)
  return status === 'active' ? null : status
}

function candidate(
  source: ResultSource,
  country: Country,
  game: SavedGame,
  puzzleNumber: number | null,
): Candidate | null {
  const status = completed(game, country)
  if (!status) return null
  return {
    source,
    country,
    status,
    guesses: [...game.guesses],
    attempts: game.guesses.length,
    puzzleNumber,
    updatedAt: game.updatedAt,
  }
}

/** Every completed game in storage whose answer is `country`, across all modes. */
export function findCompletedGames(country: Country): Candidate[] {
  const out: Candidate[] = []
  const practice = loadPractice()
  if (practice && practice.answerId === country.id) {
    const c = candidate('practice', country, practice, null)
    if (c) out.push(c)
  }
  const daily = loadDaily()
  if (daily && getDailyAnswer(daily.puzzleNumber).id === country.id) {
    const c = candidate('daily', country, daily, daily.puzzleNumber)
    if (c) out.push(c)
  }
  for (const [key, game] of Object.entries(loadArchive())) {
    const n = Number(key)
    if (getDailyAnswer(n).id !== country.id) continue
    const c = candidate('archive', country, game, n)
    if (c) out.push(c)
  }
  return out
}

/**
 * Records which completed game a results page should present. Called right
 * before navigating to `/results/:slug`, and persisted so a refresh of that
 * URL lands on the same game.
 */
export function rememberResultSource(source: ResultSource, country: Country, puzzleNumber: number | null = null): void {
  saveResultPointer({ source, countryId: country.id, puzzleNumber, at: Date.now() })
}

/**
 * Resolves the completed game behind `/results/:slug`, or null when there is
 * none. Preference: the game the player explicitly navigated from (pointer),
 * then the most recently updated completed game for that country. Nothing is
 * ever fabricated — a candidate must exist in the mode's own store and be
 * complete according to its guesses.
 */
export function resolveResultContext(slug: string): ResultContext | null {
  const country = findCountryById(slug)
  if (!country) return null
  const candidates = findCompletedGames(country)
  if (candidates.length === 0) return null

  const pointer = loadResultPointer()
  if (pointer && pointer.countryId === country.id) {
    const match = candidates.find(
      (c) => c.source === pointer.source && (pointer.source === 'practice' || c.puzzleNumber === pointer.puzzleNumber),
    )
    if (match) return strip(match)
  }
  const latest = candidates.reduce((best, c) => (c.updatedAt > best.updatedAt ? c : best))
  return strip(latest)
}

function strip(c: Candidate): ResultContext {
  const { updatedAt: _updatedAt, ...ctx } = c
  return ctx
}
