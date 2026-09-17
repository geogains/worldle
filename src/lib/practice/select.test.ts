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
  it('can select Taiwan as a Practice answer', () => {
    const taiwanIndex = ANSWER_POOL.findIndex((c) => c.id === 'taiwan')
    expect(taiwanIndex).toBeGreaterThanOrEqual(0)
    const picked = pickPracticeAnswer(null, ANSWER_POOL, () => taiwanIndex / ANSWER_POOL.length)
    expect(picked.id).toBe('taiwan')
  })
  it('can select Kosovo as a Practice answer', () => {
    const kosovoIndex = ANSWER_POOL.findIndex((c) => c.id === 'kosovo')
    expect(kosovoIndex).toBeGreaterThanOrEqual(0)
    const picked = pickPracticeAnswer(null, ANSWER_POOL, () => kosovoIndex / ANSWER_POOL.length)
    expect(picked.id).toBe('kosovo')
  })
  it('can select England, Scotland or Wales as a Practice answer, automatically via ANSWER_POOL (no special-casing needed)', () => {
    for (const id of ['england', 'scotland', 'wales']) {
      const index = ANSWER_POOL.findIndex((c) => c.id === id)
      expect(index, id).toBeGreaterThanOrEqual(0)
      // (index + 0.5) / length lands solidly inside the target bucket,
      // avoiding a floating-point round-trip landing just under the index
      // (e.g. index/length * length evaluating to index - epsilon).
      const picked = pickPracticeAnswer(null, ANSWER_POOL, () => (index + 0.5) / ANSWER_POOL.length)
      expect(picked.id, id).toBe(id)
    }
  })
})
