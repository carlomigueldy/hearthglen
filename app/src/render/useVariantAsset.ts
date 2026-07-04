import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Matrix3,
  Vector3,
  type Mesh,
  type Object3D,
} from 'three'

export interface VariantAsset {
  /** float-position render geometry, node transforms baked in */
  geometry: BufferGeometry
  /** convex collider points from the factory's <name>_col node */
  colliderVertices: Float32Array
}

/**
 * The optimized glbs are meshopt-compressed and quantized (KHR_mesh_quantization):
 * attribute data is normalized integers and the dequantization transform lives on
 * the node. Bake node matrices and convert everything to plain float attributes so
 * instancing and Rapier colliders can consume the data directly.
 */
function bakeFloatGeometry(mesh: Mesh): BufferGeometry {
  mesh.updateWorldMatrix(true, false)
  const src = mesh.geometry
  const out = new BufferGeometry()
  const count = src.attributes.position.count

  const positions = new Float32Array(count * 3)
  const v = new Vector3()
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(src.attributes.position, i).applyMatrix4(mesh.matrixWorld)
    v.toArray(positions, i * 3)
  }
  out.setAttribute('position', new BufferAttribute(positions, 3))

  if (src.attributes.normal) {
    const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld)
    const normals = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(src.attributes.normal, i).applyMatrix3(normalMatrix).normalize()
      v.toArray(normals, i * 3)
    }
    out.setAttribute('normal', new BufferAttribute(normals, 3))
  }

  if (src.attributes.color) {
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // getX/getY/getZ denormalize quantized attributes automatically
      colors[i * 3] = src.attributes.color.getX(i)
      colors[i * 3 + 1] = src.attributes.color.getY(i)
      colors[i * 3 + 2] = src.attributes.color.getZ(i)
    }
    out.setAttribute('color', new BufferAttribute(colors, 3))
  }

  if (src.index) out.setIndex(src.index.clone())
  return out
}

function findMesh(root: Object3D, name: string): Mesh {
  const node = root.getObjectByName(name)
  if (!node || !(node as Mesh).isMesh) throw new Error(`glb is missing mesh node "${name}"`)
  return node as Mesh
}

/** Load one factory variant: /assets/<name>.glb with nodes <name> and <name>_col. */
export function useVariantAsset(name: string): VariantAsset {
  const { scene } = useGLTF(`/assets/${name}.glb`)
  return useMemo(() => {
    const geometry = bakeFloatGeometry(findMesh(scene, name))
    const collider = bakeFloatGeometry(findMesh(scene, `${name}_col`))
    const colliderVertices = collider.attributes.position.array as Float32Array
    return { geometry, colliderVertices }
  }, [scene, name])
}
