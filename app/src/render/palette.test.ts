import { describe, expect, it } from 'vitest'
import palette from './palette.json'

describe('palette.json (generated from asset-factory/palette.py)', () => {
  it('has exactly 32 colors', () => {
    expect(Object.keys(palette)).toHaveLength(32)
  })

  it('contains only valid lowercase hex colors', () => {
    for (const [name, hex] of Object.entries(palette)) {
      expect(hex, name).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('has no duplicate colors', () => {
    const values = Object.values(palette)
    expect(new Set(values).size).toBe(values.length)
  })

  it('keeps the anchor colors the game logic references', () => {
    for (const name of ['grass', 'night', 'cream', 'hearth_orange', 'sky']) {
      expect(palette).toHaveProperty(name)
    }
  })
})
