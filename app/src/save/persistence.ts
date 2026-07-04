/** Versioned save persistence in IndexedDB (slot 0 for M2). */
import type { Inventory } from '../game/inventory'

const DB_NAME = 'hearthglen'
const STORE = 'saves'
const SLOT = 'slot0'

export interface SaveData {
  version: 1
  savedAt: number
  playerPos: [number, number, number]
  inventory: Inventory
  harvested: Record<string, true>
  campfires: { x: number; z: number }[]
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('failed to open save database'))
  })
}

export async function saveGame(data: SaveData): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(data, SLOT)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('failed to write save'))
  })
  db.close()
}

export async function loadGame(): Promise<SaveData | null> {
  const db = await openDb()
  const data = await new Promise<SaveData | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(SLOT)
    req.onsuccess = () => resolve((req.result as SaveData | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('failed to read save'))
  })
  db.close()
  if (data && data.version !== 1) return null // future: migrations
  return data
}
