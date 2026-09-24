import type { ReactNode } from 'react'

export interface QuizOptionCardProps {
  label: string
  description?: string
  icon?: ReactNode
  selected: boolean
  onSelect: () => void
  /**
   * 'tile': icon-on-top, centered (Quiz Type subject categories).
   * 'card': label + description, left-aligned, full-width (Difficulty).
   * 'pill': compact, label-only, one row (Answer Style, Question Count).
   * 'mixed': icon-and-label horizontal, centered, shorter than 'tile' — the
   * final combined Quiz Type option (Mixed), visually distinct from the six
   * subject-category tiles above it. See .quiz-option--mixed in index.css.
   */
  variant: 'tile' | 'card' | 'pill' | 'mixed'
}

/**
 * One selectable option in a single-select group (role="radio" inside the
 * caller's role="radiogroup" — see QuizOptionGroup). Shared by all four
 * `/quiz` selection sections instead of four bespoke components, since the
 * only real difference between them is layout density, not behaviour.
 * Selection is communicated by the border/highlight/background treatment
 * (`.quiz-option--selected`) plus `aria-checked` — no separate visual tick
 * icon; the border/glow alone is a clear enough selected state, and
 * `aria-checked`/radiogroup semantics already carry it for assistive tech.
 */
export function QuizOptionCard({ label, description, icon, selected, onSelect, variant }: QuizOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`quiz-option quiz-option--${variant}${selected ? ' quiz-option--selected' : ''}`}
      onClick={onSelect}
    >
      {/* Decorative (whether a vector icon or an emoji): the visible label
          beside it already names the option, so this is hidden from
          assistive tech rather than announced redundantly. */}
      {icon && (
        <span className="quiz-option__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="quiz-option__text">
        <span className="quiz-option__label">{label}</span>
        {description && <span className="quiz-option__description">{description}</span>}
      </span>
    </button>
  )
}
