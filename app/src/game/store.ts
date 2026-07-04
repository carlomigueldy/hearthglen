/**
 * UI-facing game state (zustand). The simulation writes snapshots/events here;
 * React (HUD) subscribes. Per-frame hot-path state stays in refs/modules.
 */
import { create } from 'zustand'
import { addItem, createInventory, removeItems, type Cost, type Inventory, type ItemId } from './inventory'

interface GameState {
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  inCombat: boolean
  lastAllClearAt: number
  inventory: Inventory
  harvested: Record<string, true>
  campfires: { x: number; z: number }[]
  warm: boolean
  nearFire: boolean
  setVitals: (
    v: Partial<Pick<GameState, 'health' | 'stamina' | 'inCombat' | 'warm' | 'nearFire'>>,
  ) => void
  addItems: (item: ItemId, count: number) => void
  spendItems: (cost: Cost) => void
  markHarvested: (key: string) => void
  addCampfire: (x: number, z: number) => void
  hydrate: (partial: Partial<Pick<GameState, 'inventory' | 'harvested' | 'campfires'>>) => void
}

export const useGameStore = create<GameState>((set) => ({
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  inCombat: false,
  lastAllClearAt: 0,
  inventory: createInventory(),
  harvested: {},
  campfires: [],
  warm: false,
  nearFire: false,
  setVitals: (v) =>
    set((s) => {
      const next = { ...s, ...v }
      const allClear =
        next.health >= next.maxHealth && next.stamina >= next.maxStamina && !next.inCombat
      const wasClear = s.health >= s.maxHealth && s.stamina >= s.maxStamina && !s.inCombat
      return {
        ...next,
        lastAllClearAt: allClear && !wasClear ? performance.now() / 1000 : s.lastAllClearAt,
      }
    }),
  addItems: (item, count) => set((s) => ({ inventory: addItem(s.inventory, item, count) })),
  spendItems: (cost) => set((s) => ({ inventory: removeItems(s.inventory, cost) })),
  markHarvested: (key) => set((s) => ({ harvested: { ...s.harvested, [key]: true } })),
  addCampfire: (x, z) => set((s) => ({ campfires: [...s.campfires, { x, z }] })),
  hydrate: (partial) => set(partial),
}))
