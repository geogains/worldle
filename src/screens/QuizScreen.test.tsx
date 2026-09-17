import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('renders the Quiz heading and all four selection groups', () => {
    renderAt('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
    expect(group('Quiz type')).toBeInTheDocument()
    expect(group('Country pool')).toBeInTheDocument()
    expect(group('Answer style')).toBeInTheDocument()
    expect(group('Question count')).toBeInTheDocument()
  })

  it('defaults to Flags / Familiar / Multiple Choice / 10, with a correct initial summary and Start Quiz ready to press immediately', () => {
    renderAt('/quiz')
    expect(within(group('Quiz type')).getByRole('radio', { name: /flags/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(group('Country pool')).getByRole('radio', { name: /^familiar/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(group('Answer style')).getByRole('radio', { name: /multiple choice/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(group('Question count')).getByRole('radio', { name: '10' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Flags · Familiar · Multiple Choice · 10 Questions')).toBeInTheDocument()
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

  it('every Country Pool option can be selected, exclusively', () => {
    renderAt('/quiz')
    const g = group('Country pool')
    for (const name of ['Familiar', 'Explorer', 'World Expert']) {
      fireEvent.click(within(g).getByRole('radio', { name: new RegExp(`^${name}`) }))
      expect(within(g).getByRole('radio', { name: new RegExp(`^${name}`) }), name).toHaveAttribute('aria-checked', 'true')
      const others = within(g)
        .getAllByRole('radio')
        .filter((el) => el.getAttribute('aria-checked') === 'true')
      expect(others).toHaveLength(1)
    }
  })

  it('both Answer Style options can be selected, exclusively and independently of Country Pool', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Country pool')).getByRole('radio', { name: /^world expert/i }))
    const g = group('Answer style')
    fireEvent.click(within(g).getByRole('radio', { name: 'Type Answer' }))
    expect(within(g).getByRole('radio', { name: 'Type Answer' })).toHaveAttribute('aria-checked', 'true')
    expect(within(g).getByRole('radio', { name: 'Multiple Choice' })).toHaveAttribute('aria-checked', 'false')
    // Country Pool selection is untouched by the Answer Style change.
    expect(within(group('Country pool')).getByRole('radio', { name: /^world expert/i })).toHaveAttribute('aria-checked', 'true')

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

  it('the configuration summary updates immediately as any selection changes', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /mixed/i }))
    fireEvent.click(within(group('Country pool')).getByRole('radio', { name: /^explorer/i }))
    fireEvent.click(within(group('Answer style')).getByRole('radio', { name: 'Type Answer' }))
    fireEvent.click(within(group('Question count')).getByRole('radio', { name: 'Unlimited' }))
    expect(screen.getByText('Mixed · Explorer · Type Answer · Unlimited')).toBeInTheDocument()
  })

  it('Start Quiz navigates to /quiz/:mode using the currently selected configuration', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /capitals/i }))
    fireEvent.click(within(group('Question count')).getByRole('radio', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' }))
    expect(window.location.pathname).toBe('/quiz/capitals')
    expect(screen.getByText('Capitals · Familiar · Multiple Choice · 5 Questions')).toBeInTheDocument()
  })

  it('selections made on /quiz persist and are still selected after navigating away and back (Change Quiz retains the previous configuration)', () => {
    renderAt('/quiz')
    fireEvent.click(within(group('Quiz type')).getByRole('radio', { name: /languages/i }))
    fireEvent.click(within(group('Country pool')).getByRole('radio', { name: /^world expert/i }))
    renderAt('/study')
    renderAt('/quiz')
    expect(within(group('Quiz type')).getByRole('radio', { name: /languages/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(group('Country pool')).getByRole('radio', { name: /^world expert/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('light/dark mode both render the setup page without errors', () => {
    set('prefs', { theme: 'dark', hasSeenHelp: true })
    renderAt('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('the setup controls (all four groups, the summary and Start Quiz) sit inside one rounded card, with the heading/intro outside it', () => {
    renderAt('/quiz')
    const card = document.querySelector('.quiz-setup-card') as HTMLElement
    expect(card).toBeInTheDocument()
    expect(within(card).getByRole('radiogroup', { name: 'Quiz type' })).toBeInTheDocument()
    expect(within(card).getByRole('radiogroup', { name: 'Country pool' })).toBeInTheDocument()
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

    fireEvent.click(within(group('Country pool')).getByRole('radio', { name: /^explorer/i }))
    expect(within(group('Country pool')).getByRole('radio', { name: /^explorer/i })).toHaveClass('quiz-option--selected')
    expect(document.querySelector('.quiz-option__check')).toBeNull()
  })

  it('Country Pool uses the dedicated "pool" grid layout, with World Expert as the 3rd option (for the mobile full-width span rule to target)', () => {
    renderAt('/quiz')
    const g = group('Country pool')
    expect(g).toHaveClass('quiz-option-group--pool')
    const options = within(g).getAllByRole('radio')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveAccessibleName(/^familiar/i)
    expect(options[1]).toHaveAccessibleName(/^explorer/i)
    expect(options[2]).toHaveAccessibleName(/^world expert/i)
  })

  it('Quiz Type keeps the unrelated grid-3 layout (not "pool"), so the Country Pool span rule cannot leak into it', () => {
    renderAt('/quiz')
    expect(group('Quiz type')).toHaveClass('quiz-option-group--grid-3')
    expect(group('Quiz type')).not.toHaveClass('quiz-option-group--pool')
  })
})

describe('Study result CTA -> /quiz', () => {
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

  it('a standalone country result page shows "Quiz" (not "Practice") and it routes to /quiz', () => {
    renderAt('/results/china')
    const card = within(screen.getByRole('heading', { level: 1 }).closest('.country-result') as HTMLElement)
    expect(card.queryByRole('button', { name: /^practice$/i })).not.toBeInTheDocument()
    fireEvent.click(card.getByRole('button', { name: /^quiz$/i }))
    expect(window.location.pathname).toBe('/quiz')
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument()
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
