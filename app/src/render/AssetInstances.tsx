import { InstancedRigidBodies, type InstancedRigidBodyProps } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import type { Placement } from '../world/scatter'
import { worldMaterial } from './paletteMaterial'
import { useVariantAsset } from './useVariantAsset'

interface Props {
  /** asset name, e.g. "rock_valley_0" */
  name: string
  placements: Placement[]
  /** create fixed convex colliders for these instances */
  collide?: boolean
}

/** One draw call for every placement of one factory variant. */
export function AssetInstances({ name, placements, collide = true }: Props) {
  const { geometry, colliderVertices } = useVariantAsset(name)
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const helper = new Object3D()
    placements.forEach((p, i) => {
      helper.position.set(p.x, 0, p.z)
      helper.rotation.set(0, p.yaw, 0)
      helper.scale.setScalar(p.scale)
      helper.updateMatrix()
      mesh.setMatrixAt(i, helper.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
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

  const visual = (
    <instancedMesh
      ref={meshRef}
      args={[geometry, worldMaterial(), placements.length]}
      frustumCulled={false}
    />
  )

  if (!collide) return visual

  return (
    <>
      {visual}
      <InstancedRigidBodies instances={bodies} colliders="hull">
        <instancedMesh
          args={[undefined, undefined, placements.length]}
          visible={false}
          frustumCulled={false}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[colliderVertices, 3]}
            />
          </bufferGeometry>
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}
