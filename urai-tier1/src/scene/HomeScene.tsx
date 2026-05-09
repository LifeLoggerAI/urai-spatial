'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Ground from './Ground'
import Orb, { OrbState } from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import AscentPortal from './AscentPortal'
import SpatialVisualOverlay from './SpatialVisualOverlayTier5'
import RitualPlatform from './RitualPlatform'
import Lanterns from './Lanterns'
import CelestialSanctuary from './CelestialSanctuary'
import ManifestRenderBoundary from '../spatial/assets/ManifestRenderBoundary'
import { useManifest } from '../spatial/assets/useManifest'
import {
  SpatialAssetManifest,
  memoryPrivacyState,
  memoryReplayReady,
  memorySourceType,
  memorySystemLabel,
  memoryTitle,
} from '../spatial/assets/manifestTypes'
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

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'
type LifeMapFilter = 'timeline' | 'seasons' | 'people' | 'places' | 'rituals' | 'recovery' | 'dreams' | 'mirror'

const ASCENT_DURATION_MS = 1800
const REPLAY_LAUNCH_DELAY_MS = 720

const LIFE_MAP_FILTERS: Array<{ id: LifeMapFilter; label: string }> = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'people', label: 'People' },
  { id: 'places', label: 'Places' },
  { id: 'rituals', label: 'Rituals' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'dreams', label: 'Dreams' },
  { id: 'mirror', label: 'Mirror' },
]

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
  if (sceneMode === 'mirror') return 'recovery'
  if (sceneMode === 'ascent') return 'listening'
  if (context === 'return') return 'recovery'
  return 'idle'
}

function manifestReplayHref(manifestId: string | null) {
  return manifestId ? `/replay?manifestId=${encodeURIComponent(manifestId)}` : `/replay?manifestId=${encodeURIComponent(DEMO_FOCUS_MANIFEST_ID)}`
}

function manifestFocusHref(manifestId: string | null) {
  return manifestId ? `/focus?manifestId=${encodeURIComponent(manifestId)}` : `/focus?manifestId=${encodeURIComponent(DEMO_FOCUS_MANIFEST_ID)}`
}

function manifestMirrorHref(manifestId: string | null) {
  return manifestId ? `/mirror?manifestId=${encodeURIComponent(manifestId)}` : `/mirror?manifestId=${encodeURIComponent(DEMO_FOCUS_MANIFEST_ID)}`
}

