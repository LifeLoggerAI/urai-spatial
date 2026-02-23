'use client'

import { Canvas } from '@react-three/fiber'
import SceneManager from '@/components/SceneManager'

export default function CanvasRoot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        camera={{ fov: 75 }}
      >
        <SceneManager>{children}</SceneManager>
      </Canvas>
    </div>
  )
}
