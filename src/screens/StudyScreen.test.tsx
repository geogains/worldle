import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { ANSWER_POOL, COUNTRIES } from '../data/countries'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

/** Finds a tile's own button by its stable data-study-tile id (avoids any ambiguity in the tile's computed accessible name). */
function tileButton(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-study-tile="${id}"]`)
  if (!el) throw new Error(`no study tile for "${id}"`)
  return el
}

describe('StudyScreen (/study)', () => {
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

  it('renders the Study heading, search input, and exactly 200 country tiles sourced from COUNTRIES', () => {
    renderAt('/study')
    expect(screen.getByRole('heading', { level: 1, name: 'Study' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search countries' })).toBeInTheDocument()
    const grid = screen.getByRole('list', { name: 'Countries' })
    expect(within(grid).getAllByRole('button')).toHaveLength(200)
    expect(COUNTRIES).toHaveLength(200)
  })

  it('includes Afghanistan, England, Scotland, Wales, United Arab Emirates, United Kingdom, United States and Vatican City', () => {
    renderAt('/study')
    for (const name of [
      'Afghanistan', 'England', 'Scotland', 'Wales',
      'United Arab Emirates', 'United Kingdom', 'United States', 'Vatican City',
    ]) {
      expect(screen.getByRole('img', { name: `Flag of ${name}` })).toBeInTheDocument()
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('does NOT include Northern Ireland as a standalone tile — it is not a canonical Study entity', () => {
    renderAt('/study')
    expect(COUNTRIES.some((c) => c.id === 'northern-ireland')).toBe(false)
    expect(screen.queryByText('Northern Ireland')).not.toBeInTheDocument()
  })

  it('does not filter by ANSWER_POOL — non-playable countries appear alongside playable ones', () => {
    renderAt('/study')
    const nonPlayable = [
      'afghanistan', 'netherlands', 'south-africa', 'switzerland',
      'united-kingdom', 'united-states', 'vatican-city',
    ]
    for (const id of nonPlayable) {
      expect(ANSWER_POOL.some((c) => c.id === id), id).toBe(false)
      expect(document.querySelector(`[data-study-tile="${id}"]`), id).not.toBeNull()
    }
  })

  it('search "united" returns exactly United Arab Emirates, United Kingdom and United States', () => {
    renderAt('/study')
    const input = screen.getByRole('searchbox', { name: 'Search countries' })
    fireEvent.change(input, { target: { value: 'united' } })
    const grid = screen.getByRole('list', { name: 'Countries' })
    expect(within(grid).getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('United Arab Emirates')).toBeInTheDocument()
    expect(screen.getByText('United Kingdom')).toBeInTheDocument()
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('search is case-insensitive: "UNITED" behaves the same as "united"', () => {
    renderAt('/study')
    const input = screen.getByRole('searchbox', { name: 'Search countries' })
    fireEvent.change(input, { target: { value: 'UNITED' } })
    const grid = screen.getByRole('list', { name: 'Countries' })
    expect(within(grid).getAllByRole('button')).toHaveLength(3)
  })

  it('search "sao" matches São Tomé and Príncipe (diacritic-insensitive)', () => {
    renderAt('/study')
    const input = screen.getByRole('searchbox', { name: 'Search countries' })
    fireEvent.change(input, { target: { value: 'sao' } })
    const grid = screen.getByRole('list', { name: 'Countries' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)
    expect(screen.getByText('São Tomé and Príncipe')).toBeInTheDocument()
  })

  it('a nonsense search shows zero tiles and a visible "No countries found." message', () => {
    renderAt('/study')
    const input = screen.getByRole('searchbox', { name: 'Search countries' })
    fireEvent.change(input, { target: { value: 'zzzzzzzz' } })
    expect(screen.queryByRole('list', { name: 'Countries' })).not.toBeInTheDocument()
    expect(screen.getByText('No countries found.')).toBeInTheDocument()
  })

  it('clearing the search restores all 200 tiles', () => {
    renderAt('/study')
    const input = screen.getByRole('searchbox', { name: 'Search countries' })
    fireEvent.change(input, { target: { value: 'united' } })
    fireEvent.change(input, { target: { value: '' } })
    const grid = screen.getByRole('list', { name: 'Countries' })
    expect(within(grid).getAllByRole('button')).toHaveLength(200)
  })

  it('clicking the United Kingdom tile navigates to /results/united-kingdom and renders its complete reference facts (not placeholders)', () => {
    renderAt('/study')
    fireEvent.click(tileButton('united-kingdom'))
    expect(window.location.pathname).toBe('/results/united-kingdom')
    expect(screen.getByRole('heading', { level: 1, name: 'United Kingdom' })).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('clicking a playable country tile (Tanzania) navigates to /results/tanzania', () => {
    renderAt('/study')
    fireEvent.click(tileButton('tanzania'))
    expect(window.location.pathname).toBe('/results/tanzania')
    expect(screen.getByRole('heading', { level: 1, name: 'Tanzania' })).toBeInTheDocument()
  })
})

describe('Study in navigation', () => {
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

  it('Study appears in the desktop nav alongside Daily, Practice and Archive', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Daily' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Practice' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Study' })).toBeInTheDocument()
  })

  it('Study gets aria-current="page" on /study; other tabs do not', () => {
    renderAt('/study')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Study' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('button', { name: 'Daily' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('button', { name: 'Practice' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('button', { name: 'Archive' })).not.toHaveAttribute('aria-current')
  })

  it('clicking the Study nav button navigates to /study', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    fireEvent.click(within(nav).getByRole('button', { name: 'Study' }))
    expect(window.location.pathname).toBe('/study')
    expect(screen.getByRole('heading', { level: 1, name: 'Study' })).toBeInTheDocument()
  })
})
