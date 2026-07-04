import { describe, expect, it } from 'vitest'
import { addItem, countItem, createInventory, removeItems, canAfford } from './inventory'

describe('inventory', () => {
  it('starts empty', () => {
    expect(createInventory().stacks).toEqual([])
  })

  it('adds items into stacks', () => {
    let inv = createInventory()
    inv = addItem(inv, 'wood', 3)
    inv = addItem(inv, 'wood', 2)
    inv = addItem(inv, 'stone', 1)
    expect(countItem(inv, 'wood')).toBe(5)
    expect(countItem(inv, 'stone')).toBe(1)
    expect(inv.stacks).toHaveLength(2)
  })

  it('does not mutate previous states', () => {
    const before = addItem(createInventory(), 'wood', 1)
    addItem(before, 'wood', 5)
    expect(countItem(before, 'wood')).toBe(1)
  })

  it('removes across a recipe cost and reports affordability', () => {
    let inv = addItem(addItem(createInventory(), 'wood', 8), 'stone', 4)
    const cost = { wood: 5, stone: 2 }
    expect(canAfford(inv, cost)).toBe(true)
    inv = removeItems(inv, cost)
    expect(countItem(inv, 'wood')).toBe(3)
    expect(countItem(inv, 'stone')).toBe(2)
  })

  it('refuses to remove more than held', () => {
    const inv = addItem(createInventory(), 'wood', 2)
    expect(canAfford(inv, { wood: 3 })).toBe(false)
    expect(() => removeItems(inv, { wood: 3 })).toThrow()
  })

  it('drops empty stacks after removal', () => {
    let inv = addItem(createInventory(), 'wood', 2)
    inv = removeItems(inv, { wood: 2 })
    expect(inv.stacks).toEqual([])
  })
})
