import { describe, expect, it } from 'vitest'
import { ANSWER_POOL } from '../../data/countries'
import { getDailyAnswer } from './select'

describe('getDailyAnswer', () => {
  it('is deterministic', () => {
    expect(getDailyAnswer(1)).toBe(getDailyAnswer(1))
    expect(getDailyAnswer(42).id).toBe(getDailyAnswer(42).id)
  })
  it('adjacent puzzles map to predictable, in-pool answers', () => {
    for (let n = 1; n <= 50; n++) {
      const c = getDailyAnswer(n)
      expect(ANSWER_POOL).toContain(c)
      expect(c.length).toBeGreaterThanOrEqual(4)
      expect(c.length).toBeLessThanOrEqual(10)
    }
  })
  it('does not repeat until the pool is exhausted', () => {
    const ids = new Set<string>()
    for (let n = 1; n <= ANSWER_POOL.length; n++) ids.add(getDailyAnswer(n).id)
    expect(ids.size).toBe(ANSWER_POOL.length)
    // second cycle also covers the full pool, in a different order
    const second: string[] = []
    for (let n = ANSWER_POOL.length + 1; n <= 2 * ANSWER_POOL.length; n++) second.push(getDailyAnswer(n).id)
    expect(new Set(second).size).toBe(ANSWER_POOL.length)
    const first = Array.from({ length: ANSWER_POOL.length }, (_, i) => getDailyAnswer(i + 1).id)
    expect(second).not.toEqual(first)
  })
  it('rejects out-of-range puzzle numbers', () => {
    expect(() => getDailyAnswer(0)).toThrow()
    expect(() => getDailyAnswer(-3)).toThrow()
    expect(() => getDailyAnswer(1.5)).toThrow()
  })
  it('the schedule is stable (snapshot of the first 10 answers)', () => {
    // If this test fails you changed the dataset or the seed. That silently
    // changes every future daily answer — only do so deliberately.
    const first = Array.from({ length: 10 }, (_, i) => getDailyAnswer(i + 1).id)
    expect(first).toMatchSnapshot()
  })
})