function LifeMapAaaStyles() {
  return (
    <style jsx global>{`
      .urai-life-map-status { position: absolute; top: 22px; right: 108px; z-index: 9; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; max-width: min(52vw, 560px); pointer-events: auto; }
      .urai-life-map-status span { min-height: 32px; display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(142,220,255,.24); background: rgba(5,9,22,.48); color: rgba(235,244,255,.78); font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; backdrop-filter: blur(14px); }
      .urai-life-map-controls { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 10; display: flex; gap: 6px; max-width: calc(100vw - 44px); padding: 7px; border: 1px solid rgba(142,220,255,.22); border-radius: 999px; background: rgba(3,7,18,.48); box-shadow: 0 18px 70px rgba(0,0,0,.32); backdrop-filter: blur(18px); pointer-events: auto; overflow-x: auto; }
      .urai-life-map-controls button { min-height: 36px; min-width: 44px; border: 1px solid rgba(142,220,255,.2); border-radius: 999px; background: rgba(95,125,255,.12); color: rgba(235,244,255,.78); padding: 7px 12px; font-size: .74rem; white-space: nowrap; }
      .urai-life-map-controls button[aria-pressed='true'] { background: linear-gradient(135deg, rgba(103,232,249,.9), rgba(139,92,246,.82)); color: #050713; font-weight: 800; }
      .urai-life-map-node-button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid rgba(142,220,255,.45); background: rgba(5,9,22,.36); color: #dff7ff; box-shadow: 0 0 18px rgba(103,232,249,.25), inset 0 0 18px rgba(139,92,246,.2); backdrop-filter: blur(10px); }
      .urai-life-map-node-button--selected, .urai-life-map-node-button:focus-visible { outline: 2px solid rgba(125,211,252,.95); outline-offset: 4px; box-shadow: 0 0 34px rgba(103,232,249,.7), 0 0 72px rgba(139,92,246,.42); }
      .urai-life-map-node-preview { position: absolute; left: 50px; top: -10px; width: 230px; padding: 10px 12px; border: 1px solid rgba(142,220,255,.26); border-radius: 16px; background: rgba(3,7,18,.76); box-shadow: 0 18px 60px rgba(0,0,0,.36); color: rgba(235,244,255,.82); backdrop-filter: blur(14px); text-align: left; }
      .urai-life-map-node-preview strong, .urai-life-map-node-preview span, .urai-life-map-node-preview small { display: block; }
      .urai-life-map-node-preview strong { font-size: .84rem; color: #f7fbff; }
      .urai-life-map-node-preview span, .urai-life-map-node-preview small { margin-top: 3px; font-size: .68rem; color: rgba(235,244,255,.68); }
      .urai-narrator-hud { position: absolute; right: 22px; top: 74px; z-index: 9; width: min(340px, calc(100vw - 44px)); display: grid; grid-template-columns: 42px 1fr; gap: 12px; padding: 14px; border: 1px solid rgba(142,220,255,.24); border-radius: 22px; background: linear-gradient(150deg, rgba(4,12,28,.68), rgba(15,10,38,.56)); box-shadow: 0 22px 80px rgba(0,0,0,.34); backdrop-filter: blur(16px); pointer-events: auto; }
      .urai-narrator-hud__orb { width: 42px; height: 42px; border-radius: 999px; background: radial-gradient(circle at 34% 28%, #fff, #67e8f9 30%, #8b5cf6 70%); box-shadow: 0 0 32px rgba(103,232,249,.5); }
      .urai-narrator-hud__copy { display: grid; gap: 5px; }
      .urai-narrator-hud__copy strong { font-size: .68rem; letter-spacing: .18em; color: rgba(182,226,255,.84); }
      .urai-narrator-hud__copy span { color: rgba(235,244,255,.76); font-size: .78rem; line-height: 1.45; }
      .urai-narrator-hud__voice { justify-self: start; min-height: 34px; border-radius: 999px; border: 1px solid rgba(142,220,255,.28); background: rgba(95,125,255,.16); color: #edf7ff; padding: 6px 10px; font-size: .72rem; }
      .urai-replay-shell { margin-top: 12px; padding: 12px; border: 1px solid rgba(142,220,255,.2); border-radius: 18px; background: rgba(103,232,249,.06); }
      .urai-replay-shell__ring { height: 8px; border-radius: 999px; background: linear-gradient(90deg, rgba(103,232,249,.95), rgba(139,92,246,.8), rgba(244,114,182,.68)); box-shadow: 0 0 26px rgba(103,232,249,.3); }
      .urai-reflection-grid { display: grid; gap: 8px; margin-top: 12px; }
      .urai-reflection-grid div { padding: 9px; border: 1px solid rgba(142,220,255,.14); border-radius: 14px; background: rgba(255,255,255,.04); color: rgba(235,244,255,.72); font-size: .76rem; line-height: 1.45; }
      .urai-reflection-grid strong { display: block; color: #f7fbff; margin-bottom: 3px; }
      @media (max-width: 640px) { .urai-life-map-status { left: 14px; right: 14px; top: auto; bottom: 124px; justify-content: center; max-width: none; } .urai-narrator-hud { left: 14px; right: 14px; top: auto; bottom: 178px; width: auto; } .urai-life-map-controls { bottom: 14px; width: calc(100vw - 28px); justify-content: flex-start; border-radius: 22px; } .urai-life-map-node-preview { width: 188px; } }
      @media (prefers-reduced-motion: reduce) { .urai-life-map-node-button, .urai-replay-shell__ring, .urai-narrator-hud__orb { animation: none !important; transition: none !important; } }
    `}</style>
  )
}

function ModeGuidance({
  mode,
  onEnter,
  onUnwind,
  reducedMotion,
}: {
  mode: SceneMode
  onEnter: () => void
  onUnwind: () => void
  reducedMotion: boolean
}) {
  if (mode === 'home') return null

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
        <span>Focus stable. Replay can begin.</span>
        <button type="button" onClick={onUnwind}>ESC / Life Map</button>
      </div>
    )
  }

  if (mode === 'replay') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-replay-guidance">
        <span>Replay breathing. ESC unwinds one layer.</span>
        <button type="button" onClick={onUnwind}>Unwind</button>
      </div>
    )
  }

  if (mode === 'mirror') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-mirror-guidance">
        <span>Mirror summary ready. ESC returns to the Life Map.</span>
        <button type="button" onClick={onUnwind}>Return</button>
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

