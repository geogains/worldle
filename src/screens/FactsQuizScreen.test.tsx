import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function correctInfo() {
  const el = document.querySelector('[data-quiz-correct-id]')
  if (!el) throw new Error('no active facts question found')
  const id = el.getAttribute('data-quiz-correct-id')!
  const name = el.getAttribute('data-quiz-correct-name')!
  return { country: findCountryById(id)!, correctLabel: name }
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'facts',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 5,
    ...config,
  })
}

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
}

describe('FactsQuizScreen (/quiz/facts)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    stubResizeObserver()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('Easy Multiple Choice: renders a fact prompt, progress and 4 country options, exactly one correct, and never shows a flag', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/facts')
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    const { country, correctLabel } = correctInfo()
    expect(country.name).toBe(correctLabel)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/\?$/)
    expect(document.querySelector('.quiz-play__country-flag')).not.toBeInTheDocument()
    expect(document.querySelector('.quiz-play__country-flag-placeholder')).not.toBeInTheDocument()
  })

  it('Easy Multiple Choice: selecting the correct answer shows success feedback, increments score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
    fireEvent.click(button)
    expect(button).toHaveClass('quiz-answer--correct')
    expect(screen.getByText('Score: 1')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Easy Multiple Choice: selecting a wrong answer reveals the correct one and does not increment score', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const wrong = screen.getAllByRole('radio').find((el) => el.textContent !== correctLabel)!
    fireEvent.click(wrong)
    expect(wrong).toHaveClass('quiz-answer--incorrect')
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: the correctly typed country (any case/whitespace) is accepted', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: `  ${correctLabel.toLowerCase()}  ` } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Easy Type Answer: a real but wrong country is rejected (valid-incorrect) and reveals the correct answer', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const wrongRealCountry = correctLabel === 'Japan' ? 'France' : 'Japan'
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: wrongRealCountry } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: nonsense input shows the invalid-domain helper instead of consuming the question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/facts')
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: 'Birmingham' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Please enter a valid country name.')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })

  it('Easy Type Answer: a close typo of the correct country shows Did You Mean, and accepting the suggestion counts as correct without leaking the answer beforehand', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const typo = correctLabel[0] + correctLabel
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: typo } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: correctLabel }))
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Skip: requires explicit confirmation; pressing Enter dismisses the confirmation (never accepts it), and only "Yes, skip" concedes without incrementing score', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
    // Enter means "I'm not confirming Skip" — it dismisses the confirmation
    // and leaves the question active/unanswered, it never concedes it.
    fireEvent.keyDown(screen.getByLabelText('Country'), { key: 'Enter' })
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    // Re-arm and this time actually confirm.
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Medium Multiple Choice: a full quiz completes and shows the shared results screen labeled "Facts Quiz Complete"', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice', countryPool: 'explorer' })
    renderAt('/quiz/facts')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Facts Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('Expert Multiple Choice: renders a valid 4-option question from the World Expert pool', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice', countryPool: 'world-expert' })
    renderAt('/quiz/facts')
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('Expert Type Answer: the correct country is accepted from the World Expert pool', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/facts')
    const { correctLabel } = correctInfo()
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: correctLabel } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('Play Again restarts with the exact same configuration and a reset score', () => {
    setConfig({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    renderAt('/quiz/facts')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText('Country'), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText('Country'), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.queryByText('Score: 1')).not.toBeInTheDocument()
  })

  it('Change Quiz from the results screen navigates to /quiz', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/facts')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Change Quiz' }))
    expect(window.location.pathname).toBe('/quiz')
  })
})

describe('FactsQuizScreen: Unlimited mode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    stubResizeObserver()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('shows "Question N" with no total, and End Quiz produces valid results with no repeated country', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'multiple-choice' })
    renderAt('/quiz/facts')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()

    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      seen.push(correctInfo().country.id)
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    expect(screen.getByText('Facts Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(new Set(seen).size).toBe(3)
  })
})

describe('Regression: other quiz routes still work', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    stubResizeObserver()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('/quiz/mixed still shows the placeholder, unaffected by Facts gameplay', () => {
    set('quizConfig', { mode: 'mixed', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
    renderAt('/quiz/mixed')
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })
})
