import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { PointLight } from 'three'
import { combatBus } from '../game/combatBus'
import { canAfford } from '../game/inventory'
import { useGameStore } from '../game/store'
import { useKeyboardInput } from '../input/keyboard'
import { paletteHex } from '../render/paletteMaterial'

export const CAMPFIRE_COST = { wood: 5, stone: 2 }
export const WARMTH_RANGE = 3.2
const EAT_HEAL = 35

/** Placed campfires + the E (place/cook) and Q (eat) interactions. */
export function Campfires() {
  const campfires = useGameStore((s) => s.campfires)
  const input = useKeyboardInput()
  const edges = useRef({ interact: false, eat: false })

  useFrame(() => {
    const keys = input.current
    const player = combatBus.getPlayer()
    const store = useGameStore.getState()

    if (keys.interact && !edges.current.interact && player) {
      const pos = player.getPosition()
      const nearFire = store.campfires.some(
        (f) => Math.hypot(f.x - pos.x, f.z - pos.z) < WARMTH_RANGE,
      )
      if (nearFire && store.inventory.stacks.some((s) => s.item === 'raw_meat')) {
        store.spendItems({ raw_meat: 1 })
        store.addItems('cooked_meat', 1)
      } else if (!nearFire && canAfford(store.inventory, CAMPFIRE_COST)) {
        store.spendItems(CAMPFIRE_COST)
        store.addCampfire(pos.x, pos.z)
      }
    }
    if (keys.eat && !edges.current.eat && player) {
      if (store.inventory.stacks.some((s) => s.item === 'cooked_meat')) {
        store.spendItems({ cooked_meat: 1 })
        player.heal(EAT_HEAL)
      }
    }
    edges.current = { interact: keys.interact, eat: keys.eat }
  })

  return (
    <>
      {campfires.map((f, i) => (
        <Campfire key={i} x={f.x} z={f.z} />
      ))}
    </>
  )
}

function Campfire({ x, z }: { x: number; z: number }) {
  const lightRef = useRef<PointLight>(null)
  const clock = useRef(Math.random() * 10)

  useFrame((_, dt) => {
    clock.current += dt
    if (lightRef.current) {
      lightRef.current.intensity =
        9 + Math.sin(clock.current * 9) * 1.6 + Math.sin(clock.current * 23) * 0.9
    }
  })

  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.09, Math.sin(a) * 0.55]} rotation-y={a}>
            <boxGeometry args={[0.22, 0.18, 0.16]} />
            <meshLambertMaterial color={paletteHex('slate_dark')} />
          </mesh>
        )
      })}
      {Array.from({ length: 3 }, (_, i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh
            key={`log${i}`}
            position={[Math.cos(a) * 0.14, 0.24, Math.sin(a) * 0.14]}
            rotation={[0.5, a, 0]}
          >
            <cylinderGeometry args={[0.05, 0.06, 0.55, 5]} />
            <meshLambertMaterial color={paletteHex('bark_dark')} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.18, 0.5, 6]} />
        <meshLambertMaterial
          color={paletteHex('hearth_orange')}
          emissive={paletteHex('hearth_orange')}
          emissiveIntensity={1.4}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.8, 0]}
        color={paletteHex('hearth_orange')}
        intensity={9}
        distance={12}
        decay={2}
      />
    </group>
  )
}
