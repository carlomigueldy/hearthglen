import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { harvestBus } from '../game/harvestBus'
import { useGameStore } from '../game/store'
import type { ItemId } from '../game/inventory'
import type { Placement } from '../world/scatter'
import { worldMaterial } from './paletteMaterial'
import { useVariantAsset } from './useVariantAsset'

const HARVEST_CONFIG = {
  tree: { hp: 3, item: 'wood' as ItemId, drops: 3 },
  rock: { hp: 4, item: 'stone' as ItemId, drops: 3 },
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0)

interface Props {
  /** asset name, e.g. "rock_valley_0" */
  name: string
  placements: Placement[]
  kind: 'tree' | 'rock'
}

/** One draw call for every placement of one factory variant; chop/mine to harvest. */
export function AssetInstances({ name, placements, kind }: Props) {
  const { geometry, colliderVertices } = useVariantAsset(name)
  const meshRef = useRef<InstancedMesh>(null)
  const bodiesRef = useRef<RapierRigidBody[]>(null)
  const healths = useRef<Float32Array>(new Float32Array(0))

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const harvested = useGameStore.getState().harvested
    healths.current = new Float32Array(placements.length).fill(HARVEST_CONFIG[kind].hp)
    const helper = new Object3D()
    placements.forEach((p, i) => {
      if (harvested[`${name}:${i}`]) {
        healths.current[i] = 0
        mesh.setMatrixAt(i, HIDDEN)
        return
      }
      helper.position.set(p.x, 0, p.z)
      helper.rotation.set(0, p.yaw, 0)
      helper.scale.setScalar(p.scale)
      helper.updateMatrix()
      mesh.setMatrixAt(i, helper.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements, name, kind])

  useEffect(() => {
    const config = HARVEST_CONFIG[kind]
    return harvestBus.registerGroup({
      name,
      kind,
      count: placements.length,
      positionOf: (i) =>
        healths.current[i] > 0 ? { x: placements[i].x, z: placements[i].z } : null,
      damage: (i) => {
        if (healths.current[i] <= 0) return null
        healths.current[i] -= 1
        if (healths.current[i] > 0) return null
        meshRef.current?.setMatrixAt(i, HIDDEN)
        if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true
        bodiesRef.current?.[i]?.setEnabled(false)
        useGameStore.getState().markHarvested(`${name}:${i}`)
        return { item: config.item, count: config.drops }
      },
    })
  }, [name, kind, placements])

  // disable bodies for instances that were already harvested in a loaded save
  useEffect(() => {
    const bodies = bodiesRef.current
    if (!bodies) return
    placements.forEach((_, i) => {
      if (healths.current[i] <= 0) bodies[i]?.setEnabled(false)
    })
  }, [placements])

  const bodies = useMemo<InstancedRigidBodyProps[]>(
    () =>
      placements.map((p, i) => ({
        key: `${name}_${i}`,
        type: 'fixed',
        position: [p.x, 0, p.z],
        rotation: [0, p.yaw, 0],
        scale: [p.scale, p.scale, p.scale],
      })),
    [name, placements],
  )

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, worldMaterial(), placements.length]}
        frustumCulled={false}
      />
      <InstancedRigidBodies ref={bodiesRef} instances={bodies} colliders="hull">
        <instancedMesh
          args={[undefined, undefined, placements.length]}
          visible={false}
          frustumCulled={false}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[colliderVertices, 3]} />
          </bufferGeometry>
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}
