'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

export default function CanvasRoot({ children }: { children: React.ReactNode }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0
      }}
    >
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </Canvas>
  )
}
