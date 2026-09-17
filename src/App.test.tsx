import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { EPOCH_UTC } from './lib/daily/date'
import { getDailyAnswer } from './lib/daily/select'
import { storageKey } from './lib/storage/storage'

function key(k: string) {
  fireEvent.keyDown(window, { key: k })
}
function typeWord(word: string) {
  for (const ch of word) key(ch)
}

describe('App (daily flow)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH_UTC + 3600_000) // puzzle #1, 01:00 UTC
    window.localStorage.setItem(storageKey('prefs'), JSON.stringify({ theme: 'light', hasSeenHelp: true }))
    window.history.replaceState(null, '', '/')
    // jsdom lacks ResizeObserver
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
  })

  it('shows the tutorial on the first visit only', () => {
    window.localStorage.removeItem(storageKey('prefs'))
    render(<App />)
    act(() => vi.advanceTimersByTime(400))
    expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(JSON.parse(window.localStorage.getItem(storageKey('prefs')) ?? '{}').hasSeenHelp).toBe(true)
  })

  it('rejects short and invalid guesses without consuming attempts, then wins, records stats and continues to the country results page', () => {
    const answer = getDailyAnswer(1)
    render(<App />)
    expect(screen.getByText(`Daily Worldle #1`)).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /game board/i })).toBeInTheDocument()

    key('Enter')
    expect(screen.getByText('Not enough letters')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2500))

    typeWord('Z'.repeat(answer.length))
    key('Enter')
    expect(screen.getByText('Not a valid country')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2500))
    for (let i = 0; i < answer.length; i++) key('Backspace')

    // Real country of a different length -> wrong-length message.
    const other = answer.length === 5 ? 'CHAD' : 'SPAIN'
    typeWord(other)
    key('Enter')
    expect(
      screen.getByText(other.length < answer.length ? 'Not enough letters' : `Country must contain ${answer.length} letters`),
    ).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2500))
    for (let i = 0; i < other.length; i++) key('Backspace')

    // No attempt consumed so far.
    expect(JSON.parse(window.localStorage.getItem(storageKey('daily')) ?? '{}').guesses).toEqual([])

    typeWord(answer.normalized)
    key('Enter')
    // Input locked during reveal.
    key('A')
    // Reveal, then completion effects, then the results delay.
    act(() => vi.advanceTimersByTime(4_000))
    act(() => vi.advanceTimersByTime(4_000))

    const stats = JSON.parse(window.localStorage.getItem(storageKey('stats')) ?? '{}')
    expect(stats.played).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.completedPuzzles).toEqual([1])
    // Completion is a real route transition into the country results page,
    // not the Statistics modal (that is only reachable from the header now).
    expect(window.location.pathname).toBe(`/results/${answer.id}`)
    expect(screen.queryByRole('dialog', { name: /statistics/i })).not.toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: new RegExp(`${answer.name} results`, 'i') })
    expect(dialog).toHaveTextContent(`Daily Worldle #1`)
    expect(dialog).toHaveTextContent('Solved in 1/6')
    // The completed board is rendered beneath the card from the daily store.
    expect(screen.getByRole('grid', { name: /game board/i })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(storageKey('lastResult')) ?? '{}')).toMatchObject({
      source: 'daily',
      countryId: answer.id,
      puzzleNumber: 1,
    })
  })

  it('keeps the header Statistics control separate from the completed-game Results button', () => {
    const answer = getDailyAnswer(1)
    window.localStorage.setItem(
      storageKey('daily'),
      JSON.stringify({ puzzleNumber: 1, guesses: [answer.normalized], current: '', status: 'won', updatedAt: 1 }),
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^statistics$/i }))
    expect(screen.getByRole('dialog', { name: /statistics/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    act(() => vi.advanceTimersByTime(400))

    fireEvent.click(screen.getByRole('button', { name: /^results$/i }))
    expect(window.location.pathname).toBe(`/results/${answer.id}`)
    expect(screen.queryByRole('dialog', { name: /statistics/i })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: new RegExp(`${answer.name} results`, 'i') })).toBeInTheDocument()
  })

  it('restores a completed game without re-applying stats', () => {
    const answer = getDailyAnswer(1)
    window.localStorage.setItem(
      storageKey('daily'),
      JSON.stringify({ puzzleNumber: 1, guesses: [answer.normalized], current: '', status: 'won', updatedAt: 1 }),
    )
    window.localStorage.setItem(
      storageKey('stats'),
      JSON.stringify({ played: 1, wins: 1, currentStreak: 1, maxStreak: 1, distribution: [1, 0, 0, 0, 0, 0], lastCompletedPuzzle: 1, lastWonPuzzle: 1, completedPuzzles: [1] }),
    )
    render(<App />)
    act(() => vi.advanceTimersByTime(5_000))
    expect(window.localStorage.getItem(storageKey('stats'))).toContain('"played":1')
    expect(screen.getByRole('button', { name: /results/i })).toBeInTheDocument()
    typeWord('SPAIN')
    expect(JSON.parse(window.localStorage.getItem(storageKey('daily')) ?? '{}').current).toBe('')
  })
})
