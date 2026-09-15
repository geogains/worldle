import { useLayoutEffect, useState, type RefObject } from 'react'
import { MAX_ATTEMPTS } from '../lib/game/types'

export interface BoardMetrics {
  tile: number
  gap: number
}

const MAX_TILE = 62
const MAX_BOARD_WIDTH = 500

export function gapForColumns(columns: number): number {
  return columns <= 6 ? 5 : 4
}

/** Pure tile-size calculation: fits `columns` x 6 tiles inside width x height. */
export function computeTileSize(width: number, height: number, columns: number): BoardMetrics {
  const gap = gapForColumns(columns)
  const byWidth = (Math.min(width, MAX_BOARD_WIDTH) - (columns - 1) * gap) / columns
  const byHeight = (height - (MAX_ATTEMPTS - 1) * gap) / MAX_ATTEMPTS
  const tile = Math.floor(Math.max(20, Math.min(MAX_TILE, byWidth, byHeight)))
  return { tile, gap }
}

/**
 * Measures the board container with ResizeObserver and returns the largest
 * square tile that keeps the whole 6-row board visible without scrolling.
 */
export function useBoardMetrics(ref: RefObject<HTMLElement | null>, columns: number): BoardMetrics {
  const [metrics, setMetrics] = useState<BoardMetrics>(() => computeTileSize(360, 420, columns))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
      const next = computeTileSize(rect.width, rect.height, columns)
      setMetrics((prev) => (prev.tile === next.tile && prev.gap === next.gap ? prev : next))
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, columns])

  return metrics
}
