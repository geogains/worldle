import { describe, expect, it } from 'vitest'
import { parseRoute, routeToPath } from './routes'

describe('parseRoute', () => {
  it('parses known routes', () => {
    expect(parseRoute('/')).toEqual({ name: 'daily' })
    expect(parseRoute('')).toEqual({ name: 'daily' })
    expect(parseRoute('/practice/')).toEqual({ name: 'practice' })
    expect(parseRoute('/archive')).toEqual({ name: 'archive' })
    expect(parseRoute('/archive/12')).toEqual({ name: 'archive-game', puzzleNumber: 12 })
  })
  it('rejects unknown paths', () => {
    expect(parseRoute('/archive/abc')).toEqual({ name: 'not-found', path: '/archive/abc' })
    expect(parseRoute('/nope')).toEqual({ name: 'not-found', path: '/nope' })
  })
  it('round-trips', () => {
    expect(routeToPath({ name: 'archive-game', puzzleNumber: 3 })).toBe('/archive/3')
    expect(routeToPath({ name: 'practice' })).toBe('/practice')
  })
})
