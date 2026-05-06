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

type SceneMode = 'home' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

function orbStateForContext({ context, hasSelectedManifest, sceneMode }: { context: NarratorContext; hasSelectedManifest: boolean; sceneMode: SceneMode }): OrbState {
  if (hasSelectedManifest) return 'memoryBloom'
  if (sceneMode === 'focus') return 'listening'
  if (sceneMode === 'replay') return 'ritual'
  if (sceneMode === 'mirror') return 'recovery'
  if (context === 'return') return 'recovery'
  return 'idle'
}

export default function HomeScene({ sceneMode = 'home' }: { sceneMode?: SceneMode }) {
  const params = useSearchParams()
  const manifestId = params.get('manifestId')
  const constellationMode = sceneMode === 'life-map' || sceneMode === 'demo' || params.get('mode') === 'constellation' || !manifestId
  const { manifest } = useManifest(manifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')
  const activeManifest = selectedManifest ?? manifest
  const orbState = useMemo(() => orbStateForContext({ context: narratorContext, hasSelectedManifest: Boolean(selectedManifest), sceneMode }), [narratorContext, selectedManifest, sceneMode])
  const cameraPath = useMemo(() => cameraPathForState({ hasFocus: Boolean(selectedPosition), isNarrating: Boolean(activeManifest) || sceneMode !== 'home', orbState }), [activeManifest, orbState, selectedPosition, sceneMode])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    setSelectedManifest(manifest)
    setSelectedPosition(position)
  }

  useEffect(() => {
    if (selectedManifest) setNarratorContext('return')
    else if (sceneMode === 'focus') setNarratorContext('arrival')
    else if (sceneMode === 'replay') setNarratorContext('return')
    else if (constellationMode) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, constellationMode, sceneMode])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 2.85, 8.35]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} />
        <color attach="background" args={['#020611']} />
        <ambientLight intensity={0.24} color="#8ea2ff" />
        <hemisphereLight args={['#9fc3ff', '#12071e', 0.9]} />
        <directionalLight position={[-5.4, 7.4, 3.8]} intensity={1.7} color="#d7e6ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={1.88} color="#c9b0ff" distance={7.2} />
        <pointLight position={[-3.2, 2.35, -3.8]} intensity={0.8} color="#62e5ff" distance={11} />
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
