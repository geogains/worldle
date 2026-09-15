import type { TileStatus } from './types'

export interface HelpExample {
  word: string
  index: number
  status: TileStatus
  /** Sentence shown under the example; "{letter}" is replaced. */
  text: string
}

const CANDIDATES: Record<TileStatus, readonly { word: string; index: number }[]> = {
  correct: [
    { word: 'SPAIN', index: 0 },
    { word: 'JAPAN', index: 0 },
    { word: 'KENYA', index: 0 },
  ],
  present: [
    { word: 'ITALY', index: 1 },
    { word: 'NEPAL', index: 1 },
    { word: 'CHILE', index: 1 },
  ],
  absent: [
    { word: 'GHANA', index: 1 },
    { word: 'MALTA', index: 1 },
    { word: 'YEMEN', index: 1 },
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
