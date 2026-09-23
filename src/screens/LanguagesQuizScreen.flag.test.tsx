import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { findCountryById } from '../data/countries'
import { EPOCH_UTC } from '../lib/daily/date'
import type { LanguageQuestion } from '../lib/quiz/languageQuestions'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function setConfig(config: Partial<{ mode: string; countryPool: string; answerStyle: string; questionCount: number | string }>) {
  set('quizConfig', {
    mode: 'languages',
    countryPool: 'familiar',
    answerStyle: 'multiple-choice',
    questionCount: 'unlimited',
    ...config,
  })
}

const japan = findCountryById('japan')!

// This suite isolates the screen's flag-visibility WIRING (does it render
// QuizCountryFlag when, and only when, kind !== 'reverse'?) from the
// question-generation logic itself, which already has full coverage in
// languageQuestions.test.ts (which `kind` each mechanic produces). Mocking
// createLanguageQuestion to return a fixed, known-kind question is what
// makes "reverse never shows the flag" deterministically testable — the
// real generator only produces a 'reverse' question for specific
// single-language/unambiguous countries at Medium/Expert, so asserting this
// via real random generation would be flaky.
vi.mock('../lib/quiz/languageQuestions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/quiz/languageQuestions')>()
  return { ...actual, createLanguageQuestion: vi.fn() }
})

const individualMcQuestion: LanguageQuestion = {
  id: 'japan',
  country: japan,
  kind: 'individual',
  prompt: 'Which is a language of Japan?',
  choices: [
    { id: 'japan-0', label: 'Japanese' },
    { id: 'japan-1', label: 'Korean' },
    { id: 'japan-2', label: 'Thai' },
    { id: 'japan-3', label: 'Vietnamese' },
  ],
  correctChoiceId: 'japan-0',
}

const individualTypeQuestion: LanguageQuestion = {
  id: 'japan',
  country: japan,
  kind: 'individual',
  prompt: 'Name a language of Japan',
  acceptedCanonical: ['Japanese'],
  revealAnswer: 'Japanese',
}

const southAfrica = findCountryById('south-africa')!

const mediumSetQuestion: LanguageQuestion = {
  id: 'south-africa',
  country: southAfrica,
  kind: 'set',
  prompt: 'Which set of languages belongs to South Africa?',
  choices: [
    { id: 'sa-0', label: 'English, Zulu' },
    { id: 'sa-1', label: 'English, Xhosa' },
    { id: 'sa-2', label: 'English, Afrikaans' },
    { id: 'sa-3', label: 'French, Xhosa' },
  ],
  correctChoiceId: 'sa-2',
}

const expertCompleteQuestion: LanguageQuestion = {
  id: 'south-africa',
  country: southAfrica,
  kind: 'complete',
  prompt: "Complete South Africa's languages",
  displayedLanguages: ['English', 'Zulu', 'Xhosa'],
  acceptedCanonical: ['Afrikaans'],
  revealAnswer: 'Afrikaans',
}

const reverseMcQuestion: LanguageQuestion = {
  id: 'japan',
  country: japan,
  kind: 'reverse',
  prompt: 'Japanese is the language of which country?',
  choices: [
    { id: 'japan-rev-0', label: 'Japan' },
    { id: 'japan-rev-1', label: 'South Korea' },
    { id: 'japan-rev-2', label: 'Thailand' },
    { id: 'japan-rev-3', label: 'Vietnam' },
  ],
  correctChoiceId: 'japan-rev-0',
}

const reverseTypeQuestion: LanguageQuestion = {
  id: 'japan',
  country: japan,
  kind: 'reverse',
  prompt: 'Which country has Japanese as its language?',
  acceptedCanonical: ['Japan'],
  revealAnswer: 'Japan',
}

describe('LanguagesQuizScreen — flag visibility by question direction', () => {
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
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('forward Easy MC (individual, multiple-choice) shows the country flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(individualMcQuestion)
    setConfig({ answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('img', { name: `Flag of ${japan.name}` })).toBeInTheDocument()
  })

  it('forward Easy Type (individual, type-answer) shows the country flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(individualTypeQuestion)
    setConfig({ answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('img', { name: `Flag of ${japan.name}` })).toBeInTheDocument()
  })

  it('forward Medium multi-language MC ("set" kind) shows the country flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(mediumSetQuestion)
    setConfig({ countryPool: 'explorer', answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('img', { name: `Flag of ${southAfrica.name}` })).toBeInTheDocument()
  })

  it('forward Expert multi-language Type ("complete" kind) shows the country flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(expertCompleteQuestion)
    setConfig({ countryPool: 'world-expert', answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('img', { name: `Flag of ${southAfrica.name}` })).toBeInTheDocument()
  })

  it('reverse Multiple Choice ("X is the language of which country?") does NOT show the target flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(reverseMcQuestion)
    setConfig({ countryPool: 'world-expert', answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('heading', { level: 1, name: reverseMcQuestion.prompt })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: `Flag of ${japan.name}` })).not.toBeInTheDocument()
    expect(document.querySelector('.quiz-play__country-flag')).toBeNull()
    expect(document.querySelector('.quiz-play__country-flag-placeholder')).toBeNull()
  })

  it('reverse Type Answer ("Which country has X as its language?") does NOT show the target flag', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(reverseTypeQuestion)
    setConfig({ countryPool: 'world-expert', answerStyle: 'type-answer' })
    renderAt('/quiz/languages')
    expect(screen.getByRole('heading', { level: 1, name: reverseTypeQuestion.prompt })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: `Flag of ${japan.name}` })).not.toBeInTheDocument()
    expect(document.querySelector('.quiz-play__country-flag')).toBeNull()
  })

  it('the flag asset shown matches the question country (correct flag/path, not a placeholder)', async () => {
    const { createLanguageQuestion } = await import('../lib/quiz/languageQuestions')
    vi.mocked(createLanguageQuestion).mockReturnValue(individualMcQuestion)
    setConfig({ answerStyle: 'multiple-choice' })
    renderAt('/quiz/languages')
    const img = screen.getByRole('img', { name: `Flag of ${japan.name}` }) as HTMLImageElement
    expect(img).toHaveClass('quiz-play__country-flag')
    expect(img.src).toMatch(/JP/)
  })
})
