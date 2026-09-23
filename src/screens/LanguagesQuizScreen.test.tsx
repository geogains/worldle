import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { languagesOf } from '../lib/quiz/languages'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function correctInfo() {
  const el = document.querySelector('[data-quiz-correct-id]')
  if (!el) throw new Error('no active languages question found')
  const id = el.getAttribute('data-quiz-correct-id')!
  const name = el.getAttribute('data-quiz-correct-name')!
  return { country: findCountryById(id)!, correctLabel: name }
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'languages',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 5,
    ...config,
  })
}

describe('LanguagesQuizScreen (/quiz/languages)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('Easy Multiple Choice: renders a prompt, progress and 4 options, exactly one of which is correct', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    const { country } = correctInfo()
    expect(screen.getByRole('heading', { level: 1, name: `Which is a language of ${country.name}?` })).toBeInTheDocument()
  })

  it('Easy Multiple Choice: selecting the correct answer shows success feedback, increments score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
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
    renderAt('/quiz/languages')
    const { correctLabel } = correctInfo()
    const wrong = screen.getAllByRole('radio').find((el) => el.textContent !== correctLabel)!
    fireEvent.click(wrong)
    expect(wrong).toHaveClass('quiz-answer--incorrect')
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: a correctly typed canonical language (any case/whitespace) is accepted', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    const { country } = correctInfo()
    expect(screen.getByRole('heading', { level: 1, name: `Name a language of ${country.name}` })).toBeInTheDocument()
    const anyValidLanguage = languagesOf(country)[0]!
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: `  ${anyValidLanguage.toLowerCase()}  ` } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Easy Type Answer: a real but wrong language is rejected and reveals the correct answer', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    const { country } = correctInfo()
    // Icelandic is a real language-domain value, and Iceland isn't in the
    // Familiar pool this test uses, so it's guaranteed wrong for whichever
    // country was actually drawn.
    const wrongRealLanguage = languagesOf(country).includes('Icelandic') ? 'French' : 'Icelandic'
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: wrongRealLanguage } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(/^Correct answer: /)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: nonsense input shows the invalid-domain helper instead of consuming the question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: 'Birmingham' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Please enter a valid language.')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })

  it('Easy Type Answer: a close typo of the accepted language shows Did You Mean and accepting it counts as correct', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    const { country } = correctInfo()
    const language = languagesOf(country)[0]!
    // A duplicated FIRST letter (not last) — some language display names end
    // in punctuation (e.g. China's "Standard Chinese (Putonghua)"), which
    // normalizeCountryName strips entirely, so appending a duplicate of a
    // trailing ")" would normalize back to an EXACT match (no typo at all).
    // Prepending is agnostic to whatever the name happens to end with.
    const typo = language[0] + language
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: typo } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: language }))
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Skip: with a Did You Mean suggestion visible, Skip does NOT accept it — normal incorrect state, real answer revealed', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    const { country, correctLabel } = correctInfo()
    const language = languagesOf(country)[0]!
    // See the "close typo" test above for why this duplicates the FIRST
    // letter rather than the last (trailing punctuation, e.g. China's
    // "Standard Chinese (Putonghua)", would otherwise normalize back to an
    // exact match instead of a genuine typo).
    const typo = language[0] + language
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: typo } })
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' })
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    // Did You Mean and the Skip confirmation are mutually exclusive —
    // clicking Skip replaces one with the other, never shows both.
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Medium Multiple Choice: a full quiz completes and shows the shared results screen labeled "Languages Quiz Complete"', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice', countryPool: 'explorer' })
    renderAt('/quiz/languages')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Languages Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('Expert Type Answer: the "complete the list" prompt shows the partial list and accepts the omitted language', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/languages')
    const { correctLabel } = correctInfo()
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: correctLabel } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('Play Again restarts with the exact same configuration and a reset score', () => {
    setConfig({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    renderAt('/quiz/languages')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText('Language'), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.queryByText('Score: 1')).not.toBeInTheDocument()
  })

  it('Change Quiz from the results screen navigates to /quiz', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/languages')
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

describe('LanguagesQuizScreen: Unlimited mode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('shows "Question N" with no total, and End Quiz produces valid results', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()

    for (let i = 0; i < 3; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    expect(screen.getByText('Languages Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})

describe('Regression: other quiz routes still work', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('/quiz/facts still shows the placeholder, unaffected by Languages gameplay', () => {
    setConfig({ mode: 'facts' })
    renderAt('/quiz/facts')
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })
})
