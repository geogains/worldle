import { useRef, type CSSProperties } from 'react'
import { MAX_ATTEMPTS, type TileStatus } from '../../lib/game/types'
import { useBoardMetrics } from '../../hooks/useBoardMetrics'
import type { RevealTiming } from '../../hooks/useGameEngine'
import { Row } from './Row'

export interface BoardProps {
  columns: number
  guesses: readonly string[]
  evaluations: readonly (readonly TileStatus[])[]
  current: string
  revealingRow: number | null
  celebratingRow: number | null
  shakeToken: number
  popIndex: number | null
  timing: RevealTiming
  /** Whether the active row accepts input (affects labelling only). */
  active: boolean
}

export function Board(props: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tile, gap } = useBoardMetrics(containerRef, props.columns)

  const rows = []
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const guess = props.guesses[r]
    const isActive = guess === undefined && r === props.guesses.length && props.active
    rows.push(
      <Row
        key={r}
        rowIndex={r}
        columns={props.columns}
        letters={guess ?? (isActive ? props.current : '')}
        statuses={guess !== undefined ? props.evaluations[r] : undefined}
        revealing={props.revealingRow === r}
        celebrating={props.celebratingRow === r}
        shakeToken={isActive ? props.shakeToken : 0}
        popIndex={isActive ? props.popIndex : null}
        gap={gap}
      />,
    )
  }

  const style = {
    '--tile': `${tile}px`,
    '--flip-duration': `${props.timing.flipDuration}ms`,
    '--flip-stagger': `${props.timing.flipStagger}ms`,
    gap,
  } as CSSProperties

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col" style={style} role="grid" aria-label="Game board">
        {rows}
      </div>
    </div>
  )
}
