import { useEffect, useState } from 'react'
import { useGameStore } from './game/store'
import { CapabilityGate } from './render/CapabilityGate'
import { GameCanvas } from './render/GameCanvas'
import { AutoSave } from './save/AutoSave'
import { loadGame } from './save/persistence'
import { setLoadedSpawn } from './save/session'
import { Hud, InventoryHud } from './ui/Hud'

function PointerHint() {
  const [locked, setLocked] = useState(false)
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])
  if (locked) return null
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        textShadow: '0 1px 8px rgba(26, 22, 20, 0.8)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontWeight: 'normal', letterSpacing: '0.08em' }}>Hearthglen</h1>
        <p>Click to wander — WASD to move, Shift to run, Space to jump, Esc to release.</p>
      </div>
    </div>
  )
}

export function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadGame()
      .then((save) => {
        if (save) {
          setLoadedSpawn(save.playerPos)
          useGameStore.getState().hydrate({
            inventory: save.inventory,
            harvested: save.harvested,
            campfires: save.campfires,
          })
        }
      })
      .catch(() => {}) // a broken save should never block a new journey
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <CapabilityGate>
        <GameCanvas />
        <Hud />
        <InventoryHud />
        <PointerHint />
        <AutoSave />
      </CapabilityGate>
    </div>
  )
}
