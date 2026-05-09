'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb, { OrbState } from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import AscentPortal from './AscentPortal'
import SpatialVisualOverlay from './SpatialVisualOverlayPremium'
import RitualPlatform from './RitualPlatform'
import Lanterns from './Lanterns'
import CelestialSanctuary from './CelestialSanctuary'
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
import { DEMO_FOCUS_MANIFEST_ID } from '../spatial/demo/demoMemoryStars'
import MemoryStarArtifact from '../spatial/memory/MemoryStarArtifact'
import { buildMemoryMorphology, MemoryMorphology } from '../spatial/memory/memoryMorphology'
import { FocusPhaseDefinition, getFocusPhaseDefinition, resolveFocusPhase } from '../spatial/scene/focusState'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'

const ASCENT_DURATION_MS = 1800
const REPLAY_LAUNCH_DELAY_MS = 720

function silentHomeInvariantProof(mode: SceneMode) {
  if (mode === 'home') return null
  return mode
}

function gatedFeatureForMode(mode: SceneMode): SpatialFeatureId | null {
  if (mode === 'life-map') return 'spatial.lifeMap.personal'
  if (mode === 'focus') return 'spatial.memoryStars.personal'
  if (mode === 'replay') return 'spatial.memoryStars.personal'
  return null
}

function orbStateForContext({
  context,
  hasSelectedManifest,
  sceneMode,
}: {
  context: NarratorContext
  hasSelectedManifest: boolean
  sceneMode: SceneMode
}): OrbState {
  if (hasSelectedManifest) return 'memoryBloom'
  if (sceneMode === 'focus') return 'listening'
  if (sceneMode === 'replay') return 'ritual'
  if (sceneMode === 'mirror' || sceneMode === 'unwind') return 'recovery'
  if (sceneMode === 'ascent') return 'listening'
  if (context === 'return') return 'recovery'
  return 'idle'
}

function manifestReplayHref(manifestId: string | null) {
  return manifestId
    ? `/replay?manifestId=${encodeURIComponent(manifestId)}`
    : `/replay?manifestId=${encodeURIComponent(DEMO_FOCUS_MANIFEST_ID)}`
}

function manifestFocusHref(manifestId: string | null) {
  return manifestId
    ? `/focus?manifestId=${encodeURIComponent(manifestId)}`
    : `/focus?manifestId=${encodeURIComponent(DEMO_FOCUS_MANIFEST_ID)}`
}

function ModeGuidance({
  mode,
  onEnter,
  onUnwind,
  onSafeUnwind,
  reducedMotion,
  focusDefinition,
}: {
  mode: SceneMode
  onEnter: () => void
  onUnwind: () => void
  onSafeUnwind: () => void
  reducedMotion: boolean
  focusDefinition?: FocusPhaseDefinition
}) {
  if (silentHomeInvariantProof(mode) === null) return null

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
    const canReplay = focusDefinition?.allowedActions.includes('start_replay')

    return (
      <div className="urai-spatial-guidance" data-testid="urai-focus-guidance" aria-live="polite">
        <span>{canReplay ? 'Focus stable. Replay can begin.' : focusDefinition?.userVisibleUi ?? 'Focus is preparing.'}</span>
        <button type="button" onClick={onUnwind}>ESC / Life Map</button>
      </div>
    )
  }

  if (mode === 'replay') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-replay-guidance">
        <span>Replay breathing. ESC unwinds one layer.</span>
        <button type="button" onClick={onSafeUnwind}>Unwind</button>
      </div>
    )
  }

  if (mode === 'unwind') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-unwind-guidance" aria-live="polite">
        <span>Unwind complete. You are back in a safe spatial state.</span>
        <button type="button" onClick={onUnwind}>Return Home</button>
      </div>
    )
  }

  return null
}

function CameraResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button type="button" className="urai-camera-reset" data-testid="urai-camera-reset" aria-label="Recenter spatial camera" onClick={onReset}>
      Recenter
    </button>
  )
}

