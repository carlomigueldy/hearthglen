/**
 * UI-facing game state (zustand). The simulation writes snapshots here;
 * React (HUD) subscribes. Per-frame hot-path state stays in refs/modules.
 */
import { create } from 'zustand'

interface GameState {
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  inCombat: boolean
  lastAllClearAt: number
  setVitals: (v: Partial<Pick<GameState, 'health' | 'stamina' | 'inCombat'>>) => void
}

export const useGameStore = create<GameState>((set) => ({
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  inCombat: false,
  lastAllClearAt: 0,
  setVitals: (v) =>
    set((s) => {
      const next = { ...s, ...v }
      const allClear =
        next.health >= next.maxHealth && next.stamina >= next.maxStamina && !next.inCombat
      const wasClear =
        s.health >= s.maxHealth && s.stamina >= s.maxStamina && !s.inCombat
      return {
        ...next,
        lastAllClearAt: allClear && !wasClear ? performance.now() / 1000 : s.lastAllClearAt,
      }
    }),
}))
