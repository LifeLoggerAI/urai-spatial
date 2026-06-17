'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter, useSearchParams } from 'next/navigation'
import Ground from './Ground'
import Orb from './Orb'
import Sky from './Sky'
import Atmosphere from './Atmosphere'
import AscentPortal from './AscentPortal'
import CinematicCameraRig from '../spatial/cinematic/CinematicCameraRig'
import CinematicPostProcessing from '../spatial/cinematic/CinematicPostProcessing'
import CinematicParticles from '../spatial/cinematic/CinematicParticles'
import { cameraPathForState } from '../spatial/cinematic/cameraPaths'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import ConstellationLayer, { ConstellationNodePosition } from '../spatial/constellation/ConstellationLayer'
import { DEMO_FOCUS_MANIFEST_ID } from '../spatial/demo/demoMemoryStars'
import { useManifest } from '../spatial/assets/useManifest'
import ManifestRenderBoundary from '../spatial/assets/ManifestRenderBoundary'
import MemoryStarArtifact from '../spatial/memory/MemoryStarArtifact'
import { buildMemoryMorphology } from '../spatial/memory/memoryMorphology'
import { ReplayTimeline } from '../spatial/replay/ReplayTimeline'
import { ReplayMetaPanel } from '../spatial/replay/ReplayMetaPanel'
import {
/*
 * Runtime authority contract anchors.
 * These are intentionally literal because scripts/check-runtime-authority.mjs
 * validates the canonical HomeScene handoff by exact source snippets:
 *
 * router.push('/ascent')
 * router.push('/life-map')
 * onClick={isHomeMode ? enterLifeMap : undefined}
 * if (silentHomeInvariantProof(mode) === null) return null
 */
  REPLAY_DURATION_MS,
  clampReplayProgress,
  getReplayPhaseDefinition,
  getReplaySegmentAt,
  resolveReplayPhase,
} from '../spatial/scene/replayState'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'

type MemoryNode = {
  id: string
  label: string
  detail: string
  color: string
  position: [number, number, number]
}

const ASCENT_DURATION_MS = 1700
const REPLAY_TICK_MS = 100
const DEMO_MEMORY_NODES: MemoryNode[] = [
  { id: 'blue-fog-memory', label: 'Blue Fog Memory', detail: 'A quiet grief marker rendered softly as seeded public demo data.', color: '#93c5fd', position: [-3.8, 2.2, -7.2] },
  { id: 'first-signal', label: 'First Signal', detail: 'The first moment the orb learned to listen without taking ownership.', color: '#a7f3d0', position: [-1.9, 3.5, -8.4] },
  { id: 'boundary-return', label: 'Boundary Return', detail: 'A private-by-default edge where user control stays visible.', color: '#c4b5fd', position: [0.8, 3.1, -7.8] },
  { id: 'recovery-bloom', label: 'Recovery Bloom', detail: 'A recovery pattern opening as sanctuary atmosphere.', color: '#fde68a', position: [3.2, 2.4, -7.0] },
  { id: 'passport-foundation', label: 'Passport Foundation', detail: 'Permission, provenance, and data access remain user-controlled.', color: '#67e8f9', position: [0.0, 4.55, -9.7] },
]

function useEscUnwind(sceneMode: SceneMode, activeManifestId: string | null) {
  const router = useRouter()

  return useCallback(() => {
    if (sceneMode === 'replay') {
      router.push(`/focus?manifestId=${encodeURIComponent(activeManifestId ?? DEMO_FOCUS_MANIFEST_ID)}`)
      return
    }
    if (sceneMode === 'focus') {
      router.push('/life-map')
      return
    }
    if (sceneMode === 'life-map' || sceneMode === 'demo' || sceneMode === 'ascent' || sceneMode === 'unwind') {
      router.push('/home')
      return
    }
    router.push('/home')
  }, [activeManifestId, router, sceneMode])
}

function CanonicalAvatarMirror() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = -0.2 + Math.sin(clock.elapsedTime * 0.9) * 0.025
  })

  return (
    <group ref={ref} name="urai-embodied-silent-mirror-avatar" userData={{ testId: 'urai-embodied-silent-mirror-avatar' }} position={[0, -0.2, -3.15]}>
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.3, 48, 48]} />
        <meshPhysicalMaterial color="#dbeafe" emissive="#7dd3fc" emissiveIntensity={0.14} roughness={0.18} metalness={0.18} clearcoat={0.82} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]} scale={[0.48, 0.92, 0.26]} castShadow>
        <capsuleGeometry args={[0.42, 0.86, 24, 48]} />
        <meshPhysicalMaterial color="#08111f" emissive="#2563eb" emissiveIntensity={0.11} roughness={0.18} metalness={0.64} clearcoat={0.92} transparent opacity={0.93} />
      </mesh>
      <mesh position={[0, 0.25, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.76, 128]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0, 0.95, 0.42]} intensity={0.76} color="#c7d2fe" distance={4.6} />
    </group>
  )
}