function LifeMapControls({ activeFilter, onFilter }: { activeFilter: LifeMapFilter; onFilter: (filter: LifeMapFilter) => void }) {
  return (
    <nav className="urai-life-map-controls" data-testid="urai-life-map-controls" aria-label="Life Map filters">
      {LIFE_MAP_FILTERS.map((filter) => (
        <button key={filter.id} type="button" aria-pressed={activeFilter === filter.id} onClick={() => onFilter(filter.id)}>
          {filter.label}
        </button>
      ))}
    </nav>
  )
}

function LifeMapStatusBadges({ manifest, dataMode }: { manifest: SpatialAssetManifest | null; dataMode: 'demo' | 'live' | 'fallback' }) {
  const privacy = memoryPrivacyState(manifest)
  const source = manifest ? memorySourceType(manifest) : dataMode

  return (
    <div className="urai-life-map-status" data-testid="urai-life-map-status" aria-label="Life Map privacy and data status">
      <span>Privacy: {privacy}</span>
      <span>Data: {source}</span>
      <span>{manifest ? 'Source verified' : 'Seed constellation'}</span>
    </div>
  )
}

function FocusActionPanel({
  manifest,
  morphology,
  mode,
  onReplay,
  onMirror,
  onUnwind,
  launching,
}: {
  manifest: SpatialAssetManifest
  morphology: MemoryMorphology
  mode: SceneMode
  onReplay: () => void
  onMirror: () => void
  onUnwind: () => void
  launching: boolean
}) {
  const isReplay = mode === 'replay'
  const isMirror = mode === 'mirror'
  const summary = manifest.reflectionSummary

  return (
    <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label={isReplay ? 'Replay stream' : isMirror ? 'Mirror of Becoming' : 'Selected memory star'} tabIndex={-1}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Stream' : isMirror ? 'Mirror of Becoming' : memorySystemLabel(manifest)}</div>
      <h2>{isReplay ? 'Memory is reconstructing as atmosphere.' : memoryTitle(manifest)}</h2>
      <p>{isReplay ? morphology.poeticLine : manifest.narratorLine || 'This memory star is generated from its emotional signal profile.'}</p>
      <div className="urai-replay-shell" data-testid="urai-replay-shell" hidden={!isReplay}>
        <div className="urai-replay-shell__ring" aria-hidden="true" />
        <p>Progress · aura bloom · narrator subtitle · pause/resume controls are available without microphone capture.</p>
      </div>
      {isMirror && summary ? (
        <div className="urai-reflection-grid" data-testid="urai-mirror-reflection-grid">
          <div><strong>What changed</strong>{summary.changed}</div>
          <div><strong>What repeated</strong>{summary.repeated}</div>
          <div><strong>What healed</strong>{summary.healed}</div>
          <div><strong>What still needs attention</strong>{summary.needsAttention}</div>
        </div>
      ) : null}
      {!isReplay && !isMirror ? (
        <p><strong>Why this appeared:</strong> {manifest.whyThisAppeared || 'This manifest passed validation and is part of the current Life Map constellation.'}</p>
      ) : null}
      <div className="urai-focus-action-panel__actions">
        {!isReplay ? (
          <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay} disabled={launching || !memoryReplayReady(manifest)}>
            {launching ? 'Opening Memory...' : memoryReplayReady(manifest) ? 'Replay Memory' : 'Replay Pending'}
          </button>
        ) : null}
        {!isMirror ? <button type="button" onClick={onMirror}>Open Mirror</button> : null}
        <button type="button" onClick={onUnwind}>{isReplay ? 'Unwind to Focus' : 'Return to Life Map'}</button>
      </div>
    </section>
  )
}

