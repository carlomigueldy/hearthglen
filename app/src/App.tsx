import { CapabilityGate } from './render/CapabilityGate'
import { GameCanvas } from './render/GameCanvas'

export function App() {
  return (
    <CapabilityGate>
      <GameCanvas />
    </CapabilityGate>
  )
}
