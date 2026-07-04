import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { combatBus } from '../game/combatBus'
import { harvestBus, type Pickup } from '../game/harvestBus'
import { useGameStore } from '../game/store'
import type { ItemId } from '../game/inventory'
import { paletteHex } from '../render/paletteMaterial'

const COLLECT_RANGE = 1.5

const ITEM_COLORS: Record<ItemId, string> = {
  wood: paletteHex('bark'),
  stone: paletteHex('stone'),
  raw_meat: paletteHex('ember'),
  cooked_meat: paletteHex('russet'),
}

/** Dropped items: bob gently, collect by walking over them. */
export function Pickups() {
  const [items, setItems] = useState<Pickup[]>([])
  const version = useRef(-1)
  const groupRef = useRef<Group>(null)
  const clock = useRef(0)

  useFrame((_, dt) => {
    clock.current += dt
    if (harvestBus.getPickupsVersion() !== version.current) {
      version.current = harvestBus.getPickupsVersion()
      setItems(harvestBus.getPickups())
    }

    const group = groupRef.current
    if (group) {
      group.children.forEach((child, idx) => {
        const p = items[idx]
        if (!p) return
        child.position.y = p.y + Math.sin(clock.current * 2.4 + p.id) * 0.08
        child.rotation.y += dt * 0.8
      })
    }

    const player = combatBus.getPlayer()
    if (!player) return
    const pos = player.getPosition()
    for (const p of items) {
      const dx = p.x - pos.x
      const dz = p.z - pos.z
      if (dx * dx + dz * dz < COLLECT_RANGE * COLLECT_RANGE) {
        const collected = harvestBus.collectPickup(p.id)
        if (collected) useGameStore.getState().addItems(collected.item, collected.count)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {items.map((p) => (
        <mesh key={p.id} position={[p.x, p.y, p.z]}>
          {p.item === 'wood' ? (
            <boxGeometry args={[0.14, 0.14, 0.5]} />
          ) : p.item === 'stone' ? (
            <icosahedronGeometry args={[0.16, 0]} />
          ) : (
            <boxGeometry args={[0.22, 0.14, 0.3]} />
          )}
          <meshLambertMaterial color={ITEM_COLORS[p.item]} />
        </mesh>
      ))}
    </group>
  )
}
