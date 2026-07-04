import { createRng, rngInt, rngRange } from './rng'

export interface ScatterConfig {
  count: number
  /** half side-length of the square world, meters */
  halfExtent: number
  /** keep this radius around the origin (spawn) clear */
  exclusionRadius: number
  scale: [min: number, max: number]
  variants: number
}

export interface Placement {
  x: number
  z: number
  yaw: number
  scale: number
  variant: number
}

/** Deterministic world dressing: same seed + config -> identical placements. */
export function createScatter(seed: number, config: ScatterConfig): Placement[] {
  const rng = createRng(seed)
  const placements: Placement[] = []
  while (placements.length < config.count) {
    const x = rngRange(rng, -config.halfExtent, config.halfExtent)
    const z = rngRange(rng, -config.halfExtent, config.halfExtent)
    if (Math.hypot(x, z) < config.exclusionRadius) continue
    placements.push({
      x,
      z,
      yaw: rng() * Math.PI * 2,
      scale: rngRange(rng, config.scale[0], config.scale[1]),
      variant: rngInt(rng, 0, config.variants - 1),
    })
  }
  return placements
}

export function groupByVariant(placements: Placement[], variants: number): Placement[][] {
  const groups: Placement[][] = Array.from({ length: variants }, () => [])
  for (const p of placements) groups[p.variant].push(p)
  return groups
}
