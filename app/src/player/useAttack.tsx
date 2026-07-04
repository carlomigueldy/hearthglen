import { useFrame, useThree } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Group, Vector3 } from 'three'
import { combatBus } from '../game/combatBus'
import { harvestBus } from '../game/harvestBus'
import { drainStamina, hasStamina, STAMINA_COSTS, type StaminaState } from './stamina'

const WINDUP = 0.14
const ACTIVE = 0.12
const RECOVERY = 0.3
const TOTAL = WINDUP + ACTIVE + RECOVERY
const RANGE = 2.4
const ARC_COS = Math.cos((70 * Math.PI) / 180)
const DAMAGE = 34
const HIT_STOP = 0.07

interface SimRef {
  stamina: StaminaState
  facing: number
  shake: number
  clock: number
}

export interface AttackApi {
  step: (now: number, body: RapierRigidBody) => void
  isAttacking: (now: number) => boolean
  movementFactor: (now: number) => number
  /** 0..1 through the whole swing, -1 when idle */
  progress: (now: number) => number
}

/** Axe light-attack state machine: click → windup → active hit window → recovery. */
export function useAttack(sim: MutableRefObject<SimRef>): AttackApi {
  const gl = useThree((s) => s.gl)
  const state = useRef({ startedAt: -Infinity, hitDone: false, queued: false })

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || document.pointerLockElement !== gl.domElement) return
      state.current.queued = true
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [gl])

  return useMemo<AttackApi>(() => {
    const isAttacking = (now: number) => now - state.current.startedAt < TOTAL
    return {
      isAttacking,
      movementFactor: (now) => (isAttacking(now) ? 0.35 : 1),
      progress: (now) => {
        const t = now - state.current.startedAt
        return t < TOTAL ? t / TOTAL : -1
      },
      step: (now, body) => {
        const st = state.current
        const s = sim.current

        if (st.queued) {
          st.queued = false
          if (!isAttacking(now) && hasStamina(s.stamina, STAMINA_COSTS.attack)) {
            s.stamina = drainStamina(s.stamina, STAMINA_COSTS.attack, now)
            st.startedAt = now
            st.hitDone = false
          }
        }

        const t = now - st.startedAt
        if (st.hitDone || t < WINDUP || t > WINDUP + ACTIVE) return
        st.hitDone = true

        const p = body.translation()
        const origin = new Vector3(p.x, p.y, p.z)
        const facing = new Vector3(Math.sin(s.facing), 0, Math.cos(s.facing))
        let connected = false
        for (const enemy of combatBus.getEnemies()) {
          if (!enemy.isAlive()) continue
          const to = enemy.getPosition().sub(origin)
          to.y = 0
          const dist = to.length()
          if (dist > RANGE) continue
          if (to.normalize().dot(facing) < ARC_COS) continue
          enemy.takeHit(DAMAGE, facing)
          connected = true
        }
        if (connected) {
          combatBus.triggerHitStop(HIT_STOP, now)
          s.shake = Math.max(s.shake, 0.14)
        }

        // chop/mine: nearest live harvestable inside the swing arc
        const groups = harvestBus.getGroups()
        let best: { group: (typeof groups)[number]; index: number; dist: number } | null = null
        for (const group of groups) {
          for (let i = 0; i < group.count; i++) {
            const pos = group.positionOf(i)
            if (!pos) continue
            const dx = pos.x - origin.x
            const dz = pos.z - origin.z
            const dist = Math.hypot(dx, dz)
            if (dist > RANGE || dist < 1e-3) continue
            if ((dx / dist) * facing.x + (dz / dist) * facing.z < ARC_COS) continue
            if (!best || dist < best.dist) best = { group, index: i, dist }
          }
        }
        if (best) {
          const drop = best.group.damage(best.index)
          const pos = { x: origin.x + facing.x * best.dist, z: origin.z + facing.z * best.dist }
          if (drop) {
            const at = best.group.positionOf(best.index) ?? pos
            harvestBus.spawnPickup(drop.item, drop.count, new Vector3(at.x, 0.5, at.z))
          }
          combatBus.triggerHitStop(0.04, now)
          s.shake = Math.max(s.shake, 0.08)
        }
      },
    }
  }, [sim])
}

/** Placeholder axe that swings with the attack arc. */
export function AxeSwing({ attack }: { attack: AttackApi }) {
  const pivot = useRef<Group>(null)
  const clock = useRef(0)

  useFrame((_, dt) => {
    clock.current += dt
    const pivotEl = pivot.current
    if (!pivotEl) return
    // cosmetic clock tracks sim time closely enough for the swing visual
    const p = attack.progress(clock.current)
    if (p < 0) {
      pivotEl.rotation.set(0.4, 0, -0.5)
      return
    }
    const windupEnd = WINDUP / TOTAL
    const activeEnd = (WINDUP + ACTIVE) / TOTAL
    if (p < windupEnd) {
      const k = p / windupEnd
      pivotEl.rotation.set(0.4 - k * 1.4, 0, -0.5 + k * 0.3)
    } else if (p < activeEnd) {
      const k = (p - windupEnd) / (activeEnd - windupEnd)
      pivotEl.rotation.set(-1 + k * 2.4, 0, -0.2 - k * 0.4)
    } else {
      const k = (p - activeEnd) / (1 - activeEnd)
      pivotEl.rotation.set(1.4 - k * 1, 0, -0.6 + k * 0.1)
    }
  })

  return (
    <group ref={pivot} position={[0.42, 1.25, 0]}>
      <mesh position={[0, 0, 0.35]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.045, 0.8, 6]} />
        <meshLambertMaterial color="#6b4f3a" />
      </mesh>
      <mesh position={[0, 0.02, 0.72]} rotation-z={Math.PI / 2}>
        <coneGeometry args={[0.14, 0.26, 4]} />
        <meshLambertMaterial color="#8d9096" />
      </mesh>
    </group>
  )
}
