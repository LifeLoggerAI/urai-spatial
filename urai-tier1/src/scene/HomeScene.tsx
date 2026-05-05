'use client'

import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import ManifestRenderer from '../spatial/assets/ManifestRenderer'
import { useManifest } from '../spatial/assets/useManifest'
import { useSearchParams } from 'next/navigation'
import CinematicCameraRig from '../spatial/cinematic/CinematicCameraRig'
import CinematicPostProcessing from '../spatial/cinematic/CinematicPostProcessing'
import CinematicParticles from '../spatial/cinematic/CinematicParticles'

export default function HomeScene() {
  const params = useSearchParams()
  const manifestId = params.get('manifestId')

  const { manifest } = useManifest(manifestId)

  return (
    <Canvas shadows gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 1.2, 4]} fov={45} />

      <CinematicCameraRig active={Boolean(manifest)} />

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

      <ManifestRenderer manifest={manifest} />

      <CinematicParticles active={Boolean(manifest)} />
      <CinematicPostProcessing active={Boolean(manifest)} />
    </Canvas>
  )
}
