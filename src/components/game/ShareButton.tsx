import { useToast } from '../../hooks/useToast'
import { buildShareText, shareText } from '../../lib/share/share'
import { ShareIcon } from '../ui/icons'

export interface ShareButtonProps {
  puzzleNumber?: number | null
  guesses: readonly string[]
  answer: string
  won: boolean
  label?: string
  className?: string
}

export function ShareButton({ puzzleNumber, guesses, answer, won, label, className }: ShareButtonProps) {
  const { showToast } = useToast()
  const onShare = async () => {
    const text = buildShareText({ puzzleNumber: puzzleNumber ?? null, guesses, answer, won, label })
    const outcome = await shareText(text)
    if (outcome === 'copied') showToast('Results copied to clipboard')
    else if (outcome === 'failed') showToast("Couldn't share results")
  }
  return (
    <button type="button" className={`btn btn--primary ${className ?? ''}`} onClick={onShare}>
      Share
      <ShareIcon size={18} />
    </button>
  )
}
