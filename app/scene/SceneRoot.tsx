'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

import Starfield from '@/engine/scene/Starfield'
import CameraRig from '@/engine/camera/CameraRig'
import MemorySphere from '@/engine/memory/MemorySphere'

export default function SceneRoot() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
    >
      <color attach="background" args={['#020412']} />
      <fog attach="fog" args={['#020412', 40, 200]} />

      <ambientLight intensity={0.35} />

      <Suspense fallback={null}>
        <CameraRig />
        <Starfield />
        <MemorySphere />
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.45}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}