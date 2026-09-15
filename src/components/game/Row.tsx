import { memo } from 'react'
import type { TileState, TileStatus } from '../../lib/game/types'
import { Tile } from './Tile'

export interface RowProps {
  rowIndex: number
  columns: number
  letters: string
  /** Present for submitted rows. */
  statuses?: readonly TileStatus[]
  /** This row is currently flipping. */
  revealing?: boolean
  /** This row is the winning row bouncing. */
  celebrating?: boolean
  /** Changing this value shakes the row. */
  shakeToken?: number
  /** Tile index to pop (active row). */
  popIndex?: number | null
  gap: number
}

function RowComponent({
  rowIndex,
  columns,
  letters,
  statuses,
  revealing,
  celebrating,
  shakeToken,
  popIndex,
  gap,
}: RowProps) {
  // Re-keying the row restarts the shake animation on every rejected submit.
  const shaking = Boolean(shakeToken)

  const submitted = statuses !== undefined
  const tiles = []
  for (let i = 0; i < columns; i++) {
    const letter = letters[i] ?? ''
    const state: TileState = submitted ? (statuses[i] ?? 'absent') : letter ? 'filled' : 'empty'
    tiles.push(
      <Tile
        key={i}
        index={i}
        letter={letter}
        state={state}
        flip={revealing}
        bounce={celebrating}
        pop={!submitted && popIndex === i}
        revealed={submitted && !revealing}
      />,
    )
  }

  const label = submitted
    ? `Row ${rowIndex + 1}, ${letters}`
    : letters
      ? `Row ${rowIndex + 1}, in progress`
      : `Row ${rowIndex + 1}, empty`

  return (
    <div
      key={shakeToken ?? 0}
      className={`flex${shaking ? ' row--shake' : ''}`}
      style={{ gap }}
      role="row"
      aria-label={label}
    >
      {tiles}
    </div>
  )
}

export const Row = memo(RowComponent)
