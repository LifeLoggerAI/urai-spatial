'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb, { OrbState } from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import AscentPortal from './AscentPortal'
import SpatialVisualOverlay from './SpatialVisualOverlay'
import ManifestRenderBoundary from '../spatial/assets/ManifestRenderBoundary'
import { useManifest } from '../spatial/assets/useManifest'
import { SpatialAssetManifest } from '../spatial/assets/manifestTypes'
import { useRouter, useSearchParams } from 'next/navigation'
import CinematicCameraRig from '../spatial/cinematic/CinematicCameraRig'
import CinematicPostProcessing from '../spatial/cinematic/CinematicPostProcessing'
import CinematicParticles from '../spatial/cinematic/CinematicParticles'
import { cameraPathForState } from '../spatial/cinematic/cameraPaths'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import { SpatialFeatureId, useSpatialTierGate } from '../spatial/tier/useSpatialTierGate'
import NarratorVoice from '../spatial/narrator/NarratorVoice'
import NarratorHud from '../spatial/narrator/NarratorHud'
import ConstellationLayer, { ConstellationNodePosition } from '../spatial/constellation/ConstellationLayer'
import { NarratorContext } from '../spatial/narrator/buildNarration'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

const ASCENT_DURATION_MS = 1800

function gatedFeatureForMode(mode: SceneMode): SpatialFeatureId | null {
  if (mode === 'life-map') return 'spatial.lifeMap.personal'
  if (mode === 'focus') return 'spatial.memoryStars.personal'
  if (mode === 'replay') return 'spatial.memoryStars.personal'
  return null
}

function orbStateForContext({ context, hasSelectedManifest, sceneMode }: { context: NarratorContext; hasSelectedManifest: boolean; sceneMode: SceneMode }): OrbState {
  if (hasSelectedManifest) return 'memoryBloom'
  if (sceneMode === 'focus') return 'listening'
  if (sceneMode === 'replay') return 'ritual'
  if (sceneMode === 'mirror') return 'recovery'
  if (sceneMode === 'ascent') return 'listening'
  if (context === 'return') return 'recovery'
  return 'idle'
}

function manifestReplayHref(manifestId: string | null) {
  return manifestId ? `/replay?manifestId=${encodeURIComponent(manifestId)}` : '/replay'
}

function manifestFocusHref(manifestId: string | null) {
  return manifestId ? `/focus?manifestId=${encodeURIComponent(manifestId)}` : '/focus'
}

