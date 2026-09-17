import { describe, expect, it } from 'vitest'
import { pick, sample, shuffle, type RandomSource } from './random'

/** Deterministic source cycling through a fixed sequence, wrapping around. */
function sequence(values: number[]): RandomSource {
  let i = 0
  return () => {
    const v = values[i % values.length] as number
    i++
    return v
  }
}

describe('shuffle', () => {
  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4]
    shuffle(input, sequence([0.1, 0.2, 0.3]))
    expect(input).toEqual([1, 2, 3, 4])
  })
  it('returns every original element exactly once', () => {
    const input = ['a', 'b', 'c', 'd', 'e']
    const result = shuffle(input, sequence([0.9, 0.1, 0.5, 0.2, 0.7]))
    expect(result).toHaveLength(5)
    expect(new Set(result)).toEqual(new Set(input))
  })
  it('is deterministic for a fixed random source', () => {
    const input = [1, 2, 3, 4, 5]
    const a = shuffle(input, sequence([0.1, 0.9, 0.4]))
    const b = shuffle(input, sequence([0.1, 0.9, 0.4]))
    expect(a).toEqual(b)
  })
  it('a constant-zero source still produces a valid permutation', () => {
    const input = [1, 2, 3, 4]
    const result = shuffle(input, () => 0)
    expect(new Set(result)).toEqual(new Set(input))
  })
})

describe('pick', () => {
  it('returns undefined for an empty array', () => {
    expect(pick([], sequence([0.5]))).toBeUndefined()
  })
  it('returns an element from the array', () => {
    const input = ['a', 'b', 'c']
    expect(input).toContain(pick(input, sequence([0.5])))
  })
})

describe('sample', () => {
  it('returns exactly `count` unique elements when enough exist', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const result = sample(input, 3, sequence([0.1, 0.9, 0.4, 0.6]))
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
    for (const v of result) expect(input).toContain(v)
  })
  it('caps at the array length when count exceeds it', () => {
    const input = [1, 2, 3]
    expect(sample(input, 10, sequence([0.1, 0.5]))).toHaveLength(3)
  })
  it('returns an empty array for count 0', () => {
    expect(sample([1, 2, 3], 0)).toEqual([])
  })
})
