'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { SelectedMemory, SelectedMemoryReplaySegment } from '@/spatial/memory/selectedMemoryContract'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import {
  buildReplaySpatialScene,
  filterReplayAnchorsForTruthMode,
  replayEvidenceDescription,
  type ReplaySpatialSceneModel,
  type ReplayTruthMode,
  type ReplayWorldAnchor,
} from '@/spatial/replay/replaySpatialModel'

export type ReplayNavigationMode = 'guided' | 'explore'

type Props = {
  memory: SelectedMemory
  progressMs: number
  activeSegmentId: SelectedMemoryReplaySegment['id']
  playing: boolean
  mode: ReplayNavigationMode
  truthMode: ReplayTruthMode
  reducedMotion: boolean
  onModeChange: (mode: ReplayNavigationMode) => void
  onAnchorSelect: (anchor: ReplayWorldAnchor | null) => void
  onExit: () => void
}

type CameraProps = {
  model: ReplaySpatialSceneModel
  activeSegmentId: SelectedMemoryReplaySegment['id']
  input: MovementInput
  mode: ReplayNavigationMode
  reducedMotion: boolean
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  shellRef: MutableRefObject<HTMLDivElement | null>
}

const CAMERA_HEIGHT = 1.68
const ANCHOR_RADIUS = 1.55

function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setAvailable(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')))
    } catch {
      setAvailable(false)
    }
  }, [])
  return available
}

function evidenceStyle(anchor: ReplayWorldAnchor) {
  if (anchor.evidenceLevel === 'confirmed') return { color: '#bff8ff', opacity: 0.92, roughness: 0.28, wireframe: false }
  if (anchor.evidenceLevel === 'high-confidence') return { color: '#b7dfff', opacity: 0.78, roughness: 0.42, wireframe: false }
  if (anchor.evidenceLevel === 'user-corrected') return { color: '#d8c9ff', opacity: 0.9, roughness: 0.3, wireframe: false }
  if (anchor.evidenceLevel === 'disputed') return { color: '#ffd0a8', opacity: 0.58, roughness: 0.65, wireframe: true }
  if (anchor.evidenceLevel === 'unknown') return { color: '#78909e', opacity: 0.24, roughness: 0.9, wireframe: true }
  return { color: '#c7b8ff', opacity: 0.44, roughness: 0.72, wireframe: true }
}

function guidedCamera(model: ReplaySpatialSceneModel, segmentId: SelectedMemoryReplaySegment['id']) {
  return model.guidedCamera[segmentId] ?? model.guidedCamera.memory
}

function ReplayCamera({ model, activeSegmentId, input, mode, reducedMotion, yaw, pitch, walkTarget, shellRef }: CameraProps) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(...model.spawn))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const frames = useRef(0)

  useEffect(() => {
    const guided = guidedCamera(model, activeSegmentId)
    if (mode === 'guided') {
      position.current.set(...guided.position).setY(0)
      walkTarget.current = null
    }
  }, [activeSegmentId, mode, model, walkTarget])

  useFrame((_, delta) => {
    if (mode === 'explore') {
      stepEmbodiedMotion({
        position: position.current,
        velocity: velocity.current,
        input,
        target: walkTarget,
        yaw: yaw.current,
        delta,
        speed: reducedMotion ? 2.2 : 3.15,
        acceleration: reducedMotion ? 18 : 11,
        deceleration: reducedMotion ? 22 : 13,
        bounds: model.bounds,
        obstacles: model.anchors.map((anchor) => ({ x: anchor.position[0], z: anchor.position[2], radius: anchor.kind === 'place' ? 1.25 : 0.7 })),
      })
      camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
      direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
      camera.lookAt(target.current.copy(camera.position).add(direction.current))
    } else {
      const guided = guidedCamera(model, activeSegmentId)
      const desiredPosition = target.current.set(...guided.position)
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.35)
      camera.position.lerp(desiredPosition, alpha)
      camera.lookAt(direction.current.set(...guided.target))
      position.current.set(camera.position.x, 0, camera.position.z)
    }

    frames.current += 1
    if (shellRef.current) {
      shellRef.current.dataset.replayReady = frames.current > 7 ? 'true' : 'warming'
      shellRef.current.dataset.replayCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.replayCameraY = camera.position.y.toFixed(3)
      shellRef.current.dataset.replayCameraZ = camera.position.z.toFixed(3)
      shellRef.current.dataset.replaySegment = activeSegmentId
      shellRef.current.dataset.replayNavigationMode = mode
    }
  })
  return null
}

