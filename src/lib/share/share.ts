import { branding } from '../../config/branding'
import { evaluateGuess } from '../game/evaluate'
import { MAX_ATTEMPTS, type TileStatus } from '../game/types'

const EMOJI: Record<TileStatus, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
}

export interface ShareInput {
  /** Omit (or null) for modes without a puzzle number, e.g. practice. */
  puzzleNumber?: number | null
  guesses: readonly string[]
  answer: string
  won: boolean
  /** Optional label override, e.g. "Practice". Defaults to the product name. */
  label?: string
}

export function buildEmojiGrid(guesses: readonly string[], answer: string): string {
  return guesses
    .map((guess) =>
      evaluateGuess(guess, answer)
        .map((s) => EMOJI[s])
        .join(''),
    )
    .join('\n')
}

/** Spoiler-free share text: "Daily Worldle #42 4/6" + emoji grid. */
export function buildShareText(input: ShareInput): string {
  const score = input.won ? String(input.guesses.length) : 'X'
  const number = input.puzzleNumber == null ? '' : ` #${input.puzzleNumber}`
  const header = `${input.label ?? branding.name}${number} ${score}/${MAX_ATTEMPTS}`
  return `${header}\n\n${buildEmojiGrid(input.guesses, input.answer)}`
}

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/**
 * Tries the Web Share API (on devices that support sharing text), then the
 * async clipboard API. Never throws.
 */
export async function shareText(text: string): Promise<ShareOutcome> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator
  if (nav?.share && (!nav.canShare || nav.canShare({ text }))) {
    // Only prefer the native sheet on touch-first devices; desktop browsers
    // often show an awkward dialog where a copy is what people expect.
    const coarse =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    if (coarse) {
      try {
        await nav.share({ text })
        return 'shared'
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
        // fall through to clipboard
      }
    }
  }
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    // fall through
  }
  return legacyCopy(text) ? 'copied' : 'failed'
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