function FocusActionPanel({
  morphology,
  mode,
  onReplay,
  onUnwind,
  launching,
  focusDefinition,
}: {
  morphology: MemoryMorphology
  mode: SceneMode
  onReplay: () => void
  onUnwind: () => void
  launching: boolean
  focusDefinition: FocusPhaseDefinition
}) {
  const isReplay = mode === 'replay'
  const canStartReplay = !isReplay && focusDefinition.allowedActions.includes('start_replay')

  return (
    <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label={isReplay ? 'Replay stream' : 'Selected memory star'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Stream' : focusDefinition.label}</div>
      <h2>{isReplay ? 'Memory is reconstructing as atmosphere.' : morphology.title}</h2>
      <p>{isReplay ? morphology.poeticLine : focusDefinition.userVisibleUi}</p>
      <div className="urai-focus-action-panel__actions">
        {!isReplay ? (
          <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay} disabled={launching || !canStartReplay}>
            {launching ? 'Opening Memory...' : 'Start Replay'}
          </button>
        ) : null}
        <button type="button" onClick={onUnwind}>{isReplay ? 'Unwind to Focus' : 'Back to Life Map'}</button>
      </div>
    </section>
  )
}

function FocusEmptyPanel({
  mode,
  loading,
  onLifeMap,
  focusDefinition,
}: {
  mode: SceneMode
  loading: boolean
  onLifeMap: () => void
  focusDefinition: FocusPhaseDefinition
}) {
  const isReplay = mode === 'replay'

  return (
    <section className="urai-focus-action-panel urai-focus-action-panel--empty" data-testid="urai-focus-empty-panel" aria-label={isReplay ? 'Replay preparing' : 'Focus preparing'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Preparing' : focusDefinition.label}</div>
      <h2>{loading ? 'Opening memory star...' : 'Demo memory star ready'}</h2>
      <p>
        {loading
          ? focusDefinition.userVisibleUi
          : 'No private memory data was required. Return to the Life Map to choose another visible star.'}
      </p>
      <div className="urai-focus-action-panel__actions">
        <button type="button" className="urai-focus-action-panel__primary" onClick={onLifeMap}>Open Life Map</button>
      </div>
    </section>
  )
}

function TierGatePanel({
  featureId,
  loading,
  reasons,
  requiredTier,
  fallbackFeatureId,
  onPreview,
}: {
  featureId: SpatialFeatureId
  loading: boolean
  reasons: string[]
  requiredTier?: string
  fallbackFeatureId?: SpatialFeatureId
  onPreview: () => void
}) {
  const title = loading ? 'Checking spatial access...' : 'Personal Life Map is locked'
  const body = loading
    ? 'URAI is checking your tier, consent, and feature flags before opening this personal spatial layer.'
    : `This feature (${featureId}) requires ${requiredTier ?? 'a higher tier'} or additional consent. Fallback: ${fallbackFeatureId ?? 'spatial.starfield.preview'}. ${
        reasons.length ? `Reason: ${reasons.join(', ')}.` : ''
      }`

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
  const modeNeedsManifest = sceneMode === 'focus' || sceneMode === 'replay'
  const effectiveManifestId = modeNeedsManifest ? (manifestId ?? DEMO_FOCUS_MANIFEST_ID) : manifestId
  const isHomeMode = sceneMode === 'home'
  const isAscentMode = sceneMode === 'ascent'
  const isConstellationRoute = sceneMode === 'life-map' || sceneMode === 'demo' || params.get('mode') === 'constellation'
  const showHomeWorld = isHomeMode
  const showAscentPortal = isAscentMode
  const showConstellation = isConstellationRoute && !gateBlocksMode
  const showOrb = sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror' || sceneMode === 'unwind'
  const { manifest, loading: manifestLoading } = useManifest(gateBlocksMode ? null : effectiveManifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')
  const [cameraResetSignal, setCameraResetSignal] = useState(0)
  const [replayLaunching, setReplayLaunching] = useState(false)
  const activeManifest = gateBlocksMode ? null : selectedManifest ?? manifest
  const activeManifestId = selectedManifest?.manifestId ?? activeManifest?.manifestId ?? effectiveManifestId

  const focusPhase = useMemo(
    () =>
      resolveFocusPhase({
        mode: sceneMode,
        hasSelectedTarget: Boolean(selectedManifest) || Boolean(activeManifest),
        hasLoadedTarget: Boolean(activeManifest),
        isManifestLoading: manifestLoading,
        isGateLoading: gate.loading,
        isGateBlocked: Boolean(gatedFeatureId) && !gate.allowed,
        isReplayLaunching: replayLaunching,
      }),
    [activeManifest, gatedFeatureId, gate.allowed, gate.loading, manifestLoading, replayLaunching, sceneMode, selectedManifest],
  )

  const focusDefinition = useMemo(() => getFocusPhaseDefinition(focusPhase), [focusPhase])

  const memoryMorphology = useMemo(
    () => buildMemoryMorphology(activeManifest, sceneMode === 'replay' ? 'focus' : 'recovery'),
    [activeManifest, sceneMode],
  )

  const orbState = useMemo(
    () =>
      orbStateForContext({
        context: narratorContext,
        hasSelectedManifest:
          Boolean(activeManifest) ||
          Boolean(selectedManifest) ||
          sceneMode === 'focus' ||
          sceneMode === 'replay' ||
          sceneMode === 'unwind',
        sceneMode,
      }),
    [activeManifest, narratorContext, selectedManifest, sceneMode],
  )

  const cameraPath = useMemo(
    () =>
      cameraPathForState({
        hasFocus: Boolean(selectedPosition) || sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'unwind' || isAscentMode,
        isNarrating: Boolean(activeManifest) || sceneMode !== 'home',
        orbState,
        sceneMode,
      }),
    [activeManifest, orbState, selectedPosition, sceneMode, isAscentMode],
  )

  const resetCamera = useCallback(() => {
    setCameraResetSignal((value) => value + 1)
  }, [])

  const enterLifeMap = useCallback(() => {
    if (sceneMode === 'home') router.push('/ascent')
    if (sceneMode === 'ascent') router.push('/life-map')
  }, [router, sceneMode])

  const openLifeMap = useCallback(() => router.push('/life-map'), [router])
  const openPreviewMap = useCallback(() => router.push('/demo/life-map'), [router])
  const openSafeUnwind = useCallback(() => router.push('/unwind'), [router])

  const unwind = useCallback(() => {
    setReplayLaunching(false)

    if (selectedManifest) {
      setSelectedManifest(null)
      setSelectedPosition(null)
      setNarratorContext('explore')
      resetCamera()
      return
    }

    if (sceneMode === 'replay') {
      router.push(manifestFocusHref(activeManifestId))
      return
    }

    if (sceneMode === 'focus') {
      router.push('/life-map')
      return
    }

    if (sceneMode === 'unwind') {
      router.push('/')
      return
    }

    if (sceneMode === 'life-map' || sceneMode === 'ascent') router.push('/')
  }, [activeManifestId, resetCamera, router, sceneMode, selectedManifest])

  const startReplay = useCallback(() => {
    if (replayLaunching || !focusDefinition.allowedActions.includes('start_replay')) return

    setReplayLaunching(true)

    if (reducedMotion) {
      router.push(manifestReplayHref(activeManifestId))
      return
    }

    window.setTimeout(() => router.push(manifestReplayHref(activeManifestId)), REPLAY_LAUNCH_DELAY_MS)
  }, [activeManifestId, focusDefinition.allowedActions, reducedMotion, replayLaunching, router])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    router.push(`/focus?manifestId=${encodeURIComponent(manifest.manifestId)}`)
    setReplayLaunching(false)
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
    setReplayLaunching(false)

    if (selectedManifest) setNarratorContext('return')
    else if (sceneMode === 'focus') setNarratorContext('arrival')
    else if (sceneMode === 'replay' || sceneMode === 'unwind') setNarratorContext('return')
    else if (sceneMode === 'ascent') setNarratorContext('explore')
    else if (isConstellationRoute) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, isConstellationRoute, sceneMode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') unwind()
      if (event.key.toLowerCase() === 'r' && !isHomeMode) resetCamera()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isHomeMode, resetCamera, unwind])

  const showFocusPanel = Boolean(activeManifest) && (Boolean(selectedManifest) || modeNeedsManifest)
  const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest
  const showMemoryArtifact = !gateBlocksMode && (sceneMode === 'focus' || sceneMode === 'replay')

  return (
    <div
      className="urai-scene-stage"
      data-testid="urai-scene-stage"
      data-scene-mode={sceneMode}
      data-focus-phase={focusPhase}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-replay-launching={replayLaunching ? 'true' : 'false'}
      onClick={isHomeMode ? enterLifeMap : undefined}
    >
      <div className="urai-scene-stage__fallback" aria-hidden="true" />
      <SpatialVisualOverlay mode={sceneMode} />

      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} onPointerMissed={enterLifeMap}>
        <PerspectiveCamera makeDefault position={[0, 2.85, 8.35]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} reducedMotion={reducedMotion} resetSignal={cameraResetSignal} />

        <ambientLight intensity={isHomeMode ? 0.82 : isAscentMode ? 0.5 : 0.28} color="#b8d7ff" />
        <hemisphereLight args={['#d3e7ff', '#12071e', isHomeMode ? 1.58 : 0.95]} />
        <directionalLight
          position={[-5.4, 7.4, 3.8]}
          intensity={isHomeMode ? 2.65 : 1.85}
          color="#d7e6ff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={isHomeMode ? 3.15 : 2.05} color="#c9b0ff" distance={7.8} />
        <pointLight position={[-3.2, 2.35, -3.8]} intensity={isHomeMode ? 1.55 : 0.9} color="#62e5ff" distance={11} />
        <pointLight position={[3.2, 1.1, -3.2]} intensity={isHomeMode ? 0.82 : 0.25} color="#ffbf7a" distance={8.4} />

        <Atmosphere />
        <Sky />

        {isHomeMode ? <CelestialSanctuary reducedMotion={reducedMotion} /> : null}
        {showHomeWorld ? <Ground /> : null}
        {isHomeMode ? <RitualPlatform reducedMotion={reducedMotion} /> : null}
        {isHomeMode ? <Lanterns reducedMotion={reducedMotion} /> : null}
        {showAscentPortal ? <AscentPortal /> : null}
        {showOrb ? <Orb state={orbState} /> : null}

        {showConstellation ? (
          <ConstellationLayer enabled selectedManifestId={selectedManifest?.manifestId ?? null} onSelect={handleSelect} />
        ) : activeManifest ? (
          <ManifestRenderBoundary manifest={activeManifest} />
        ) : null}

        <CinematicParticles active reducedMotion={reducedMotion} />
        <CinematicPostProcessing active={Boolean(activeManifest) || showConstellation || isAscentMode || isHomeMode} reducedMotion={reducedMotion} />
        {!isHomeMode ? <NarratorVoice manifest={activeManifest} context={narratorContext} /> : null}
      </Canvas>

      {showMemoryArtifact ? <MemoryStarArtifact morphology={memoryMorphology} replay={sceneMode === 'replay' || replayLaunching} /> : null}
      {!isHomeMode ? <CameraResetButton onReset={resetCamera} /> : null}

      {!isHomeMode ? <ModeGuidance mode={sceneMode} onEnter={enterLifeMap} onUnwind={unwind} onSafeUnwind={openSafeUnwind} reducedMotion={reducedMotion} focusDefinition={focusDefinition} /> : null}

      {gateBlocksMode && gatedFeatureId ? (
        <TierGatePanel
          featureId={gatedFeatureId}
          loading={gate.loading}
          reasons={gate.reasons}
          requiredTier={gate.requiredTier}
          fallbackFeatureId={gate.fallbackFeatureId}
          onPreview={openPreviewMap}
        />
      ) : null}

      {showFocusPanel && activeManifest ? (
        <FocusActionPanel morphology={memoryMorphology} mode={sceneMode} onReplay={startReplay} onUnwind={unwind} launching={replayLaunching} focusDefinition={focusDefinition} />
      ) : null}

      {showEmptyFocusPanel ? <FocusEmptyPanel mode={sceneMode} loading={manifestLoading} onLifeMap={openLifeMap} focusDefinition={focusDefinition} /> : null}
      {!isHomeMode ? <NarratorHud /> : null}
    </div>
  )
}
