'use client'

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { TimeProvider } from '@/components/time-core/TimeProvider';
import Orb from '@/components/orb/Orb';
import PostFX from '@/components/post/PostFX';
import { ColorManagement } from 'three';
import CinematicIdleCamera from '@/components/camera/CinematicIdleCamera';
import StableStars from '@/components/stars/StableStars';

// Enable Three.js color management for more accurate and realistic color representation.
ColorManagement.enabled = true

/**
 * The main scene component that composes the entire URAI experience.
 */
export default function Scene() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas
        gl={{
          antialias: true,
          physicallyCorrectLights: true, // Enables physically accurate lighting
          toneMapping: THREE.ACESFilmicToneMapping, // For a cinematic, HDR-like look
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.0
        }}
        camera={{ position: [0, 0, 3], fov: 45 }}
      >
        <fog attach="fog" args={['#020308', 5, 20]} />
        {/* The TimeProvider is the heart of the simulation */}
        <TimeProvider>
          <CinematicIdleCamera />
          <StableStars />
          <Orb />
          <PostFX />
        </TimeProvider>
      </Canvas>
    </div>
  );
}
