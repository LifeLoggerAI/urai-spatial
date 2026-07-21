'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { SelectedMemory, SelectedMemoryReplaySegment } from '@/spatial/memory/selectedMemoryContract'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { buildReplaySpatialScene, filterReplayAnchorsForTruthMode, replayEvidenceDescription, type ReplaySpatialSceneModel, type ReplayTruthMode, type ReplayWorldAnchor } from '@/spatial/replay/replaySpatialModel'

export type ReplayNavigationMode = 'guided' | 'explore'
type Props = { memory: SelectedMemory; progressMs: number; activeSegmentId: SelectedMemoryReplaySegment['id']; playing: boolean; mode: ReplayNavigationMode; reducedMotion: boolean; onModeChange: (mode: ReplayNavigationMode) => void; onAnchorSelect: (anchor: ReplayWorldAnchor | null) => void; onExit: () => void }
type CameraProps = { model: ReplaySpatialSceneModel; activeSegmentId: SelectedMemoryReplaySegment['id']; input: MovementInput; mode: ReplayNavigationMode; reducedMotion: boolean; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; walkTarget: MutableRefObject<THREE.Vector3 | null>; shellRef: MutableRefObject<HTMLDivElement | null> }
const CAMERA_HEIGHT = 1.68

function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => { try { const canvas = document.createElement('canvas'); setAvailable(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))) } catch { setAvailable(false) } }, [])
  return available
}

function ReplayCamera({ model, activeSegmentId, input, mode, reducedMotion, yaw, pitch, walkTarget, shellRef }: CameraProps) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(...model.spawn))
  const velocity = useRef(new THREE.Vector3())
  const scratch = useRef(new THREE.Vector3())
  useFrame((_, delta) => {
    if (mode === 'explore') {
      stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target: walkTarget, yaw: yaw.current, delta, speed: reducedMotion ? 2.2 : 3.15, acceleration: 11, deceleration: 13, bounds: model.bounds, obstacles: model.anchors.map((anchor) => ({ x: anchor.position[0], z: anchor.position[2], radius: anchor.kind === 'place' ? 1.25 : 0.7 })) })
      camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
      const direction = scratch.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
      camera.lookAt(direction.add(camera.position))
    } else {
      const guided = model.guidedCamera[activeSegmentId] ?? model.guidedCamera.memory
      camera.position.lerp(scratch.current.set(...guided.position), reducedMotion ? 1 : 1 - Math.exp(-delta * 2.35))
      camera.lookAt(...guided.target)
      position.current.set(camera.position.x, 0, camera.position.z)
    }
    if (shellRef.current) {
      shellRef.current.dataset.replayReady = 'true'
      shellRef.current.dataset.replayCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.replayCameraZ = camera.position.z.toFixed(3)
    }
  })
  return null
}

function ReplayScene({ model, selected, onSelect, ...cameraProps }: CameraProps & { selected: ReplayWorldAnchor | null; onSelect: (anchor: ReplayWorldAnchor | null) => void }) {
  const floorClick = (event: ThreeEvent<MouseEvent>) => { if (cameraProps.mode === 'explore' && event.delta <= 7) cameraProps.walkTarget.current = new THREE.Vector3(event.point.x, 0, event.point.z) }
  return <><color attach="background" args={['#02060c']} /><fog attach="fog" args={['#07111a', 5.5, 24]} /><ambientLight intensity={0.65} /><directionalLight position={[4, 9, 6]} intensity={1.6} castShadow /><Stars radius={52} depth={28} count={520} factor={2.1} fade speed={cameraProps.reducedMotion ? 0 : 0.025} /><ReplayCamera model={model} {...cameraProps} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.8]} receiveShadow onClick={floorClick}><planeGeometry args={[18, 18]} /><meshStandardMaterial color="#07121a" roughness={0.78} /></mesh><mesh position={[0, 3.4, -7.8]}><boxGeometry args={[16, 6.8, 0.45]} /><meshStandardMaterial color="#07131d" /></mesh>{model.anchors.map((anchor) => <group key={anchor.id} position={anchor.position} data-testid="replay-world-anchor" onClick={(event) => { event.stopPropagation(); onSelect(anchor) }}><mesh castShadow><icosahedronGeometry args={[anchor.kind === 'place' ? 1.1 : 0.55, 2]} /><meshStandardMaterial color={anchor.evidenceLevel === 'confirmed' ? '#bff8ff' : '#c7b8ff'} transparent opacity={anchor.evidenceLevel === 'unknown' ? 0.25 : 0.72} wireframe={anchor.evidenceLevel === 'unknown' || anchor.evidenceLevel === 'disputed'} emissive={selected?.id === anchor.id ? '#7fe8f5' : '#10232d'} /></mesh></group>)}</>
}

