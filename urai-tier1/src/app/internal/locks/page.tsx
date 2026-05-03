'use client'

import { useState } from 'react'
import { useSpatialTierLock } from '@/lib/tier-locks/client'

const FEATURES = ['spatial.lifeMap.personal','spatial.memoryStars.personal','spatial.ritual.interactive','spatial.admin.inspectLocks'] as const

export default function LockInspectorPage() {
  const [feature, setFeature] = useState<typeof FEATURES[number]>('spatial.lifeMap.personal')
  const decision = useSpatialTierLock(feature)

  if (process.env.NEXT_PUBLIC_URAI_DEBUG_SPATIAL !== 'true') return null

  return <main style={{ padding: 24, color: '#dbeafe', background: '#020617', minHeight: '100vh' }}>
    <h1>Spatial Lock Inspector</h1>
    <select value={feature} onChange={(e) => setFeature(e.target.value as typeof FEATURES[number])}>
      {FEATURES.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
    <pre>{JSON.stringify(decision, null, 2)}</pre>
  </main>
}
