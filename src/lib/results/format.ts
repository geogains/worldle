import { branding } from '../../config/branding'
import { MAX_ATTEMPTS } from '../game/types'
import type { ResultContext } from './context'

/** "Solved in 4/6" or the consolation line; never hard-codes an attempt count. */
export function resultSummary(context: Pick<ResultContext, 'status' | 'attempts'>): string {
  return context.status === 'won' ? `Solved in ${context.attempts}/${MAX_ATTEMPTS}` : 'Better luck next time'
}

/** Short label for where the result came from: "Practice", "Daily Worldle #12", "Archive #12". */
export function resultSourceLabel(context: Pick<ResultContext, 'source' | 'puzzleNumber'>): string {
  switch (context.source) {
    case 'practice':
      return 'Practice'
    case 'daily':
      return `${branding.name} #${context.puzzleNumber}`
    case 'archive':
      return `Archive #${context.puzzleNumber}`
  }
}
