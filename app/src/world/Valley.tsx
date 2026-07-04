import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { Color } from 'three'
import { paletteHex } from '../render/paletteMaterial'
import { AssetInstances } from '../render/AssetInstances'
import { createScatter, groupByVariant } from './scatter'

export const WORLD_SEED = 20260704
export const HALF_EXTENT = 90

const VARIANTS = 4
const PINES = 2600
const ROCKS = 2400

/** M0 valley: flat ground + 5k seeded, instanced pines and rocks. */
export function Valley() {
  const { pineGroups, rockGroups } = useMemo(() => {
    const pines = createScatter(WORLD_SEED, {
      count: PINES,
      halfExtent: HALF_EXTENT,
      exclusionRadius: 8,
      scale: [0.7, 1.4],
      variants: VARIANTS,
    })
    const rocks = createScatter(WORLD_SEED + 1, {
      count: ROCKS,
      halfExtent: HALF_EXTENT,
      exclusionRadius: 6,
      scale: [0.5, 1.6],
      variants: VARIANTS,
    })
    return {
      pineGroups: groupByVariant(pines, VARIANTS),
      rockGroups: groupByVariant(rocks, VARIANTS),
    }
  }, [])

  const grass = useMemo(() => new Color(paletteHex('grass')), [])

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_EXTENT + 20, 0.5, HALF_EXTENT + 20]} position={[0, -0.5, 0]} />
        <mesh rotation-x={-Math.PI / 2} position-y={0}>
          <planeGeometry args={[(HALF_EXTENT + 20) * 2, (HALF_EXTENT + 20) * 2]} />
          <meshLambertMaterial color={grass} />
        </mesh>
      </RigidBody>
      {pineGroups.map((placements, i) => (
        <AssetInstances key={`pine_${i}`} name={`pine_valley_${i}`} placements={placements} />
      ))}
      {rockGroups.map((placements, i) => (
        <AssetInstances key={`rock_${i}`} name={`rock_valley_${i}`} placements={placements} />
      ))}
    </>
  )
}
