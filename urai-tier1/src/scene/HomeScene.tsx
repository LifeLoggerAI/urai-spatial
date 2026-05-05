'use client'

import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import ManifestRenderer from '../spatial/assets/ManifestRenderer'

// TEMP: static manifest injection (replace with Firestore fetch later)
const demoManifest = null

export default function HomeScene() {
  return (
    <Canvas shadows gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 1.2, 4]} fov={45} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Atmosphere />
      <Sky />
      <Ground />
      <Orb />

      <ManifestRenderer manifest={demoManifest} />
    </Canvas>
  )
}
