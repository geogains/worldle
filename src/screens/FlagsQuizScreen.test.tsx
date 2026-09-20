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

/** The correct country for the currently-shown question, exposed via a data attribute (never visible text/alt/aria — see FlagsQuizScreen.tsx). */
function correctCountry() {
  const el = document.querySelector('[data-quiz-correct-id]')
  if (!el) throw new Error('no active flags question found')
  const id = el.getAttribute('data-quiz-correct-id')!
  return findCountryById(id)!
}

/** Finds the answer radio button whose visible label text is `name` — robust against the accessible name changing once a correct/incorrect feedback icon (with its own aria-label) is appended after an answer locks in. */
function answerButton(name: string): HTMLElement {
  const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(name, { exact: true }))
  if (!button) throw new Error(`no answer button found for "${name}"`)
  return button
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'flags',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 5,
    ...config,
  })
}

describe('FlagsQuizScreen (/quiz/flags)', () => {
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

  it('renders the question, progress and 4 multiple-choice options from the persisted config', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/flags')
    expect(screen.getByRole('heading', { level: 1, name: /which country does this flag belong to/i })).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Country flag' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('multiple choice: selecting the correct answer shows success feedback, increments score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    fireEvent.click(answerButton(correct.name))
    expect(answerButton(correct.name)).toHaveClass('quiz-answer--correct')
    expect(screen.getAllByRole('radio').every((el) => el.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByText('Score: 1')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('multiple choice: selecting a wrong answer reveals the correct one, does not increment score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const wrongOption = screen.getAllByRole('radio').find((el) => el.textContent !== correct.name)!
    fireEvent.click(wrongOption)
    expect(wrongOption).toHaveClass('quiz-answer--incorrect')
    expect(answerButton(correct.name)).toHaveClass('quiz-answer--correct')
    expect(screen.getByText('Score: 0')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('multiple choice: rapid double-clicking an answer cannot double-score', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const button = answerButton(correct.name)
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('type answer: a correctly typed name (any case/whitespace) is accepted', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: `  ${correct.name.toLowerCase()}  ` } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('type answer: Enter submits the same as the button', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: correct.name } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('type answer: a wrong answer is rejected and reveals "Correct answer: X"', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: 'Definitely Not A Country' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText(`Correct answer: ${correct.name}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('type answer: double submission (Enter then button) cannot double-score', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: correct.name } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('type answer: the input is automatically focused when the quiz first loads', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    expect(screen.getByLabelText('Country name')).toHaveFocus()
  })

  it('type answer: submitting locks/disables the input during feedback, and the next question automatically regains focus with a cleared value', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: correct.name } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(input).toBeDisabled()

    act(() => vi.advanceTimersByTime(900))
    const nextInput = screen.getByLabelText('Country name')
    expect(nextInput).not.toBeDisabled()
    expect(nextInput).toHaveFocus()
    expect(nextInput).toHaveValue('')
  })

  it('type answer: focus is not repeatedly stolen while the user is still answering the same question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const input = screen.getByLabelText('Country name')
    input.blur()
    expect(input).not.toHaveFocus()
    fireEvent.change(input, { target: { value: 'partial' } })
    // No remount/advance happened, so nothing should have re-focused it.
    expect(input).not.toHaveFocus()
  })

  it('type answer: Play Again restores automatic focus on the fresh first question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    for (let i = 0; i < 5; i++) {
      const correct = correctCountry()
      fireEvent.change(screen.getByLabelText('Country name'), { target: { value: correct.name } })
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Flags Quiz Complete')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByLabelText('Country name')).toHaveFocus()
  })

  it('type answer: the on-screen keyboard renders and reuses the shared Keyboard component', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    expect(screen.getByRole('group', { name: 'On-screen keyboard' })).toBeInTheDocument()
  })

  it('on-screen keyboard: clicking letters types lowercase into the input, concatenating correctly (visible keys stay uppercase)', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const keyboard = screen.getByRole('group', { name: 'On-screen keyboard' })
    expect(within(keyboard).getByRole('button', { name: 'F' })).toHaveTextContent('F')
    fireEvent.click(within(keyboard).getByRole('button', { name: 'F' }))
    fireEvent.click(within(keyboard).getByRole('button', { name: 'A' }))
    expect(screen.getByLabelText('Country name')).toHaveValue('fa')
  })

  it('on-screen keyboard: Backspace removes the last character', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const keyboard = screen.getByRole('group', { name: 'On-screen keyboard' })
    fireEvent.click(within(keyboard).getByRole('button', { name: 'F' }))
    fireEvent.click(within(keyboard).getByRole('button', { name: 'A' }))
    fireEvent.click(within(keyboard).getByRole('button', { name: 'Backspace' }))
    expect(screen.getByLabelText('Country name')).toHaveValue('f')
  })

  it('on-screen keyboard: Enter submits the current input', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    fireEvent.change(screen.getByLabelText('Country name'), { target: { value: correct.name } })
    fireEvent.click(within(screen.getByRole('group', { name: 'On-screen keyboard' })).getByRole('button', { name: 'Enter' }))
    expect(screen.getByText('Correct!')).toBeInTheDocument()
  })

  it('on-screen keyboard: physical typing and on-screen clicks stay synchronized on the same value (on-screen appends lowercase, physical typing is untouched)', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: 'Sp' } })
    fireEvent.click(within(screen.getByRole('group', { name: 'On-screen keyboard' })).getByRole('button', { name: 'A' }))
    expect(input).toHaveValue('Spa')
  })

  it('physical typing is never force-lowercased — whatever case the user types is preserved as-is', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const input = screen.getByLabelText('Country name')
    fireEvent.change(input, { target: { value: 'MaUrItAnIa' } })
    expect(input).toHaveValue('MaUrItAnIa')
  })

  it('on-screen keyboard: keys are disabled and inert during the feedback lock', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const correct = correctCountry()
    fireEvent.change(screen.getByLabelText('Country name'), { target: { value: correct.name } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    const keyboard = screen.getByRole('group', { name: 'On-screen keyboard' })
    const key = within(keyboard).getByRole('button', { name: 'Z' })
    expect(key).toBeDisabled()
    fireEvent.click(key)
    // Locked keyboard must not be able to sneak a character into the (also locked) input.
    expect(screen.getByLabelText('Country name')).toHaveValue(correct.name)
  })

  it('on-screen keyboard: no Wordle-style letter-result colouring leaks into the quiz (every key stays neutral)', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/flags')
    const keyboard = screen.getByRole('group', { name: 'On-screen keyboard' })
    const letterKey = within(keyboard).getByRole('button', { name: 'F' })
    expect(letterKey.className).not.toMatch(/key--correct|key--present|key--absent/)
  })

  it('a 5-question quiz completes after the 5th question and shows the shared results screen', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(answerButton(correctCountry().name))
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Flags Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()

    // The entire results experience — heading, score, percent, meta pills,
    // and both actions — is grouped inside the one rounded results card,
    // not scattered loose on the page background.
    const card = document.querySelector('.quiz-results') as HTMLElement
    expect(card).not.toBeNull()
    expect(within(card).getByText('Flags Quiz Complete')).toBeInTheDocument()
    expect(within(card).getByText('5 / 5')).toBeInTheDocument()
    expect(within(card).getByText('100%')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('Play Again restarts with the exact same configuration, fresh questions, and a reset score', () => {
    setConfig({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    renderAt('/quiz/flags')
    for (let i = 0; i < 5; i++) {
      const correct = correctCountry()
      fireEvent.change(screen.getByLabelText('Country name'), { target: { value: correct.name } })
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Type Answer')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Country name')).toBeInTheDocument() // still Type Answer
    expect(screen.queryByText('Score: 1')).not.toBeInTheDocument()
  })

  it('Change Quiz from the results screen navigates to /quiz', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/flags')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(answerButton(correctCountry().name))
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Change Quiz' }))
    expect(window.location.pathname).toBe('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
  })
})

describe('FlagsQuizScreen: Unlimited mode', () => {
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

  it('shows "Question N" with no total, and continues answering beyond 10 questions', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()

    for (let i = 0; i < 12; i++) {
      fireEvent.click(answerButton(correctCountry().name))
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Question 13')).toBeInTheDocument()
    expect(screen.getByText('Score: 12')).toBeInTheDocument()
  })

  it('End Quiz produces a valid results state from whatever was answered so far', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    for (let i = 0; i < 3; i++) {
      fireEvent.click(answerButton(correctCountry().name))
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    expect(screen.getByText('Flags Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('Play Again after Unlimited restarts another Unlimited session with the same configuration', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'multiple-choice' })
    renderAt('/quiz/flags')
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })
})

describe('Regression: other quiz routes and existing flows still work', () => {
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

  it('/quiz/capitals still shows the Phase 1 "Coming soon" placeholder, unaffected by Flags gameplay', () => {
    setConfig({ mode: 'capitals' })
    renderAt('/quiz/capitals')
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('/quiz setup screen still renders and Start Quiz still routes to /quiz/flags for the Flags mode', () => {
    renderAt('/quiz')
    fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' }))
    expect(window.location.pathname).toBe('/quiz/flags')
    expect(screen.getByRole('heading', { level: 1, name: /which country does this flag belong to/i })).toBeInTheDocument()
  })
})
