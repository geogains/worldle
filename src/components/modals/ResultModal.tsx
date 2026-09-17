import type { ReactNode } from 'react'
import type { Country } from '../../data/countries'
import { Modal } from '../ui/Modal'
import { ShareButton } from '../game/ShareButton'
import { PostGameSlot } from '../game/PostGameSlot'

export interface ResultModalProps {
  open: boolean
  onClose: () => void
  title: string
  mode: 'practice' | 'archive'
  answer: Country
  guesses: readonly string[]
  won: boolean
  shareLabel: string
  sharePuzzleNumber?: number | null
  /** Main next step (coral primary), e.g. "Play again". */
  primaryAction: ReactNode
  /** Quiet text action rendered last, e.g. "Back to today's puzzle". */
  tertiaryAction?: ReactNode
}

const WIN_HEADLINES = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew']

export function ResultModal(props: ResultModalProps) {
  const { open, onClose, title, mode, answer, guesses, won, shareLabel, sharePuzzleNumber, primaryAction, tertiaryAction } =
    props
  const headline = won ? (WIN_HEADLINES[guesses.length - 1] ?? 'Well done') : 'Not this time'
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-center text-[1.6rem] font-extrabold tracking-[-0.01em] text-ink">{headline}</p>
      <p className="mt-2 text-center text-[0.95rem]">
        {won ? `You got it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}. ` : ''}
        The country was <strong className="font-extrabold uppercase">{answer.name}</strong>
      </p>
      <PostGameSlot country={answer} mode={mode} />
      <div className="mt-7 flex flex-col items-stretch gap-3">
        {primaryAction}
        <ShareButton
          guesses={guesses}
          answer={answer.normalized}
          won={won}
          label={shareLabel}
          puzzleNumber={sharePuzzleNumber ?? null}
          variant="secondary"
        />
        {tertiaryAction && <div className="mt-1 flex justify-center">{tertiaryAction}</div>}
      </div>
    </Modal>
  )
}
