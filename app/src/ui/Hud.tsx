import { useEffect, useState } from 'react'
import { useGameStore } from '../game/store'
import { paletteHex } from '../render/paletteMaterial'

const FADE_AFTER_SEC = 4

/**
 * Quiet-contextual vitals (design spec §A2): visible while damaged, draining,
 * or in combat; fades away 4s after everything is calm again.
 */
export function Hud() {
  const health = useGameStore((s) => s.health)
  const maxHealth = useGameStore((s) => s.maxHealth)
  const stamina = useGameStore((s) => s.stamina)
  const maxStamina = useGameStore((s) => s.maxStamina)
  const inCombat = useGameStore((s) => s.inCombat)
  const lastAllClearAt = useGameStore((s) => s.lastAllClearAt)
  const [, force] = useState(0)

  const active = health < maxHealth || stamina < maxStamina - 0.5 || inCombat
  const sinceClear = performance.now() / 1000 - lastAllClearAt
  const visible = active || sinceClear < FADE_AFTER_SEC

  // re-render once the fade window can elapse
  useEffect(() => {
    if (active || !visible) return
    const t = setTimeout(() => force((n) => n + 1), (FADE_AFTER_SEC - sinceClear) * 1000 + 50)
    return () => clearTimeout(t)
  }, [active, visible, sinceClear])

  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease',
        fontFamily: 'Georgia, serif',
      }}
    >
      <Bar value={health} max={maxHealth} color={paletteHex('ember')} label="♥" />
      <Bar value={stamina} max={maxStamina} color={paletteHex('gold_harvest')} label="⚡" />
    </div>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(26, 22, 20, 0.55)',
        borderRadius: 10,
        padding: '5px 12px 5px 10px',
        boxShadow: '0 2px 8px rgba(26, 22, 20, 0.35)',
      }}
    >
      <span style={{ color: paletteHex('cream'), fontSize: 13, width: 16 }}>{label}</span>
      <div style={{ width: 150, height: 7, background: 'rgba(232, 220, 200, 0.18)', borderRadius: 4 }}>
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 120ms linear',
          }}
        />
      </div>
    </div>
  )
}
