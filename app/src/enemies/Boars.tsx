import { useFrame } from '@react-three/fiber'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Group, MeshLambertMaterial, Vector3 } from 'three'
import { combatBus } from '../game/combatBus'
import { useVariantAsset } from '../render/useVariantAsset'
import { createRng, rngRange } from '../world/rng'
import { WORLD_SEED } from '../world/Valley'
import { BOAR, createBoarBrain, hitBoar, stepBoar, type BoarState } from './boarBrain'

const COUNT = 6
const CONTACT_RANGE = 1.15
const PLAYER_DAMAGE = 15
const KNOCK = 5

let nextId = 1

/** A sounder of boars scattered around the valley's middle distance. */
export function Boars() {
  const spawns = useMemo(() => {
    const rng = createRng(WORLD_SEED + 77)
    return Array.from({ length: COUNT }, (_, i) => {
      const angle = (i / COUNT) * Math.PI * 2 + rng() * 0.8
      const dist = rngRange(rng, 14, 26)
      return {
        id: i,
        variant: i % 2,
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        seed: WORLD_SEED + 500 + i,
      }
    })
  }, [])

  return (
    <>
      {spawns.map(({ id, ...spawn }) => (
        <Boar key={id} {...spawn} />
      ))}
    </>
  )
}

function Boar({ variant, x, z, seed }: { variant: number; x: number; z: number; seed: number }) {
  const { geometry } = useVariantAsset(`boar_valley_${variant}`)
  const bodyRef = useRef<RapierRigidBody>(null)
  const visualRef = useRef<Group>(null)
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), [])

  const sim = useRef<{
    brain: BoarState
    health: number
    clock: number
    rng: () => number
    flashUntil: number
    hurtPlayerAt: number
    yaw: number
    deadAt: number
  }>({
    brain: { kind: 'wander', target: { x, z }, until: 0 },
    health: BOAR.maxHealth,
    clock: 0,
    rng: createRng(seed),
    flashUntil: 0,
    hurtPlayerAt: -Infinity,
    yaw: 0,
    deadAt: 0,
  })

  useEffect(() => {
    const s = sim.current
    s.brain = createBoarBrain(s.rng, 0)
    const id = nextId++
    return combatBus.registerEnemy({
      id,
      isAlive: () => s.brain.kind !== 'dead',
      getPosition: () => {
        const t = bodyRef.current?.translation()
        return t ? new Vector3(t.x, t.y, t.z) : new Vector3(x, 0, z)
      },
      takeHit: (damage, fromDir) => {
        if (s.brain.kind === 'dead') return
        s.health -= damage
        s.flashUntil = s.clock + 0.12
        s.brain = s.health <= 0 ? { kind: 'dead' } : hitBoar(s.brain, s.clock)
        if (s.brain.kind === 'dead') s.deadAt = s.clock
        bodyRef.current?.applyImpulse(
          { x: fromDir.x * KNOCK, y: 1.2, z: fromDir.z * KNOCK },
          true,
        )
      },
    })
  }, [x, z])

  useFrame((_, dt) => {
    const body = bodyRef.current
    const visual = visualRef.current
    if (!body || !visual) return
    const s = sim.current
    if (combatBus.inHitStop(s.clock)) {
      s.clock += dt
      return
    }
    s.clock += dt

    material.emissive.setScalar(s.clock < s.flashUntil ? 0.6 : 0)

    if (s.brain.kind === 'dead') {
      const k = Math.min(1, (s.clock - s.deadAt) / 0.6)
      visual.scale.setScalar(1 - k * 0.9)
      if (k >= 1 && body.isEnabled()) body.setEnabled(false)
      return
    }

    const player = combatBus.getPlayer()
    if (!player) return
    const t = body.translation()
    const playerPos = player.getPosition()

    const out = stepBoar(s.brain, {
      now: s.clock,
      pos: { x: t.x, z: t.z },
      playerPos: { x: playerPos.x, z: playerPos.z },
      rng: s.rng,
    })
    s.brain = out.state

    const vel = body.linvel()
    body.setLinvel({ x: out.move.x, y: vel.y, z: out.move.z }, true)

    // windup telegraph: squash down, ready to burst
    const windup = s.brain.kind === 'windup'
    visual.scale.y += ((windup ? 0.8 : 1) - visual.scale.y) * Math.min(1, dt * 10)

    if (out.move.x !== 0 || out.move.z !== 0) {
      s.yaw = Math.atan2(out.move.x, out.move.z) + Math.PI // model nose faces -Z
    } else if (windup && s.brain.kind === 'windup') {
      s.yaw = Math.atan2(s.brain.dir.x, s.brain.dir.z) + Math.PI
    }
    visual.rotation.y += (shortest(visual.rotation.y, s.yaw) - visual.rotation.y) * Math.min(1, dt * 10)

    if (out.dealsDamage && s.clock - s.hurtPlayerAt > 1) {
      const to = playerPos.clone().sub(new Vector3(t.x, t.y, t.z))
      if (to.length() < CONTACT_RANGE + 0.5) {
        s.hurtPlayerAt = s.clock
        player.takeDamage(PLAYER_DAMAGE, to.normalize())
      }
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      position={[x, 1.2, z]}
      colliders="hull"
      enabledRotations={[false, false, false]}
      friction={1}
    >
      <group ref={visualRef}>
        <mesh geometry={geometry} material={material} position={[0, -0.35, 0]} />
      </group>
    </RigidBody>
  )
}

function shortest(from: number, to: number): number {
  const diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI
  return from + (diff < -Math.PI ? diff + Math.PI * 2 : diff)
}
