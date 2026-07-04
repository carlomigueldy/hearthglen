/** Pure, immutable inventory model. */

export type ItemId = 'wood' | 'stone' | 'raw_meat' | 'cooked_meat'

export interface ItemStack {
  item: ItemId
  count: number
}

export interface Inventory {
  stacks: ItemStack[]
}

export type Cost = Partial<Record<ItemId, number>>

export function createInventory(): Inventory {
  return { stacks: [] }
}

export function addItem(inv: Inventory, item: ItemId, count = 1): Inventory {
  const existing = inv.stacks.find((s) => s.item === item)
  if (!existing) return { stacks: [...inv.stacks, { item, count }] }
  return {
    stacks: inv.stacks.map((s) => (s.item === item ? { ...s, count: s.count + count } : s)),
  }
}

export function countItem(inv: Inventory, item: ItemId): number {
  return inv.stacks.find((s) => s.item === item)?.count ?? 0
}

export function canAfford(inv: Inventory, cost: Cost): boolean {
  return Object.entries(cost).every(([item, n]) => countItem(inv, item as ItemId) >= (n ?? 0))
}

export function removeItems(inv: Inventory, cost: Cost): Inventory {
  if (!canAfford(inv, cost)) throw new Error('cannot afford cost')
  return {
    stacks: inv.stacks
      .map((s) => ({ ...s, count: s.count - (cost[s.item] ?? 0) }))
      .filter((s) => s.count > 0),
  }
}
