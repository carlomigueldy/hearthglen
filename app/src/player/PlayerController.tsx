import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, Vector3 } from 'three'
import type Rapier from '@dimforge/rapier3d-compat'
import { combatBus } from '../game/combatBus'
import { useGameStore } from '../game/store'
import { useKeyboardInput } from '../input/keyboard'
import { getLoadedSpawn } from '../save/session'
import { paletteHex } from '../render/paletteMaterial'
import { AxeSwing, useAttack } from './useAttack'
import { createStamina, drainStamina, hasStamina, tickStamina, STAMINA_COSTS } from './stamina'

const CAPSULE_HALF_HEIGHT = 0.6
const CAPSULE_RADIUS = 0.35
const WALK_SPEED = 5
const SPRINT_SPEED = 8.5
const DODGE_SPEED = 10.5
const DODGE_DURATION = 0.32
const JUMP_SPEED = 6.5
const GRAVITY = -22
const MOUSE_SENSITIVITY = 0.0022
const MAX_PITCH = 1.15
const MIN_PITCH = -0.5
const CAMERA_DISTANCE = 4.6
const CAMERA_HEIGHT = 1.9
const DAMAGE_INVULN = 0.8

/** Third-person character: WASD relative to camera, mouse orbits, C dodges, click attacks. */
export function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const characterRef = useRef<Group>(null)
  const input = useKeyboardInput()
  const look = useRef({ yaw: 0, pitch: 0.35 })
  const sim = useRef({
    velocityY: 0,
    facing: 0,
    stamina: createStamina(100),
    health: 100,
    clock: 0,
    dodgeUntil: 0,
    dodgeDir: new Vector3(),
    invulnUntil: 0,
    knock: new Vector3(),
    shake: 0,
  })
  const controllerRef = useRef<Rapier.KinematicCharacterController | null>(null)

  const { world } = useRapier()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const attack = useAttack(sim)

  useEffect(() => {
    const controller = world.createCharacterController(0.05)
    controller.enableAutostep(0.45, 0.25, true)
    controller.enableSnapToGround(0.4)
    controller.setMaxSlopeClimbAngle((60 * Math.PI) / 180)
    controllerRef.current = controller
    return () => {
      world.removeCharacterController(controller)
      controllerRef.current = null
    }
  }, [world])

  useEffect(() => {
    const s = sim.current
    return combatBus.registerPlayer({
      getPosition: () => {
        const t = bodyRef.current?.translation()
        return t ? new Vector3(t.x, t.y, t.z) : new Vector3()
      },
      heal: (amount) => {
        s.health = Math.min(100, s.health + amount)
      },
      takeDamage: (amount, fromDir) => {
        if (s.clock < s.invulnUntil || s.clock < s.dodgeUntil) return
        s.health = Math.max(0, s.health - amount)
        s.invulnUntil = s.clock + DAMAGE_INVULN
        s.knock.copy(fromDir).setY(0).normalize().multiplyScalar(6)
        s.shake = Math.max(s.shake, 0.22)
        if (s.health <= 0) {
          // pressure without punishment: drowsy respawn at the spawn hearth
          s.health = 100
          bodyRef.current?.setNextKinematicTranslation({ x: 0, y: 1.4, z: 0 })
        }
      },
    })
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    const requestLock = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      const yaw = look.current.yaw - e.movementX * MOUSE_SENSITIVITY
      const pitch = MathUtils.clamp(
        look.current.pitch + e.movementY * MOUSE_SENSITIVITY,
        MIN_PITCH,
        MAX_PITCH,
      )
      look.current = { yaw, pitch }
    }
    canvas.addEventListener('click', requestLock)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      canvas.removeEventListener('click', requestLock)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [gl])

  useBeforePhysicsStep(() => {
    const body = bodyRef.current
    const controller = controllerRef.current
    if (!body || !controller) return
    const s = sim.current
    const dt = world.timestep
    s.clock += dt
    const now = s.clock
    const keys = input.current
    const { yaw } = look.current

    const dir = new Vector3(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.back ? 1 : 0) - (keys.forward ? 1 : 0),
    )
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new Vector3(0, 1, 0), yaw)

    // dodge roll: burst move with brief invulnerability
    if (keys.dodge && now > s.dodgeUntil && hasStamina(s.stamina, STAMINA_COSTS.dodge)) {
      s.stamina = drainStamina(s.stamina, STAMINA_COSTS.dodge, now)
      s.dodgeUntil = now + DODGE_DURATION
      s.dodgeDir.copy(dir.lengthSq() > 0 ? dir : facingDir(s.facing))
    }

    const dodging = now < s.dodgeUntil
    const sprinting = keys.sprint && dir.lengthSq() > 0 && hasStamina(s.stamina, 1)
    if (sprinting && !dodging) {
      s.stamina = drainStamina(s.stamina, STAMINA_COSTS.sprintPerSec * dt, now)
    }

    const grounded = controller.computedGrounded()
    if (grounded && s.velocityY < 0) s.velocityY = 0
    if (grounded && keys.jump && !dodging && hasStamina(s.stamina, STAMINA_COSTS.jump)) {
      s.stamina = drainStamina(s.stamina, STAMINA_COSTS.jump, now)
      s.velocityY = JUMP_SPEED
    }
    s.velocityY += GRAVITY * dt

    const attackSlow = attack.movementFactor(now)
    let move: Vector3
    if (dodging) {
      move = s.dodgeDir.clone().multiplyScalar(DODGE_SPEED * dt)
    } else {
      const speed = (sprinting ? SPRINT_SPEED : WALK_SPEED) * attackSlow
      move = dir.multiplyScalar(speed * dt)
    }
    move.add(s.knock.clone().multiplyScalar(dt))
    s.knock.multiplyScalar(Math.max(0, 1 - dt * 6))

    const desired = { x: move.x, y: s.velocityY * dt, z: move.z }
    controller.computeColliderMovement(body.collider(0), desired)
    const corrected = controller.computedMovement()
    const pos = body.translation()
    body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    })

    // face movement (or camera while attacking)
    const target = attack.isAttacking(now)
      ? yaw + Math.PI
      : move.lengthSq() > 1e-6
        ? Math.atan2(move.x, move.z)
        : s.facing
    s.facing = MathUtils.lerp(s.facing, shortestAngle(s.facing, target), 1 - Math.exp(-dt * 12))

    s.stamina = tickStamina(s.stamina, dt, now)
    attack.step(now, body)

    // hearth warmth: gentle regen near a lit campfire (comfort, not pressure)
    const store = useGameStore.getState()
    const warm = store.campfires.some((f) => Math.hypot(f.x - pos.x, f.z - pos.z) < 3.2)
    if (warm) s.health = Math.min(100, s.health + 2.5 * dt)

    store.setVitals({
      health: s.health,
      stamina: s.stamina.current,
      warm,
      nearFire: warm,
      inCombat: attack.isAttacking(now) || combatBus.getEnemies().some((e) => e.isAlive()
        && e.getPosition().distanceTo(new Vector3(pos.x, pos.y, pos.z)) < 14),
    })
  })

  useFrame((_, dt) => {
    const body = bodyRef.current
    const char = characterRef.current
    if (!body || !char) return
    const s = sim.current
    const t = body.translation()
    char.position.set(t.x, t.y - CAPSULE_HALF_HEIGHT - CAPSULE_RADIUS, t.z)
    char.rotation.y = s.facing

    const { yaw, pitch } = look.current
    const offset = new Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).multiplyScalar(CAMERA_DISTANCE)
    s.shake = Math.max(0, s.shake - dt * 1.4)
    const shake = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0
    camera.position.set(t.x + offset.x + shake, t.y + CAMERA_HEIGHT * 0.4 + offset.y + shake, t.z + offset.z)
    camera.lookAt(t.x, t.y + 0.6, t.z)
  })

  return (
    <>
      <RigidBody
        ref={bodyRef}
        type="kinematicPosition"
        colliders={false}
        position={getLoadedSpawn() ?? [0, CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.2, 0]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
      </RigidBody>
      <group ref={characterRef}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 4, 10]} />
          <meshLambertMaterial color={paletteHex('wood_warm')} />
        </mesh>
        <mesh position={[0, 1.45, 0.3]} rotation-x={Math.PI / 2}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshLambertMaterial color={paletteHex('cream')} />
        </mesh>
        <AxeSwing attack={attack} />
      </group>
    </>
  )
}

function facingDir(yaw: number): Vector3 {
  return new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
}

function shortestAngle(from: number, to: number): number {
  const diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI
  return from + (diff < -Math.PI ? diff + Math.PI * 2 : diff)
}
