/**
 * The one world material: flat-shaded vertex colors from the 32-color palette.
 * No textures anywhere (PLAN.md §5.2) — this is what keeps draw calls batchable
 * and downloads tiny. TypeGPU-based palette compute (grass, particles) will sit
 * beside this module post-M0.
 */
import { MeshLambertMaterial } from 'three'
import palette from './palette.json'

export const PALETTE: Record<string, string> = palette

export function paletteHex(name: string): string {
  const hex = PALETTE[name]
  if (!hex) throw new Error(`unknown palette color: ${name}`)
  return hex
}

let shared: MeshLambertMaterial | null = null

/** Single shared material for every generated asset. */
export function worldMaterial(): MeshLambertMaterial {
  shared ??= new MeshLambertMaterial({ vertexColors: true })
  return shared
}
