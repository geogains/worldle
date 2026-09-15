import { describe, expect, it } from 'vitest'
import {
  EPOCH_UTC,
  formatCountdown,
  getNextResetTime,
  getPuzzleDateKey,
  getPuzzleNumber,
  getPuzzleStart,
  msUntilNextReset,
  DAY_MS,
} from './date'

describe('daily date policy (UTC)', () => {
  it('epoch is puzzle #1 all day', () => {
    expect(getPuzzleNumber(EPOCH_UTC)).toBe(1)
    expect(getPuzzleNumber(EPOCH_UTC + DAY_MS - 1)).toBe(1)
  })
  it('increments at 00:00 UTC', () => {
    expect(getPuzzleNumber(EPOCH_UTC + DAY_MS)).toBe(2)
    expect(getPuzzleNumber(EPOCH_UTC + 10 * DAY_MS + 12345)).toBe(11)
  })
  it('never goes below 1 before the epoch', () => {
    expect(getPuzzleNumber(EPOCH_UTC - 5 * DAY_MS)).toBe(1)
  })
  it('puzzle start / date key round-trip', () => {
    expect(getPuzzleStart(1)).toBe(EPOCH_UTC)
    expect(getPuzzleDateKey(1)).toBe('2026-09-15')
    expect(getPuzzleDateKey(17)).toBe('2026-10-01')
    expect(getPuzzleNumber(getPuzzleStart(300))).toBe(300)
  })
  it('countdown agrees with puzzle boundary', () => {
    const t = EPOCH_UTC + 3 * DAY_MS + 5 * 3600_000
    expect(getNextResetTime(t)).toBe(EPOCH_UTC + 4 * DAY_MS)
    expect(getPuzzleNumber(getNextResetTime(t))).toBe(getPuzzleNumber(t) + 1)
    expect(msUntilNextReset(t)).toBe(19 * 3600_000)
    expect(formatCountdown(msUntilNextReset(t))).toBe('19:00:00')
    expect(formatCountdown(61_000)).toBe('00:01:01')
  })
})
