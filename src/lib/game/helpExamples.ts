import type { TileStatus } from './types'

export interface HelpExample {
  word: string
  index: number
  status: TileStatus
  /** Sentence shown under the example; "{letter}" is replaced. */
  text: string
}

/**
 * All examples use 9-letter normalized country names so the tutorial board
 * doesn't visually imply a five-letter-only game. Each status lists the
 * primary demo word first, plus two alternates used only if the primary
 * happens to be today's actual answer (see getHelpExamples below) — every
 * word here must stay a real 9-letter entry in the country dataset.
 * "Costa Rica" (COSTARICA) is the primary correct-position example: it's
 * the clearest demonstration that a country's board form can come from a
 * display name containing a space.
 */
const CANDIDATES: Record<TileStatus, readonly { word: string; index: number }[]> = {
  correct: [
    { word: 'COSTARICA', index: 1 }, // Costa Rica -> COSTARICA; highlights "O"
    { word: 'AUSTRALIA', index: 1 },
    { word: 'LITHUANIA', index: 3 },
  ],
  present: [
    { word: 'SINGAPORE', index: 4 },
    { word: 'INDONESIA', index: 3 },
    { word: 'GUATEMALA', index: 3 },
  ],
  absent: [
    { word: 'ARGENTINA', index: 2 },
    { word: 'VENEZUELA', index: 5 },
    { word: 'NICARAGUA', index: 1 },
  ],
}

const TEXT: Record<TileStatus, string> = {
  correct: '{letter} is in the country and in the correct spot.',
  present: '{letter} is in the country but in the wrong spot.',
  absent: '{letter} is not in the country in any spot.',
}

/** Three tutorial examples that never use today's answer. */
export function getHelpExamples(excludeNormalized: string | null): HelpExample[] {
  return (['correct', 'present', 'absent'] as const).map((status) => {
    const list = CANDIDATES[status]
    const pick = list.find((c) => c.word !== excludeNormalized) ?? (list[0] as { word: string; index: number })
    const letter = pick.word[pick.index] as string
    return { word: pick.word, index: pick.index, status, text: TEXT[status].replace('{letter}', letter) }
  })
}
