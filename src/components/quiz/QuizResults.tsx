import { ANSWER_STYLE_OPTIONS, COUNTRY_POOL_OPTIONS, QUIZ_MODE_OPTIONS } from '../../lib/quiz/config'
import type { QuizConfig } from '../../lib/quiz/types'

export interface QuizResultsProps {
  config: QuizConfig
  correct: number
  total: number
  onPlayAgain: () => void
  onChangeQuiz: () => void
}

function labelOf<T extends { id: unknown; label: string }>(options: readonly T[], id: T['id']): string {
  return options.find((o) => o.id === id)?.label ?? String(id)
}

/**
 * Shared quiz results screen — deliberately not Flags-specific (reads only
 * `QuizConfig` + a correct/total tally), so Capitals/Currencies/Languages/
 * Facts can render through this same component later. A Mixed category
 * breakdown is intentionally not rendered yet (QuizResult.breakdown from
 * lib/quiz/types.ts exists for it, but no quiz mode produces one this
 * phase) — this component only needs `correct`/`total`, not the full
 * QuizResult shape, and will grow a `breakdown` prop when Mixed lands.
 */
export function QuizResults({ config, correct, total, onPlayAgain, onChangeQuiz }: QuizResultsProps) {
  const modeLabel = labelOf(QUIZ_MODE_OPTIONS, config.mode)
  const poolLabel = labelOf(COUNTRY_POOL_OPTIONS, config.countryPool)
  const styleLabel = labelOf(ANSWER_STYLE_OPTIONS, config.answerStyle)
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="quiz-results" role="status">
      <span className="eyebrow eyebrow--pill">{modeLabel} Quiz Complete</span>
      <p className="quiz-results__score">
        {correct} / {total}
      </p>
      <p className="quiz-results__percent">{percent}%</p>
      <div className="quiz-results__meta">
        <span className="eyebrow eyebrow--pill">{poolLabel}</span>
        <span className="eyebrow eyebrow--pill">{styleLabel}</span>
      </div>
      <div className="quiz-results__actions">
        <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button type="button" className="btn btn--secondary" onClick={onChangeQuiz}>
          Change Quiz
        </button>
      </div>
    </div>
  )
}
