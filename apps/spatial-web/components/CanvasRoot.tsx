'use client'

import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import { A11yUserPreferences } from '@react-three/a11y'

export default function CanvasRoot({ children }: { children: React.ReactNode }) {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
      }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 10], fov: 25 }}
    >
      <A11yUserPreferences>
        {children}
        <Preload all />
      </A11yUserPreferences>
    </Canvas>
  )
}
