'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import ManifestRenderer from '../spatial/assets/ManifestRenderer'
import { useManifest } from '../spatial/assets/useManifest'
import { SpatialAssetManifest } from '../spatial/assets/manifestTypes'
import { useSearchParams } from 'next/navigation'
import CinematicCameraRig from '../spatial/cinematic/CinematicCameraRig'
import CinematicPostProcessing from '../spatial/cinematic/CinematicPostProcessing'
import CinematicParticles from '../spatial/cinematic/CinematicParticles'
import NarratorVoice from '../spatial/narrator/NarratorVoice'
import NarratorHud from '../spatial/narrator/NarratorHud'
import ConstellationLayer, { ConstellationNodePosition } from '../spatial/constellation/ConstellationLayer'
import { NarratorContext } from '../spatial/narrator/buildNarration'

export default function HomeScene() {
  const params = useSearchParams()
  const manifestId = params.get('manifestId')
  const constellationMode = params.get('mode') === 'constellation' || !manifestId

  const { manifest } = useManifest(manifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')

  const activeManifest = selectedManifest ?? manifest

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    setSelectedManifest(manifest)
    setSelectedPosition(position)
  }

  useEffect(() => {
    if (selectedManifest) {
      setNarratorContext('return')
    } else if (constellationMode) {
      setNarratorContext('explore')
    } else {
      setNarratorContext('arrival')
    }
  }, [selectedManifest, constellationMode])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 1.2, 4]} fov={45} />

        <CinematicCameraRig
          active={Boolean(activeManifest)}
          focusPosition={selectedPosition}
        />

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

        {constellationMode ? (
          <ConstellationLayer
            enabled
            selectedManifestId={selectedManifest?.manifestId ?? null}
            onSelect={handleSelect}
          />
        ) : (
          <ManifestRenderer manifest={manifest} />
        )}

        <CinematicParticles active={Boolean(activeManifest)} />
        <CinematicPostProcessing active={Boolean(activeManifest)} />

        <NarratorVoice manifest={activeManifest} context={narratorContext} />
      </Canvas>

      <NarratorHud />
    </div>
  )
}
