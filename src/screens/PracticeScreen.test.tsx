import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { EPOCH_UTC } from '../lib/daily/date'
import { storageKey } from '../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))
function key(k: string) {
  fireEvent.keyDown(window, { key: k })
}
function typeWord(word: string) {
  for (const ch of word) key(ch)
}

describe('Practice completion flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000)
    set('prefs', { theme: 'light', hasSeenHelp: true })
    window.history.replaceState(null, '', '/practice')
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

  it('continues to /results/tanzania after the win animation, preserving the completed game', () => {
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['ZIMBABWE'], current: '', status: 'active', updatedAt: 1 })
    render(<App />)
    typeWord('TANZANIA')
    key('Enter')
    // Reveal + celebration are still running: no navigation yet.
    act(() => vi.advanceTimersByTime(1500))
    expect(window.location.pathname).toBe('/practice')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Reveal finishes (~2.5s for 8 tiles); completion effects run, and only
    // after the results delay does the route transition. Advancing in steps
    // mirrors real time: effects scheduled by a timer flush when act ends.
    act(() => vi.advanceTimersByTime(1500))
    expect(window.location.pathname).toBe('/practice')
    act(() => vi.advanceTimersByTime(1000))
    expect(window.location.pathname).toBe('/practice')
    act(() => vi.advanceTimersByTime(1500))
    expect(window.location.pathname).toBe('/results/tanzania')
    const dialog = screen.getByRole('dialog', { name: /tanzania results/i })
    expect(dialog).toHaveTextContent('Solved in 2/6')
    expect(screen.getByRole('grid', { name: /game board/i })).toHaveTextContent('ZIMBABWE')
    expect(JSON.parse(window.localStorage.getItem(storageKey('practice')) ?? '{}')).toMatchObject({
      answerId: 'tanzania',
      guesses: ['ZIMBABWE', 'TANZANIA'],
      status: 'won',
    })
    expect(JSON.parse(window.localStorage.getItem(storageKey('lastResult')) ?? '{}')).toMatchObject({
      source: 'practice',
      countryId: 'tanzania',
    })
    // Only one results experience: no legacy result modal, no stats modal.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('Results on a restored completed practice game opens the country page, not Statistics', () => {
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['TANZANIA'], current: '', status: 'won', updatedAt: 1 })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^results$/i }))
    expect(window.location.pathname).toBe('/results/tanzania')
    expect(screen.getByRole('dialog', { name: /tanzania results/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /statistics/i })).not.toBeInTheDocument()
  })

  it('Play again on the practice screen still starts a new game in place', () => {
    set('practice', { answerId: 'tanzania', previousAnswerId: null, guesses: ['TANZANIA'], current: '', status: 'won', updatedAt: 1 })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(window.location.pathname).toBe('/practice')
    const saved = JSON.parse(window.localStorage.getItem(storageKey('practice')) ?? '{}')
    expect(saved.status).toBe('active')
    expect(saved.previousAnswerId).toBe('tanzania')
    expect(saved.answerId).not.toBe('tanzania')
  })
})
