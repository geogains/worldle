export interface QuizProgressProps {
  /** 0-based current question index. */
  index: number
  /** null for Unlimited — no fixed endpoint to display. */
  total: number | null
}

/** "3 / 10" + a fill bar for finite quizzes; "Question 14" (no total/bar) for Unlimited. */
export function QuizProgress({ index, total }: QuizProgressProps) {
  if (total === null) {
    return <p className="quiz-progress__label">Question {index + 1}</p>
  }
  return (
    <div className="quiz-progress">
      <p className="quiz-progress__label">
        Question {index + 1} of {total}
      </p>
      <div
        className="quiz-progress__bar"
        role="progressbar"
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Quiz progress"
      >
        <div className="quiz-progress__fill" style={{ width: `${(index / total) * 100}%` }} />
      </div>
    </div>
  )
}
