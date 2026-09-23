import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

/** Unmounts any previous render first, so a test can call this more than once to simulate leaving and returning to a route (RTL only auto-cleans up between *tests*, not between calls within one). */
function renderAt(path: string) {
  cleanup()
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function group(label: string): HTMLElement {
  return screen.getByRole('radiogroup', { name: label })
}

// --- Difficulty carousel helpers -------------------------------------
const prevDifficultyBtn = () => screen.getByRole('button', { name: 'Previous difficulty' })
const nextDifficultyBtn = () => screen.getByRole('button', { name: 'Next difficulty' })
/**
 * Clicks an arrow AND clears the transition lock (advances past the
 * ~220ms animation window) before returning, so a test can chain multiple
 * steps the way it would assert them — one settled step at a time. A test
 * that specifically wants to exercise the lock itself (rapid presses
 * before it clears) fires fireEvent.click directly instead.
 */
function clickNextDifficulty() {
  fireEvent.click(nextDifficultyBtn())
  act(() => vi.advanceTimersByTime(300))
}
function clickPrevDifficulty() {
  fireEvent.click(prevDifficultyBtn())
  act(() => vi.advanceTimersByTime(300))
}
function difficultyCard(): HTMLElement {
  // Not just `.difficulty-carousel__card` — mid-transition, an exiting card
  // briefly coexists with the current one, so this targets the current
  // selection unambiguously regardless of animation state or DOM order.
  return document.querySelector('[data-difficulty-card="current"]') as HTMLElement
}
function difficultyStatus(): HTMLElement {
  return document.querySelector('.difficulty-carousel__status') as HTMLElement
}
function currentDifficultyLabel(): string | null | undefined {
  return difficultyCard()?.querySelector('.quiz-option__label')?.textContent
}
function activeDifficultyDotIndex(): number {
  const dots = [...document.querySelectorAll('.difficulty-carousel__dot')]
  return dots.findIndex((d) => d.classList.contains('difficulty-carousel__dot--active'))
}

describe('QuizScreen (/quiz)', () => {
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

  it('renders the Quiz heading, the Difficulty carousel, and the other three selection groups', () => {
    renderAt('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
    expect(group('Quiz type')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Difficulty' })).toBeInTheDocument()
    expect(prevDifficultyBtn()).toBeInTheDocument()
    expect(nextDifficultyBtn()).toBeInTheDocument()
    expect(group('Answer style')).toBeInTheDocument()
    expect(group('Question count')).toBeInTheDocument()
  })

  it('"Country Pool" is no longer the visible heading or accessible group name — it is "Difficulty" now', () => {
    renderAt('/quiz')
    expect(screen.queryByText('Country Pool')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Country pool' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Difficulty' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Difficulty' })).toBeInTheDocument()
  })

  it('defaults to Flags / Easy / Multiple Choice / 10, with a correct initial summary and Start Quiz ready to press immediately', () => {
    renderAt('/quiz')
    expect(within(group('Quiz type')).getByRole('radio', { name: /flags/i })).toHaveAttribute('aria-checked', 'true')
    expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
    expect(within(group('Answer style')).getByRole('radio', { name: /multiple choice/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(group('Question count')).getByRole('radio', { name: '10' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Flags · Easy · Multiple Choice · 10 Questions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument()
  })

  it('every Quiz Type option can be selected, exclusively', () => {
    renderAt('/quiz')
    const g = group('Quiz type')
    for (const name of ['Flags', 'Capitals', 'Currencies', 'Languages', 'Facts', 'Mixed']) {
      fireEvent.click(within(g).getByRole('radio', { name }))
      expect(within(g).getByRole('radio', { name }), name).toHaveAttribute('aria-checked', 'true')
      const others = within(g)
        .getAllByRole('radio')
        .filter((el) => el.getAttribute('aria-checked') === 'true')
      expect(others).toHaveLength(1)
    }
  })

  it('Next loops Easy -> Medium -> Expert -> Easy', () => {
    renderAt('/quiz')
    expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
    clickNextDifficulty()
    expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
    clickNextDifficulty()
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
    clickNextDifficulty()
    expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
  })

  it('Previous loops Easy -> Expert -> Medium -> Easy', () => {
    renderAt('/quiz')
    expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
    clickPrevDifficulty()
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
    clickPrevDifficulty()
    expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
    clickPrevDifficulty()
    expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
  })

  it('changing the carousel position selects immediately — no second click needed, and updates persisted config (internal "explorer" value) the same as any other selector', () => {
    renderAt('/quiz')
    fireEvent.click(nextDifficultyBtn())
    expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
    const saved = JSON.parse(window.localStorage.getItem(storageKey('quizConfig')) ?? '{}')
    expect(saved.countryPool).toBe('explorer')
  })

  it('the displayed difficulty always matches the persisted QuizConfig.countryPool, at every step (visible label vs. unchanged internal value)', () => {
    renderAt('/quiz')
    const stepsAndExpected: Array<['next' | 'prev', string, string]> = [
      ['next', 'Medium 🟠🟠⚪️', 'explorer'],
      ['next', 'Expert 🔴🔴🔴', 'world-expert'],
      ['prev', 'Medium 🟠🟠⚪️', 'explorer'],
      ['prev', 'Easy 🔵⚪️⚪️', 'familiar'],
      ['prev', 'Expert 🔴🔴🔴', 'world-expert'],
    ]
    for (const [dir, label, poolId] of stepsAndExpected) {
      if (dir === 'next') clickNextDifficulty()
      else clickPrevDifficulty()
      expect(currentDifficultyLabel()).toBe(label)
      const saved = JSON.parse(window.localStorage.getItem(storageKey('quizConfig')) ?? '{}')
      expect(saved.countryPool).toBe(poolId)
    }
  })

  it('pagination dots: exactly one active dot, matching the current difficulty (index 0/1/2 for Easy/Medium/Expert)', () => {
    renderAt('/quiz')
    expect(document.querySelectorAll('.difficulty-carousel__dot')).toHaveLength(3)
    expect(activeDifficultyDotIndex()).toBe(0) // Easy
    clickNextDifficulty()
    expect(activeDifficultyDotIndex()).toBe(1) // Medium
    clickNextDifficulty()
    expect(activeDifficultyDotIndex()).toBe(2) // Expert
    clickNextDifficulty()
    expect(activeDifficultyDotIndex()).toBe(0) // looped back to Easy
  })

  it('if a previous difficulty selection is already saved, the carousel opens showing it — not forced back to Easy', () => {
    set('quizConfig', { mode: 'flags', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 10 })
    renderAt('/quiz')
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
    expect(activeDifficultyDotIndex()).toBe(2)
  })

  it('both Answer Style options can be selected, exclusively and independently of Difficulty', () => {
    renderAt('/quiz')
    clickNextDifficulty()
    clickNextDifficulty()
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
    const g = group('Answer style')
    fireEvent.click(within(g).getByRole('radio', { name: 'Type Answer' }))
    expect(within(g).getByRole('radio', { name: 'Type Answer' })).toHaveAttribute('aria-checked', 'true')
    expect(within(g).getByRole('radio', { name: 'Multiple Choice' })).toHaveAttribute('aria-checked', 'false')
    // Difficulty selection is untouched by the Answer Style change.
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')

    fireEvent.click(within(g).getByRole('radio', { name: 'Multiple Choice' }))
    expect(within(g).getByRole('radio', { name: 'Multiple Choice' })).toHaveAttribute('aria-checked', 'true')
    expect(within(g).getByRole('radio', { name: 'Type Answer' })).toHaveAttribute('aria-checked', 'false')
  })

  it('all three Question Count options can be selected, exclusively', () => {
    renderAt('/quiz')
    const g = group('Question count')
    for (const name of ['5', '10', 'Unlimited']) {
      fireEvent.click(within(g).getByRole('radio', { name }))
      expect(within(g).getByRole('radio', { name }), name).toHaveAttribute('aria-checked', 'true')
      const others = within(g)
        .getAllByRole('radio')
        .filter((el) => el.getAttribute('aria-checked') === 'true')
      expect(others).toHaveLength(1)
    }
  })

  it('the configuration summary updates immediately as any selection changes, including the Difficulty carousel — using the plain "Medium" label, not the emoji-decorated card text', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /mixed/i }))
    fireEvent.click(nextDifficultyBtn()) // Easy -> Medium
    fireEvent.click(within(group('Answer style')).getByRole('radio', { name: 'Type Answer' }))
    fireEvent.click(within(group('Question count')).getByRole('radio', { name: 'Unlimited' }))
    expect(screen.getByText('Mixed · Medium · Type Answer · Unlimited')).toBeInTheDocument()
    expect(screen.queryByText(/Mixed · Medium 🟠/)).not.toBeInTheDocument()
  })

  it('Start Quiz navigates to /quiz/:mode using the currently selected configuration', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /mixed/i }))
    fireEvent.click(within(group('Question count')).getByRole('radio', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' }))
    expect(window.location.pathname).toBe('/quiz/mixed')
    expect(screen.getByText('Mixed · Easy · Multiple Choice · 5 Questions')).toBeInTheDocument()
  })

  it('selections made on /quiz persist and are still selected after navigating away and back (Change Quiz retains the previous configuration)', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /languages/i }))
    fireEvent.click(prevDifficultyBtn()) // Easy -> Expert
    renderAt('/study')
    renderAt('/quiz')
    expect(within(group('Quiz type')).getByRole('radio', { name: /languages/i })).toHaveAttribute('aria-checked', 'true')
    expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
  })

  it('light/dark mode both render the setup page without errors', () => {
    set('prefs', { theme: 'dark', hasSeenHelp: true })
    renderAt('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('the setup controls (Quiz Type, the Difficulty carousel, Answer Style, Question Count, the summary and Start Quiz) sit inside one rounded card, with the heading/intro outside it', () => {
    renderAt('/quiz')
    const card = document.querySelector('.quiz-setup-card') as HTMLElement
    expect(card).toBeInTheDocument()
    expect(within(card).getByRole('radiogroup', { name: 'Quiz type' })).toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 2, name: 'Difficulty' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Previous difficulty' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Next difficulty' })).toBeInTheDocument()
    expect(within(card).getByRole('radiogroup', { name: 'Answer style' })).toBeInTheDocument()
    expect(within(card).getByRole('radiogroup', { name: 'Question count' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument()
    // Heading and intro copy are NOT inside the card.
    expect(within(card).queryByRole('heading', { level: 1, name: 'Quiz' })).not.toBeInTheDocument()
    expect(card.contains(screen.getByRole('heading', { level: 1, name: 'Quiz' }))).toBe(false)
  })

  it('a selected option keeps its selected class/aria-checked state, with no circular check-icon element rendered anywhere on the page', () => {
    renderAt('/quiz')
    const flagsOption = within(group('Quiz type')).getByRole('radio', { name: /flags/i })
    expect(flagsOption).toHaveClass('quiz-option--selected')
    expect(flagsOption).toHaveAttribute('aria-checked', 'true')
    // No leftover check-icon element, on the default-selected options or after changing selection.
    expect(document.querySelector('.quiz-option__check')).toBeNull()

    // The Difficulty carousel's visible card is always the selected card
    // (there's only one shown), and it never gets a checkmark either.
    expect(difficultyCard()).toHaveClass('quiz-option--selected')
    fireEvent.click(nextDifficultyBtn())
    expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
    expect(difficultyCard()).toHaveClass('quiz-option--selected')
    expect(document.querySelector('.quiz-option__check')).toBeNull()
  })

  it('Quiz Type keeps its unrelated grid-3 layout, unaffected by the Difficulty carousel change', () => {
    renderAt('/quiz')
    expect(group('Quiz type')).toHaveClass('quiz-option-group--grid-3')
  })

  it('Quiz Type options show the illustrated PNG icons for all six modes, decorative to assistive tech (visible label still carries the accessible name)', () => {
    renderAt('/quiz')
    const g = group('Quiz type')
    const expectedImages: Record<string, string> = {
      Flags: '/icons/flags.png',
      Capitals: '/icons/capitals.png',
      Currencies: '/icons/currencies.png',
      Languages: '/icons/languages.png',
      Facts: '/icons/facts.png',
      Mixed: '/icons/mixed.png',
    }
    for (const [name, src] of Object.entries(expectedImages)) {
      const option = within(g).getByRole('radio', { name })
      const iconEl = option.querySelector('.quiz-option__icon') as HTMLElement
      expect(iconEl).not.toBeNull()
      expect(iconEl).toHaveAttribute('aria-hidden', 'true')
      const img = iconEl.querySelector('img')
      expect(img).not.toBeNull()
      expect(img).toHaveAttribute('src', src)
      expect(img).toHaveAttribute('alt', '')
      // The visible text label (not the icon) is what the accessible name
      // is built from — getByRole above already proves this by matching on
      // the label text alone.
      expect(within(option).getByText(name)).toBeInTheDocument()
    }
  })

  describe('Difficulty carousel', () => {
    it('preserves the existing descriptions for each difficulty (unchanged wording)', () => {
      renderAt('/quiz')
      expect(screen.getByText('The most recognisable, widely known countries.')).toBeInTheDocument()
      clickNextDifficulty()
      expect(screen.getByText('A balanced mix of familiar and less obvious countries.')).toBeInTheDocument()
      clickNextDifficulty()
      expect(screen.getByText('The full supported country pool.')).toBeInTheDocument()
    })

    it('shows the exact new visible labels — Easy 🔵⚪️⚪️, Medium 🟠🟠⚪️, Expert 🔴🔴🔴', () => {
      renderAt('/quiz')
      expect(currentDifficultyLabel()).toBe('Easy 🔵⚪️⚪️')
      clickNextDifficulty()
      expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
      clickNextDifficulty()
      expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
    })

    it('the old visible labels (Familiar / Explorer / World Expert) no longer render anywhere in the Difficulty carousel', () => {
      renderAt('/quiz')
      const carousel = document.querySelector('.difficulty-carousel')?.parentElement as HTMLElement
      for (let i = 0; i < 3; i++) {
        expect(within(carousel).queryByText('Familiar')).not.toBeInTheDocument()
        expect(within(carousel).queryByText('Explorer')).not.toBeInTheDocument()
        expect(within(carousel).queryByText('World Expert')).not.toBeInTheDocument()
        clickNextDifficulty()
      }
    })

    it("the emoji sits alongside the label but doesn't leak into the accessible name/status — internal countryPool values stay 'familiar'/'explorer'/'world-expert'. Actual centered rendering is verified in browser QA, not here (jsdom doesn't load the real stylesheet).", () => {
      renderAt('/quiz')
      const card = difficultyCard()
      expect(card).toHaveClass('difficulty-carousel__card')
      const emojiEl = card.querySelector('.quiz-option__label span[aria-hidden="true"]')
      expect(emojiEl).toHaveTextContent('🔵⚪️⚪️')
      expect(difficultyStatus()).toHaveTextContent('Difficulty 1 of 3: Easy')
      expect(difficultyStatus()).not.toHaveTextContent('🔵')
      // Internal value for this initial ("Easy") state — persistence and
      // value-sync across every step is covered thoroughly elsewhere.
      clickNextDifficulty()
      const saved = JSON.parse(window.localStorage.getItem(storageKey('quizConfig')) ?? '{}')
      expect(saved.countryPool).toBe('explorer')
    })

    it('only one difficulty card is present in the DOM at rest (not three)', () => {
      renderAt('/quiz')
      expect(document.querySelectorAll('.difficulty-carousel__card')).toHaveLength(1)
      expect(screen.queryByText('A balanced mix of familiar and less obvious countries.')).not.toBeInTheDocument()
      expect(screen.queryByText('The full supported country pool.')).not.toBeInTheDocument()
    })

    it('exposes an accessible status announcing the current position and difficulty, using the plain label (no emoji)', () => {
      renderAt('/quiz')
      expect(difficultyStatus()).toHaveAttribute('role', 'status')
      expect(difficultyStatus()).toHaveTextContent('Difficulty 1 of 3: Easy')
      fireEvent.click(nextDifficultyBtn())
      expect(difficultyStatus()).toHaveTextContent('Difficulty 2 of 3: Medium')
    })

    it('rapid repeated presses do not skip state or desync from a single, deterministic step per press once settled', () => {
      renderAt('/quiz')
      // Fire five rapid Next presses with no time advance between them —
      // the transition lock should swallow all but the first.
      for (let i = 0; i < 5; i++) fireEvent.click(nextDifficultyBtn())
      expect(currentDifficultyLabel()).toBe('Medium 🟠🟠⚪️')
      // Let the lock's timeout elapse, then advance one more step cleanly.
      act(() => vi.advanceTimersByTime(300))
      fireEvent.click(nextDifficultyBtn())
      expect(currentDifficultyLabel()).toBe('Expert 🔴🔴🔴')
      const saved = JSON.parse(window.localStorage.getItem(storageKey('quizConfig')) ?? '{}')
      expect(saved.countryPool).toBe('world-expert')
    })
  })
})

describe('existing routes remain unaffected by the Quiz addition', () => {
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

  it('Daily, Practice, Archive and Study still render', () => {
    renderAt('/')
    expect(screen.getByRole('grid', { name: /game board/i })).toBeInTheDocument()
    renderAt('/practice')
    expect(screen.getByText(/unlimited games/i)).toBeInTheDocument()
    renderAt('/archive')
    expect(screen.getByRole('heading', { level: 1, name: 'Archive' })).toBeInTheDocument()
    renderAt('/study')
    expect(screen.getByRole('heading', { level: 1, name: 'Study' })).toBeInTheDocument()
  })
})
