'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import World from '../ecs/World'
import SceneRouter from './SceneRouter'

export default function EngineSpine() {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 50 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
    >
      {/* Stable Cinematic Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />

      {/* Subtle fog for depth */}
      <fog attach="fog" args={['#0f172a', 10, 40]} />

      <Suspense fallback={null}>
        <World />
        <SceneRouter />
      </Suspense>
    </Canvas>
  )
}
