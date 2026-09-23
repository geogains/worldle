import type { QuizPhase } from '../../hooks/useQuizEngine'

export interface ChoiceOption {
  id: string
  label: string
}

export interface MultipleChoiceAnswersProps {
  choices: readonly ChoiceOption[]
  correctId: string
  selectedId: string | null
  phase: QuizPhase
  onSelect: (id: string) => void
  /** Accessible label for the option group, e.g. "Answer options". */
  groupLabel: string
}

/**
 * Generic multiple-choice answer grid — not Flags-specific (just id/label
 * pairs), so Capitals/Currencies/Languages/Facts can reuse it unchanged.
 * Feedback never relies on colour alone: an .sr-only status suffix carries
 * correct/incorrect state in the button's accessible name independently of
 * the green/red background tint, without a visible tick/cross glyph (the
 * card colour itself is the intended visible signal — see the
 * quiz-answer--correct/--incorrect CSS).
 */
export function MultipleChoiceAnswers({ choices, correctId, selectedId, phase, onSelect, groupLabel }: MultipleChoiceAnswersProps) {
  const locked = phase !== 'answering'
  return (
    <div className="quiz-answers" role="radiogroup" aria-label={groupLabel}>
      {choices.map((choice) => {
        const isCorrect = choice.id === correctId
        const isSelected = choice.id === selectedId
        const showCorrect = locked && isCorrect
        const showIncorrect = locked && isSelected && !isCorrect
        const classes = ['quiz-answer']
        if (showCorrect) classes.push('quiz-answer--correct')
        if (showIncorrect) classes.push('quiz-answer--incorrect')
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={classes.join(' ')}
            disabled={locked}
            onClick={() => onSelect(choice.id)}
          >
            <span className="quiz-answer__label">{choice.label}</span>
            {showCorrect && <span className="sr-only"> — Correct answer</span>}
            {showIncorrect && <span className="sr-only"> — Incorrect answer</span>}
          </button>
        )
      })}
    </div>
  )
}
