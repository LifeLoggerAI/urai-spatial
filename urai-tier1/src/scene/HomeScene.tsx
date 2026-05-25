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
import LifeMapTrustLoop from '../spatial/lifemap/LifeMapTrustLoop'
import { FocusPhaseDefinition, getFocusPhaseDefinition, resolveFocusPhase } from '../spatial/scene/focusState'
import {
  REPLAY_DURATION_MS,
  clampReplayProgress,
  getReplayPhaseDefinition,
  getReplaySegmentAt,
  resolveReplayPhase,
} from '../spatial/scene/replayState'
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
  if (sceneMode === 'home') return 'idle'
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

function HomeSpatialHud({ onLifeMap, onFocus, onReplay }: { onLifeMap: () => void; onFocus: () => void; onReplay: () => void }) {
  return (
    <section className="urai-home-canon-hud" data-testid="urai-home-canon-hud" aria-label="URAI home sanctuary controls">
      <div className="urai-home-canon-hud__kicker">URAI V1 · Home Field</div>
      <h1>Private emotional universe online.</h1>
      <p>
        Sky, ground, orb, avatar mirror, memory stars, and Passport foundation are live as seeded public demo data. URAI remains private by default with no ads inside URAI.
      </p>
      <div className="urai-home-canon-hud__actions">
        <button type="button" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>Ascend to Life Map</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onFocus() }}>Open Focus Chamber</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onReplay() }}>Enter Replay Theater</button>
      </div>
      <div className="urai-home-canon-hud__privacy">Private by default · User-controlled data access · URAI Passport foundation · No ads</div>
    </section>
  )
}

function CanonicalAvatarMirror() {
  return (
    <group name="urai-embodied-silent-mirror-avatar" userData={{ testId: 'urai-embodied-silent-mirror-avatar' }} position={[0, -0.16, -3.25]}>
      <mesh position={[0, 0.98, 0]} castShadow>
        <sphereGeometry args={[0.28, 48, 48]} />
        <meshPhysicalMaterial color="#d8e8ff" emissive="#7dd3fc" emissiveIntensity={0.12} roughness={0.18} metalness={0.18} clearcoat={0.74} transparent opacity={0.86} />
      </mesh>
      <mesh position={[0, 0.32, 0]} scale={[0.46, 0.86, 0.24]} castShadow>
        <capsuleGeometry args={[0.42, 0.82, 24, 48]} />
        <meshPhysicalMaterial color="#111827" emissive="#0ea5e9" emissiveIntensity={0.08} roughness={0.2} metalness={0.62} clearcoat={0.88} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.28, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 0.72, 96]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.95, 0.32]} intensity={0.62} color="#c7d2fe" distance={4.2} />
    </group>
  )
}

function HomeMemoryLattice({ onLifeMap }: { onLifeMap: () => void }) {
  const nodes: Array<[number, number, number, number]> = [
    [-3.8, 2.7, -6.8, 0.08],
    [-2.2, 3.8, -8.2, 0.055],
    [1.7, 3.15, -7.6, 0.07],
    [3.7, 2.32, -6.6, 0.052],
    [0.1, 4.42, -9.6, 0.046],
  ]

  return (
    <group name="urai-home-memory-constellation-lattice" userData={{ testId: 'urai-home-memory-constellation-lattice' }}>
      {nodes.map(([x, y, z, radius], index) => (
        <mesh key={`home-star-${index}`} position={[x, y, z]} onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial color={index % 2 === 0 ? '#a7f3d0' : '#c4b5fd'} transparent opacity={0.92} />
        </mesh>
      ))}
      {nodes.slice(0, -1).map(([x, y, z], index) => {
        const [nx, ny, nz] = nodes[index + 1]
        const mid: [number, number, number] = [(x + nx) / 2, (y + ny) / 2, (z + nz) / 2]
        const dx = nx - x
        const dy = ny - y
        const dz = nz - z
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return (
          <mesh key={`home-line-${index}`} position={mid} rotation={[Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), Math.atan2(dx, dz), 0]}>
            <cylinderGeometry args={[0.006, 0.006, length, 8]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.22} />
          </mesh>
        )
      })}
    </group>
  )
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
              <strong>{node.label}</strong>
              <span>{node.cue}</span>
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
  const showLifeMapTrustLoop = sceneMode === 'life-map' && !gateBlocksMode
  const showOrb = isHomeMode || sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'unwind' || sceneMode === 'mirror'
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
    [activeManifest, focusDetailOpen, focusRecenting, gatedFeatureId, gate.allowed, gate.loading, hoveredRelatedNodeId, manifestLoading, replayLaunching, sceneMode, selectedManifest],
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
    // [rest unchanged]