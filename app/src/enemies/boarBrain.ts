/**
 * Pure boar AI state machine. Big readable telegraphs (PLAN.md pillar 3):
 * it stops, squares up, winds up visibly, then charges in a straight line.
 */

export const BOAR = {
  aggroRange: 11,
  chargeTriggerRange: 3.6,
  wanderSpeed: 1.2,
  chaseSpeed: 4.2,
  chargeSpeed: 9,
  windupSec: 0.55,
  chargeSec: 0.5,
  recoverSec: 0.9,
  staggerSec: 0.35,
  wanderLegSec: 3,
  maxHealth: 100,
} as const

interface Vec2 {
  x: number
  z: number
}

export type BoarState =
  | { kind: 'wander'; target: Vec2; until: number }
  | { kind: 'chase' }
  | { kind: 'windup'; until: number; dir: Vec2 }
  | { kind: 'charge'; until: number; dir: Vec2 }
  | { kind: 'recover'; until: number }
  | { kind: 'stagger'; until: number }
  | { kind: 'dead' }

export interface BoarContext {
  now: number
  pos: Vec2
  playerPos: Vec2
  rng: () => number
}

export interface BoarOutput {
  state: BoarState
  /** velocity in m/s */
  move: Vec2
  /** true while the charge can hurt the player */
  dealsDamage: boolean
}

const STILL: Vec2 = { x: 0, z: 0 }

export function createBoarBrain(rng: () => number, now: number): BoarState {
  return { kind: 'wander', target: { x: 0, z: 0 }, until: now + rng() * BOAR.wanderLegSec }
}

export function hitBoar(state: BoarState, now: number): BoarState {
  if (state.kind === 'dead') return state
  return { kind: 'stagger', until: now + BOAR.staggerSec }
}

function toward(from: Vec2, to: Vec2): { dir: Vec2; dist: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const dist = Math.hypot(dx, dz)
  return dist > 1e-6 ? { dir: { x: dx / dist, z: dz / dist }, dist } : { dir: STILL, dist: 0 }
}

export function stepBoar(state: BoarState, ctx: BoarContext): BoarOutput {
  const { now, pos, playerPos, rng } = ctx
  const player = toward(pos, playerPos)

  switch (state.kind) {
    case 'dead':
      return { state, move: STILL, dealsDamage: false }

    case 'stagger':
      if (now < state.until) return { state, move: STILL, dealsDamage: false }
      return stepBoar(createBoarBrain(rng, now), ctx)

    case 'recover':
      if (now < state.until) return { state, move: STILL, dealsDamage: false }
      return stepBoar({ kind: 'chase' }, ctx)

    case 'windup':
      if (now < state.until) return { state, move: STILL, dealsDamage: false }
      return {
        state: { kind: 'charge', until: now + BOAR.chargeSec, dir: state.dir },
        move: { x: state.dir.x * BOAR.chargeSpeed, z: state.dir.z * BOAR.chargeSpeed },
        dealsDamage: true,
      }

    case 'charge':
      if (now < state.until) {
        return {
          state,
          move: { x: state.dir.x * BOAR.chargeSpeed, z: state.dir.z * BOAR.chargeSpeed },
          dealsDamage: true,
        }
      }
      return { state: { kind: 'recover', until: now + BOAR.recoverSec }, move: STILL, dealsDamage: false }

    case 'chase': {
      if (player.dist > BOAR.aggroRange * 1.4) return stepBoar(createBoarBrain(rng, now), ctx)
      if (player.dist < BOAR.chargeTriggerRange) {
        return {
          state: { kind: 'windup', until: now + BOAR.windupSec, dir: player.dir },
          move: STILL,
          dealsDamage: false,
        }
      }
      return {
        state,
        move: { x: player.dir.x * BOAR.chaseSpeed, z: player.dir.z * BOAR.chaseSpeed },
        dealsDamage: false,
      }
    }

    case 'wander': {
      if (player.dist < BOAR.aggroRange) return stepBoar({ kind: 'chase' }, ctx)
      let next = state
      if (now > state.until) {
        const angle = rng() * Math.PI * 2
        next = {
          kind: 'wander',
          target: { x: pos.x + Math.cos(angle) * 6, z: pos.z + Math.sin(angle) * 6 },
          until: now + BOAR.wanderLegSec * (0.5 + rng()),
        }
      }
      const leg = toward(pos, next.target)
      const move =
        leg.dist < 0.4 ? STILL : { x: leg.dir.x * BOAR.wanderSpeed, z: leg.dir.z * BOAR.wanderSpeed }
      return { state: next, move, dealsDamage: false }
    }
  }
}
