import { describe, expect, it } from 'vitest'
import { applyDailyResult, createEmptyStats, getCurrentStreak, getWinPercentage } from './stats'

describe('applyDailyResult', () => {
  it('records a win', () => {
    const s = applyDailyResult(createEmptyStats(), { puzzleNumber: 1, won: true, attempts: 3 })
    expect(s.played).toBe(1)
    expect(s.wins).toBe(1)
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(1)
    expect(s.distribution).toEqual([0, 0, 1, 0, 0, 0])
    expect(s.lastWonPuzzle).toBe(1)
    expect(s.completedPuzzles).toEqual([1])
  })
  it('records a loss and resets the streak', () => {
    let s = applyDailyResult(createEmptyStats(), { puzzleNumber: 1, won: true, attempts: 2 })
    s = applyDailyResult(s, { puzzleNumber: 2, won: false, attempts: 6 })
    expect(s.played).toBe(2)
    expect(s.wins).toBe(1)
    expect(s.currentStreak).toBe(0)
    expect(s.maxStreak).toBe(1)
    expect(s.distribution).toEqual([0, 1, 0, 0, 0, 0])
    expect(s.lastWonPuzzle).toBe(1)
    expect(s.lastCompletedPuzzle).toBe(2)
  })
  it('increments the streak across consecutive days', () => {
    let s = createEmptyStats()
    for (let n = 1; n <= 5; n++) s = applyDailyResult(s, { puzzleNumber: n, won: true, attempts: 4 })
    expect(s.currentStreak).toBe(5)
    expect(s.maxStreak).toBe(5)
  })
  it('breaks the streak when a day is skipped', () => {
    let s = createEmptyStats()
    s = applyDailyResult(s, { puzzleNumber: 1, won: true, attempts: 4 })
    s = applyDailyResult(s, { puzzleNumber: 2, won: true, attempts: 4 })
    s = applyDailyResult(s, { puzzleNumber: 4, won: true, attempts: 4 })
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(2)
  })
  it('is idempotent for repeated completion of the same puzzle', () => {
    const once = applyDailyResult(createEmptyStats(), { puzzleNumber: 7, won: true, attempts: 1 })
    const twice = applyDailyResult(once, { puzzleNumber: 7, won: true, attempts: 1 })
    expect(twice).toBe(once)
    const lossAgain = applyDailyResult(once, { puzzleNumber: 7, won: false, attempts: 6 })
    expect(lossAgain).toBe(once)
  })
  it('does not mutate the input', () => {
    const base = createEmptyStats()
    applyDailyResult(base, { puzzleNumber: 1, won: true, attempts: 6 })
    expect(base).toEqual(createEmptyStats())
  })
  it('clamps attempts into the distribution range', () => {
    const s = applyDailyResult(createEmptyStats(), { puzzleNumber: 1, won: true, attempts: 99 })
    expect(s.distribution[5]).toBe(1)
  })
})

describe('getCurrentStreak (display)', () => {
  it('shows the stored streak when the last win was today or yesterday', () => {
    const s = applyDailyResult(createEmptyStats(), { puzzleNumber: 10, won: true, attempts: 3 })
    expect(getCurrentStreak(s, 10)).toBe(1)
    expect(getCurrentStreak(s, 11)).toBe(1)
  })
  it('shows zero once a day has been missed', () => {
    const s = applyDailyResult(createEmptyStats(), { puzzleNumber: 10, won: true, attempts: 3 })
    expect(getCurrentStreak(s, 12)).toBe(0)
  })
  it('is zero with no wins', () => {
    expect(getCurrentStreak(createEmptyStats(), 1)).toBe(0)
  })
})

describe('getWinPercentage', () => {
  it('rounds and handles zero', () => {
    expect(getWinPercentage(createEmptyStats())).toBe(0)
    expect(getWinPercentage({ ...createEmptyStats(), played: 3, wins: 2 })).toBe(67)
  })
})