function ReplayFloor({ model, walkTarget, mode }: { model: ReplaySpatialSceneModel; walkTarget: MutableRefObject<THREE.Vector3 | null>; mode: ReplayNavigationMode }) {
  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (mode !== 'explore' || event.delta > 7) return
    walkTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, model.bounds.minX, model.bounds.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, model.bounds.minZ, model.bounds.maxZ),
    )
  }
  return <group name="replay-grounding-system" data-testid="replay-grounding-system"><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.8]} receiveShadow onClick={choose}><planeGeometry args={[18, 18]} /><meshStandardMaterial color="#07121a" roughness={0.78} metalness={0.18} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -0.8]}><ringGeometry args={[2.6, 8.4, 128]} /><meshBasicMaterial color="#82dff0" transparent opacity={0.055} depthWrite={false} side={THREE.DoubleSide} /></mesh></group>
}

function MemoryArchitecture() {
  return <group name="replay-world-environment" data-testid="replay-world-environment"><mesh position={[0, 3.4, -7.8]} castShadow receiveShadow><boxGeometry args={[16, 6.8, 0.45]} /><meshStandardMaterial color="#07131d" roughness={0.7} metalness={0.16} /></mesh>{[-6.7, -4.5, -2.3, 2.3, 4.5, 6.7].map((x) => <mesh key={x} position={[x, 2.8, -3.2]} castShadow><boxGeometry args={[0.28, 5.6, 8.8]} /><meshStandardMaterial color="#0a1d28" roughness={0.64} metalness={0.24} /></mesh>)}<mesh position={[0, 2.7, -7.46]}><torusGeometry args={[2.25, 0.08, 16, 128, Math.PI]} /><meshBasicMaterial color="#b6f4ff" transparent opacity={0.34} depthWrite={false} /></mesh><pointLight position={[0, 4.6, -4.8]} intensity={22} distance={18} color="#88dfee" /><pointLight position={[-5.2, 2.2, 1]} intensity={8} distance={10} color="#9a8cff" /><pointLight position={[5.2, 2.2, -1]} intensity={7} distance={10} color="#68c8da" /></group>
}

function AnchorPresence({ anchor, active, onSelect, walkTarget, mode }: { anchor: ReplayWorldAnchor; active: boolean; onSelect: (anchor: ReplayWorldAnchor) => void; walkTarget: MutableRefObject<THREE.Vector3 | null>; mode: ReplayNavigationMode }) {
  const group = useRef<THREE.Group>(null)
  const style = evidenceStyle(anchor)
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = anchor.evidenceLevel === 'inferred' ? Math.sin(clock.elapsedTime * 0.34) * 0.1 : 0 })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(anchor)
    if (mode === 'explore') walkTarget.current = new THREE.Vector3(anchor.position[0], 0, anchor.position[2] + ANCHOR_RADIUS)
  }
  return <group ref={group} position={anchor.position} name={`replay-anchor-${anchor.kind}`} data-testid="replay-world-anchor">{anchor.kind === 'person' ? <group onClick={activate}><mesh position={[0, 1.05, 0]} castShadow><capsuleGeometry args={[0.3, 1.35, 8, 18]} /><meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={0.18} transparent opacity={style.opacity * 0.58} wireframe={style.wireframe} /></mesh><mesh position={[0, 2, 0]} castShadow><sphereGeometry args={[0.27, 24, 24]} /><meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={0.22} transparent opacity={style.opacity * 0.62} wireframe={style.wireframe} /></mesh></group> : anchor.kind === 'place' ? <mesh position={[0, 1.45, 0]} onClick={activate} castShadow receiveShadow><boxGeometry args={[3.6, 2.9, 0.25]} /><meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={0.12} transparent opacity={style.opacity * 0.45} roughness={style.roughness} wireframe={style.wireframe} /></mesh> : anchor.kind === 'sound' ? <mesh onClick={activate}><torusGeometry args={[0.52, 0.08, 16, 80]} /><meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.2} transparent opacity={style.opacity} wireframe={style.wireframe} /></mesh> : <mesh onClick={activate} castShadow><icosahedronGeometry args={[anchor.kind === 'emotion' || anchor.kind === 'pattern' ? 0.72 : 0.56, 2]} /><meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={active ? 1.2 : 0.34} transparent opacity={style.opacity} roughness={style.roughness} wireframe={style.wireframe} /></mesh>}<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><ringGeometry args={[0.58, active ? 1.02 : 0.76, 64]} /><meshBasicMaterial color={style.color} transparent opacity={active ? 0.28 : 0.08} depthWrite={false} side={THREE.DoubleSide} /></mesh></group>
}

