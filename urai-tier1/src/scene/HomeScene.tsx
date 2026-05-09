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
import { REPLAY_DURATION_MS, clampReplayProgress, getReplayPhaseDefinition, getReplaySegmentAt, resolveReplayPhase } from '../spatial/scene/replayState'
import { ReplayTimeline } from '../spatial/replay/ReplayTimeline'
import { ReplayMetaPanel } from '../spatial/replay/ReplayMetaPanel'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'

type RelatedFocusNode = {
  id: string
  label: string
  detail: string
  cue: string
}

const ASCENT_DURATION_MS = 1800
const REPLAY_LAUNCH_DELAY_MS = 720
const FOCUS_RECENTER_DURATION_MS = 520
const REPLAY_TICK_MS = 100

const RELATED_FOCUS_NODES: RelatedFocusNode[] = [
  {
    id: 'boundary-context',
    label: 'Boundary context',
    detail: 'Shows where this memory sits against the outer privacy and readiness boundary.',
    cue: 'Boundary 75%',
  },
  {
    id: 'readiness-context',
    label: 'Replay readiness',
    detail: 'Confirms whether the selected memory is stable enough to become replay atmosphere.',
    cue: 'Readiness 87%',
  },
  {
    id: 'emotion-context',
    label: 'Emotional signal',
    detail: 'Keeps the strongest emotional signal visible without turning Focus into full detail reading.',
    cue: 'Intensity 68%',
  },
]

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
    const guidance = canReplay
      ? reducedMotion
        ? 'Focus ready. Reduced motion keeps the field still.'
        : 'Focus stable. Replay can begin.'
      : focusDefinition?.userVisibleUi ?? 'Focus is preparing.'

    return (
      <div className="urai-spatial-guidance" data-testid="urai-focus-guidance" aria-live="polite">
        <span>{guidance}</span>
        <button type="button" onClick={onUnwind}>ESC / Life Map</button>
      </div>
    )
  }

  if (mode === 'replay') {
    return (
      <div className="urai-spatial-guidance" data-testid="urai-replay-guidance">
        <span>{reducedMotion ? 'Replay opened without travel motion.' : 'Ready · Esc returns to Focus'}</span>
        <button type="button" onClick={onSafeUnwind}>Return to Focus</button>
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

function CameraResetButton({ onReset, disabled }: { onReset: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      className="urai-camera-reset"
      data-testid="urai-camera-reset"
      aria-label="Recenter spatial camera"
      onClick={onReset}
      disabled={disabled}
    >
      Recenter memory
    </button>
  )
}

function FocusContextRail({
  nodes,
  activeNodeId,
  selectedNodeId,
  onPreview,
  onSelect,
}: {
  nodes: RelatedFocusNode[]
  activeNodeId: string | null
  selectedNodeId: string | null
  onPreview: (nodeId: string | null) => void
  onSelect: (nodeId: string) => void
}) {
  const activeNode = nodes.find((node) => node.id === activeNodeId || node.id === selectedNodeId) ?? nodes[0]

  return (
    <section
      className="urai-focus-action-panel urai-focus-context-rail"
      data-testid="urai-focus-context-rail"
      aria-label="Related memory context"
      style={{ left: 22, right: 'auto', bottom: 82, width: 'min(330px, calc(100vw - 44px))' }}
    >
      <div className="urai-focus-action-panel__eyebrow">Related Memory Context</div>
      <h2>{activeNode.label}</h2>
      <p>{activeNode.detail}</p>
      <div className="urai-focus-action-panel__actions" role="list" aria-label="Preview related memory nodes">
        {nodes.map((node, index) => {
          const isActive = node.id === activeNodeId || node.id === selectedNodeId

          return (
            <button
              key={node.id}
              type="button"
              role="listitem"
              data-testid={`urai-focus-related-node-${node.id}`}
              aria-pressed={isActive}
              aria-label={`${node.label}: ${node.detail}`}
              onPointerEnter={() => onPreview(node.id)}
              onFocus={() => onPreview(node.id)}
              onPointerLeave={() => onPreview(null)}
              onBlur={() => onPreview(null)}
              onClick={() => onSelect(node.id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return

                event.preventDefault()
                const offset = event.key === 'ArrowRight' ? 1 : -1
                const nextIndex = (index + offset + nodes.length) % nodes.length
                const next = document.querySelector<HTMLButtonElement>(`[data-testid="urai-focus-related-node-${nodes[nextIndex].id}"]`)
                next?.focus()
              }}
            >
              {node.cue}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function FocusDetailPanel({
  morphology,
  selectedContext,
  onClose,
  onReplay,
}: {
  morphology: MemoryMorphology
  selectedContext: RelatedFocusNode | null
  onClose: () => void
  onReplay: () => void
}) {
  return (
    <section
      className="urai-focus-action-panel urai-focus-detail-panel"
      data-testid="urai-focus-detail-panel"
      aria-label="Selected memory detail"
      aria-modal="false"
      style={{ right: 22, top: 92, bottom: 'auto', width: 'min(420px, calc(100vw - 44px))' }}
    >
      <div className="urai-focus-action-panel__eyebrow">Selected Memory Detail</div>
      <h2>{morphology.title}</h2>
      <p>{morphology.poeticLine}</p>
      {selectedContext ? <p>{selectedContext.label}: {selectedContext.detail}</p> : null}
      <div className="urai-focus-action-panel__actions">
        <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay}>Start Replay</button>
        <button type="button" onClick={onClose}>Close Detail</button>
      </div>
    </section>
  )
}

function FocusActionPanel({
  morphology,
  mode,
  onReplay,
  onDetail,
  onUnwind,
  launching,
  focusDefinition,
}: {
  morphology: MemoryMorphology
  mode: SceneMode
  onReplay: () => void
  onDetail: () => void
  onUnwind: () => void
  launching: boolean
  focusDefinition: FocusPhaseDefinition
}) {
  const isReplay = mode === 'replay'
  const canStartReplay = !isReplay && focusDefinition.allowedActions.includes('start_replay')
  const canOpenDetail = !isReplay && focusDefinition.allowedActions.includes('open_detail')

  return (
    <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label={isReplay ? 'Replay stream' : 'Selected memory focus'}>
      <div className="urai-focus-action-panel__eyebrow">{isReplay ? 'Replay Stream' : focusDefinition.label}</div>
      <h2>{isReplay ? 'Memory is reconstructing as atmosphere.' : morphology.title}</h2>
      <p>{isReplay ? morphology.poeticLine : focusDefinition.userVisibleUi}</p>
      <div className="urai-focus-action-panel__actions">
        {!isReplay ? (
          <button type="button" className="urai-focus-action-panel__primary" onClick={onReplay} disabled={launching || !canStartReplay}>
            {launching ? 'Opening Memory...' : 'Start Replay'}
          </button>
        ) : null}
        {!isReplay ? (
          <button type="button" onClick={onDetail} disabled={!canOpenDetail}>Open Detail</button>
        ) : null}
        <button type="button" onClick={onUnwind}>{isReplay ? 'Return to Focus' : 'Back to Life Map'}</button>
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
      <h2>{loading ? 'Opening memory star...' : 'No memory selected'}</h2>
      <p>
        {loading
          ? focusDefinition.userVisibleUi
          : 'Focus needs a selected memory. Return to the Life Map to choose one visible star.'}
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
  focusDefinition,
}: {
  featureId: SpatialFeatureId
  loading: boolean
  reasons: string[]
  requiredTier?: string
  fallbackFeatureId?: SpatialFeatureId
  onPreview: () => void
  focusDefinition?: FocusPhaseDefinition
}) {
  const title = loading ? 'Checking spatial access...' : focusDefinition?.label ?? 'Personal Life Map is locked'
  const body = loading
    ? focusDefinition?.userVisibleUi ?? 'URAI is checking your tier, consent, and feature flags before opening this personal spatial layer.'
    : `This feature (${featureId}) requires ${requiredTier ?? 'a higher tier'} or additional consent. Fallback: ${fallbackFeatureId ?? 'spatial.starfield.preview'}. ${
        reasons.length ? `Reason: ${reasons.join(', ')}.` : ''
      }`

  return (
    <section className="urai-focus-action-panel urai-focus-action-panel--locked" data-testid="urai-tier-gate-panel" aria-label="Spatial feature locked">
      <div className="urai-focus-action-panel__eyebrow">Focus Access</div>
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
  const [focusRecentering, setFocusRecentering] = useState(false)
  const [hoveredRelatedNodeId, setHoveredRelatedNodeId] = useState<string | null>(null)
  const [selectedRelatedNodeId, setSelectedRelatedNodeId] = useState<string | null>(RELATED_FOCUS_NODES[0]?.id ?? null)
  const [focusDetailOpen, setFocusDetailOpen] = useState(false)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replayProgressMs, setReplayProgressMs] = useState(0)
  const [replayScrubbing, setReplayScrubbing] = useState(false)
  const activeManifest = gateBlocksMode ? null : selectedManifest ?? manifest
  const activeManifestId = selectedManifest?.manifestId ?? activeManifest?.manifestId ?? effectiveManifestId

  const selectedRelatedNode = useMemo(
    () => RELATED_FOCUS_NODES.find((node) => node.id === selectedRelatedNodeId) ?? null,
    [selectedRelatedNodeId],
  )

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
        isRecentering: focusRecentering,
        isHoveringNode: Boolean(hoveredRelatedNodeId),
        isDetailOpen: focusDetailOpen,
      }),
    [activeManifest, focusDetailOpen, focusRecentering, gatedFeatureId, gate.allowed, gate.loading, hoveredRelatedNodeId, manifestLoading, replayLaunching, sceneMode, selectedManifest],
  )

  const focusDefinition = useMemo(() => getFocusPhaseDefinition(focusPhase), [focusPhase])
  const canRecenterFocus = focusDefinition.allowedActions.includes('recenter_focus')

  const replayPhase = useMemo(
    () =>
      resolveReplayPhase({
        mode: sceneMode,
        hasReplayTarget: Boolean(activeManifest),
        isManifestLoading: manifestLoading,
        isGateLoading: gate.loading,
        isGateBlocked: Boolean(gatedFeatureId) && !gate.allowed,
        isPlaying: replayPlaying,
        isScrubbing: replayScrubbing,
        progressMs: replayProgressMs,
        durationMs: REPLAY_DURATION_MS,
      }),
    [activeManifest, gatedFeatureId, gate.allowed, gate.loading, manifestLoading, replayPlaying, replayProgressMs, replayScrubbing, sceneMode],
  )

  const replayDefinition = useMemo(() => getReplayPhaseDefinition(replayPhase), [replayPhase])
  const replaySegment = useMemo(() => getReplaySegmentAt(replayProgressMs), [replayProgressMs])

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
    if (!canRecenterFocus && sceneMode === 'focus') return

    setFocusRecentering(true)
    setCameraResetSignal((value) => value + 1)

    if (reducedMotion) {
      setFocusRecentering(false)
      return
    }

    window.setTimeout(() => setFocusRecentering(false), FOCUS_RECENTER_DURATION_MS)
  }, [canRecenterFocus, reducedMotion, sceneMode])

  const enterLifeMap = useCallback(() => {
    if (sceneMode === 'home') router.push('/ascent')
    if (sceneMode === 'ascent') router.push('/life-map')
  }, [router, sceneMode])

  const openLifeMap = useCallback(() => router.push('/life-map'), [router])
  const openPreviewMap = useCallback(() => router.push('/demo/life-map'), [router])
  const openSafeUnwind = useCallback(() => router.push('/unwind'), [router])

  const unwind = useCallback(() => {
    setReplayLaunching(false)
    setReplayPlaying(false)
    setReplayScrubbing(false)

    if (focusDetailOpen) {
      setFocusDetailOpen(false)
      return
    }

    if (selectedManifest) {
      setSelectedManifest(null)
      setSelectedPosition(null)
      setSelectedRelatedNodeId(RELATED_FOCUS_NODES[0]?.id ?? null)
      setHoveredRelatedNodeId(null)
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
  }, [activeManifestId, focusDetailOpen, resetCamera, router, sceneMode, selectedManifest])

  const startReplay = useCallback(() => {
    if (replayLaunching || !focusDefinition.allowedActions.includes('start_replay')) return

    setReplayLaunching(true)

    if (reducedMotion) {
      router.push(manifestReplayHref(activeManifestId))
      return
    }

    window.setTimeout(() => router.push(manifestReplayHref(activeManifestId)), REPLAY_LAUNCH_DELAY_MS)
  }, [activeManifestId, focusDefinition.allowedActions, reducedMotion, replayLaunching, router])

  const openFocusDetail = useCallback(() => {
    if (!focusDefinition.allowedActions.includes('open_detail')) return
    setFocusDetailOpen(true)
  }, [focusDefinition.allowedActions])

  const toggleReplayPlayback = useCallback(() => {
    if (replayPhase === 'loading_replay' || replayPhase === 'replay_empty' || replayPhase === 'replay_error') return
    if (replayPhase === 'replay_complete') setReplayProgressMs(0)
    setReplayPlaying((value) => !value)
  }, [replayPhase])

  const scrubReplay = useCallback((nextProgressMs: number) => {
    setReplayScrubbing(true)
    setReplayProgressMs(clampReplayProgress(nextProgressMs, REPLAY_DURATION_MS))
    window.setTimeout(() => setReplayScrubbing(false), reducedMotion ? 0 : 120)
  }, [reducedMotion])

  function handleSelect(manifest: SpatialAssetManifest, position: ConstellationNodePosition) {
    router.push(`/focus?manifestId=${encodeURIComponent(manifest.manifestId)}`)
    setReplayLaunching(false)
    setReplayPlaying(false)
    setReplayProgressMs(0)
    setFocusDetailOpen(false)
    setSelectedRelatedNodeId(RELATED_FOCUS_NODES[0]?.id ?? null)
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
    setFocusDetailOpen(false)
    setHoveredRelatedNodeId(null)

    if (selectedManifest) setNarratorContext('return')
    else if (sceneMode === 'focus') setNarratorContext('arrival')
    else if (sceneMode === 'replay' || sceneMode === 'unwind') setNarratorContext('return')
    else if (sceneMode === 'ascent') setNarratorContext('explore')
    else if (isConstellationRoute) setNarratorContext('explore')
    else setNarratorContext('arrival')
  }, [selectedManifest, isConstellationRoute, sceneMode])

  useEffect(() => {
    if (sceneMode !== 'replay') {
      setReplayPlaying(false)
      setReplayProgressMs(0)
      setReplayScrubbing(false)
    }
  }, [sceneMode])

  useEffect(() => {
    if (sceneMode !== 'replay' || !replayPlaying || reducedMotion) return

    const interval = window.setInterval(() => {
      setReplayProgressMs((value) => {
        const nextValue = clampReplayProgress(value + REPLAY_TICK_MS, REPLAY_DURATION_MS)
        if (nextValue >= REPLAY_DURATION_MS) setReplayPlaying(false)
        return nextValue
      })
    }, REPLAY_TICK_MS)

    return () => window.clearInterval(interval)
  }, [reducedMotion, replayPlaying, sceneMode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') unwind()
      if (event.key.toLowerCase() === 'r' && !isHomeMode) resetCamera()
      if (event.key === ' ' && sceneMode === 'replay') {
        event.preventDefault()
        toggleReplayPlayback()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isHomeMode, resetCamera, sceneMode, toggleReplayPlayback, unwind])

  const showFocusPanel = sceneMode !== 'replay' && Boolean(activeManifest) && (Boolean(selectedManifest) || modeNeedsManifest)
  const showReplayPanel = sceneMode === 'replay' && Boolean(activeManifest) && !gateBlocksMode
  const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest
  const showMemoryArtifact = !gateBlocksMode && (sceneMode === 'focus' || sceneMode === 'replay')
  const showFocusContextRail = sceneMode === 'focus' && showFocusPanel && activeManifest && !focusDetailOpen

  return (
    <div
      className="urai-scene-stage"
      data-testid="urai-scene-stage"
      data-scene-mode={sceneMode}
      data-focus-phase={focusPhase}
      data-replay-phase={replayPhase}
      data-replay-segment={replaySegment.id}
      data-focus-motion={reducedMotion ? 'reduced' : 'cinematic'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-replay-launching={replayLaunching ? 'true' : 'false'}
      onClick={isHomeMode ? enterLifeMap : undefined}
    >
      <div className="urai-scene-stage__fallback" aria-hidden="true" />
      <SpatialVisualOverlay mode={sceneMode} />

      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} onPointerMissed={enterLifeMap}>
        <PerspectiveCamera makeDefault position={[0, 2.85, 8.35]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} reducedMotion={reducedMotion} resetSignal={cameraResetSignal} />

        <ambientLight intensity={isHomeMode ? 0.82 : isAscentMode ? 0.5 : sceneMode === 'focus' ? 0.22 : 0.28} color="#b8d7ff" />
        <hemisphereLight args={['#d3e7ff', '#12071e', isHomeMode ? 1.58 : 0.95]} />
        <directionalLight
          position={[-5.4, 7.4, 3.8]}
          intensity={isHomeMode ? 2.65 : sceneMode === 'focus' ? 1.55 : 1.85}
          color="#d7e6ff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={isHomeMode ? 3.15 : sceneMode === 'focus' ? 1.7 : 2.05} color="#c9b0ff" distance={7.8} />
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
      {!isHomeMode ? <CameraResetButton onReset={resetCamera} disabled={sceneMode === 'focus' && !canRecenterFocus} /> : null}

      {!isHomeMode ? <ModeGuidance mode={sceneMode} onEnter={enterLifeMap} onUnwind={unwind} onSafeUnwind={unwind} reducedMotion={reducedMotion} focusDefinition={focusDefinition} /> : null}

      {gateBlocksMode && gatedFeatureId ? (
        <TierGatePanel
          featureId={gatedFeatureId}
          loading={gate.loading}
          reasons={gate.reasons}
          requiredTier={gate.requiredTier}
          fallbackFeatureId={gate.fallbackFeatureId}
          onPreview={openPreviewMap}
          focusDefinition={sceneMode === 'focus' || sceneMode === 'replay' ? focusDefinition : undefined}
        />
      ) : null}

      {showFocusContextRail ? (
        <FocusContextRail
          nodes={RELATED_FOCUS_NODES}
          activeNodeId={hoveredRelatedNodeId}
          selectedNodeId={selectedRelatedNodeId}
          onPreview={setHoveredRelatedNodeId}
          onSelect={setSelectedRelatedNodeId}
        />
      ) : null}

      {showFocusPanel && activeManifest ? (
        <FocusActionPanel
          morphology={memoryMorphology}
          mode={sceneMode}
          onReplay={startReplay}
          onDetail={openFocusDetail}
          onUnwind={unwind}
          launching={replayLaunching}
          focusDefinition={focusDefinition}
        />
      ) : null}

      {showReplayPanel ? (
        <ReplayMetaPanel
          morphology={memoryMorphology}
          phase={replayPhase}
          phaseDefinition={replayDefinition}
          activeSegment={replaySegment}
          sourceLabel="LifeMap · Pattern Node"
          onReturnToFocus={unwind}
        />
      ) : null}

      {showReplayPanel ? (
        <ReplayTimeline
          phase={replayPhase}
          activeSegment={replaySegment}
          progressMs={replayProgressMs}
          durationMs={REPLAY_DURATION_MS}
          playing={replayPlaying}
          reducedMotion={reducedMotion}
          onPlayPause={toggleReplayPlayback}
          onScrub={scrubReplay}
        />
      ) : null}

      {focusDetailOpen && activeManifest ? (
        <FocusDetailPanel
          morphology={memoryMorphology}
          selectedContext={selectedRelatedNode}
          onClose={() => setFocusDetailOpen(false)}
          onReplay={startReplay}
        />
      ) : null}

      {showEmptyFocusPanel ? <FocusEmptyPanel mode={sceneMode} loading={manifestLoading} onLifeMap={openLifeMap} focusDefinition={focusDefinition} /> : null}
      {!isHomeMode ? <NarratorHud /> : null}
    </div>
  )
}