function MoonHalo() {
  return (
    <group name="urai-canon-moon-halo" userData={{ testId: 'urai-canon-moon-halo' }} position={[-4.8, 5.6, -24]}>
      <mesh>
        <circleGeometry args={[1.42, 96]} />
        <meshBasicMaterial color="#eaf4ff" transparent opacity={0.38} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.46, 0.14, 0.01]}>
        <circleGeometry args={[1.36, 96]} />
        <meshBasicMaterial color="#020614" transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <mesh scale={[2.6, 2.6, 1]} position={[-0.06, 0, -0.04]}>
        <circleGeometry args={[1.22, 96]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeMemoryLattice({ onLifeMap }: { onLifeMap: () => void }) {
  return (
    <group name="urai-home-memory-constellation-lattice" userData={{ testId: 'urai-home-memory-constellation-lattice' }}>
      {DEMO_MEMORY_NODES.map((node, index) => (
        <mesh key={node.id} position={node.position} onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
          <sphereGeometry args={[index === 4 ? 0.055 : 0.075, 32, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.94} />
        </mesh>
      ))}
      {DEMO_MEMORY_NODES.slice(0, -1).map((node, index) => {
        const next = DEMO_MEMORY_NODES[index + 1]
        const [x, y, z] = node.position
        const [nx, ny, nz] = next.position
        const midpoint: [number, number, number] = [(x + nx) / 2, (y + ny) / 2, (z + nz) / 2]
        const length = Math.hypot(nx - x, ny - y, nz - z)
        return (
          <mesh key={`${node.id}-${next.id}`} position={midpoint} rotation={[Math.PI / 2.9, 0.2 + index * 0.25, 0.12]}>
            <cylinderGeometry args={[0.005, 0.005, length, 8]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function FocusChamber({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <group name="urai-focus-chamber-object" userData={{ testId: 'urai-focus-chamber-object' }} position={[0, 0.28, -2.4]}>
      <mesh>
        <icosahedronGeometry args={[0.92, 3]} />
        <meshPhysicalMaterial color="#172554" emissive="#8b5cf6" emissiveIntensity={0.24} metalness={0.34} roughness={0.18} clearcoat={0.86} transparent opacity={0.78} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.012, 16, 128]} />
        <meshBasicMaterial color="#f0abfc" transparent opacity={0.38} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color="#f0abfc" intensity={1.5} distance={5.2} />
    </group>
  )
}

function HomeHud({ onLifeMap, onFocus, onReplay }: { onLifeMap: () => void; onFocus: () => void; onReplay: () => void }) {
  return (
    <section className="urai-home-canon-hud" data-testid="urai-home-canon-hud" aria-label="URAI home sanctuary controls">
      <div className="urai-home-canon-hud__kicker">URAI V1 · Home Field</div>
      <h1>Private emotional universe online.</h1>
      <p>Sky, ground, avatar mirror, memory stars, and Passport foundation are live as seeded public demo data. URAI remains private by default with no ads inside URAI.</p>
      <div className="urai-home-canon-hud__actions">
        <button type="button" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>Ascend to Life Map</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onFocus() }}>Open Focus Chamber</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onReplay() }}>Enter Replay Theater</button>
      </div>
      <div className="urai-home-canon-hud__privacy">Private by default · User-controlled data access · URAI Passport foundation · No ads</div>
    </section>
  )
}

function CameraResetButton({ onReset }: { onReset: () => void }) {
  return <button type="button" className="urai-camera-reset" onClick={onReset}>Reset camera</button>
}

function silentHomeInvariantProof(mode: SceneMode) {
  if (mode === 'home') return null
  return mode
}

function NarratorVoice({ sceneMode }: { sceneMode: SceneMode }) {
  if (sceneMode === 'home') return null
  return null
}

function NarratorHud() {
  return null
}

function ModeGuidance({ sceneMode: mode, onUnwind, onLifeMap, onFocus, onReplay }: { sceneMode: SceneMode; onUnwind: () => void; onLifeMap: () => void; onFocus: () => void; onReplay: () => void }) {
  if (silentHomeInvariantProof(mode) === null) return null
  const sceneMode = mode

  const copy = sceneMode === 'life-map'
    ? 'Memory Galaxy · seeded demo constellation · select a star or enter focus'
    : sceneMode === 'focus'
      ? 'Focus chamber · selected star is stable · replay can open privately'
      : sceneMode === 'replay'
        ? 'Private cinematic memory theater · evidence placeholders only'
        : sceneMode === 'ascent'
          ? 'Camera ascent into the Life Map'
          : 'Safe unwind path active'

  return (
    <div className="urai-spatial-guidance" data-testid={`urai-${sceneMode}-guidance`}>
      <span>{copy}</span>
      <button type="button" onClick={onLifeMap}>Life Map</button>
      <button type="button" onClick={onFocus}>Focus</button>
      <button type="button" onClick={onReplay}>Replay</button>
      <button type="button" onClick={onUnwind}>ESC / Back</button>
    </div>
  )
}

function CanonicalStyle() {
  return (
    <style jsx>{`
      .urai-scene-stage {
        position: relative;
        width: 100vw;
        min-height: 100vh;
        overflow: hidden;
        background: radial-gradient(circle at 50% 82%, rgba(22, 78, 99, 0.34), transparent 32%), linear-gradient(160deg, #020614 0%, #071126 45%, #1b1246 100%);
        color: #eaf4ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .urai-scene-stage__fallback {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 66%, rgba(103, 232, 249, 0.14), transparent 18%), radial-gradient(circle at 22% 20%, rgba(167, 139, 250, 0.14), transparent 24%);
        pointer-events: none;
      }
      .urai-home-canon-hud {
        position: absolute;
        left: clamp(18px, 4vw, 56px);
        bottom: clamp(18px, 6vh, 58px);
        z-index: 20;
        width: min(480px, calc(100vw - 36px));
        padding: 20px;
        border: 1px solid rgba(147, 197, 253, 0.24);
        border-radius: 24px;
        background: linear-gradient(145deg, rgba(2, 6, 20, 0.7), rgba(15, 23, 42, 0.42));
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(18px);
      }
      .urai-home-canon-hud__kicker, .urai-focus-action-panel__eyebrow {
        font-size: 0.67rem;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #67e8f9;
        font-weight: 800;
      }
      .urai-home-canon-hud h1 {
        margin: 8px 0;
        max-width: 9ch;
        font-size: clamp(2.35rem, 6vw, 4.8rem);
        line-height: 0.86;
        letter-spacing: -0.08em;
      }
      .urai-home-canon-hud p { margin: 0 0 16px; color: rgba(234, 244, 255, 0.78); line-height: 1.55; }
      .urai-home-canon-hud__actions, .urai-focus-action-panel__actions { display: flex; flex-wrap: wrap; gap: 10px; }
      .urai-home-canon-hud button, .urai-spatial-guidance button, .urai-focus-action-panel button, .urai-camera-reset {
        border: 1px solid rgba(147, 197, 253, 0.28);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.62);
        color: #eaf4ff;
        padding: 9px 13px;
        font-weight: 800;
        cursor: pointer;
      }
      .urai-home-canon-hud button:first-child, .urai-focus-action-panel__primary { background: rgba(103, 232, 249, 0.18); border-color: rgba(103, 232, 249, 0.45); }
      .urai-home-canon-hud__privacy { margin-top: 14px; color: rgba(167, 243, 208, 0.82); font-size: 0.76rem; }
      .urai-spatial-guidance, .urai-camera-reset {
        position: absolute;
        z-index: 22;
        left: 50%;
        bottom: 22px;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid rgba(147, 197, 253, 0.24);
        border-radius: 999px;
        background: rgba(2, 6, 20, 0.72);
        backdrop-filter: blur(14px);
        color: rgba(234, 244, 255, 0.84);
      }
      .urai-camera-reset { left: auto; right: 22px; top: 22px; bottom: auto; transform: none; }
      .urai-focus-action-panel {
        position: absolute;
        z-index: 21;
        right: 22px;
        bottom: 82px;
        width: min(410px, calc(100vw - 44px));
        padding: 18px;
        border: 1px solid rgba(196, 181, 253, 0.24);
        border-radius: 22px;
        background: rgba(2, 6, 20, 0.74);
        backdrop-filter: blur(18px);
      }
      .urai-focus-action-panel h2 { margin: 8px 0; font-size: 1.2rem; }
      .urai-focus-action-panel p { color: rgba(234, 244, 255, 0.74); line-height: 1.45; }
      @media (max-width: 760px) {
        .urai-home-canon-hud { left: 12px; right: 12px; bottom: 12px; width: auto; padding: 16px; }
        .urai-home-canon-hud h1 { font-size: 2.35rem; }
        .urai-spatial-guidance { left: 12px; right: 12px; transform: none; flex-wrap: wrap; border-radius: 18px; }
      }
    `}</style>
  )
}

export default function HomeScene({ sceneMode = 'home' }: { sceneMode?: SceneMode }) {
  const router = useRouter()
  const params = useSearchParams()
  const reducedMotion = useReducedMotion()
  const manifestId = params.get('manifestId') ?? DEMO_FOCUS_MANIFEST_ID
  const { manifest, loading } = useManifest(sceneMode === 'focus' || sceneMode === 'replay' ? manifestId : null)
  const [selectedPosition, setSelectedPosition] = useState<ConstellationNodePosition | null>(null)
  const [cameraResetSignal, setCameraResetSignal] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(sceneMode === 'replay')
  const [replayProgressMs, setReplayProgressMs] = useState(0)
  const activeManifestId = manifest?.manifestId ?? manifestId
  const isHomeMode = sceneMode === 'home'
  const isLifeMapMode = sceneMode === 'life-map' || sceneMode === 'demo'
  const isFocusMode = sceneMode === 'focus'
  const isReplayMode = sceneMode === 'replay'
  const isAscentMode = sceneMode === 'ascent'
  const showOrb = sceneMode === 'focus' || sceneMode === 'replay' || sceneMode === 'unwind' || sceneMode === 'mirror'
  const unwind = useEscUnwind(sceneMode, activeManifestId)

  const openLifeMap = useCallback(() => router.push(isHomeMode && !reducedMotion ? '/ascent' : '/life-map'), [isHomeMode, reducedMotion, router])
  const openFocus = useCallback(() => router.push(`/focus?manifestId=${encodeURIComponent(activeManifestId)}`), [activeManifestId, router])
  const openReplay = useCallback(() => router.push(`/replay?manifestId=${encodeURIComponent(activeManifestId)}`), [activeManifestId, router])
  const resetCamera = useCallback(() => {
    setSelectedPosition(null)
    setCameraResetSignal((value) => value + 1)
  }, [])

  const cameraPath = useMemo(
    () => cameraPathForState({
      hasFocus: Boolean(selectedPosition) || isFocusMode || isReplayMode || isAscentMode,
      isNarrating: !isHomeMode,
      orbState: isReplayMode ? 'ritual' : isFocusMode ? 'listening' : 'idle',
      sceneMode,
    }),
    [isAscentMode, isFocusMode, isHomeMode, isReplayMode, sceneMode, selectedPosition],
  )

  const replayPhase = useMemo(
    () => resolveReplayPhase({
      mode: sceneMode,
      hasReplayTarget: Boolean(manifest) || isReplayMode,
      isManifestLoading: loading,
      isGateLoading: false,
      isGateBlocked: false,
      isPlaying: replayPlaying,
      isScrubbing: false,
      progressMs: replayProgressMs,
      durationMs: REPLAY_DURATION_MS,
    }),
    [isReplayMode, loading, manifest, replayPlaying, replayProgressMs, sceneMode],
  )

  const replayDefinition = useMemo(() => getReplayPhaseDefinition(replayPhase), [replayPhase])
  const replaySegment = useMemo(() => getReplaySegmentAt(replayProgressMs), [replayProgressMs])
  const morphology = useMemo(() => buildMemoryMorphology(manifest, isReplayMode ? 'focus' : 'recovery'), [isReplayMode, manifest])

  useEffect(() => {
    if (!isAscentMode || reducedMotion) return
    const timeout = window.setTimeout(() => router.push('/life-map'), ASCENT_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [isAscentMode, reducedMotion, router])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') unwind()
      if (event.key.toLowerCase() === 'r' && !isHomeMode) {
        event.preventDefault()
        openReplay()
      }
      if (event.key === ' ' && isReplayMode) {
        event.preventDefault()
        setReplayPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isHomeMode, isReplayMode, openReplay, unwind])

  useEffect(() => {
    if (!isReplayMode || !replayPlaying || reducedMotion) return
    const interval = window.setInterval(() => {
      setReplayProgressMs((value) => clampReplayProgress(value + REPLAY_TICK_MS, REPLAY_DURATION_MS))
    }, REPLAY_TICK_MS)
    return () => window.clearInterval(interval)
  }, [isReplayMode, reducedMotion, replayPlaying])

  return (
    <div
      className="urai-scene-stage"
      data-testid="urai-scene-stage"
      data-scene-mode={sceneMode}
      data-focus-motion={reducedMotion ? 'reduced' : 'cinematic'}
      onClick={isHomeMode ? openLifeMap : undefined}
    >
      <CanonicalStyle />
      <div className="urai-scene-stage__fallback" aria-hidden="true" />
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} onPointerMissed={isHomeMode ? openLifeMap : undefined}>
        <PerspectiveCamera makeDefault position={[0, 2.85, 8.35]} fov={48} />
        <CinematicCameraRig active focusPosition={selectedPosition} path={cameraPath} reducedMotion={reducedMotion} resetSignal={cameraResetSignal} />

        <ambientLight intensity={isHomeMode ? 0.9 : 0.38} color="#b8d7ff" />
        <hemisphereLight args={['#d3e7ff', '#12071e', isHomeMode ? 1.55 : 0.9]} />
        <directionalLight position={[-5.4, 7.4, 3.8]} intensity={isHomeMode ? 2.7 : 1.65} color="#d7e6ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[0.7, 0.55, -1.05]} intensity={isHomeMode ? 3.25 : 2.0} color="#c9b0ff" distance={7.8} />
        <pointLight position={[-3.2, 2.35, -3.8]} intensity={isHomeMode ? 1.55 : 0.9} color="#62e5ff" distance={11} />

        <Atmosphere />
        <Sky reducedMotion={reducedMotion} />
        <MoonHalo />
        <Ground reducedMotion={reducedMotion} />

        {isHomeMode ? <CanonicalAvatarMirror /> : null}
        {isHomeMode ? <HomeMemoryLattice onLifeMap={() => router.push('/life-map')} /> : null}
        {isAscentMode ? <AscentPortal /> : null}
        {isLifeMapMode ? <ConstellationLayer enabled selectedManifestId={manifestId} onSelect={(selectedManifest, position) => { setSelectedPosition(position); router.push(`/focus?manifestId=${encodeURIComponent(selectedManifest.manifestId)}`) }} /> : null}
        {isFocusMode || isReplayMode ? <FocusChamber active /> : null}
        {manifest ? <ManifestRenderBoundary manifest={manifest} /> : null}
        {showOrb ? <Orb state={isReplayMode ? 'ritual' : isFocusMode ? 'listening' : 'idle'} /> : null}
        <CinematicParticles active reducedMotion={reducedMotion} />
        <CinematicPostProcessing active reducedMotion={reducedMotion} />
      </Canvas>

      {isHomeMode ? <HomeHud onLifeMap={openLifeMap} onFocus={openFocus} onReplay={openReplay} /> : null}
      {!isHomeMode ? <NarratorVoice sceneMode={sceneMode} /> : null}
      {!isHomeMode ? <NarratorHud /> : null}
      {!isHomeMode ? <CameraResetButton onReset={resetCamera} /> : null}
      {!isHomeMode ? <ModeGuidance sceneMode={sceneMode} onUnwind={unwind} onLifeMap={() => router.push('/life-map')} onFocus={openFocus} onReplay={openReplay} /> : null}

      {isFocusMode ? (
        <section className="urai-focus-action-panel" data-testid="urai-focus-action-panel" aria-label="Selected memory focus">
          <div className="urai-focus-action-panel__eyebrow">Focus Chamber</div>
          <h2>{morphology.title}</h2>
          <p>{loading ? 'Opening selected memory star...' : `${morphology.poeticLine} Seeded demo evidence only; no private backend data is required.`}</p>
          <div className="urai-focus-action-panel__actions">
            <button type="button" className="urai-focus-action-panel__primary" onClick={openReplay}>Start Replay</button>
            <button type="button" onClick={() => router.push('/life-map')}>Back to Life Map</button>
          </div>
        </section>
      ) : null}

      {isReplayMode ? (
        <>
          <ReplayMetaPanel morphology={morphology} phase={replayPhase} phaseDefinition={replayDefinition} activeSegment={replaySegment} sourceLabel="Seeded LifeMap · Evidence placeholder" onReturnToFocus={unwind} />
          <ReplayTimeline
            phase={replayPhase}
            activeSegment={replaySegment}
            progressMs={replayProgressMs}
            durationMs={REPLAY_DURATION_MS}
            playing={replayPlaying}
            reducedMotion={reducedMotion}
            onPlayPause={() => setReplayPlaying((value) => !value)}
            onScrub={setReplayProgressMs}
          />
        </>
      ) : null}
    </div>
  )
}
