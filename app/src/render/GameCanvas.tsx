import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense } from 'react'
import { WebGPURenderer } from 'three/webgpu'
import { PlayerController } from '../player/PlayerController'
import { Valley } from '../world/Valley'
import { paletteHex } from './paletteMaterial'

export function GameCanvas() {
  const sky = paletteHex('sky')
  return (
    <Canvas
      camera={{ position: [0, 1.7, 0], fov: 65, near: 0.1, far: 400 }}
      onCreated={(state) => {
        // dev-only hook for headless perf probes and e2e checks
        if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__hearthglen = state
      }}
      gl={async (props) => {
        const renderer = new WebGPURenderer(
          props as ConstructorParameters<typeof WebGPURenderer>[0],
        )
        await renderer.init()
        return renderer
      }}
    >
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 70, 260]} />
      <hemisphereLight args={[sky, paletteHex('moss'), 0.75]} />
      <directionalLight position={[40, 60, 25]} intensity={1.6} color={paletteHex('honey')} />
      <Suspense fallback={null}>
        <Physics timeStep={1 / 60}>
          <Valley />
          <PlayerController />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
