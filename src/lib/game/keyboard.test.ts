import { describe, expect, it } from 'vitest'
import { computeKeyStates } from './keyboard'

describe('computeKeyStates', () => {
  it('reports states with correct priority', () => {
    // answer SPAIN, guess PAINS -> P present, A present, I present, N present, S present
    const s1 = computeKeyStates(['CHILE'], 'SPAIN')
    expect(s1.I).toBe('present')
    expect(s1.C).toBe('absent')
    expect(s1.S).toBeUndefined()
  })
  it('never downgrades a green key', () => {
    // answer SAMOA; guess SPAIN -> S correct, A present. then guess ... A absent? can't be, but
    // a later guess that puts S in the wrong place must keep S green.
    const s = computeKeyStates(['SPAIN', 'OSSSS'], 'SAMOA')
    expect(s.S).toBe('correct')
    expect(s.A).toBe('present')
    expect(s.O).toBe('present')
  })
  it('upgrades yellow to green', () => {
    const s = computeKeyStates(['ITALY', 'SAMOA'], 'SAMOA')
    expect(s.A).toBe('correct')
  })
  it('a duplicate letter marked absent in one slot does not downgrade a green elsewhere', () => {
    // answer SAMOA, guess AAAAA -> A correct at 1 & 4, absent elsewhere. Key must be green.
    const s = computeKeyStates(['AAAAA'], 'SAMOA')
    expect(s.A).toBe('correct')
  })
})
