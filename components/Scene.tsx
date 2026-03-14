'use client'

import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { TimeProvider } from '@/components/time-core/TimeProvider'
import Orb from '@/components/orb/Orb'
import PostFX from '@/components/post/PostFX'
import CinematicIdleCamera from '@/components/camera/CinematicIdleCamera'
import StableStars from '@/components/stars/StableStars'
import MemorySphere from '@/components/spatial/MemorySphere'

/**
 * Root URAI scene.
 * Owns the WebGL renderer and mounts the simulation systems.
 */

export default function Scene() {

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'black'
      }}
    >

      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping
        }}
        onCreated={({ gl }) => {

          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMappingExposure = 1.0

        }}
      >

        <fog attach="fog" args={['#020308', 5, 20]} />

        {/* Simulation root */}
        <TimeProvider>

          <CinematicIdleCamera />

          <StableStars />

          <Orb />

          <MemorySphere />

          <PostFX />

        </TimeProvider>

      </Canvas>

    </div>
  )
}