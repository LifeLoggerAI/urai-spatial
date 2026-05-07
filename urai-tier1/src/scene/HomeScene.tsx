'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb, { OrbState } from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import ManifestRenderer from '../spatial/assets/ManifestRenderer'
import { useManifest } from '../spatial/assets/useManifest'
import { SpatialAssetManifest } from '../spatial/assets/manifestTypes'
import { useRouter, useSearchParams } from 'next/navigation'
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

function manifestReplayHref(manifestId: string | null) {
  return manifestId ? `/replay?manifestId=${encodeURIComponent(manifestId)}` : '/replay'
}

function manifestFocusHref(manifestId: string | null) {
  return manifestId ? `/focus?manifestId=${encodeURIComponent(manifestId)}` : '/focus'
}

function ModeGuidance({ mode, onEnter, onUnwind }: { mode: SceneMode; onEnter: () => void; onUnwind: () => void }) {
  if (mode === 'home') {
    return (
      <div className="urai-spatial-guidance urai-spatial-guidance--home" data-testid="urai-sky-guidance">
        <span className="urai-spatial-guidance__pulse" aria-hidden="true" />
        <span>Click the sky to open your Life Map</span>
        <button type="button" onClick={onEnter}>Enter Life Map</button>
      </div>
    )
  }

  if (mode === 'life-map' || mode === 'demo') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-lifemap-guidance">
        <span>Click a star to open memory focus</span>
        <button type="button" onClick={onUnwind}>ESC / Return Home</button>
      </div>
    )
  }

  if (mode === 'focus') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-focus-guidance">
        <span>Focus open. Replay when ready.</span>
        <button type="button" onClick={onUnwind}>ESC / Life Map</button>
      </div>
    )
  }

  if (mode === 'replay') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-replay-guidance">
        <span>Replay active. ESC unwinds one layer.</span>
        <button type="button" onClick={onUnwind}>Unwind</button>
      </div>
    )
  }

  return null
}

function FocusActionPanel({
  manifest,
  mode,
  onReplay,
  onUnwind,
}: {
  manifest: SpatialAssetManifest
  mode: SceneMode
  onReplay: () => void
  onUnwind: () => void
}) {
  const isReplay = mode === 'replay'
  const title = manifest.promptPreview || manifest.assetType || 'Memory star'

  return (
    <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label={isReplay ? 'Replay stream' : 'Selected memory star'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Stream' : 'Memory Star Open'}</div>
      <h2>{title}</h2>
      <p>
        {isReplay
          ? 'The replay is running as a cinematic memory layer. Press Escape to unwind back to focus, then Life Map, then Home.'
          : 'This star is open. Start replay to enter the memory stream, or press Escape to return to the constellation.'}
      </p>
      <div className="urai-focus-action-panel__actions">
        {!isReplay ? <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay}>Start Replay</button> : null}
        <button type="button" onClick={onUnwind}>{isReplay ? 'Unwind to Focus' : 'Back to Life Map'}</button>
      </div>
    </section>
  )
}

export default function HomeScene({ sceneMode = 'home' }: { sceneMode?: SceneMode }) {
  const router = useRouter()
  const params = useSearchParams()
  const manifestId = params.get('manifestId')
  const constellationMode = sceneMode === 'life-map' || sceneMode === 'demo' || params.get('mode') === 'constellation' || !manifestId
  const { manifest } = useManifest(manifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')
  const activeManifest = selectedManifest ?? manifest
  const orbState = useMemo(() => orbStateForContext({ context: narratorContext, hasSelectedManifest: Boolean(selectedManifest) || sceneMode === 'focus' || sceneMode === 'replay', sceneMode }), [narratorContext, selectedManifest, sceneMode])
  const cameraPath = useMemo(() => cameraPathForState({ hasFocus: Boolean(selectedPosition) || sceneMode === 'focus' || sceneMode === 'replay', isNarrating: Boolean(activeManifest) || sceneMode !== 'home', orbState }), [activeManifest, orbState, selectedPosition, sceneMode])

  const enterLifeMap = useCallback(() => {
    if (sceneMode === 'home') router.push('/life-map')
  }, [router, sceneMode])

  const unwind = useCallback(() => {
    if (selectedManifest) {
      setSelectedManifest(null)
      setSelectedPosition(null)
      setNarratorContext('explore')
      return
    }

    if (sceneMode === 'replay') {
      router.push(manifestFocusHref(manifestId))
      return
    }

    if (sceneMode === 'focus') {
      router.push('/life-map')
      return
    }

    if (sceneMode === 'life-map') {
      router.push('/home')
    }
  }, [manifestId, router, sceneMode, selectedManifest])

  const startReplay = useCallback(() => {
    const id = selectedManifest?.manifestId ?? manifestId
    router.push(manifestReplayHref(id))
  }, [manifestId, router, selectedManifest])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    setSelectedManifest(manifest)
    setSelectedPosition(position)
    setNarratorContext('return')
  }

  useEffect(() => {
    if (selectedManifest) setNarratorContext('return')
    else if (sceneMode === 'focus') setNarratorContext('arrival')
    else if (sceneMode === 'replay') setNarratorContext('return')
    else if (constellationMode) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, constellationMode, sceneMode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') unwind()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [unwind])

  const showFocusPanel = Boolean(activeManifest) && (Boolean(selectedManifest) || sceneMode === 'focus' || sceneMode === 'replay')

  return (
    <div className="urai-scene-stage" data-scene-mode={sceneMode}>
      {sceneMode === 'home' ? (
        <button
          type="button"
          className="urai-sky-click-target"
          data-testid="urai-sky-click-target"
          aria-label="Enter Life Map from sky"
          onClick={enterLifeMap}
        />
      ) : null}
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }} onPointerMissed={enterLifeMap}>
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
      <ModeGuidance mode={sceneMode} onEnter={enterLifeMap} onUnwind={unwind} />
      {showFocusPanel && activeManifest ? <FocusActionPanel manifest={activeManifest} mode={sceneMode} onReplay={startReplay} onUnwind={unwind} /> : null}
      <NarratorHud />
    </div>
  )
}