function ModeGuidance({ mode, onEnter, onUnwind, reducedMotion }: { mode: SceneMode; onEnter: () => void; onUnwind: () => void; reducedMotion: boolean }) {
  if (mode === 'home') {
    return (
      <div className="urai-spatial-guidance urai-spatial-guidance--home" data-testid="urai-sky-guidance">
        <span className="urai-spatial-guidance__pulse" aria-hidden="true" />
        <span>Click the sky to begin the ascent</span>
        <button type="button" onClick={onEnter}>Begin Ascent</button>
      </div>
    )
  }

  if (mode === 'ascent') {
    return (
      <div className="urai-spatial-guidance urai-spatial-guidance--ascent" data-testid="urai-ascent-guidance" aria-live="polite">
        <span className="urai-spatial-guidance__pulse" aria-hidden="true" />
        <span>{reducedMotion ? 'Ascent ready. Continue into your Life Map.' : 'Ascending into your Life Map...'}</span>
        {reducedMotion ? <button type="button" onClick={onEnter}>Enter Life Map</button> : null}
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

function CameraResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button type="button" className="urai-camera-reset" data-testid="urai-camera-reset" aria-label="Reset spatial camera" onClick={onReset}>
      Reset View
    </button>
  )
}

function FocusActionPanel({ manifest, mode, onReplay, onUnwind }: { manifest: SpatialAssetManifest; mode: SceneMode; onReplay: () => void; onUnwind: () => void }) {
  const isReplay = mode === 'replay'
  const title = manifest.promptPreview || manifest.assetType || 'Memory star'

  return (
    <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label={isReplay ? 'Replay stream' : 'Selected memory star'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Stream' : 'Memory Star Open'}</div>
      <h2>{title}</h2>
      <p>{isReplay ? 'The replay is running as a cinematic memory layer. Press Escape to unwind back to focus, then Life Map, then Home.' : 'This star is open. Start replay to enter the memory stream, or press Escape to return to the constellation.'}</p>
      <div className="urai-focus-action-panel__actions">
        {!isReplay ? <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay}>Start Replay</button> : null}
        <button type="button" onClick={onUnwind}>{isReplay ? 'Unwind to Focus' : 'Back to Life Map'}</button>
      </div>
    </section>
  )
}

function FocusEmptyPanel({ mode, manifestId, loading, error, onLifeMap }: { mode: SceneMode; manifestId: string | null; loading: boolean; error: string | null; onLifeMap: () => void }) {
  const isReplay = mode === 'replay'
  const title = loading ? 'Loading memory star...' : error ? 'Memory star unavailable' : manifestId ? 'Memory star not ready' : 'Choose a memory star first'
  const body = loading
    ? 'URAI is retrieving the selected spatial memory. The scene will open as soon as the manifest is available.'
    : error
      ? error
      : manifestId
        ? 'This memory link exists, but it does not have a valid spatial manifest yet.'
        : isReplay
          ? 'Replay needs a selected memory. Return to the Life Map and choose a star to begin the stream.'
          : 'Focus opens after a Life Map star is selected. Return to the constellation and choose a memory.'

  return (
    <section className="urai-focus-action-panel urai-focus-action-panel--empty" data-testid="urai-focus-empty-panel" aria-label={isReplay ? 'Replay unavailable' : 'Focus unavailable'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Pending' : 'Focus Pending'}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="urai-focus-action-panel__actions">
        <button type="button" className="urai-focus-action-panel__primary" onClick={onLifeMap}>Open Life Map</button>
      </div>
    </section>
  )
}

function TierGatePanel({ featureId, loading, reasons, requiredTier, fallbackFeatureId, onPreview }: { featureId: SpatialFeatureId; loading: boolean; reasons: string[]; requiredTier?: string; fallbackFeatureId?: SpatialFeatureId; onPreview: () => void }) {
  const title = loading ? 'Checking spatial access...' : 'Personal Life Map is locked'
  const body = loading ? 'URAI is checking your tier, consent, and feature flags before opening this personal spatial layer.' : `This feature (${featureId}) requires ${requiredTier ?? 'a higher tier'} or additional consent. Fallback: ${fallbackFeatureId ?? 'spatial.starfield.preview'}. ${reasons.length ? `Reason: ${reasons.join(', ')}.` : ''}`

  return (
    <section className="urai-focus-action-panel urai-focus-action-panel--locked" data-testid="urai-tier-gate-panel" aria-label="Spatial feature locked">
      <div className="urai-focus-action-panel__eyebrow">Tier Gate</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="urai-focus-action-panel__actions">
        <button type="button" className="urai-focus-action-panel__primary" onClick={onPreview}>Open Preview Map</button>
      </div>
    </section>
  )
}

export default function HomeScene({ sceneMode = 'home' }: { sceneMode?: SceneMode }) {
  const router = useRouter()
  const params = useSearchParams()
  const reducedMotion = useReducedMotion()
  const gatedFeatureId = gatedFeatureForMode(sceneMode)
  const gate = useSpatialTierGate(gatedFeatureId)
  const gateBlocksMode = Boolean(gatedFeatureId) && (gate.loading || !gate.allowed)
  const manifestId = params.get('manifestId')
  const isHomeMode = sceneMode === 'home'
  const isAscentMode = sceneMode === 'ascent'
  const isConstellationRoute = sceneMode === 'life-map' || sceneMode === 'demo' || params.get('mode') === 'constellation'
  const showHomeWorld = isHomeMode
  const showAscentPortal = isAscentMode
  const showConstellation = isConstellationRoute && !gateBlocksMode
  const showOrb = isHomeMode || sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror'
  const { manifest, loading: manifestLoading, error: manifestError } = useManifest(gateBlocksMode ? null : manifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')
  const [cameraResetSignal, setCameraResetSignal] = useState(0)
  const activeManifest = gateBlocksMode ? null : selectedManifest ?? manifest
  const orbState = useMemo(() => orbStateForContext({ context: narratorContext, hasSelectedManifest: Boolean(selectedManifest) || sceneMode === 'focus' || sceneMode === 'replay', sceneMode }), [narratorContext, selectedManifest, sceneMode])
  const cameraPath = useMemo(() => cameraPathForState({ hasFocus: Boolean(selectedPosition) || sceneMode === 'focus' || sceneMode === 'replay' || isAscentMode, isNarrating: Boolean(activeManifest) || sceneMode !== 'home', orbState }), [activeManifest, orbState, selectedPosition, sceneMode, isAscentMode])

  const resetCamera = useCallback(() => {
    setCameraResetSignal((value) => value + 1)
  }, [])

  const enterLifeMap = useCallback(() => {
    if (sceneMode === 'home') router.push('/ascent')
    if (sceneMode === 'ascent') router.push('/life-map')
  }, [router, sceneMode])

  const openLifeMap = useCallback(() => router.push('/life-map'), [router])
  const openPreviewMap = useCallback(() => router.push('/demo/life-map'), [router])

  const unwind = useCallback(() => {
    if (selectedManifest) {
      setSelectedManifest(null)
      setSelectedPosition(null)
      setNarratorContext('explore')
      resetCamera()
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
    if (sceneMode === 'life-map' || sceneMode === 'ascent') router.push('/home')
  }, [manifestId, resetCamera, router, sceneMode, selectedManifest])

  const startReplay = useCallback(() => {
    const id = selectedManifest?.manifestId ?? manifestId
    router.push(manifestReplayHref(id))
  }, [manifestId, router, selectedManifest])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    router.push(`/focus?manifestId=${encodeURIComponent(manifest.manifestId)}`)
    setSelectedManifest(manifest)
    setSelectedPosition(position)
    setNarratorContext('return')
  }

  useEffect(() => {
    if (!isAscentMode || reducedMotion) return
    const timeout = window.setTimeout(() => router.push('/life-map'), ASCENT_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [isAscentMode, reducedMotion, router])

  useEffect(() => {
    if (selectedManifest) setNarratorContext('return')
    else if (sceneMode === 'focus') setNarratorContext('arrival')
    else if (sceneMode === 'replay') setNarratorContext('return')
    else if (sceneMode === 'ascent') setNarratorContext('explore')
    else if (isConstellationRoute) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, isConstellationRoute, sceneMode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') unwind()
      if (event.key.toLowerCase() === 'r') resetCamera()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetCamera, unwind])

  const modeNeedsManifest = sceneMode === 'focus' || sceneMode === 'replay'
  const showFocusPanel = Boolean(activeManifest) && (Boolean(selectedManifest) || modeNeedsManifest)
  const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest

  return (
    <div className="urai-scene-stage" data-scene-mode={sceneMode} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <div className="urai-scene-stage__fallback" aria-hidden="true" />
      <SpatialVisualOverlay mode={sceneMode} />
      {isHomeMode ? <button type="button" className="urai-sky-click-target" data-testid="urai-sky-click-target" aria-label="Begin ascent to Life Map" onClick={enterLifeMap} /> : null}
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} onPointerMissed={enterLifeMap}>
        <PerspectiveCamera makeDefault position={[0, 2.85, 8.35]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} reducedMotion={reducedMotion} resetSignal={cameraResetSignal} />
        <ambientLight intensity={isHomeMode ? 0.72 : isAscentMode ? 0.5 : 0.28} color="#b8d7ff" />
        <hemisphereLight args={['#d3e7ff', '#12071e', isHomeMode ? 1.45 : 0.95]} />
        <directionalLight position={[-5.4, 7.4, 3.8]} intensity={isHomeMode ? 2.45 : 1.85} color="#d7e6ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={isHomeMode ? 2.8 : 2.05} color="#c9b0ff" distance={7.2} />
        <pointLight position={[-3.2, 2.35, -3.8]} intensity={isHomeMode ? 1.35 : 0.9} color="#62e5ff" distance={11} />
        <Atmosphere />
        <Sky />
        {showHomeWorld ? <Ground /> : null}
        {showAscentPortal ? <AscentPortal /> : null}
        {showOrb ? <Orb state={orbState} /> : null}
        {showConstellation ? <ConstellationLayer enabled selectedManifestId={selectedManifest?.manifestId ?? null} onSelect={handleSelect} /> : activeManifest ? <ManifestRenderBoundary manifest={activeManifest} /> : null}
        <CinematicParticles active reducedMotion={reducedMotion} />
        <CinematicPostProcessing active={Boolean(activeManifest) || showConstellation || isAscentMode} reducedMotion={reducedMotion} />
        <NarratorVoice manifest={activeManifest} context={narratorContext} />
      </Canvas>
      <CameraResetButton onReset={resetCamera} />
      <ModeGuidance mode={sceneMode} onEnter={enterLifeMap} onUnwind={unwind} reducedMotion={reducedMotion} />
      {gateBlocksMode && gatedFeatureId ? <TierGatePanel featureId={gatedFeatureId} loading={gate.loading} reasons={gate.reasons} requiredTier={gate.requiredTier} fallbackFeatureId={gate.fallbackFeatureId} onPreview={openPreviewMap} /> : null}
      {showFocusPanel && activeManifest ? <FocusActionPanel manifest={activeManifest} mode={sceneMode} onReplay={startReplay} onUnwind={unwind} /> : null}
      {showEmptyFocusPanel ? <FocusEmptyPanel mode={sceneMode} manifestId={manifestId} loading={manifestLoading} error={manifestError} onLifeMap={openLifeMap} /> : null}
      <NarratorHud />
    </div>
  )
}
