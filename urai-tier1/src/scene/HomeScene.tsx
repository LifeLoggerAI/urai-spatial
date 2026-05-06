'use client'

import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb, { OrbState } from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import ManifestRenderer from '../spatial/assets/ManifestRenderer'
import { useManifest } from '../spatial/assets/useManifest'
import { SpatialAssetManifest } from '../spatial/assets/manifestTypes'
import { useSearchParams } from 'next/navigation'
import CinematicCameraRig from '../spatial/cinematic/CinematicCameraRig'
import CinematicPostProcessing from '../spatial/cinematic/CinematicPostProcessing'
import CinematicParticles from '../spatial/cinematic/CinematicParticles'
import { cameraPathForState } from '../spatial/cinematic/cameraPaths'
import NarratorVoice from '../spatial/narrator/NarratorVoice'
import NarratorHud from '../spatial/narrator/NarratorHud'
import ConstellationLayer, { ConstellationNodePosition } from '../spatial/constellation/ConstellationLayer'
import { NarratorContext } from '../spatial/narrator/buildNarration'

function orbStateForContext({
  context,
  hasSelectedManifest,
}: {
  context: NarratorContext
  hasSelectedManifest: boolean
}): OrbState {
  if (hasSelectedManifest) return 'memoryBloom'
  if (context === 'return') return 'recovery'
  return 'idle'
}

export default function HomeScene() {
  const params = useSearchParams()
  const manifestId = params.get('manifestId')
  const constellationMode = params.get('mode') === 'constellation' || !manifestId

  const { manifest } = useManifest(manifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')

  const activeManifest = selectedManifest ?? manifest
  const orbState = useMemo(
    () => orbStateForContext({ context: narratorContext, hasSelectedManifest: Boolean(selectedManifest) }),
    [narratorContext, selectedManifest],
  )
  const cameraPath = useMemo(
    () => cameraPathForState({ hasFocus: Boolean(selectedPosition), isNarrating: Boolean(activeManifest), orbState }),
    [activeManifest, orbState, selectedPosition],
  )

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
      <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 0.72, 5.35]} fov={53} />

        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} />

        <color attach="background" args={['#030711']} />
        <ambientLight intensity={0.18} color="#6f7dff" />
        <hemisphereLight args={['#8fb7ff', '#16091f', 0.72]} />
        <directionalLight
          position={[-4.5, 6.5, 2.5]}
          intensity={1.55}
          color="#c9dcff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[1.4, 0.8, 1.25]} intensity={1.25} color="#b88cff" distance={7} />
        <pointLight position={[-2.2, 1.45, -1.5]} intensity={0.58} color="#6fe7ff" distance={8} />

        <Atmosphere />
        <Sky />
        <Ground />
        <Orb state={orbState} />

        {constellationMode ? (
          <ConstellationLayer
            enabled
            selectedManifestId={selectedManifest?.manifestId ?? null}
            onSelect={handleSelect}
          />
        ) : (
          <ManifestRenderer manifest={manifest} />
        )}

        <CinematicParticles active />
        <CinematicPostProcessing active={Boolean(activeManifest)} />

        <NarratorVoice manifest={activeManifest} context={narratorContext} />
      </Canvas>

      <NarratorHud />
    </div>
  )
}
