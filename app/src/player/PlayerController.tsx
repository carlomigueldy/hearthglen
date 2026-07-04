import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { Group, Vector3 } from 'three'
import type Rapier from '@dimforge/rapier3d-compat'
import { useKeyboardInput } from '../input/keyboard'

const CAPSULE_HALF_HEIGHT = 0.6
const CAPSULE_RADIUS = 0.35
const EYE_HEIGHT = 0.7 // above body center
const WALK_SPEED = 5
const SPRINT_SPEED = 8.5
const JUMP_SPEED = 6.5
const GRAVITY = -22
const MOUSE_SENSITIVITY = 0.0022
const MAX_PITCH = Math.PI / 2 - 0.05

/** Kinematic character: WASD + mouse look + jump + sprint, stepped at the fixed physics rate. */
export function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const eyeRef = useRef<Group>(null)
  const input = useKeyboardInput()
  const look = useRef({ yaw: 0, pitch: 0 })
  const velocityY = useRef(0)
  const controllerRef = useRef<Rapier.KinematicCharacterController | null>(null)

  const { world } = useRapier()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

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
    const canvas = gl.domElement
    const requestLock = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      const yaw = look.current.yaw - e.movementX * MOUSE_SENSITIVITY
      const pitch = Math.min(
        MAX_PITCH,
        Math.max(-MAX_PITCH, look.current.pitch - e.movementY * MOUSE_SENSITIVITY),
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
    const dt = world.timestep
    const keys = input.current
    const { yaw } = look.current

    const dir = new Vector3(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.back ? 1 : 0) - (keys.forward ? 1 : 0),
    )
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new Vector3(0, 1, 0), yaw)
    const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED

    const grounded = controller.computedGrounded()
    if (grounded && velocityY.current < 0) velocityY.current = 0
    if (grounded && keys.jump) velocityY.current = JUMP_SPEED
    velocityY.current += GRAVITY * dt

    const desired = {
      x: dir.x * speed * dt,
      y: velocityY.current * dt,
      z: dir.z * speed * dt,
    }
    controller.computeColliderMovement(body.collider(0), desired)
    const move = controller.computedMovement()
    const pos = body.translation()
    body.setNextKinematicTranslation({
      x: pos.x + move.x,
      y: pos.y + move.y,
      z: pos.z + move.z,
    })
  })

  useFrame(() => {
    const eye = eyeRef.current
    if (!eye) return
    eye.getWorldPosition(camera.position)
    camera.rotation.order = 'YXZ'
    camera.rotation.set(look.current.pitch, look.current.yaw, 0)
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[0, CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.2, 0]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
      <group ref={eyeRef} position={[0, EYE_HEIGHT, 0]} />
    </RigidBody>
  )
}
