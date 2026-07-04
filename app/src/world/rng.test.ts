import { describe, expect, it } from 'vitest'
import { createRng, rngInt, rngRange } from './rng'

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 100 }, () => a())
    const seqB = Array.from({ length: 100 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 10_000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('rngInt', () => {
  it('covers the inclusive range and never leaves it', () => {
    const rng = createRng(123)
    const seen = new Set<number>()
    for (let i = 0; i < 5_000; i++) {
      const v = rngInt(rng, 1, 6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect(seen.size).toBe(6)
  })
})

describe('rngRange', () => {
  it('stays within [min, max)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 5_000; i++) {
      const v = rngRange(rng, -2.5, 2.5)
      expect(v).toBeGreaterThanOrEqual(-2.5)
      expect(v).toBeLessThan(2.5)
    }
  })
})
