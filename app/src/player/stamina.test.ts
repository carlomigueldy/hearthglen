import { describe, expect, it } from 'vitest'
import {
  createStamina,
  drainStamina,
  hasStamina,
  tickStamina,
  STAMINA_COSTS,
} from './stamina'

describe('createStamina', () => {
  it('starts full', () => {
    const s = createStamina(100)
    expect(s.current).toBe(100)
    expect(s.max).toBe(100)
  })
})

describe('drainStamina', () => {
  it('subtracts the cost and records the drain time', () => {
    const s = drainStamina(createStamina(100), 30, 5)
    expect(s.current).toBe(70)
    expect(s.lastDrainAt).toBe(5)
  })

  it('never goes below zero', () => {
    const s = drainStamina(createStamina(10), 30, 0)
    expect(s.current).toBe(0)
  })

  it('does not mutate the input state', () => {
    const before = createStamina(100)
    drainStamina(before, 30, 0)
    expect(before.current).toBe(100)
  })
})

describe('tickStamina', () => {
  it('does not regen during the delay window after a drain', () => {
    let s = drainStamina(createStamina(100), 50, 10)
    s = tickStamina(s, 0.5, 10.5)
    expect(s.current).toBe(50)
  })

  it('regens after the delay window', () => {
    let s = drainStamina(createStamina(100), 50, 0)
    s = tickStamina(s, 1, 2) // past the 1s delay
    expect(s.current).toBeGreaterThan(50)
  })

  it('caps at max', () => {
    let s = drainStamina(createStamina(100), 10, 0)
    s = tickStamina(s, 100, 200)
    expect(s.current).toBe(100)
  })

  it('continuous sprint drain works via drainStamina per tick', () => {
    let s = createStamina(100)
    for (let i = 0; i < 10; i++) {
      s = drainStamina(s, STAMINA_COSTS.sprintPerSec * 0.1, i * 0.1)
    }
    expect(s.current).toBeCloseTo(100 - STAMINA_COSTS.sprintPerSec, 1)
  })
})

describe('hasStamina', () => {
  it('is true only when the cost is affordable', () => {
    const s = drainStamina(createStamina(100), 95, 0)
    expect(hasStamina(s, 5)).toBe(true)
    expect(hasStamina(s, 6)).toBe(false)
  })
})
