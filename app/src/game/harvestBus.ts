/**
 * Harvestable world resources + item pickup queue. Same registry pattern as
 * combatBus: per-frame simulation talks through here, React renders snapshots.
 */
import type { Vector3 } from 'three'
import type { ItemId } from './inventory'

export interface HarvestableGroup {
  /** e.g. "pine_valley_0" */
  name: string
  kind: 'tree' | 'rock'
  /** world position of instance i, or null if already harvested */
  positionOf: (i: number) => { x: number; z: number } | null
  count: number
  /** returns drops if the hit depleted the instance */
  damage: (i: number) => { item: ItemId; count: number } | null
}

export interface Pickup {
  id: number
  item: ItemId
  count: number
  x: number
  y: number
  z: number
}

const groups = new Map<string, HarvestableGroup>()
const pickups = new Map<number, Pickup>()
let nextPickupId = 1
let pickupsVersion = 0

export const harvestBus = {
  registerGroup(group: HarvestableGroup) {
    groups.set(group.name, group)
    return () => {
      groups.delete(group.name)
    }
  },
  getGroups(): HarvestableGroup[] {
    return [...groups.values()]
  },
  spawnPickup(item: ItemId, count: number, pos: Vector3) {
    pickups.set(nextPickupId, { id: nextPickupId, item, count, x: pos.x, y: pos.y, z: pos.z })
    nextPickupId++
    pickupsVersion++
  },
  collectPickup(id: number): Pickup | null {
    const p = pickups.get(id) ?? null
    if (p) {
      pickups.delete(id)
      pickupsVersion++
    }
    return p
  },
  getPickups(): Pickup[] {
    return [...pickups.values()]
  },
  getPickupsVersion(): number {
    return pickupsVersion
  },
}
