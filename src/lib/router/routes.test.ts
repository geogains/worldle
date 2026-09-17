import { describe, expect, it } from 'vitest'
import { parseRoute, routeToPath } from './routes'

describe('parseRoute', () => {
  it('parses known routes', () => {
    expect(parseRoute('/')).toEqual({ name: 'daily' })
    expect(parseRoute('')).toEqual({ name: 'daily' })
    expect(parseRoute('/practice/')).toEqual({ name: 'practice' })
    expect(parseRoute('/archive')).toEqual({ name: 'archive' })
    expect(parseRoute('/archive/12')).toEqual({ name: 'archive-game', puzzleNumber: 12 })
    expect(parseRoute('/study')).toEqual({ name: 'study' })
    expect(parseRoute('/study/')).toEqual({ name: 'study' })
    expect(parseRoute('/quiz')).toEqual({ name: 'quiz' })
    expect(parseRoute('/quiz/')).toEqual({ name: 'quiz' })
  })
  it('parses each future gameplay route (/quiz/:mode) for a real QuizMode', () => {
    expect(parseRoute('/quiz/flags')).toEqual({ name: 'quiz-play', mode: 'flags' })
    expect(parseRoute('/quiz/capitals')).toEqual({ name: 'quiz-play', mode: 'capitals' })
    expect(parseRoute('/quiz/currencies')).toEqual({ name: 'quiz-play', mode: 'currencies' })
    expect(parseRoute('/quiz/languages')).toEqual({ name: 'quiz-play', mode: 'languages' })
    expect(parseRoute('/quiz/facts')).toEqual({ name: 'quiz-play', mode: 'facts' })
    expect(parseRoute('/quiz/mixed/')).toEqual({ name: 'quiz-play', mode: 'mixed' })
  })
  it('rejects a /quiz/* path that is not a real QuizMode', () => {
    expect(parseRoute('/quiz/nope')).toEqual({ name: 'not-found', path: '/quiz/nope' })
    expect(parseRoute('/quiz/Flags')).toEqual({ name: 'not-found', path: '/quiz/Flags' })
  })
  it('parses country results routes by slug shape', () => {
    expect(parseRoute('/results/tanzania')).toEqual({ name: 'results', countrySlug: 'tanzania' })
    expect(parseRoute('/results/costa-rica/')).toEqual({ name: 'results', countrySlug: 'costa-rica' })
    // Case-insensitive on the way in; the canonical slug is lowercase.
    expect(parseRoute('/results/Tanzania')).toEqual({ name: 'results', countrySlug: 'tanzania' })
    // Unknown countries still parse as a results route; the screen resolves them.
    expect(parseRoute('/results/not-a-country')).toEqual({ name: 'results', countrySlug: 'not-a-country' })
  })
  it('rejects malformed results paths', () => {
    expect(parseRoute('/results')).toEqual({ name: 'not-found', path: '/results' })
    expect(parseRoute('/results/')).toEqual({ name: 'not-found', path: '/results' })
    expect(parseRoute('/results/tanzania/extra')).toEqual({ name: 'not-found', path: '/results/tanzania/extra' })
    expect(parseRoute('/results/tan_zania')).toEqual({ name: 'not-found', path: '/results/tan_zania' })
  })
  it('rejects unknown paths', () => {
    expect(parseRoute('/archive/abc')).toEqual({ name: 'not-found', path: '/archive/abc' })
    expect(parseRoute('/nope')).toEqual({ name: 'not-found', path: '/nope' })
  })
  it('round-trips', () => {
    expect(routeToPath({ name: 'archive-game', puzzleNumber: 3 })).toBe('/archive/3')
    expect(routeToPath({ name: 'practice' })).toBe('/practice')
    expect(routeToPath({ name: 'study' })).toBe('/study')
    expect(routeToPath({ name: 'quiz' })).toBe('/quiz')
    expect(routeToPath({ name: 'quiz-play', mode: 'facts' })).toBe('/quiz/facts')
    expect(routeToPath({ name: 'results', countrySlug: 'tanzania' })).toBe('/results/tanzania')
  })
})
