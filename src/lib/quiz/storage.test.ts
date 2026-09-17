import { beforeEach, describe, expect, it } from 'vitest'
import { resetStorageBackendForTests, storageKey } from '../storage/storage'
import { DEFAULT_QUIZ_CONFIG } from './config'
import { loadQuizConfig, parseQuizConfig, saveQuizConfig } from './storage'

describe('quiz config storage', () => {
  beforeEach(() => resetStorageBackendForTests())

  it('falls back to DEFAULT_QUIZ_CONFIG when nothing is saved yet', () => {
    expect(loadQuizConfig()).toEqual(DEFAULT_QUIZ_CONFIG)
  })

  it('round-trips a saved config exactly', () => {
    saveQuizConfig({ mode: 'currencies', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 'unlimited' })
    expect(loadQuizConfig()).toEqual({
      mode: 'currencies',
      countryPool: 'world-expert',
      answerStyle: 'type-answer',
      questionCount: 'unlimited',
    })
  })

  it('rejects malformed JSON, falling back to defaults instead of throwing', () => {
    window.localStorage.setItem(storageKey('quizConfig'), '{not json')
    expect(loadQuizConfig()).toEqual(DEFAULT_QUIZ_CONFIG)
  })

  it('parseQuizConfig rejects an invalid mode/pool/style/count', () => {
    expect(parseQuizConfig(null)).toBeNull()
    expect(parseQuizConfig({ mode: 'flag', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 10 })).toBeNull()
    expect(parseQuizConfig({ mode: 'flags', countryPool: 'easy', answerStyle: 'multiple-choice', questionCount: 10 })).toBeNull()
    expect(parseQuizConfig({ mode: 'flags', countryPool: 'familiar', answerStyle: 'hard', questionCount: 10 })).toBeNull()
    expect(parseQuizConfig({ mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 7 })).toBeNull()
  })

  it('a saved config persists across independent loadQuizConfig() calls (survives a simulated "Change Quiz" navigation)', () => {
    saveQuizConfig({ mode: 'mixed', countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    expect(loadQuizConfig().mode).toBe('mixed')
    expect(loadQuizConfig().countryPool).toBe('explorer')
  })
})
