import type { Country } from '../../data/countries'

export interface PostGameSlotProps {
  country: Country
  mode: 'daily' | 'practice' | 'archive'
}

/**
 * Extension point for post-game content inside the Statistics and Archive
 * results modals (e.g. a promotional banner). The country information card
 * that this slot originally reserved space for now lives on its own route —
 * see screens/CountryResultScreen.tsx and components/results/ — so this
 * intentionally still renders nothing.
 */
export function PostGameSlot(_props: PostGameSlotProps) {
  return null
}
