import { beforeEach, describe, expect, it } from 'vitest'
import { storageKey } from '../storage/storage'
import { createPracticeGame, loadPracticeGame, restoreOrCreatePracticeGame } from './session'

describe('practice session', () => {
  beforeEach(() => window.localStorage.clear())

  it('creates and persists a new active game that avoids the previous answer', () => {
    const g = createPracticeGame('tanzania')
    expect(g.answer.id).not.toBe('tanzania')
    expect(g.saved).toMatchObject({ answerId: g.answer.id, previousAnswerId: 'tanzania', guesses: [], status: 'active' })
    expect(JSON.parse(window.localStorage.getItem(storageKey('practice')) ?? '{}').answerId).toBe(g.answer.id)
  })

  it('restores a saved game, including a completed one', () => {
    window.localStorage.setItem(
      storageKey('practice'),
      JSON.stringify({ answerId: 'tanzania', previousAnswerId: null, guesses: ['TANZANIA'], current: '', status: 'won', updatedAt: 1 }),
    )
    expect(loadPracticeGame()?.answer.id).toBe('tanzania')
    expect(restoreOrCreatePracticeGame().saved.status).toBe('won')
  })

  it('starts a fresh game when the saved answer is unknown', () => {
    window.localStorage.setItem(
      storageKey('practice'),
      JSON.stringify({ answerId: 'atlantis', previousAnswerId: null, guesses: [], current: '', status: 'active', updatedAt: 1 }),
    )
    expect(loadPracticeGame()).toBeNull()
    expect(restoreOrCreatePracticeGame().saved.previousAnswerId).toBe('atlantis')
  })
})
