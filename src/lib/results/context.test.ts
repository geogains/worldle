import { beforeEach, describe, expect, it } from 'vitest'
import { findCountryById } from '../../data/countries'
import { getDailyAnswer } from '../daily/select'
import { storageKey } from '../storage/storage'
import { findCompletedGames, rememberResultSource, resolveResultContext } from './context'

const tanzania = findCountryById('tanzania')!
const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

describe('resolveResultContext', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns null for unknown slugs and for countries with no completed game', () => {
    expect(resolveResultContext('not-a-country')).toBeNull()
    expect(resolveResultContext('tanzania')).toBeNull()
  })

  it('ignores in-progress games (never fabricates a result)', () => {
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['ZIMBABWE'], current: 'TAN', status: 'active', updatedAt: 5 })
    expect(resolveResultContext('tanzania')).toBeNull()
    // A stored status that disagrees with the guesses is not trusted either.
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['ZIMBABWE'], current: '', status: 'won', updatedAt: 5 })
    expect(resolveResultContext('tanzania')).toBeNull()
  })

  it('resolves a completed practice game', () => {
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['ZIMBABWE', 'TANZANIA'], current: '', status: 'won', updatedAt: 5 })
    expect(resolveResultContext('tanzania')).toEqual({
      source: 'practice',
      country: tanzania,
      status: 'won',
      guesses: ['ZIMBABWE', 'TANZANIA'],
      attempts: 2,
      puzzleNumber: null,
    })
  })

  it('resolves a completed (lost) daily game with its puzzle number', () => {
    const n = 1
    const answer = getDailyAnswer(n)
    const wrong = answer.normalized === 'ZIMBABWE' ? 'TANZANIA' : 'ZIMBABWE'
    const guesses = Array(6).fill(wrong.slice(0, answer.length).padEnd(answer.length, 'A'))
    set('daily', { puzzleNumber: n, guesses, current: '', status: 'lost', updatedAt: 9 })
    const ctx = resolveResultContext(answer.id)
    expect(ctx).toMatchObject({ source: 'daily', status: 'lost', attempts: 6, puzzleNumber: n })
    expect(ctx?.country).toEqual(answer)
  })

  it('resolves completed archive replays', () => {
    const answer = getDailyAnswer(2)
    set('archive', { '2': { guesses: [answer.normalized], current: '', status: 'won', updatedAt: 3 } })
    expect(resolveResultContext(answer.id)).toMatchObject({ source: 'archive', puzzleNumber: 2, attempts: 1 })
  })

  it('prefers the game the player navigated from, then the most recent', () => {
    const n = 1
    const answer = getDailyAnswer(n)
    set('daily', { puzzleNumber: n, guesses: [answer.normalized], current: '', status: 'won', updatedAt: 10 })
    set('practice', { answerId: answer.id, previousAnswerId: null, guesses: ['ZIMBABWE'.slice(0, answer.length).padEnd(answer.length, 'A'), answer.normalized], current: '', status: 'won', updatedAt: 20 })
    expect(findCompletedGames(answer)).toHaveLength(2)
    // No pointer: most recently updated wins.
    expect(resolveResultContext(answer.id)?.source).toBe('practice')
    rememberResultSource('daily', answer, n)
    expect(resolveResultContext(answer.id)?.source).toBe('daily')
    // A pointer at a game that no longer exists falls back gracefully.
    rememberResultSource('archive', answer, 99)
    expect(resolveResultContext(answer.id)?.source).toBe('practice')
  })
})
