import { describe, expect, it } from 'vitest'
import { computeTileSize } from './useBoardMetrics'

describe('computeTileSize', () => {
  it('caps at the max tile size on wide screens', () => {
    expect(computeTileSize(1200, 900, 5).tile).toBe(62)
  })
  it('fits 10 columns on a 320px phone', () => {
    const { tile, gap } = computeTileSize(320 - 16, 400, 10)
    expect(tile * 10 + gap * 9).toBeLessThanOrEqual(304)
    expect(tile).toBeGreaterThanOrEqual(26)
  })
  it('respects the height budget', () => {
    const { tile, gap } = computeTileSize(1000, 240, 4)
    expect(tile * 6 + gap * 5).toBeLessThanOrEqual(240)
  })
  it('keeps 10-column boards narrower than the max board width', () => {
    const { tile, gap } = computeTileSize(1000, 1000, 10)
    expect(tile * 10 + gap * 9).toBeLessThanOrEqual(500)
  })
})
