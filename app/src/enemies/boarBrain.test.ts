import { describe, expect, it } from 'vitest'
import { createBoarBrain, hitBoar, stepBoar, BOAR } from './boarBrain'

const rng = () => 0.5

function ctx(overrides: Partial<Parameters<typeof stepBoar>[1]> = {}) {
  return {
    now: 10,
    pos: { x: 0, z: 0 },
    playerPos: { x: 100, z: 0 },
    rng,
    ...overrides,
  }
}

describe('boar brain', () => {
  it('wanders when the player is far away', () => {
    const out = stepBoar(createBoarBrain(rng, 0), ctx())
    expect(out.state.kind).toBe('wander')
  })

  it('starts chasing when the player enters aggro range', () => {
    const out = stepBoar(createBoarBrain(rng, 0), ctx({ playerPos: { x: BOAR.aggroRange - 1, z: 0 } }))
    expect(out.state.kind).toBe('chase')
    expect(out.move.x).toBeGreaterThan(0)
  })

  it('winds up a charge in close range and does not move during windup', () => {
    let s = stepBoar(createBoarBrain(rng, 0), ctx({ playerPos: { x: 2, z: 0 } }))
    expect(s.state.kind).toBe('windup')
    s = stepBoar(s.state, ctx({ now: 10.1, playerPos: { x: 2, z: 0 } }))
    expect(s.move.x).toBe(0)
  })

  it('charges after windup toward the locked direction, then recovers', () => {
    let s = stepBoar(createBoarBrain(rng, 0), ctx({ playerPos: { x: 2, z: 0 } }))
    s = stepBoar(s.state, ctx({ now: 10 + BOAR.windupSec + 0.01, playerPos: { x: -5, z: 0 } }))
    expect(s.state.kind).toBe('charge')
    expect(s.move.x).toBeGreaterThan(0) // locked toward where the player was
    expect(s.dealsDamage).toBe(true)
    s = stepBoar(s.state, ctx({ now: 10 + BOAR.windupSec + BOAR.chargeSec + 0.02 }))
    expect(s.state.kind).toBe('recover')
  })

  it('staggers when hit and resumes after the stagger window', () => {
    const brain = hitBoar(createBoarBrain(rng, 0), 5)
    expect(brain.kind).toBe('stagger')
    const out = stepBoar(brain, ctx({ now: 5 + BOAR.staggerSec + 0.01, playerPos: { x: 100, z: 0 } }))
    expect(out.state.kind).toBe('wander')
  })

  it('never leaves the dead state', () => {
    const out = stepBoar({ kind: 'dead' }, ctx({ playerPos: { x: 1, z: 0 } }))
    expect(out.state.kind).toBe('dead')
    expect(out.move.x).toBe(0)
  })
})
