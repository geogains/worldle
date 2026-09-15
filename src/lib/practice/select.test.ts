import { describe, expect, it } from 'vitest'
import { ANSWER_POOL } from '../../data/countries'
import { pickPracticeAnswer } from './select'

describe('pickPracticeAnswer', () => {
  it('returns an eligible country', () => {
    const c = pickPracticeAnswer()
    expect(ANSWER_POOL).toContain(c)
  })
  it('never immediately repeats the previous answer', () => {
    const prev = ANSWER_POOL[0]!
    for (let i = 0; i < 200; i++) {
      expect(pickPracticeAnswer(prev.id).id).not.toBe(prev.id)
    }
  })
  it('handles random() returning 1', () => {
    expect(() => pickPracticeAnswer(null, ANSWER_POOL, () => 1)).not.toThrow()
  })
})
