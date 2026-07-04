/**
 * Pure stamina model (immutable updates). Simulation state lives outside React;
 * components read snapshots. Times are seconds (physics clock).
 */
export interface StaminaState {
  max: number
  current: number
  lastDrainAt: number
}

export const STAMINA_COSTS = {
  sprintPerSec: 12,
  jump: 12,
  dodge: 25,
  attack: 18,
} as const

const REGEN_PER_SEC = 35
const REGEN_DELAY_SEC = 1

export function createStamina(max: number): StaminaState {
  return { max, current: max, lastDrainAt: -Infinity }
}

export function drainStamina(state: StaminaState, cost: number, now: number): StaminaState {
  return {
    ...state,
    current: Math.max(0, state.current - cost),
    lastDrainAt: now,
  }
}

export function tickStamina(state: StaminaState, dt: number, now: number): StaminaState {
  if (now - state.lastDrainAt < REGEN_DELAY_SEC || state.current >= state.max) return state
  return {
    ...state,
    current: Math.min(state.max, state.current + REGEN_PER_SEC * dt),
  }
}

export function hasStamina(state: StaminaState, cost: number): boolean {
  return state.current >= cost
}
