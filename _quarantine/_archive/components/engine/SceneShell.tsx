'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import SceneRouter from './SceneRouter'
import PostPipeline from '@/components/post/PostPipeline'

export default function SceneShell() {
  const [scene, setScene] = useState<'home' | 'lifemap' | 'replay'>('home')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <Suspense fallback={null}>
          <SceneRouter scene={scene} setScene={setScene} />
          <PostPipeline />
        </Suspense>
      </Canvas>
    </div>
  )
}