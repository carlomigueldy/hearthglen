/** Spawn position handoff from the loaded save to the player controller. */
let loadedSpawn: [number, number, number] | null = null

export function setLoadedSpawn(pos: [number, number, number]) {
  loadedSpawn = pos
}

export function getLoadedSpawn(): [number, number, number] | null {
  return loadedSpawn
}
