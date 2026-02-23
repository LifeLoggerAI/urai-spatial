'use client'

import { Suspense } from 'react'
import { ContactShadows } from '@react-three/drei'
import Orb from '@/components/scene/Orb'
import Ground from '@/components/scene/Ground'
import ResponsiveCamera from '@/components/scene/ResponsiveCamera'
import SkyDome from '@/components/scene/SkyDome'
import { BackgroundStars, MidStars, ForegroundStars } from '@/components/scene/StarsLayer'
import AtmosphereBand from '@/components/scene/AtmosphereBand'

export default function SceneManager() {
  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={0.2} />

      {/* Directional light intensity reduced to balance the scene and soften the orb's highlight. */}
      <directionalLight
        castShadow
        position={[2, 3, 2]}
        intensity={0.9}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <pointLight
        position={[0, -2.8, -2]}
        intensity={0.4}
        color="#0ea5e9"
      />

      <SkyDome />
      <BackgroundStars />
      <MidStars />
      <ForegroundStars />
      <AtmosphereBand />

      <Suspense fallback={null}>
        <ContactShadows
          position={[0, 0.01, 0]} // Positioned slightly above ground to avoid z-fighting
          opacity={0.35}
          scale={4}
          blur={2}
          far={2}
          resolution={512}
        />
        <Ground />
        <Orb />
      </Suspense>
    </>
  )
}
