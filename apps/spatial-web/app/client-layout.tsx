'use client'

import { Canvas } from '@react-three/fiber'
import SceneManager from '../components/SceneManager'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
      >
        <SceneManager />
      </Canvas>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'auto',
          background: 'transparent',
        }}
      >
        {children}
      </div>
    </>
  )
}
