import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultipleChoiceAnswers } from './MultipleChoiceAnswers'

const choices = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
  { id: 'd', label: 'Delta' },
]

describe('MultipleChoiceAnswers — answered-state feedback', () => {
  it('before answering, no correct/incorrect classes or feedback text are present', () => {
    render(<MultipleChoiceAnswers groupLabel="Answer options" choices={choices} correctId="a" selectedId={null} phase="answering" onSelect={vi.fn()} />)
    for (const el of screen.getAllByRole('radio')) {
      expect(el).not.toHaveClass('quiz-answer--correct')
      expect(el).not.toHaveClass('quiz-answer--incorrect')
    }
  })

  it('correct answer gets the correct class and no visible tick glyph, but carries accessible "Correct answer" text', () => {
    render(<MultipleChoiceAnswers groupLabel="Answer options" choices={choices} correctId="a" selectedId="a" phase="feedback" onSelect={vi.fn()} />)
    const correctButton = screen.getAllByRole('radio').find((el) => el.textContent?.startsWith('Alpha'))!
    expect(correctButton).toHaveClass('quiz-answer--correct')
    // No visible check glyph: no svg icon element rendered inside the button.
    expect(correctButton.querySelector('svg')).toBeNull()
    // Accessible equivalent is preserved via visually-hidden text, not a
    // decorative icon + aria-label.
    expect(correctButton.querySelector('.sr-only')?.textContent).toContain('Correct answer')
    // The visible label text itself contains no tick/cross character either.
    expect(correctButton.querySelector('.quiz-answer__label')?.textContent).toBe('Alpha')
  })

  it('incorrect selected answer gets the incorrect class and no visible cross glyph, but carries accessible "Incorrect answer" text', () => {
    render(<MultipleChoiceAnswers groupLabel="Answer options" choices={choices} correctId="a" selectedId="b" phase="feedback" onSelect={vi.fn()} />)
    const wrongButton = screen.getAllByRole('radio').find((el) => el.textContent?.startsWith('Beta'))!
    expect(wrongButton).toHaveClass('quiz-answer--incorrect')
    expect(wrongButton.querySelector('svg')).toBeNull()
    expect(wrongButton.querySelector('.sr-only')?.textContent).toContain('Incorrect answer')
    expect(wrongButton.querySelector('.quiz-answer__label')?.textContent).toBe('Beta')
  })

  it('the correct answer is still marked correct even when a different option was selected (so the right answer stays identifiable after a wrong pick)', () => {
    render(<MultipleChoiceAnswers groupLabel="Answer options" choices={choices} correctId="a" selectedId="b" phase="feedback" onSelect={vi.fn()} />)
    const correctButton = screen.getAllByRole('radio').find((el) => el.textContent?.startsWith('Alpha'))!
    expect(correctButton).toHaveClass('quiz-answer--correct')
    expect(correctButton.querySelector('.sr-only')?.textContent).toContain('Correct answer')
  })

  it('an unselected, non-correct option gets neither class and no feedback text once locked', () => {
    render(<MultipleChoiceAnswers groupLabel="Answer options" choices={choices} correctId="a" selectedId="b" phase="feedback" onSelect={vi.fn()} />)
    const untouched = screen.getAllByRole('radio').find((el) => el.textContent?.startsWith('Gamma'))!
    expect(untouched).not.toHaveClass('quiz-answer--correct')
    expect(untouched).not.toHaveClass('quiz-answer--incorrect')
    expect(untouched.querySelector('.sr-only')).toBeNull()
  })
})
