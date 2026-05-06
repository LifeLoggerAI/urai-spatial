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

function orbStateForContext({ context, hasSelectedManifest }: { context: NarratorContext; hasSelectedManifest: boolean }): OrbState {
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
  const orbState = useMemo(() => orbStateForContext({ context: narratorContext, hasSelectedManifest: Boolean(selectedManifest) }), [narratorContext, selectedManifest])
  const cameraPath = useMemo(() => cameraPathForState({ hasFocus: Boolean(selectedPosition), isNarrating: Boolean(activeManifest), orbState }), [activeManifest, orbState, selectedPosition])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    setSelectedManifest(manifest)
    setSelectedPosition(position)
  }

  useEffect(() => {
    if (selectedManifest) setNarratorContext('return')
    else if (constellationMode) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, constellationMode])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 2.55, 7.85]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} />
        <color attach="background" args={['#020611']} />
        <ambientLight intensity={0.22} color="#8ea2ff" />
        <hemisphereLight args={['#9fc3ff', '#12071e', 0.86]} />
        <directionalLight position={[-5.4, 7.4, 3.8]} intensity={1.62} color="#d7e6ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={1.72} color="#c9b0ff" distance={6.5} />
        <pointLight position={[-3.2, 2.35, -3.8]} intensity={0.72} color="#62e5ff" distance={10} />
        <Atmosphere />
        <Sky />
        <Ground />
        <Orb state={orbState} />
        {constellationMode ? <ConstellationLayer enabled selectedManifestId={selectedManifest?.manifestId ?? null} onSelect={handleSelect} /> : <ManifestRenderer manifest={manifest} />}
        <CinematicParticles active />
        <CinematicPostProcessing active={Boolean(activeManifest) || constellationMode} />
        <NarratorVoice manifest={activeManifest} context={narratorContext} />
      </Canvas>
      <NarratorHud />
    </div>
  )
}
