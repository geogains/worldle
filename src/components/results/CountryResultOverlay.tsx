import type { ReactNode } from 'react'
import type { CountryDetails } from '../../data/countryDetails'
import type { ResultContext } from '../../lib/results/context'
import { Modal } from '../ui/Modal'
import { CountryResultCard } from './CountryResultCard'

export interface CountryResultOverlayProps {
  open: boolean
  onClose: () => void
  details: CountryDetails
  context: ResultContext | null
  primaryAction: ReactNode
  secondaryAction?: ReactNode
  tertiaryAction?: ReactNode
}

/**
 * The country result card presented as a dialog over the completed game.
 * Delegates dialog semantics, backdrop, focus trap/restoration, Escape and
 * enter/exit motion to the shared Modal so it behaves exactly like every
 * other Worldle overlay. Closing never navigates — the route stays put and
 * the completed board beneath simply becomes interactive again.
 */
export function CountryResultOverlay(props: CountryResultOverlayProps) {
  const { open, onClose, details, ...card } = props
  return (
    <Modal open={open} onClose={onClose} title={`${details.name} results`} hideTitle maxWidth="max-w-[600px]">
      <CountryResultCard details={details} {...card} />
    </Modal>
  )
}
