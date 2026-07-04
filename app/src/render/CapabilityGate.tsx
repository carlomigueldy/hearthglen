import { useEffect, useState, type ReactNode } from 'react'

type Capability = 'checking' | 'supported' | 'unsupported'

async function detectWebGpu(): Promise<boolean> {
  if (!('gpu' in navigator)) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function CapabilityGate({ children }: { children: ReactNode }) {
  const [capability, setCapability] = useState<Capability>('checking')

  useEffect(() => {
    let cancelled = false
    void detectWebGpu().then((supported) => {
      if (!cancelled) setCapability(supported ? 'supported' : 'unsupported')
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (capability === 'checking') return null
  if (capability === 'supported') return children

  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '32rem' }}>
        <h1 style={{ fontWeight: 'normal' }}>The hearth needs a newer flame</h1>
        <p style={{ lineHeight: 1.6 }}>
          Hearthglen is built on WebGPU, which this browser doesn&apos;t support yet. It runs
          in recent versions of Chrome and Edge, and Safari 26 or newer.
        </p>
      </div>
    </div>
  )
}