function CompanionOrb({ onSelect }: { onSelect: () => void }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (group.current) group.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 1.15) * 0.08 })
  return <group ref={group} position={[0, 1.2, 2.2]} name="replay-companion-orb" data-testid="replay-companion-orb"><mesh onClick={(event) => { event.stopPropagation(); onSelect() }}><sphereGeometry args={[0.28, 32, 32]} /><meshStandardMaterial color="#effeff" emissive="#6fe7f6" emissiveIntensity={3.2} roughness={0.18} /></mesh><mesh><sphereGeometry args={[0.72, 28, 28]} /><meshBasicMaterial color="#87e8f5" transparent opacity={0.055} depthWrite={false} /></mesh></group>
}

function ReplayScene(props: CameraProps & { selectedAnchor: ReplayWorldAnchor | null; onAnchorSelect: (anchor: ReplayWorldAnchor | null) => void }) {
  return <><color attach="background" args={['#02060c']} /><fog attach="fog" args={['#07111a', 5.5, 24]} /><ambientLight intensity={0.58} color="#cbeaf0" /><directionalLight position={[4, 9, 6]} intensity={1.6} color="#e8fdff" castShadow /><Stars radius={52} depth={28} count={520} factor={2.1} saturation={0.15} fade speed={props.reducedMotion ? 0 : 0.025} /><ReplayCamera {...props} /><MemoryArchitecture /><ReplayFloor model={props.model} walkTarget={props.walkTarget} mode={props.mode} />{props.model.anchors.map((anchor) => <AnchorPresence key={anchor.id} anchor={anchor} active={props.selectedAnchor?.id === anchor.id || anchor.segmentId === props.activeSegmentId} onSelect={props.onAnchorSelect} walkTarget={props.walkTarget} mode={props.mode} />)}<CompanionOrb onSelect={() => props.onAnchorSelect(null)} /></>
}

