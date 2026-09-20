import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../../App'
import { EPOCH_UTC } from '../../lib/daily/date'
import { storageKey } from '../../lib/storage/storage'

const set = (name: string, value: unknown) => window.localStorage.setItem(storageKey(name), JSON.stringify(value))

function renderAt(path: string) {
  cleanup()
  window.history.replaceState(null, '', path)
  return render(<App />)
}

describe('Header navigation', () => {
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

  it('desktop nav shows Daily, Practice, Archive, Study, Quiz in that order', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    const labels = within(nav)
      .getAllByRole('button')
      .map((el) => el.textContent)
    expect(labels).toEqual(['Daily', 'Practice', 'Archive', 'Study', 'Quiz'])
  })

  it('mobile drawer shows the same five items in the same order', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByRole('dialog', { name: /navigation/i })
    const labels = within(drawer)
      .getAllByRole('button')
      .map((el) => el.textContent)
      .filter((t): t is string => !!t && ['Daily', 'Practice', 'Archive', 'Study', 'Quiz'].includes(t))
    expect(labels).toEqual(['Daily', 'Practice', 'Archive', 'Study', 'Quiz'])
  })

  it('Quiz nav link navigates to /quiz', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    fireEvent.click(within(nav).getByRole('button', { name: 'Quiz' }))
    expect(window.location.pathname).toBe('/quiz')
  })

  it('Quiz nav link in the mobile drawer navigates to /quiz and closes the drawer', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByRole('dialog', { name: /navigation/i })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Quiz' }))
    expect(window.location.pathname).toBe('/quiz')
    act(() => vi.advanceTimersByTime(350)) // drawer's own close-animation timeout
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument()
  })

  it('Quiz shows the active state on /quiz', () => {
    renderAt('/quiz')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    const quiz = within(nav).getByRole('button', { name: 'Quiz' })
    expect(quiz).toHaveAttribute('aria-current', 'page')
    for (const label of ['Daily', 'Practice', 'Archive', 'Study']) {
      expect(within(nav).getByRole('button', { name: label })).not.toHaveAttribute('aria-current')
    }
  })

  it('Quiz remains active on a quiz subroute (/quiz/flags), not just the exact /quiz setup route', () => {
    set('quizConfig', { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
    renderAt('/quiz/flags')
    const nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Quiz' })).toHaveAttribute('aria-current', 'page')
  })

  it('existing Daily/Practice/Archive/Study active states are unaffected by adding Quiz', () => {
    renderAt('/')
    let nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-current', 'page')

    renderAt('/practice')
    nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Practice' })).toHaveAttribute('aria-current', 'page')

    renderAt('/archive')
    nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Archive' })).toHaveAttribute('aria-current', 'page')

    renderAt('/study')
    nav = screen.getByRole('navigation', { name: 'Game modes' })
    expect(within(nav).getByRole('button', { name: 'Study' })).toHaveAttribute('aria-current', 'page')
  })
})
