import type { Country } from '../../data/countries'

export interface PostGameSlotProps {
  country: Country
  mode: 'daily' | 'practice' | 'archive'
}

/**
 * Extension point for V2 post-game content (country information card,
 * promotional banner). Rendered inside the results modal once a game is
 * complete, i.e. only after the answer is known. Intentionally renders
 * nothing in V1 so no empty space is reserved.
 */
export function PostGameSlot(_props: PostGameSlotProps) {
  return null
}
