export type TileStatus = 'correct' | 'present' | 'absent'

/** Status of a tile that may not have been submitted yet. */
export type TileState = 'empty' | 'filled' | TileStatus

/** Keyboard key knowledge, in priority order (higher wins). */
export type KeyStatus = 'unused' | 'absent' | 'present' | 'correct'

export const MAX_ATTEMPTS = 6

export type GameStatus = 'active' | 'won' | 'lost'
