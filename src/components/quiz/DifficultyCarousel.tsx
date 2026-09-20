import { useEffect, useRef, useState } from 'react'
import type { CountryPoolOption } from '../../lib/quiz/config'
import type { CountryPool } from '../../lib/quiz/types'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons'

export interface DifficultyCarouselProps {
  options: readonly CountryPoolOption[]
  selected: CountryPool
  onChange: (id: CountryPool) => void
}

const TRANSITION_MS = 220

type Direction = 'next' | 'prev'

/**
 * Single-card looping carousel for Difficulty (Familiar / Explorer / World
 * Expert) — replaces the old three-stacked-cards selector. The visible
 * card IS the selection: there is no separate "carousel index" state that
 * could drift from QuizConfig.countryPool. The current index is derived
 * from `selected` on every render, and Previous/Next call `onChange`
 * directly — exactly like every other selector on this screen already
 * does, so persistence/summary/Start Quiz need no special-casing.
 *
 * `pending` is purely presentational bookkeeping for the exit/enter
 * animation (which card is leaving, and which direction) — it never
 * determines which difficulty is selected, and doubles as the "rapid
 * press" transition lock: a second press while one is still animating is
 * a no-op rather than skipping state or firing a second onChange.
 */
export function DifficultyCarousel({ options, selected, onChange }: DifficultyCarouselProps) {
  const reducedMotion = usePrefersReducedMotion()
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === selected),
  )
  const current = options[index] as CountryPoolOption

  const [pending, setPending] = useState<{ option: CountryPoolOption; direction: Direction } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const go = (direction: Direction) => {
    if (pending) return // transition lock — ignore a press mid-animation
    const delta = direction === 'next' ? 1 : -1
    const nextIndex = (index + delta + options.length) % options.length
    const outgoing = current
    onChange((options[nextIndex] as CountryPoolOption).id)
    if (reducedMotion) return // instant swap, no exit/enter bookkeeping
    setPending({ option: outgoing, direction })
    timeoutRef.current = setTimeout(() => setPending(null), TRANSITION_MS)
  }

  return (
    <div>
      <div className="difficulty-carousel">
        <button
          type="button"
          className="icon-btn difficulty-carousel__arrow"
          onClick={() => go('prev')}
          aria-label="Previous difficulty"
        >
          <ChevronLeftIcon size={24} aria-hidden="true" />
        </button>
        <div className="difficulty-carousel__viewport">
          {pending && (
            <DifficultyCardFace
              key={`out-${pending.option.id}`}
              option={pending.option}
              anim={pending.direction === 'next' ? 'out-left' : 'out-right'}
              state="exiting"
            />
          )}
          <DifficultyCardFace
            key={`in-${current.id}`}
            option={current}
            anim={pending ? (pending.direction === 'next' ? 'in-right' : 'in-left') : undefined}
            state="current"
          />
        </div>
        <button
          type="button"
          className="icon-btn difficulty-carousel__arrow"
          onClick={() => go('next')}
          aria-label="Next difficulty"
        >
          <ChevronRightIcon size={24} aria-hidden="true" />
        </button>
      </div>

      {/* Decorative only — purely a visual position indicator, redundant
          with the status text below, which is what assistive tech uses. */}
      <div className="difficulty-carousel__dots" aria-hidden="true">
        {options.map((option, i) => (
          <span
            key={option.id}
            className={`difficulty-carousel__dot${i === index ? ' difficulty-carousel__dot--active' : ''}`}
          />
        ))}
      </div>

      <p className="sr-only difficulty-carousel__status" role="status" aria-live="polite">
        {`Difficulty ${index + 1} of ${options.length}: ${current.label}`}
      </p>
    </div>
  )
}

function DifficultyCardFace({
  option,
  anim,
  state,
}: {
  option: CountryPoolOption
  anim?: 'out-left' | 'out-right' | 'in-left' | 'in-right'
  /** Which of the (up to two, mid-transition) rendered cards this is — lets
      callers (and tests) find the actual current selection unambiguously,
      regardless of DOM order or whether an exiting card is also present. */
  state: 'current' | 'exiting'
}) {
  return (
    <div
      className={`quiz-option quiz-option--card quiz-option--selected difficulty-carousel__card${
        anim ? ` difficulty-carousel__card--${anim}` : ''
      }`}
      data-difficulty-card={state}
    >
      <span className="quiz-option__text">
        <span className="quiz-option__label">
          {option.label}
          {option.emoji && (
            <>
              {' '}
              <span aria-hidden="true">{option.emoji}</span>
            </>
          )}
        </span>
        <span className="quiz-option__description">{option.description}</span>
      </span>
    </div>
  )
}