export default function ReplaySpatialWorld({ memory, progressMs, activeSegmentId, playing, mode, reducedMotion, onModeChange, onAnchorSelect, onExit }: Props) {
  const webglAvailable = useWebGLAvailable()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [truthMode, setTruthMode] = useState<ReplayTruthMode>('evidence')
  const [selected, setSelected] = useState<ReplayWorldAnchor | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const model = useMemo(() => { const base = buildReplaySpatialScene(memory); return { ...base, anchors: filterReplayAnchorsForTruthMode(base.anchors, truthMode) } }, [memory, truthMode])
  useEffect(() => {
    const root = shellRef.current?.closest('[data-replay-truth-mode]')
    if (!root) return
    const sync = () => { const modeValue = root.getAttribute('data-replay-truth-mode') as ReplayTruthMode | null; if (modeValue) setTruthMode(modeValue) }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-replay-truth-mode'] })
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (selected && !model.anchors.some((anchor) => anchor.id === selected.id)) { setSelected(null); onAnchorSelect(null) } }, [model.anchors, onAnchorSelect, selected])
  const select = useCallback((anchor: ReplayWorldAnchor | null) => { setSelected(anchor); onAnchorSelect(anchor) }, [onAnchorSelect])
  const input = useMovementInput({ enabled: mode === 'explore', onEscape: onExit, onInteract: () => select(selected), onReset: () => { walkTarget.current = new THREE.Vector3(...model.spawn) } })
  const look = useDragLook({ yaw, pitch, enabled: mode === 'explore', sensitivity: reducedMotion ? 0.0023 : 0.0037 })
  if (webglAvailable === null) return <section className="replaySpatialLoading" role="status">Preparing the memory space...</section>
  if (!webglAvailable) return <section className="replayWebglFallback" data-testid="replay-webgl-fallback"><h2>{memory.title}</h2><p>{memory.summary}</p><p>Spatial rendering is unavailable, so URAI is showing the source-backed summary.</p><button type="button" onClick={onExit}>Return to Focus</button></section>
  return <div ref={shellRef} className="replaySpatialShell" data-testid="replay-spatial-world" data-replay-spatial-renderer="webgl-r3f" data-replay-truth-mode={truthMode} data-replay-playing={playing ? 'true' : 'false'} data-replay-progress-ms={progressMs} {...look}><Canvas camera={{ position: [0, CAMERA_HEIGHT, 7.2], fov: 56 }} shadows><Suspense fallback={null}><ReplayScene model={model} activeSegmentId={activeSegmentId} input={input} mode={mode} reducedMotion={reducedMotion} yaw={yaw} pitch={pitch} walkTarget={walkTarget} shellRef={shellRef} selected={selected} onSelect={select} /></Suspense></Canvas><div className="replaySpatialPrompt"><strong>{mode === 'guided' ? `Guided - ${activeSegmentId}` : selected?.label ?? 'Explore the memory'}</strong><span>{selected ? replayEvidenceDescription(selected.evidenceLevel) : `${model.anchors.length} anchors visible in ${truthMode} mode`}</span></div><MovementHelp realm="Life Map" summary="Replay is a bounded evidence-aware memory reconstruction." controls="Explore with WASD, arrows, touch controls, or tap the floor. Escape exits." />{mode === 'explore' ? <MobileMovementPad input={input} label="Replay movement controls" /> : null}<div className="replayModeControls"><button type="button" aria-pressed={mode === 'guided'} onClick={() => onModeChange('guided')}>Guided</button><button type="button" aria-pressed={mode === 'explore'} onClick={() => onModeChange('explore')}>Explore</button></div><style jsx>{`.replaySpatialShell{position:absolute;inset:0;overflow:hidden;background:#02060c}.replaySpatialPrompt{position:absolute;z-index:12;left:50%;bottom:230px;transform:translateX(-50%);display:grid;padding:10px 16px;border:1px solid #d8faff20;border-radius:18px;background:#03101ad4;text-align:center}.replaySpatialPrompt span{font-size:11px;color:#a7bfcc}.replayModeControls{position:absolute;z-index:18;left:14px;bottom:16px;display:flex;gap:7px}.replayModeControls button{min-height:48px;padding:0 16px;border:1px solid #d3f7ff28;border-radius:999px;background:#061521dc;color:#fff}.replayModeControls button[aria-pressed='true']{background:#dffcff;color:#031018}.replaySpatialLoading,.replayWebglFallback{position:absolute;inset:0;display:grid;place-content:center;padding:28px;background:#02060c;color:#fff;text-align:center}`}</style></div>
}