function FocusEmptyPanel({ mode, loading, onLifeMap }: { mode: SceneMode; loading: boolean; onLifeMap: () => void }) {
  const isReplay = mode === 'replay'

  return (
    <section className="urai-focus-action-panel urai-focus-action-panel--empty" data-testid="urai-focus-empty-panel" aria-label={isReplay ? 'Replay preparing' : 'Focus preparing'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Preparing' : 'Focus Preparing'}</div>
      <h2>{loading ? 'Opening memory star...' : 'Demo memory star ready'}</h2>
      <p>
        {loading
          ? 'URAI is opening the selected spatial memory. If private data is unavailable, the demo star will remain visible.'
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
  const modeNeedsManifest = sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror'
  const effectiveManifestId = modeNeedsManifest ? (manifestId ?? DEMO_FOCUS_MANIFEST_ID) : manifestId
  const isHomeMode = sceneMode === 'home'
  const isAscentMode = sceneMode === 'ascent'
  const isConstellationRoute = sceneMode === 'life-map' || sceneMode === 'demo' || params.get('mode') === 'constellation'
  const showHomeWorld = isHomeMode
  const showAscentPortal = isAscentMode
  const showConstellation = isConstellationRoute && !gateBlocksMode
  const showOrb = sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror'
  const { manifest, loading: manifestLoading } = useManifest(gateBlocksMode ? null : effectiveManifestId)
  const [selectedManifest, setSelectedManifest] = useState<SpatialAssetManifest | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [narratorContext, setNarratorContext] = useState<NarratorContext>('arrival')
  const [cameraResetSignal, setCameraResetSignal] = useState(0)
  const [replayLaunching, setReplayLaunching] = useState(false)
  const [activeFilter, setActiveFilter] = useState<LifeMapFilter>('timeline')
  const activeManifest = gateBlocksMode ? null : selectedManifest ?? manifest
  const activeManifestId = selectedManifest?.manifestId ?? activeManifest?.manifestId ?? effectiveManifestId

  const memoryMorphology = useMemo(
    () => buildMemoryMorphology(activeManifest, sceneMode === 'replay' ? 'focus' : 'recovery'),
    [activeManifest, sceneMode],
  )

  const orbState = useMemo(
    () =>
      orbStateForContext({
        context: narratorContext,
        hasSelectedManifest: Boolean(activeManifest) || Boolean(selectedManifest) || sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror',
        sceneMode,
      }),
    [activeManifest, narratorContext, selectedManifest, sceneMode],
  )

  const cameraPath = useMemo(
    () =>
      cameraPathForState({
        hasFocus: Boolean(selectedPosition) || sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror' || isAscentMode,
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

  const unwind = useCallback(() => {
    setReplayLaunching(false)

    if (selectedManifest && sceneMode !== 'focus' && sceneMode !== 'replay' && sceneMode !== 'mirror') {
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

    if (sceneMode === 'focus' || sceneMode === 'mirror') {
      router.push('/life-map')
      return
    }

    if (sceneMode === 'life-map' || sceneMode === 'ascent') router.push('/')
  }, [activeManifestId, resetCamera, router, sceneMode, selectedManifest])

  const startReplay = useCallback(() => {
    if (replayLaunching) return

    setReplayLaunching(true)

    if (reducedMotion) {
      router.push(manifestReplayHref(activeManifestId))
      return
    }

    window.setTimeout(() => router.push(manifestReplayHref(activeManifestId)), REPLAY_LAUNCH_DELAY_MS)
  }, [activeManifestId, reducedMotion, replayLaunching, router])

  const openMirror = useCallback(() => {
    router.push(manifestMirrorHref(activeManifestId))
  }, [activeManifestId, router])

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
    else if (sceneMode === 'replay') setNarratorContext('return')
    else if (sceneMode === 'mirror') setNarratorContext('return')
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
  const showMemoryArtifact = !gateBlocksMode && (sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'mirror')
  const showLifeMapHud = !isHomeMode && !isAscentMode
  const narratorFallback = activeManifest?.narratorLine || (sceneMode === 'life-map' ? `Filter: ${activeFilter}. Choose a star to open Focus.` : 'URAI narrator text is available. Voice stays off until enabled.')

  return (
    <div
      className="urai-scene-stage"
      data-testid="urai-scene-stage"
      data-scene-mode={sceneMode}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-replay-launching={replayLaunching ? 'true' : 'false'}
      data-life-map-filter={activeFilter}
      onClick={isHomeMode ? enterLifeMap : undefined}
    >
      <LifeMapAaaStyles />
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
      {showLifeMapHud ? <LifeMapStatusBadges manifest={activeManifest} dataMode={activeManifest ? memorySourceType(activeManifest) === 'seed' ? 'demo' : 'live' : 'fallback'} /> : null}
      {isConstellationRoute ? <LifeMapControls activeFilter={activeFilter} onFilter={setActiveFilter} /> : null}

      {!isHomeMode ? <ModeGuidance mode={sceneMode} onEnter={enterLifeMap} onUnwind={unwind} reducedMotion={reducedMotion} /> : null}

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
        <FocusActionPanel manifest={activeManifest} morphology={memoryMorphology} mode={sceneMode} onReplay={startReplay} onMirror={openMirror} onUnwind={unwind} launching={replayLaunching} />
      ) : null}

      {showEmptyFocusPanel ? <FocusEmptyPanel mode={sceneMode} loading={manifestLoading} onLifeMap={openLifeMap} /> : null}
      {!isHomeMode ? <NarratorHud fallbackLine={narratorFallback} /> : null}
    </div>
  )
}
