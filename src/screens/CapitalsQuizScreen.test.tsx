import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { capitalOf } from '../lib/quiz/capitals'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

/** The correct country/capital for the currently-shown question, exposed via data attributes (see CapitalsQuizScreen.tsx). */
function correctCountryAndCapital() {
  const el = document.querySelector('[data-quiz-correct-id]')
  if (!el) throw new Error('no active capitals question found')
  const id = el.getAttribute('data-quiz-correct-id')!
  const country = findCountryById(id)!
  return { country, capital: capitalOf(country)! }
}

function answerButton(name: string): HTMLElement {
  const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(name, { exact: true }))
  if (!button) throw new Error(`no answer button found for "${name}"`)
  return button
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'capitals',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 5,
    ...config,
  })
}

describe('CapitalsQuizScreen (/quiz/capitals)', () => {
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

  it('renders the country prompt, progress and 4 multiple-choice capital options from the persisted config', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/capitals')
    expect(screen.getByRole('heading', { level: 1, name: 'What is the capital of:' })).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    const { country } = correctCountryAndCapital()
    expect(screen.getByText(country.name)).toBeInTheDocument()
    // Same shared flag treatment/class Languages now reuses for its own
    // forward questions — see QuizCountryFlag.tsx.
    expect(screen.getByRole('img', { name: `Flag of ${country.name}` })).toHaveClass('quiz-play__country-flag')
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('multiple choice: selecting the correct capital shows success feedback, increments score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    fireEvent.click(answerButton(capital))
    expect(answerButton(capital)).toHaveClass('quiz-answer--correct')
    expect(screen.getAllByRole('radio').every((el) => el.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByText('Score: 1')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('multiple choice: selecting a wrong capital reveals the correct one, does not increment score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    const wrongOption = screen.getAllByRole('radio').find((el) => el.textContent !== capital)!
    fireEvent.click(wrongOption)
    expect(wrongOption).toHaveClass('quiz-answer--incorrect')
    expect(answerButton(capital)).toHaveClass('quiz-answer--correct')
    expect(screen.getByText('Score: 0')).toBeInTheDocument()

    // Incorrect feedback holds noticeably longer than correct (see
    // src/lib/quiz/timing.ts) — 900ms alone (correct's own advance window)
    // is not enough here.
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(600))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
  })

  it('type answer: a correctly typed capital (any case/whitespace) is accepted', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    const input = screen.getByLabelText('Capital city')
    fireEvent.change(input, { target: { value: `  ${capital.toLowerCase()}  ` } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('type answer: repeated internal whitespace is tolerated', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    const spaced = capital.replace(/ /g, '   ')
    const input = screen.getByLabelText('Capital city')
    fireEvent.change(input, { target: { value: spaced } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('type answer: a real but wrong capital is rejected and reveals "Correct answer: <capital>"', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    const wrongRealCapital = capital === 'Paris' ? 'Tokyo' : 'Paris' // a real capital, guaranteed different from this question's own answer
    const input = screen.getByLabelText('Capital city')
    fireEvent.change(input, { target: { value: wrongRealCapital } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(`Correct answer: ${capital}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('type answer: nonsense input shows the invalid-domain helper instead of consuming the question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const input = screen.getByLabelText('Capital city')
    fireEvent.change(input, { target: { value: 'Birmingham' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Please enter a valid capital city.')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })

  it('type answer: a close typo shows Did You Mean and accepting it counts as correct', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    const input = screen.getByLabelText('Capital city')
    // A conservative 1-edit typo (duplicated FIRST letter, not last) that
    // stays safely within the typo threshold regardless of the capital's
    // own length. Duplicating the LAST character specifically would break
    // for "Washington, D.C." (ends in a period, which
    // normalizeCountryName strips entirely) — appending another "." would
    // normalize back to an EXACT match, not a typo, occasionally flaking
    // this test whenever the United States is drawn.
    const typo = capital[0] + capital
    fireEvent.change(input, { target: { value: typo } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Score: 0')).toBeInTheDocument() // not yet submitted
    const suggestion = screen.getByRole('button', { name: capital })
    fireEvent.click(suggestion)
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Skip: partial, unsubmitted text ("To...") is overridden and ignored — confirming Skip resolves incorrect and reveals the real capital', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    const { capital } = correctCountryAndCapital()
    fireEvent.change(screen.getByLabelText('Capital city'), { target: { value: 'To...' } })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${capital}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('type answer: the input is automatically focused when the quiz first loads', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/capitals')
    expect(screen.getByLabelText('Capital city')).toHaveFocus()
  })

  it('a 5-question quiz completes and shows the shared results screen labeled "Capitals Quiz Complete"', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/capitals')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(answerButton(correctCountryAndCapital().capital))
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Capitals Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('Play Again restarts with the exact same configuration, fresh questions, and a reset score', () => {
    setConfig({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    renderAt('/quiz/capitals')
    for (let i = 0; i < 5; i++) {
      const { capital } = correctCountryAndCapital()
      fireEvent.change(screen.getByLabelText('Capital city'), { target: { value: capital } })
      fireEvent.keyDown(screen.getByLabelText('Capital city'), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Type Answer')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Capital city')).toBeInTheDocument()
    expect(screen.queryByText('Score: 1')).not.toBeInTheDocument()
  })

  it('Change Quiz from the results screen navigates to /quiz', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/capitals')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(answerButton(correctCountryAndCapital().capital))
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Change Quiz' }))
    expect(window.location.pathname).toBe('/quiz')
  })
})

describe('CapitalsQuizScreen: Unlimited mode', () => {
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
    renderAt('/quiz/capitals')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()

    for (let i = 0; i < 3; i++) {
      fireEvent.click(answerButton(correctCountryAndCapital().capital))
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    expect(screen.getByText('Capitals Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
