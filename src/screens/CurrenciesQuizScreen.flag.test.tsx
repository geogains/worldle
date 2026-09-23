import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { EPOCH_UTC } from '../lib/daily/date'
import type { CurrencyQuestion } from '../lib/quiz/currencyQuestions'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'currencies',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 'unlimited',
    ...config,
  })
}

const japan = findCountryById('japan')!
const poland = findCountryById('poland')!
const switzerland = findCountryById('switzerland')!

// Isolates the screen's flag-visibility WIRING (does it render
// QuizCountryFlag when, and only when, kind is 'forward' or
// 'code-forward'?) from the question-generation logic itself, which
// already has full coverage in currencyQuestions.test.ts — mirrors
// LanguagesQuizScreen.flag.test.tsx's same technique and rationale.
vi.mock('../lib/quiz/currencyQuestions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/quiz/currencyQuestions')>()
  return { ...actual, createCurrencyQuestion: vi.fn() }
})

const forwardQuestion: CurrencyQuestion = {
  id: 'japan',
  country: japan,
  kind: 'forward',
  prompt: 'What is the currency of Japan?',
  choices: [
    { id: 'japan-0', label: 'Japanese Yen' },
    { id: 'japan-1', label: 'South Korean Won' },
    { id: 'japan-2', label: 'Renminbi' },
    { id: 'japan-3', label: 'Thai Baht' },
  ],
  correctChoiceId: 'japan-0',
}

const reverseQuestion: CurrencyQuestion = {
  id: 'poland',
  country: poland,
  kind: 'reverse',
  prompt: 'Which country uses the Polish Złoty?',
  choices: [
    { id: 'poland-rev-0', label: 'Poland' },
    { id: 'poland-rev-1', label: 'Hungary' },
    { id: 'poland-rev-2', label: 'Czechia' },
    { id: 'poland-rev-3', label: 'Romania' },
  ],
  correctChoiceId: 'poland-rev-0',
}

const codeForwardQuestion: CurrencyQuestion = {
  id: 'switzerland',
  country: switzerland,
  kind: 'code-forward',
  prompt: "What is Switzerland's currency code?",
  choices: [
    { id: 'switzerland-0', label: 'CHF' },
    { id: 'switzerland-1', label: 'SEK' },
    { id: 'switzerland-2', label: 'NOK' },
    { id: 'switzerland-3', label: 'DKK' },
  ],
  correctChoiceId: 'switzerland-0',
}

const codeReverseQuestion: CurrencyQuestion = {
  id: 'switzerland',
  country: switzerland,
  kind: 'code-reverse',
  prompt: 'Which currency does CHF represent?',
  choices: [
    { id: 'switzerland-0', label: 'Swiss Franc' },
    { id: 'switzerland-1', label: 'Swedish Krona' },
    { id: 'switzerland-2', label: 'Norwegian Krone' },
    { id: 'switzerland-3', label: 'Danish Krone' },
  ],
  correctChoiceId: 'switzerland-0',
}

describe('CurrenciesQuizScreen — flag visibility by question kind', () => {
  beforeEach(async () => {
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
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('forward (Easy / Medium fallback): shows the country flag', async () => {
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReturnValue(forwardQuestion)
    setConfig({ answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    expect(screen.getByRole('img', { name: `Flag of ${japan.name}` })).toBeInTheDocument()
  })

  it('code-forward (Expert Form A): shows the country flag', async () => {
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReturnValue(codeForwardQuestion)
    setConfig({ countryPool: 'world-expert', answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    expect(screen.getByRole('img', { name: `Flag of ${switzerland.name}` })).toBeInTheDocument()
  })

  it('reverse (Medium, unique currency): does NOT show the target country flag', async () => {
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReturnValue(reverseQuestion)
    setConfig({ countryPool: 'explorer', answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    expect(screen.getByRole('heading', { level: 1, name: reverseQuestion.prompt })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: `Flag of ${poland.name}` })).not.toBeInTheDocument()
    expect(document.querySelector('.quiz-play__country-flag')).toBeNull()
    expect(document.querySelector('.quiz-play__country-flag-placeholder')).toBeNull()
  })

  it('code-reverse (Expert Form B): does NOT show any country flag', async () => {
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReturnValue(codeReverseQuestion)
    setConfig({ countryPool: 'world-expert', answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    expect(screen.getByRole('heading', { level: 1, name: codeReverseQuestion.prompt })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: `Flag of ${switzerland.name}` })).not.toBeInTheDocument()
    expect(document.querySelector('.quiz-play__country-flag')).toBeNull()
  })

  it('the flag asset shown for a forward question matches the question country (correct flag/path, not a placeholder)', async () => {
    const { createCurrencyQuestion } = await import('../lib/quiz/currencyQuestions')
    vi.mocked(createCurrencyQuestion).mockReturnValue(forwardQuestion)
    setConfig({ answerStyle: 'multiple-choice' })
    renderAt('/quiz/currencies')
    const img = screen.getByRole('img', { name: `Flag of ${japan.name}` }) as HTMLImageElement
    expect(img).toHaveClass('quiz-play__country-flag')
    expect(img.src).toMatch(/JP/)
  })
})
