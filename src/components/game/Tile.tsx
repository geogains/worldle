import { memo, type CSSProperties } from 'react'
import type { TileState } from '../../lib/game/types'

export interface TileProps {
  letter: string
  state: TileState
  /** Column index, used for animation stagger. */
  index: number
  /** Animate a flip reveal into `state`. */
  flip?: boolean
  /** Animate the win bounce. */
  bounce?: boolean
  /** Animate the entry pop. */
  pop?: boolean
  /** Whether the letter should be announced with its status. */
  revealed?: boolean
  size?: 'board' | 'example'
}

const STATUS_LABEL: Record<TileState, string> = {
  empty: 'empty',
  filled: '',
  correct: 'correct',
  present: 'present in another position',
  absent: 'absent',
}

function TileComponent({ letter, state, index, flip, bounce, pop, revealed, size = 'board' }: TileProps) {
  const classes = ['tile', `tile--${state}`]
  if (size === 'example') classes.push('tile--example')
  if (flip) classes.push('tile--flip')
  if (bounce) classes.push('tile--bounce')
  if (pop) classes.push('tile--pop')

  const label = revealed && letter ? `${letter}, ${STATUS_LABEL[state]}` : letter || 'empty'
  const style = { '--i': index } as CSSProperties

  return (
    <div
      className={classes.join(' ')}
      style={style}
      role="gridcell"
      aria-label={label}
      data-state={state}
    >
      {letter}
    </div>
  )
}

export const Tile = memo(TileComponent)
