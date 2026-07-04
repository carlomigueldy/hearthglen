/**
 * Lightweight combat registry connecting the player and enemies without React
 * re-renders. M1-scale (a handful of entities); migrates into the ECS with M2.
 */
import type { Vector3 } from 'three'

export interface EnemyHandle {
  id: number
  getPosition: () => Vector3
  isAlive: () => boolean
  takeHit: (damage: number, fromDir: Vector3) => void
}

export interface PlayerHandle {
  getPosition: () => Vector3
  takeDamage: (amount: number, fromDir: Vector3) => void
  heal: (amount: number) => void
}

const enemies = new Map<number, EnemyHandle>()
let player: PlayerHandle | null = null
let hitStopUntil = 0

export const combatBus = {
  registerEnemy(handle: EnemyHandle) {
    enemies.set(handle.id, handle)
    return () => {
      enemies.delete(handle.id)
    }
  },
  registerPlayer(handle: PlayerHandle) {
    player = handle
    return () => {
      player = null
    }
  },
  getEnemies(): EnemyHandle[] {
    return [...enemies.values()]
  },
  getPlayer(): PlayerHandle | null {
    return player
  },
  /** Freeze simulation cosmetics briefly for impact weight. */
  triggerHitStop(durationSec: number, now: number) {
    hitStopUntil = Math.max(hitStopUntil, now + durationSec)
  },
  inHitStop(now: number): boolean {
    return now < hitStopUntil
  },
}