export default function ReplaySpatialWorld({ memory, progressMs, activeSegmentId, playing, mode, truthMode, reducedMotion, onModeChange, onAnchorSelect, onExit }: Props) {
  const webglAvailable = useWebGLAvailable()
  const model = useMemo(() => {
    const base = buildReplaySpatialScene(memory)
    return { ...base, anchors: filterReplayAnchorsForTruthMode(base.anchors, truthMode) }
  }, [memory, truthMode])
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const [selectedAnchor, setSelectedAnchor] = useState<ReplayWorldAnchor | null>(null)
  const [dragging, setDragging] = useState(false)
  const selectAnchor = useCallback((anchor: ReplayWorldAnchor | null) => { setSelectedAnchor(anchor); onAnchorSelect(anchor) }, [onAnchorSelect])
  const resetExplore = useCallback(() => { walkTarget.current = new THREE.Vector3(...model.spawn); yaw.current = 0; pitch.current = -0.04 }, [model.spawn])
  const interact = useCallback(() => { if (selectedAnchor) onAnchorSelect(selectedAnchor) }, [onAnchorSelect, selectedAnchor])
  const input = useMovementInput({ enabled: mode === 'explore', onEscape: onExit, onInteract: interact, onReset: resetExplore })
  const look = useDragLook({ yaw, pitch, enabled: mode === 'explore', sensitivity: reducedMotion ? 0.0023 : 0.0037, onDragState: setDragging })

  useEffect(() => {
    if (selectedAnchor && !model.anchors.some((anchor) => anchor.id === selectedAnchor.id)) selectAnchor(null)
  }, [model.anchors, selectAnchor, selectedAnchor])

  if (webglAvailable === null) return <section className="replaySpatialLoading" role="status">Preparing the memory space...</section>
  if (!webglAvailable) return <section className="replayWebglFallback" data-testid="replay-webgl-fallback" role="region" aria-label="Replay non-WebGL fallback"><p>Spatial rendering is unavailable on this device.</p><h2>{memory.title}</h2><p>{memory.summary}</p><p>URAI is showing the source-backed memory summary instead of pretending this is an explorable world.</p><button type="button" onClick={onExit}>Return to Focus</button></section>

  return <div ref={shellRef} className="replaySpatialShell" data-testid="replay-spatial-world" data-replay-spatial-renderer="webgl-r3f" data-replay-ready="warming" data-replay-playing={playing ? 'true' : 'false'} data-replay-progress-ms={progressMs} data-replay-navigation-mode={mode} data-replay-truth-mode={truthMode} data-replay-camera-mode={dragging ? 'look' : mode} aria-label={`Explorable Replay space for ${memory.title}`} {...look}>
    <Canvas className="replaySpatialCanvas" style={{ position: 'absolute', inset: 0 }} dpr={[1, 1.35]} camera={{ position: [0, CAMERA_HEIGHT, 7.2], fov: 56, near: 0.08, far: 90 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} shadows><Suspense fallback={null}><ReplayScene model={model} activeSegmentId={activeSegmentId} input={input} mode={mode} reducedMotion={reducedMotion} yaw={yaw} pitch={pitch} walkTarget={walkTarget} shellRef={shellRef} selectedAnchor={selectedAnchor} onAnchorSelect={selectAnchor} /></Suspense></Canvas>
    <div className="replaySpatialPrompt" role="status" aria-live="polite"><strong>{mode === 'guided' ? `Guided - ${activeSegmentId}` : selectedAnchor ? selectedAnchor.label : 'Explore the memory'}</strong><span>{mode === 'guided' ? `Truth mode: ${truthMode}. Switch to Explore to move through the scene.` : selectedAnchor ? replayEvidenceDescription(selectedAnchor.evidenceLevel) : 'WASD / arrows - tap ground - drag to look - Enter to inspect'}</span></div>
    <MovementHelp realm="Replay" summary="Replay is a bounded memory reconstruction. Solid elements are confirmed; softened or fragmented elements are inferred or unknown." controls="Switch to Explore. WASD or arrows move. Tap ground to approach. Drag to look. Enter inspects. R resets. Escape exits." />
    {mode === 'explore' ? <MobileMovementPad input={input} label="Replay movement controls" /> : null}
    <div className="replayModeControls" data-movement-ui="true" role="group" aria-label="Replay navigation mode"><button type="button" aria-pressed={mode === 'guided'} onClick={() => onModeChange('guided')}>Guided</button><button type="button" aria-pressed={mode === 'explore'} onClick={() => onModeChange('explore')}>Explore</button>{mode === 'explore' ? <button type="button" onClick={resetExplore}>Reset view</button> : null}</div>
    <p className="srOnly">Scene summary: {model.placeLabel}. {model.anchors.length} spatial anchors are available in {truthMode} mode. Confirmed and inferred details use visibly different materials.</p>
    <style jsx>{`.replaySpatialShell{position:absolute;inset:0;overflow:hidden;touch-action:none;background:#02060c;isolation:isolate}.replaySpatialShell[data-replay-camera-mode='look']{cursor:grabbing}:global(.replaySpatialCanvas){z-index:1}.replaySpatialPrompt{position:absolute;z-index:12;left:50%;bottom:max(232px,calc(env(safe-area-inset-bottom) + 222px));transform:translateX(-50%);display:grid;gap:4px;width:min(540px,calc(100vw - 32px));padding:10px 16px;box-sizing:border-box;border:1px solid #d8faff20;border-radius:18px;background:#03101ad4;text-align:center;pointer-events:none}.replaySpatialPrompt strong{font:850 11px/1.2 Inter,system-ui;color:#f0fcff}.replaySpatialPrompt span{font:600 10px/1.4 Inter,system-ui;color:#a7bfcc}.replayModeControls{position:absolute;z-index:18;left:max(14px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:7px}.replayModeControls button{min-height:48px;padding:0 16px;border:1px solid #d3f7ff28;border-radius:999px;background:#061521dc;color:#fff;font-weight:800}.replayModeControls button[aria-pressed='true']{background:#dffcff;color:#031018}.srOnly{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}.replaySpatialLoading,.replayWebglFallback{position:absolute;inset:0;z-index:2;display:grid;place-content:center;padding:28px;background:#02060c;color:#fff;text-align:center}.replayWebglFallback p{max-width:560px}.replayWebglFallback button{justify-self:center;min-height:48px;padding:0 20px;border:0;border-radius:999px}@media(max-width:700px){.replaySpatialPrompt{bottom:max(288px,calc(env(safe-area-inset-bottom) + 278px))}.replayModeControls{left:auto;right:10px;flex-wrap:wrap;max-width:210px}}`}</style>
  </div>
}
