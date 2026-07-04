import { describe, expect, it } from 'vitest'
import { createScatter, groupByVariant } from './scatter'

const CONFIG = {
  count: 1000,
  halfExtent: 80,
  exclusionRadius: 10,
  scale: [0.7, 1.4] as [number, number],
  variants: 4,
}

describe('createScatter', () => {
  it('is deterministic for the same seed', () => {
    expect(createScatter(7, CONFIG)).toEqual(createScatter(7, CONFIG))
  })

  it('differs across seeds', () => {
    expect(createScatter(1, CONFIG)).not.toEqual(createScatter(2, CONFIG))
  })

  it('produces the requested count', () => {
    expect(createScatter(7, CONFIG)).toHaveLength(1000)
  })

  it('keeps every placement inside the world bounds', () => {
    for (const p of createScatter(7, CONFIG)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(CONFIG.halfExtent)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(CONFIG.halfExtent)
    }
  })

  it('keeps the spawn exclusion zone clear', () => {
    for (const p of createScatter(7, CONFIG)) {
      expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(CONFIG.exclusionRadius)
    }
  })

  it('keeps scale within range and yaw within a full turn', () => {
    for (const p of createScatter(7, CONFIG)) {
      expect(p.scale).toBeGreaterThanOrEqual(0.7)
      expect(p.scale).toBeLessThanOrEqual(1.4)
      expect(p.yaw).toBeGreaterThanOrEqual(0)
      expect(p.yaw).toBeLessThan(Math.PI * 2)
    }
  })

  it('uses every variant', () => {
    const variants = new Set(createScatter(7, CONFIG).map((p) => p.variant))
    expect(variants.size).toBe(CONFIG.variants)
  })
})

describe('groupByVariant', () => {
  it('partitions placements without losing any', () => {
    const placements = createScatter(7, CONFIG)
    const groups = groupByVariant(placements, CONFIG.variants)
    expect(groups).toHaveLength(CONFIG.variants)
    expect(groups.reduce((n, g) => n + g.length, 0)).toBe(placements.length)
    groups.forEach((group, i) => {
      for (const p of group) expect(p.variant).toBe(i)
    })
  })
})
