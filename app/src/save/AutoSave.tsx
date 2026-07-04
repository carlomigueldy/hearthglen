import { useEffect } from 'react'
import { combatBus } from '../game/combatBus'
import { useGameStore } from '../game/store'
import { saveGame } from './persistence'

const INTERVAL_MS = 10_000

function snapshot() {
  const s = useGameStore.getState()
  const pos = combatBus.getPlayer()?.getPosition()
  return {
    version: 1 as const,
    savedAt: Date.now(),
    playerPos: (pos ? [pos.x, pos.y, pos.z] : [0, 1.4, 0]) as [number, number, number],
    inventory: s.inventory,
    harvested: s.harvested,
    campfires: s.campfires,
  }
}

/** Autosaves every 10s and when the tab loses visibility. */
export function AutoSave() {
  useEffect(() => {
    const save = () => void saveGame(snapshot()).catch(() => {})
    const interval = setInterval(save, INTERVAL_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
  return null
}
