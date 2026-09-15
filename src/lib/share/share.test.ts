import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildEmojiGrid, buildShareText, shareText } from './share'

describe('buildShareText', () => {
  it('formats a win with the correct puzzle number and score', () => {
    const text = buildShareText({
      puzzleNumber: 42,
      answer: 'SPAIN',
      guesses: ['CHILE', 'SAMOA', 'SPAIN'],
      won: true,
    })
    expect(text).toBe('Daily Worldle #42 3/6\n\n⬛⬛🟨⬛⬛\n🟩🟨⬛⬛⬛\n🟩🟩🟩🟩🟩')
  })
  it('uses X/6 for a loss and never includes the answer', () => {
    const guesses = ['CHILE', 'CHILE', 'CHILE', 'CHILE', 'CHILE', 'CHILE']
    const text = buildShareText({ puzzleNumber: 3, answer: 'SPAIN', guesses, won: false })
    expect(text.startsWith('Daily Worldle #3 X/6')).toBe(true)
    expect(text).not.toContain('SPAIN')
    expect(text.split('\n')).toHaveLength(8)
  })
  it('row width follows the answer length', () => {
    const grid = buildEmojiGrid(['COSTARICA'], 'COSTARICA')
    expect(Array.from(grid)).toHaveLength(9)
  })
  it('omits the number when none is given', () => {
    expect(buildShareText({ answer: 'PERU', guesses: ['PERU'], won: true, label: 'Practice' })).toMatch(
      /^Practice 1\/6\n/,
    )
  })
  it('supports a custom label', () => {
    expect(buildShareText({ puzzleNumber: 1, answer: 'PERU', guesses: ['PERU'], won: true, label: 'Practice' })).toMatch(
      /^Practice #1 1\/6/,
    )
  })
})

describe('shareText', () => {
  afterEach(() => vi.restoreAllMocks())

  it('copies to the clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await shareText('hello')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('hello')
  })
  it('reports failure gracefully when nothing works', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false })
    expect(await shareText('hello')).toBe('failed')
  })
})
