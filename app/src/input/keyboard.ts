/**
 * Minimal action-mapped keyboard state for M0 (WASD + jump + sprint).
 * The full action-map abstraction (rebinding, gamepad) arrives in M5 —
 * consumers already read actions, not key codes, so it can grow in place.
 */
import { useEffect, useRef } from 'react'

export interface InputState {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  jump: boolean
  sprint: boolean
  dodge: boolean
}

const BINDINGS: Record<string, keyof InputState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyC: 'dodge',
}

export function useKeyboardInput() {
  const state = useRef<InputState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    dodge: false,
  })

  useEffect(() => {
    const set = (code: string, value: boolean) => {
      const action = BINDINGS[code]
      if (action) state.current = { ...state.current, [action]: value }
    }
    const onDown = (e: KeyboardEvent) => {
      if (BINDINGS[e.code]) e.preventDefault()
      set(e.code, true)
    }
    const onUp = (e: KeyboardEvent) => set(e.code, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  return state
}
