import { Canvas } from '@react-three/fiber'
import { WebGPURenderer } from 'three/webgpu'

export function GameCanvas() {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      gl={async (props) => {
        const renderer = new WebGPURenderer(props as ConstructorParameters<typeof WebGPURenderer>[0])
        await renderer.init()
        return renderer
      }}
    >
      <color attach="background" args={['#87a96b']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 12, 6]} intensity={1.2} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[40, 40]} />
        <meshLambertMaterial color="#5c8a4e" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry />
        <meshLambertMaterial color="#8a6a4e" />
      </mesh>
    </Canvas>
  )
}
