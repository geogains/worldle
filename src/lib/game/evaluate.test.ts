import { describe, expect, it } from 'vitest'
import { evaluateGuess } from './evaluate'

describe('evaluateGuess', () => {
  it('all correct', () => {
    expect(evaluateGuess('SPAIN', 'SPAIN')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
  })
  it('all absent', () => {
    expect(evaluateGuess('CHAD', 'PERU')).toEqual(['absent', 'absent', 'absent', 'absent'])
  })
  it('mixed correct / present / absent', () => {
    // answer ITALY (I T A L Y), guess CHILE: I present, L correct (pos 3), others absent
    expect(evaluateGuess('CHILE', 'ITALY')).toEqual(['absent', 'absent', 'present', 'correct', 'absent'])
    // answer PERU, guess IRAQ: R present
    expect(evaluateGuess('IRAQ', 'PERU')).toEqual(['absent', 'present', 'absent', 'absent'])
  })

  describe('duplicate letters', () => {
    it('does not mark a second occurrence present when the answer has only one', () => {
      // answer TOGO has two O's; guess OMAN has one O -> present
      expect(evaluateGuess('OMAN', 'TOGO')).toEqual(['present', 'absent', 'absent', 'absent'])
      // answer NEPAL has one N; guess NAURU: N correct... A present, U absent, R absent, U absent
      expect(evaluateGuess('NAURU', 'NEPAL')).toEqual(['correct', 'present', 'absent', 'absent', 'absent'])
    })
    it('green consumes an occurrence before yellow is awarded', () => {
      // answer GHANA (A at 2 and 4). guess JAPAN: A at 1 -> present (one A left after none green),
      // A at 3 -> present (second A), N at 4 -> present? answer N at 3... let's compute precisely:
      // GHANA: G H A N A ; JAPAN: J A P A N
      // pass1: no exact matches. remaining: G1 H1 A2 N1
      // J absent, A present (A1), P absent, A present (A0), N present (N0)
      expect(evaluateGuess('JAPAN', 'GHANA')).toEqual(['absent', 'present', 'absent', 'present', 'present'])
    })
    it('exact match takes priority over an earlier misplaced duplicate', () => {
      // answer SAMOA (A at 1 and 4). guess AAAAA -> A1 correct, A4 correct, rest absent (no remaining A)
      expect(evaluateGuess('AAAAA', 'SAMOA')).toEqual(['absent', 'correct', 'absent', 'absent', 'correct'])
    })
    it('guess with duplicate where only one exists: later exact wins, earlier becomes absent', () => {
      // answer TONGA (one A at 4). guess ALAAT? not a country but logic is pure:
      // A(0): pass1 none; remaining T,O,N,G,A minus exact... guess A L A A T vs T O N G A: no exact.
      // remaining: T1 O1 N1 G1 A1 -> A present, L absent, A absent, A absent, T present
      expect(evaluateGuess('ALAAT', 'TONGA')).toEqual(['present', 'absent', 'absent', 'absent', 'present'])
      // guess GABON vs answer TONGA: G present, A present, B absent, O present, N present
      expect(evaluateGuess('GABON', 'TONGA')).toEqual(['present', 'present', 'absent', 'present', 'present'])
    })
    it('answer with triple letters', () => {
      // answer TANZANIA: T A N Z A N I A (A x3, N x2). guess ANDORRA: A N D O R R A
      // pass1: none exact (T/A, A/N, N/D, Z/O, A/R, N/R, I/A) -> wait lengths 8 vs 7. use MALAYSIA (8): M A L A Y S I A
      // pass1 vs TANZANIA: pos1 A=A correct, pos3 A=Z no, pos7 A=A correct. remaining T,N,Z,A(1),N,I
      // pass1 vs TANZANIA: pos1 A=A, pos6 I=I, pos7 A=A correct. remaining T,N,Z,A(1),N
      // M absent, A correct, L absent, A present (A0), Y absent, S absent, I correct, A correct
      expect(evaluateGuess('MALAYSIA', 'TANZANIA')).toEqual([
        'absent', 'correct', 'absent', 'present', 'absent', 'absent', 'correct', 'correct',
      ])
    })
  })

  it('throws on mismatched lengths', () => {
    expect(() => evaluateGuess('CHAD', 'SPAIN')).toThrow()
  })
})
