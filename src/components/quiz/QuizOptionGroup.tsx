import type { ReactNode } from 'react'

export interface QuizOptionGroupProps {
  title: string
  groupLabel: string
  /**
   * 'pool' is its own layout (not just 'grid-3') because Country Pool's
   * mobile behaviour — 3rd option (World Expert) spanning the full row
   * beneath the first two — must never leak into Quiz Type's unrelated
   * 6-option 'grid-3' grid, which shares the same column counts otherwise.
   */
  layout: 'grid-2' | 'grid-3' | 'pool' | 'row'
  children: ReactNode
}

/**
 * A titled, labelled single-select group wrapping QuizOptionCard options.
 * Shared across all four `/quiz` sections (Quiz Type, Country Pool, Answer
 * Style, Question Count) so the radiogroup semantics and section heading
 * pattern is written once, not four times.
 */
export function QuizOptionGroup({ title, groupLabel, layout, children }: QuizOptionGroupProps) {
  return (
    <section className="quiz-section">
      <h2 className="quiz-section__title">{title}</h2>
      <div className={`quiz-option-group quiz-option-group--${layout}`} role="radiogroup" aria-label={groupLabel}>
        {children}
      </div>
    </section>
  )
}
