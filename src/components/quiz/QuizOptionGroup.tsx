import type { ReactNode } from 'react'

export interface QuizOptionGroupProps {
  title: string
  groupLabel: string
  /** 'stack': one full-width option per row at every width (Difficulty). */
  layout: 'grid-2' | 'grid-3' | 'stack' | 'row'
  children: ReactNode
}

/**
 * A titled, labelled single-select group wrapping QuizOptionCard options.
 * Shared across all four `/quiz` sections (Quiz Type, Difficulty, Answer
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
