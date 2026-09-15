import { describe, expect, it, beforeEach } from 'vitest'
import { readJSON, writeJSON, storageKey, resetStorageBackendForTests } from './storage'
import {
  loadDaily,
  loadPractice,
  loadPrefs,
  loadStats,
  parseSavedArchive,
  parseSavedDaily,
  parseStats,
  saveDaily,
  saveArchiveGame,
  loadArchive,
} from './schema'
import { createEmptyStats } from '../stats/stats'

describe('storage', () => {
  beforeEach(() => resetStorageBackendForTests())

  it('namespaces and versions keys', () => {
    expect(storageKey('daily')).toBe('daily-worldle:v1:daily')
  })
  it('round-trips JSON', () => {
    writeJSON('x', { a: 1 })
    expect(readJSON('x', (v) => v as { a: number })).toEqual({ a: 1 })
  })
  it('returns null for malformed JSON instead of throwing', () => {
    window.localStorage.setItem(storageKey('daily'), '{not json')
    expect(loadDaily()).toBeNull()
  })
  it('rejects invalid daily shapes', () => {
    expect(parseSavedDaily({ guesses: ['abc'], puzzleNumber: 1 })).toBeNull() // lowercase
    expect(parseSavedDaily({ guesses: [], puzzleNumber: 0 })).toBeNull()
    expect(parseSavedDaily({ guesses: new Array(7).fill('SPAIN'), puzzleNumber: 1 })).toBeNull()
    expect(parseSavedDaily(null)).toBeNull()
    expect(parseSavedDaily({ guesses: ['SPAIN'], puzzleNumber: 2, current: 'CH' })).toMatchObject({
      guesses: ['SPAIN'],
      current: 'CH',
      puzzleNumber: 2,
      status: 'active',
    })
  })
  it('daily save/load', () => {
    saveDaily({ puzzleNumber: 3, guesses: ['SPAIN'], current: 'IT', status: 'active', updatedAt: 1 })
    expect(loadDaily()?.current).toBe('IT')
  })
  it('stats fall back to defaults field-by-field', () => {
    expect(parseStats({ played: 'x', distribution: [1, 2] })).toEqual(createEmptyStats())
    expect(parseStats({ played: 4, wins: 2, distribution: [1, 1, 0, 0, 0, 0], completedPuzzles: [2, 1, 1, -3] })).toMatchObject({
      played: 4,
      wins: 2,
      distribution: [1, 1, 0, 0, 0, 0],
      completedPuzzles: [1, 2],
    })
    expect(loadStats()).toEqual(createEmptyStats())
  })
  it('prefs, practice and archive parsers are tolerant', () => {
    expect(loadPrefs()).toEqual({ theme: 'system', hasSeenHelp: false })
    expect(loadPractice()).toBeNull()
    expect(parseSavedArchive({ '3': { guesses: ['PERU'] }, bad: { guesses: 1 }, '4': null })).toEqual({
      '3': { guesses: ['PERU'], current: '', status: 'active', updatedAt: 0 },
    })
    saveArchiveGame(5, { guesses: ['CHAD'], current: '', status: 'won', updatedAt: 9 })
    expect(loadArchive()['5']?.status).toBe('won')
  })
  it('falls back to memory when localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    resetStorageBackendForTests()
    expect(writeJSON('m', 1)).toBe(true)
    expect(readJSON('m', (v) => v as number)).toBe(1)
    if (original) Object.defineProperty(window, 'localStorage', original)
    resetStorageBackendForTests()
  })
})
