'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import Orb from './Orb'
import Starfield from './Starfield'
import CameraRig from './CameraRig'

export default function HomeScene() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 50 }}
    >
      <color attach="background" args={['#05070d']} />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Suspense fallback={null}>
        <CameraRig />
        <Starfield />
        <Orb />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
