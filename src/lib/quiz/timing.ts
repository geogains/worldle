/**
 * Centralized quiz feedback timing, mirroring the FULL_MOTION/REDUCED_MOTION
 * split already used by the Daily/Practice game engine (useGameEngine.ts) —
 * one place to tune instead of a magic number scattered through the quiz
 * engine/screens. ~800ms is the requested target for full motion; reduced
 * motion gets a much shorter delay so the automatic-advance flow stays
 * snappy for players who've asked for less animation, without removing the
 * feedback entirely (they still see it, just briefly).
 *
 * Incorrect answers get a longer delay than correct ones: after a correct
 * answer there's nothing new to read (the player already knew the answer),
 * but after an incorrect one the player needs to notice they were wrong,
 * see their own answer, see the correct one, and actually read it — a
 * quick confirmation-length pause isn't enough. 1.75x (full motion) / 2x
 * (reduced motion — chosen so both land on a clean round number) keeps
 * this within the requested 1.5-2x range without dragging the flow out.
 */
export const QUIZ_FEEDBACK_DELAY_MS = 800
export const QUIZ_FEEDBACK_DELAY_MS_REDUCED = 250
export const QUIZ_FEEDBACK_DELAY_INCORRECT_MS = 1400
export const QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED = 500

export function quizFeedbackDelay(reducedMotion: boolean, isCorrect: boolean = true): number {
  if (isCorrect) return reducedMotion ? QUIZ_FEEDBACK_DELAY_MS_REDUCED : QUIZ_FEEDBACK_DELAY_MS
  return reducedMotion ? QUIZ_FEEDBACK_DELAY_INCORRECT_MS_REDUCED : QUIZ_FEEDBACK_DELAY_INCORRECT_MS
}
