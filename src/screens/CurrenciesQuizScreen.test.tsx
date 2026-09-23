import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { currencyOf } from '../lib/quiz/currencies'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function correctInfo() {
  const el = document.querySelector('[data-quiz-correct-id]')
  if (!el) throw new Error('no active currencies question found')
  const id = el.getAttribute('data-quiz-correct-id')!
  const name = el.getAttribute('data-quiz-correct-name')!
  return { country: findCountryById(id)!, correctLabel: name }
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'currencies',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 5,
    ...config,
  })
}

describe('CurrenciesQuizScreen (/quiz/currencies)', () => {
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
    renderAt('/quiz/currencies')
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    const { country } = correctInfo()
    expect(screen.getByRole('heading', { level: 1, name: `What is the currency of ${country.name}?` })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Flag of ${country.name}` })).toBeInTheDocument()
  })

  it('Easy Multiple Choice: selecting the correct answer shows success feedback, increments score, and auto-advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
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
    renderAt('/quiz/currencies')
    const { correctLabel } = correctInfo()
    const wrong = screen.getAllByRole('radio').find((el) => el.textContent !== correctLabel)!
    fireEvent.click(wrong)
    expect(wrong).toHaveClass('quiz-answer--incorrect')
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: the canonical currency name is accepted', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/currencies')
    const { country } = correctInfo()
    expect(screen.getByRole('heading', { level: 1, name: `Name the currency of ${country.name}` })).toBeInTheDocument()
    const canonical = currencyOf(country)!.name
    const input = screen.getByLabelText('Currency')
    fireEvent.change(input, { target: { value: `  ${canonical.toLowerCase()}  ` } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Easy Type Answer: a real but wrong currency is rejected and reveals the correct answer', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/currencies')
    const { country } = correctInfo()
    const wrongRealCurrency = currencyOf(country)!.name === 'Japanese Yen' ? 'Euro' : 'Japanese Yen'
    const input = screen.getByLabelText('Currency')
    fireEvent.change(input, { target: { value: wrongRealCurrency } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(/^Correct answer: /)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Easy Type Answer: nonsense input shows the invalid-domain helper instead of consuming the question', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/currencies')
    const input = screen.getByLabelText('Currency')
    fireEvent.change(input, { target: { value: 'Bitcoin' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Please enter a valid currency.')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })

  it('Easy Type Answer: a close typo of the currency name shows Did You Mean and accepting it counts as correct', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/currencies')
    const { country } = correctInfo()
    const canonical = currencyOf(country)!.name
    const typo = canonical + canonical.slice(-1)
    const input = screen.getByLabelText('Currency')
    fireEvent.change(input, { target: { value: typo } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: canonical }))
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('Score: 1')).toBeInTheDocument()
  })

  it('Skip: invalid-domain helper visible + Skip clears it and reveals the correct currency', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer' })
    renderAt('/quiz/currencies')
    const { correctLabel } = correctInfo()
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'Bitcoin' } })
    fireEvent.keyDown(screen.getByLabelText('Currency'), { key: 'Enter' })
    expect(screen.getByText('Please enter a valid currency.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    // The invalid-domain helper and the Skip confirmation are mutually
    // exclusive — clicking Skip replaces one with the other.
    expect(screen.queryByText('Please enter a valid currency.')).not.toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
  })

  it('Medium: Skip works the same as Easy — 0 points, correct answer revealed, advances', () => {
    setConfig({ questionCount: 5, answerStyle: 'type-answer', countryPool: 'explorer' })
    renderAt('/quiz/currencies')
    const { correctLabel } = correctInfo()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText('Score: 0')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1600))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
  })

  it('Multiple Choice regression: no Skip button appears', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
  })

  it('Expert code-forward Type Answer: Skip works for the code answer and reveals the correct code', () => {
    // Unlimited, not a fixed count: Expert coin-flips code-forward/reverse
    // per question, so a fixed 5-question quiz has a real (~3%) chance of
    // completing before a code-forward question ever comes up, which would
    // break this cycling loop's premise. Unlimited never completes.
    setConfig({ questionCount: 'unlimited', answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/currencies')
    let tries = 0
    while (!screen.getByRole('heading', { level: 1 }).textContent?.includes('currency code') && tries < 30) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
      tries++
    }
    expect(tries).toBeLessThan(30)
    const { correctLabel: correctCode } = correctInfo()
    // Cycling through with genuinely correct answers to reach this question
    // form legitimately raises the score above 0 — the point of this test
    // is that Skip adds no MORE points, not that the score is literally 0.
    const scoreBefore = screen.getByText(/^Score: \d+$/).textContent
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${correctCode}`)).toBeInTheDocument()
    expect(screen.getByText(scoreBefore!)).toBeInTheDocument()
  })

  it('Expert code-reverse Type Answer: Skip works for the currency-name answer and reveals the correct currency', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/currencies')
    let tries = 0
    while (!/^Which currency does .* represent\?$/.test(screen.getByRole('heading', { level: 1 }).textContent ?? '') && tries < 30) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
      tries++
    }
    expect(tries).toBeLessThan(30)
    const { correctLabel } = correctInfo()
    const scoreBefore = screen.getByText(/^Score: \d+$/).textContent
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(screen.getByText(`Correct answer: ${correctLabel}`)).toBeInTheDocument()
    expect(screen.getByText(scoreBefore!)).toBeInTheDocument()
  })

  it('Expert code-forward Type Answer: a nonsense code shows the currency-code invalid message', () => {
    setConfig({ questionCount: 'unlimited', answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/currencies')
    // Cycle until a code-forward question appears (Expert randomly picks
    // between the two forms — see currencyQuestions.ts).
    let tries = 0
    while (!screen.getByRole('heading', { level: 1 }).textContent?.includes('currency code') && tries < 30) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
      tries++
    }
    expect(tries).toBeLessThan(30)
    const input = screen.getByLabelText('Currency code')
    fireEvent.change(input, { target: { value: 'ABC' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Please enter a valid currency code.')).toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })

  it('Medium Multiple Choice: a full quiz completes and shows the shared results screen labeled "Currencies Quiz Complete"', () => {
    setConfig({ questionCount: 5, answerStyle: 'multiple-choice', countryPool: 'explorer' })
    renderAt('/quiz/currencies')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Currencies Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Quiz' })).toBeInTheDocument()
  })

  it('Expert: a full quiz completes across mixed code-forward/code-reverse questions', () => {
    setConfig({ questionCount: 10, answerStyle: 'type-answer', countryPool: 'world-expert' })
    renderAt('/quiz/currencies')
    for (let i = 0; i < 10; i++) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('Currencies Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('10 / 10')).toBeInTheDocument()
  })

  it('Play Again restarts with the exact same configuration and a reset score', () => {
    setConfig({ countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
    renderAt('/quiz/currencies')
    for (let i = 0; i < 5; i++) {
      const { correctLabel } = correctInfo()
      fireEvent.change(screen.getByLabelText(/Currency|Country/), { target: { value: correctLabel } })
      fireEvent.keyDown(screen.getByLabelText(/Currency|Country/), { key: 'Enter' })
      act(() => vi.advanceTimersByTime(900))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.queryByText('Score: 1')).not.toBeInTheDocument()
  })

  it('Change Quiz from the results screen navigates to /quiz', () => {
    setConfig({ questionCount: 5 })
    renderAt('/quiz/currencies')
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

describe('CurrenciesQuizScreen: Unlimited mode', () => {
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
    renderAt('/quiz/currencies')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument()

    for (let i = 0; i < 3; i++) {
      const { correctLabel } = correctInfo()
      const button = screen.getAllByRole('radio').find((el) => within(el).queryByText(correctLabel, { exact: true }))!
      fireEvent.click(button)
      act(() => vi.advanceTimersByTime(900))
    }
    fireEvent.click(screen.getByRole('button', { name: 'End Quiz' }))
    expect(screen.getByText('Currencies Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
