import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))
const completedPractice = {
  answerId: 'tanzania',
  previousAnswerId: null,
  guesses: ['ZIMBABWE', 'MALAYSIA', 'TANZANIA'],
  current: '',
  status: 'won',
  updatedAt: 1,
}

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

describe('CountryResultScreen (/results/:slug)', () => {
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

  it('restores the completed practice game beneath the Tanzania card (refresh / direct load)', () => {
    set('practice', completedPractice)
    set('lastResult', { source: 'practice', countryId: 'tanzania', puzzleNumber: null, at: 1 })
    renderAt('/results/tanzania')

    const dialog = screen.getByRole('dialog', { name: /tanzania results/i })
    expect(within(dialog).getByRole('img', { name: 'Flag of Tanzania' })).toHaveAttribute('src', '/flags/TZ.png')
    expect(within(dialog).getByRole('heading', { name: 'Tanzania' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Solved in 3/6')
    expect(dialog).toHaveTextContent('Practice')
    // Tanzania is the populated test case for the country-data layer: real
    // facts render, not placeholders.
    expect(within(dialog).getByText('Dodoma')).toBeInTheDocument()
    expect(within(dialog).getByText('69 million')).toBeInTheDocument()
    // population.asOf is preserved in the raw data but never rendered.
    expect(dialog).not.toHaveTextContent(/estimate as of/i)
    expect(dialog).not.toHaveTextContent('2026')
    expect(within(dialog).getByText('Africa')).toBeInTheDocument()
    expect(within(dialog).getByText('Tanzanian Shilling (TZS) · TSh')).toBeInTheDocument()
    expect(within(dialog).getByText('Swahili, English')).toBeInTheDocument()
    expect(within(dialog).queryByText('Coming soon')).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('Did you know?')
    expect(dialog).toHaveTextContent('Mount Kilimanjaro')
    expect(within(dialog).getByRole('button', { name: /play again/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(document.title).toBe('Daily Worldle — Tanzania Results')

    // The actual completed board: three submitted rows, keyboard locked.
    const grid = screen.getByRole('grid', { name: /game board/i })
    const rows = within(grid).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('ZIMBABWE')
    expect(rows[2]).toHaveTextContent('TANZANIA')
    expect(rows[3]).not.toHaveTextContent(/[A-Z]/)
    // Nothing was written back to the practice store by merely viewing it.
    expect(JSON.parse(window.localStorage.getItem(storageKey('practice')) ?? '{}')).toEqual(completedPractice)
  })

  it('result modal redesign: near-full-viewport card on mobile / classic centered popup on desktop, keeps the hierarchy, and drops "Back to today\'s puzzle" with no replacement', () => {
    set('practice', completedPractice)
    renderAt('/results/tanzania')
    const dialog = screen.getByRole('dialog', { name: /tanzania results/i })

    // Uses Modal's `result` variant: near-full-viewport card below 640px
    // (visible backdrop margin, full rounded corners via .modal-panel--result),
    // classic centered/constrained popup at/above it (sm:h-auto, sm:max-h-[92dvh]).
    expect(dialog).toHaveClass('modal-panel--result')
    expect(dialog).toHaveClass('w-[calc(100vw-16px)]')
    expect(dialog).toHaveClass('max-w-[600px]')
    expect(dialog).toHaveClass('sm:h-auto')
    expect(dialog).toHaveClass('sm:max-h-[92dvh]')

    // Hierarchy intact: flag, name, mode badge, result message, facts,
    // fun fact, Play again, Share — in that DOM order.
    const headerEls = Array.from(dialog.querySelectorAll('img, h3, .eyebrow--pill, .country-result__summary'))
    expect(headerEls.map((el) => el.tagName.toLowerCase())).toEqual(['img', 'h3', 'span', 'p'])
    expect(within(dialog).getByRole('img', { name: 'Flag of Tanzania' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Tanzania' })).toBeInTheDocument()
    expect(within(dialog).getByText('Practice')).toBeInTheDocument()
    expect(within(dialog).getByText('Solved in 3/6')).toBeInTheDocument()
    expect(dialog.querySelector('.country-result__facts')).toBeInTheDocument()
    expect(dialog.querySelector('.country-result__fun-fact')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /play again/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^close$/i })).toBeInTheDocument()

    // The removed CTA, with no replacement in its place.
    expect(within(dialog).queryByRole('button', { name: /back to today's puzzle/i })).not.toBeInTheDocument()
    expect(dialog.querySelector('.country-result__tertiary')).not.toBeInTheDocument()
  })

  it('closes with Escape without leaving the route, and the Results button reopens the card', () => {
    set('practice', completedPractice)
    renderAt('/results/tanzania')
    const dialog = screen.getByRole('dialog', { name: /tanzania results/i })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/results/tanzania')
    expect(screen.getByRole('grid', { name: /game board/i })).toBeInTheDocument()

    const results = screen.getByRole('button', { name: /^results$/i })
    results.focus()
    fireEvent.click(results)
    expect(window.location.pathname).toBe('/results/tanzania')
    expect(screen.getByRole('dialog', { name: /tanzania results/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /statistics/i })).not.toBeInTheDocument()

    // Close via the X and focus returns to the Results button.
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(results)
  })

  it('Play again starts a fresh practice game via the shared practice flow', () => {
    set('practice', completedPractice)
    renderAt('/results/tanzania')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /play again/i }))
    expect(window.location.pathname).toBe('/practice')
    const saved = JSON.parse(window.localStorage.getItem(storageKey('practice')) ?? '{}')
    expect(saved.status).toBe('active')
    expect(saved.guesses).toEqual([])
    expect(saved.previousAnswerId).toBe('tanzania')
    expect(saved.answerId).not.toBe('tanzania')
    expect(screen.getByText(/unlimited games/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders a standalone country page when there is no completed game (no fabricated result)', () => {
    renderAt('/results/tanzania')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tanzania' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Tanzania' })).toBeInTheDocument()
    expect(screen.getByText('Dodoma')).toBeInTheDocument()
    expect(screen.getByText('Tanzanian Shilling (TZS) · TSh')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
    expect(screen.queryByText(/solved in/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/better luck/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    const card = within(screen.getByRole('heading', { level: 1 }).closest('.country-result') as HTMLElement)
    fireEvent.click(card.getByRole('button', { name: /^quiz$/i }))
    expect(window.location.pathname).toBe('/quiz')
  })

  it('standalone/reference result (no completed-game context, e.g. opened from Study): shows Quiz as primary and Back to Study as secondary, never "Today\'s puzzle" or bare "Practice"', () => {
    renderAt('/results/tanzania')
    const card = within(screen.getByRole('heading', { level: 1 }).closest('.country-result') as HTMLElement)
    const quizBtn = card.getByRole('button', { name: /^quiz$/i })
    const backToStudyBtn = card.getByRole('button', { name: /^back to study$/i })
    expect(quizBtn).toHaveClass('btn--primary')
    expect(backToStudyBtn).toHaveClass('btn--secondary')
    expect(card.queryByRole('button', { name: /today's puzzle/i })).not.toBeInTheDocument()
    expect(card.queryByRole('button', { name: /^practice$/i })).not.toBeInTheDocument()

    fireEvent.click(backToStudyBtn)
    expect(window.location.pathname).toBe('/study')
    expect(screen.getByRole('heading', { level: 1, name: 'Study' })).toBeInTheDocument()
  })

  it('standalone/reference result for a playable country (China) shows the same Quiz + Back to Study pair, proving the CTA is not eligibility-based', () => {
    renderAt('/results/china')
    const card = within(screen.getByRole('heading', { level: 1 }).closest('.country-result') as HTMLElement)
    expect(card.getByRole('button', { name: /^quiz$/i })).toHaveClass('btn--primary')
    expect(card.getByRole('button', { name: /^back to study$/i })).toHaveClass('btn--secondary')
    expect(card.queryByRole('button', { name: /today's puzzle/i })).not.toBeInTheDocument()

    fireEvent.click(card.getByRole('button', { name: /^quiz$/i }))
    expect(window.location.pathname).toBe('/quiz')
  })

  it('standalone/reference result for a non-playable country (United Kingdom) shows the same Quiz + Back to Study pair', () => {
    renderAt('/results/united-kingdom')
    const card = within(screen.getByRole('heading', { level: 1 }).closest('.country-result') as HTMLElement)
    expect(card.getByRole('button', { name: /^quiz$/i })).toHaveClass('btn--primary')
    expect(card.getByRole('button', { name: /^back to study$/i })).toHaveClass('btn--secondary')
    expect(card.queryByRole('button', { name: /today's puzzle/i })).not.toBeInTheDocument()

    fireEvent.click(card.getByRole('button', { name: /^back to study$/i }))
    expect(window.location.pathname).toBe('/study')
  })

  it('completed Practice result regression: still shows Play again + Share, never Back to Study', () => {
    set('practice', completedPractice)
    renderAt('/results/tanzania')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /play again/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /back to study/i })).not.toBeInTheDocument()
  })

  it('completed Daily result regression: preserves its own CTAs exactly, never Back to Study or View statistics', () => {
    set('daily', { puzzleNumber: 1, guesses: ['ZIMBABWE', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 })
    set('lastResult', { source: 'daily', countryId: 'tanzania', puzzleNumber: 1, at: 1 })
    renderAt('/results/tanzania')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /play practice/i })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /back to study/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /^practice$/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /view statistics/i })).not.toBeInTheDocument()
    // No tertiary row at all for a completed Daily result now that its only
    // occupant (View statistics) is gone.
    expect(dialog.querySelector('.country-result__tertiary')).not.toBeInTheDocument()
  })

  it('View statistics is removed from the post-game result page; the header Statistics control still opens it independently', () => {
    set('daily', { puzzleNumber: 1, guesses: ['ZIMBABWE', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 })
    set('lastResult', { source: 'daily', countryId: 'tanzania', puzzleNumber: 1, at: 1 })
    renderAt('/results/tanzania')
    expect(screen.queryByRole('button', { name: /view statistics/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Statistics' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }))
    expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeInTheDocument()
  })

  it('does not show a completed game for a different country as Tanzania context', () => {
    set('practice', { ...completedPractice, answerId: 'zimbabwe', guesses: ['ZIMBABWE'] })
    renderAt('/results/tanzania')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('shows a real flag and real facts for Mauritania end to end (formerly the documented flag-mapping gap, now completed)', () => {
    // Mauritania was the last gameplay country with no flag mapping (see
    // src/data/countryDetails/flags.ts) — a real public/flags/MR.png was
    // added and mauritania -> MR mapped, closing that gap. Every gameplay
    // country now has a flag and real facts, so this end-to-end path no
    // longer has a "neutral frame" fixture to exercise; this confirms the
    // completed data resolves correctly through the full screen instead.
    set('practice', { ...completedPractice, answerId: 'mauritania', guesses: ['AZERBAIJAN', 'MAURITANIA'] })
    renderAt('/results/mauritania')
    const dialog = screen.getByRole('dialog', { name: /mauritania results/i })
    const flag = within(dialog).getByRole('img', { name: 'Flag of Mauritania' })
    expect(flag).toHaveAttribute('src', '/flags/MR.png')
    expect(dialog).toHaveTextContent('Solved in 2/6')
    expect(within(dialog).queryAllByText('Coming soon')).toHaveLength(0)
    expect(dialog).toHaveTextContent('Nouakchott')
    expect(dialog).toHaveTextContent('5 million')
    expect(dialog).toHaveTextContent('Mauritanian Ouguiya (MRU) · UM')
    expect(dialog).toHaveTextContent('Arabic')
  })

  it('shows the correct flag for a country other than Tanzania', () => {
    set('practice', { ...completedPractice, answerId: 'japan', guesses: ['JAPAN'] })
    renderAt('/results/japan')
    const dialog = screen.getByRole('dialog', { name: /japan results/i })
    const flag = within(dialog).getByRole('img', { name: 'Flag of Japan' })
    expect(flag).toHaveAttribute('src', '/flags/JP.png')
    expect(dialog).toHaveTextContent('Solved in 1/6')
  })

  it('acknowledges a loss without exposing anything else', () => {
    set('practice', { ...completedPractice, status: 'lost', guesses: Array(6).fill('ZIMBABWE') })
    renderAt('/results/tanzania')
    const dialog = screen.getByRole('dialog', { name: /tanzania results/i })
    expect(dialog).toHaveTextContent('Better luck next time')
    expect(dialog).not.toHaveTextContent(/solved in/i)
  })

  it('falls back to not-found for an invalid country slug', () => {
    renderAt('/results/not-a-country')
    expect(screen.getByRole('heading', { name: /isn't in daily worldle/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /today's puzzle/i }))
    expect(window.location.pathname).toBe('/')
  })

  describe('Study Previous/Next country navigation', () => {
    const cardOf = (name: string) => within(screen.getByRole('heading', { level: 1, name }).closest('.country-result') as HTMLElement)

    it('resolves to the immediate alphabetical neighbours for a middle country (Algeria)', () => {
      renderAt('/results/algeria')
      const card = cardOf('Algeria')
      expect(card.getByRole('button', { name: 'Previous country: Albania' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Next country: Andorra' })).toBeInTheDocument()
    })

    it('resolves Andorra’s neighbours to Algeria and Angola', () => {
      renderAt('/results/andorra')
      const card = cardOf('Andorra')
      expect(card.getByRole('button', { name: 'Previous country: Algeria' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Next country: Angola' })).toBeInTheDocument()
    })

    it('loops Previous from the first Study country (Afghanistan) to the last (Zimbabwe), Next to the second (Albania)', () => {
      renderAt('/results/afghanistan')
      const card = cardOf('Afghanistan')
      expect(card.getByRole('button', { name: 'Previous country: Zimbabwe' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Next country: Albania' })).toBeInTheDocument()
    })

    it('loops Next from the last Study country (Zimbabwe) to the first (Afghanistan), Previous to the penultimate (Zambia)', () => {
      renderAt('/results/zimbabwe')
      const card = cardOf('Zimbabwe')
      expect(card.getByRole('button', { name: 'Previous country: Zambia' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Next country: Afghanistan' })).toBeInTheDocument()
    })

    it('Next performs a real route navigation (URL, content, title, CTAs, neighbour labels all update) and pushes browser history', () => {
      renderAt('/results/algeria')
      expect(window.location.pathname).toBe('/results/algeria')
      const lengthBefore = window.history.length

      fireEvent.click(cardOf('Algeria').getByRole('button', { name: 'Next country: Andorra' }))
      expect(window.location.pathname).toBe('/results/andorra')
      expect(document.title).toBe('Daily Worldle — Andorra Results')
      let card = cardOf('Andorra')
      expect(card.getByRole('img', { name: 'Flag of Andorra' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: /^quiz$/i })).toBeInTheDocument()
      expect(card.getByRole('button', { name: /^back to study$/i })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Previous country: Algeria' })).toBeInTheDocument()
      expect(card.getByRole('button', { name: 'Next country: Angola' })).toBeInTheDocument()

      fireEvent.click(card.getByRole('button', { name: 'Next country: Angola' }))
      expect(window.location.pathname).toBe('/results/angola')
      card = cardOf('Angola')
      expect(card.getByRole('button', { name: 'Previous country: Andorra' })).toBeInTheDocument()

      // Two real forward navigations, each its own history entry (pushState,
      // not replaceState) — not just the same page's content swapped in place.
      expect(window.history.length).toBe(lengthBefore + 2)
    })

    it('Previous performs a real route navigation in the opposite direction', () => {
      renderAt('/results/andorra')
      fireEvent.click(cardOf('Andorra').getByRole('button', { name: 'Previous country: Algeria' }))
      expect(window.location.pathname).toBe('/results/algeria')
      expect(cardOf('Algeria').getByRole('heading', { level: 1, name: 'Algeria' })).toBeInTheDocument()
    })

    it('ordinary browser Back/Forward walks each intermediate country, not straight to the start', async () => {
      vi.useRealTimers()
      renderAt('/results/algeria')
      fireEvent.click(cardOf('Algeria').getByRole('button', { name: 'Next country: Andorra' }))
      fireEvent.click(cardOf('Andorra').getByRole('button', { name: 'Next country: Angola' }))
      expect(window.location.pathname).toBe('/results/angola')

      act(() => window.history.back())
      await waitFor(() => expect(window.location.pathname).toBe('/results/andorra'))
      expect(screen.getByRole('heading', { level: 1, name: 'Andorra' })).toBeInTheDocument()

      act(() => window.history.back())
      await waitFor(() => expect(window.location.pathname).toBe('/results/algeria'))
      expect(screen.getByRole('heading', { level: 1, name: 'Algeria' })).toBeInTheDocument()
    })
  })
})
