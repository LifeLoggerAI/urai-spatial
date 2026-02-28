'use client'

import EngineSpine from '../engine/spine/EngineSpine'

export default function CanvasRoot({ children }: { children: React.ReactNode }) {
  return (
    <EngineSpine>
      {children}
    </EngineSpine>
  )
}
