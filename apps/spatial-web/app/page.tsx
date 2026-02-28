'use client'

import EngineSpine from '../engine/spine/EngineSpine'
import InsightOverlay from '../components/InsightOverlay'

export default function Page() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <EngineSpine />
      <InsightOverlay />
    </div>
  )
}
