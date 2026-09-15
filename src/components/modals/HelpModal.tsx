import { branding } from '../../config/branding'
import { getHelpExamples } from '../../lib/game/helpExamples'
import { Modal } from '../ui/Modal'
import { Tile } from '../game/Tile'

export interface HelpModalProps {
  open: boolean
  onClose: () => void
  /** Today's normalized answer, so the tutorial never shows it. */
  excludeAnswer: string | null
}

export function HelpModal({ open, onClose, excludeAnswer }: HelpModalProps) {
  const examples = getHelpExamples(excludeAnswer)
  return (
    <Modal open={open} onClose={onClose} title="How to play" maxWidth="max-w-[480px]">
      <h3 className="text-[1.6rem] leading-tight font-extrabold tracking-[-0.01em]">
        Guess the country in 6 tries.
      </h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.95rem] leading-snug">
        <li>Each guess must be a valid country.</li>
        <li>Each guess must contain the same number of letters as today's country.</li>
        <li>Spaces and punctuation are ignored — only letters count.</li>
        <li>The colour of the tiles shows how close your guess was.</li>
      </ul>

      <h4 className="mt-6 text-[0.95rem] font-bold">Examples</h4>
      <div className="mt-3 space-y-4">
        {examples.map((ex) => (
          <div key={ex.status}>
            <div className="flex gap-1.5" role="grid" aria-label={`Example: ${ex.word}`}>
              <div className="flex gap-1.5" role="row">
                {ex.word.split('').map((letter, i) => (
                  <Tile
                    key={i}
                    index={i}
                    letter={letter}
                    state={i === ex.index ? ex.status : 'filled'}
                    size="example"
                    revealed={i === ex.index}
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 text-[0.95rem]">
              <strong>{ex.word[ex.index]}</strong>
              {ex.text.slice(1)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-divider pt-4 text-[0.95rem] text-muted">
        A new {branding.name} is available every day. Try Practice for unlimited games, or replay
        past puzzles from the Archive.
      </p>
    </Modal>
  )
}
