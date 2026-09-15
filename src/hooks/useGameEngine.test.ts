import { describe, expect, it } from 'vitest'
import { createEngineState, engineReducer, revealDuration, FULL_MOTION } from './useGameEngine'

describe('engineReducer', () => {
  const base = createEngineState([], '', 'SPAIN')

  it('adds letters up to the answer length', () => {
    let s = base
    for (const l of 'SPAINX') s = engineReducer(s, { type: 'ADD_LETTER', letter: l, maxLength: 5 })
    expect(s.input).toBe('SPAIN')
    expect(s.popIndex).toBe(4)
  })
  it('deletes letters', () => {
    let s = engineReducer(base, { type: 'ADD_LETTER', letter: 'S', maxLength: 5 })
    s = engineReducer(s, { type: 'DELETE_LETTER' })
    expect(s.input).toBe('')
    expect(engineReducer(s, { type: 'DELETE_LETTER' })).toBe(s)
  })
  it('submits, reveals and wins', () => {
    let s = engineReducer(base, { type: 'SUBMIT', guess: 'SPAIN' })
    expect(s.phase).toBe('revealing')
    expect(engineReducer(s, { type: 'ADD_LETTER', letter: 'A', maxLength: 5 })).toBe(s)
    expect(engineReducer(s, { type: 'SUBMIT', guess: 'CHILE' })).toBe(s)
    s = engineReducer(s, { type: 'REVEAL_DONE', answer: 'SPAIN' })
    expect(s.phase).toBe('won')
    expect(s.celebrating).toBe(true)
  })
  it('loses after six wrong guesses', () => {
    let s = base
    for (let i = 0; i < 6; i++) {
      s = engineReducer(s, { type: 'SUBMIT', guess: 'CHILE' })
      s = engineReducer(s, { type: 'REVEAL_DONE', answer: 'SPAIN' })
    }
    expect(s.phase).toBe('lost')
    expect(s.guesses).toHaveLength(6)
  })
  it('restores completed games as already handled', () => {
    const won = createEngineState(['CHILE', 'SPAIN'], 'ZZ', 'SPAIN')
    expect(won.phase).toBe('won')
    expect(won.input).toBe('')
    expect(won.completionHandled).toBe(true)
    const active = createEngineState(['CHILE'], 'ITA', 'SPAIN')
    expect(active.phase).toBe('active')
    expect(active.input).toBe('ITA')
    expect(active.completionHandled).toBe(false)
  })
  it('reveal duration scales with columns', () => {
    expect(revealDuration(5, FULL_MOTION)).toBe(4 * 280 + 520)
  })
})
