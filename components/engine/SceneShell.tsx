'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import SceneRouter from './SceneRouter'
import PostPipeline from '@/components/post/PostPipeline'

/**
 * Root WebGL scene container.
 * Owns the Canvas and routes active scenes.
 */

export default function SceneShell() {

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >

      <Canvas
        shadows
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance'
        }}
        style={{
          position: 'absolute',
          inset: 0
        }}
      >

        <Suspense fallback={null}>

          <SceneRouter scene="home" setScene={() => {}} />

          <PostPipeline />

        </Suspense>

      </Canvas>

    </div>
  )
}