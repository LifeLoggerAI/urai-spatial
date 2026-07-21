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
    const shell = shellRef.current
    if (shell) {
      shell.dataset.replayReady = 'true'
      shell.dataset.replayCameraX = camera.position.x.toFixed(3)
      shell.dataset.replayCameraZ = camera.position.z.toFixed(3)
    }
  })
  return null
}

function ReplayFloor({ onClick }: { onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const steppingStones = [-6.6, -5.1, -3.6, -2.1, -0.6, 0.9, 2.4, 3.9, 5.4]
  return (
    <group name="replay-floor">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -0.8]} receiveShadow onClick={onClick}>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#07121a" roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2.2]} receiveShadow>
        <circleGeometry args={[5.8, 72]} />
        <meshPhysicalMaterial color="#0c2029" roughness={0.2} metalness={0.22} clearcoat={0.75} transparent opacity={0.86} />
      </mesh>
      {steppingStones.map((z, index) => (
        <mesh key={z} position={[Math.sin(index * 0.64) * 0.16, 0.045, z - 1.2]} castShadow receiveShadow>
          <boxGeometry args={[2.15 + (index % 2) * 0.22, 0.1, 0.72]} />
          <meshStandardMaterial color={index % 2 ? '#17303a' : '#1b3943'} roughness={0.58} metalness={0.16} />
        </mesh>
      ))}
      {[2.4, 4.2, 5.8].map((radius) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, -2.2]}>
          <ringGeometry args={[radius - 0.025, radius, 96]} />
          <meshBasicMaterial color="#75dce9" transparent opacity={0.14} />
        </mesh>
      ))}
    </group>
  )
}

function MemoryArchitecture() {
  const columns = [-6.4, -4.3, -2.15, 2.15, 4.3, 6.4]
  return (
    <group name="replay-memory-architecture">
      <mesh position={[0, 3.4, -7.8]} castShadow receiveShadow>
        <boxGeometry args={[16, 6.8, 0.45]} />
        <meshStandardMaterial color="#07131d" roughness={0.82} />
      </mesh>
      <mesh position={[-8.05, 2.8, -1.2]} castShadow receiveShadow><boxGeometry args={[0.4, 5.6, 13.6]} /><meshStandardMaterial color="#091923" roughness={0.78} /></mesh>
      <mesh position={[8.05, 2.8, -1.2]} castShadow receiveShadow><boxGeometry args={[0.4, 5.6, 13.6]} /><meshStandardMaterial color="#091923" roughness={0.78} /></mesh>
      {columns.map((x, index) => (
        <group key={x} position={[x, 0, -6.85]}>
          <mesh position={[0, 2.45, 0]} castShadow><cylinderGeometry args={[0.24, 0.34, 4.9, 14]} /><meshStandardMaterial color="#18303a" roughness={0.56} metalness={0.18} /></mesh>
          <mesh position={[0, 4.92, 0]} castShadow><boxGeometry args={[1.25, 0.18, 0.65]} /><meshStandardMaterial color={index % 2 ? '#49606c' : '#596b70'} metalness={0.48} roughness={0.32} /></mesh>
          <pointLight position={[0, 3.6, 0.9]} color={index % 2 ? '#b9eefa' : '#d7c8ff'} intensity={0.34} distance={5.5} decay={2} />
        </group>
      ))}
      {[-5.4, -2.7, 0, 2.7, 5.4].map((x) => (
        <mesh key={x} position={[x, 5.85, -2.1]} rotation={[0, 0, x * 0.012]} castShadow>
          <boxGeometry args={[0.14, 0.2, 11.2]} />
          <meshStandardMaterial color="#31434c" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function AnchorPresence({ anchor, selected, onSelect }: { anchor: ReplayWorldAnchor; selected: boolean; onSelect: (anchor: ReplayWorldAnchor) => void }) {
  const inferred = anchor.evidenceLevel === 'inferred'
  const uncertain = anchor.evidenceLevel === 'unknown' || anchor.evidenceLevel === 'disputed'
  const color = anchor.evidenceLevel === 'confirmed' ? '#bff8ff' : inferred ? '#c7b8ff' : '#8ca5b4'
  const opacity = uncertain ? 0.28 : selected ? 0.96 : 0.72
  const material = <meshStandardMaterial color={color} transparent opacity={opacity} wireframe={uncertain} emissive={selected ? '#68e2ef' : '#10232d'} emissiveIntensity={selected ? 0.75 : 0.25} roughness={0.3} metalness={0.2} />
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(anchor) }

  if (anchor.kind === 'person') return (
    <group position={anchor.position} data-testid="replay-world-anchor" onClick={activate}>
      <mesh position={[0, 1.22, 0]} castShadow><sphereGeometry args={[0.24, 24, 18]} />{material}</mesh>
      <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.28, 0.42, 0.9, 18]} />{material}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><ringGeometry args={[0.58, 0.68, 48]} /><meshBasicMaterial color={color} transparent opacity={0.38} /></mesh>
    </group>
  )

  if (anchor.kind === 'place') return (
    <group position={anchor.position} data-testid="replay-world-anchor" onClick={activate}>
      <mesh position={[0, 1.55, 0]} castShadow><torusGeometry args={[1.08, 0.16, 20, 64, Math.PI]} />{material}</mesh>
      <mesh position={[-1.08, 0.72, 0]} castShadow><boxGeometry args={[0.22, 1.45, 0.3]} />{material}</mesh>
      <mesh position={[1.08, 0.72, 0]} castShadow><boxGeometry args={[0.22, 1.45, 0.3]} />{material}</mesh>
      <pointLight position={[0, 1.2, 0.6]} color={color} intensity={selected ? 1.25 : 0.55} distance={5} />
    </group>
  )

  if (anchor.kind === 'sound') return (
    <group position={anchor.position} data-testid="replay-world-anchor" onClick={activate}>
      {[0.38, 0.65, 0.92].map((radius) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.035, 12, 48]} />{material}</mesh>)}
    </group>
  )

  return (
    <group position={anchor.position} data-testid="replay-world-anchor" onClick={activate}>
      <mesh castShadow scale={anchor.kind === 'pattern' ? [1.18, 0.72, 1.18] : [1, 1, 1]}>
        {anchor.kind === 'pattern' ? <octahedronGeometry args={[0.7, 1]} /> : <icosahedronGeometry args={[0.58, 2]} />}
        {material}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}><ringGeometry args={[0.54, 0.61, 48]} /><meshBasicMaterial color={color} transparent opacity={0.22} /></mesh>
    </group>
  )
}

function CompanionOrb({ reducedMotion }: { reducedMotion: boolean }) {
  const orb = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!orb.current) return
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.7) * 0.055
    orb.current.scale.setScalar(pulse)
    if (!reducedMotion) orb.current.rotation.y = clock.elapsedTime * 0.18
  })
  return (
    <group position={[0, 1.15, 2.25]} name="replay-companion-orb">
      <mesh ref={orb} castShadow>
        <icosahedronGeometry args={[0.42, 4]} />
        <meshPhysicalMaterial color="#d9fbff" emissive="#52cbd8" emissiveIntensity={0.85} transmission={0.42} thickness={0.7} roughness={0.08} clearcoat={1} transparent opacity={0.92} />
      </mesh>
      <pointLight color="#8cecf4" intensity={1.1} distance={5.5} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0]}><ringGeometry args={[0.72, 0.79, 64]} /><meshBasicMaterial color="#83e6ef" transparent opacity={0.3} /></mesh>
    </group>
  )
}

function ReplayScene({ model, selected, onSelect, ...cameraProps }: CameraProps & { selected: ReplayWorldAnchor | null; onSelect: (anchor: ReplayWorldAnchor | null) => void }) {
  const floorClick = (event: ThreeEvent<MouseEvent>) => { if (cameraProps.mode === 'explore' && event.delta <= 7) cameraProps.walkTarget.current = new THREE.Vector3(event.point.x, 0, event.point.z) }
  return (
    <>
      <color attach="background" args={['#02060c']} />
      <fog attach="fog" args={['#07111a', 5.5, 25]} />
      <ambientLight intensity={0.48} />
      <hemisphereLight intensity={0.7} color="#dff9ff" groundColor="#08141c" />
      <directionalLight position={[4, 9, 6]} intensity={1.55} color="#f3f7ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <Stars radius={52} depth={28} count={620} factor={2.1} fade speed={cameraProps.reducedMotion ? 0 : 0.025} />
      <ReplayCamera model={model} {...cameraProps} />
      <ReplayFloor onClick={floorClick} />
      <MemoryArchitecture />
      <CompanionOrb reducedMotion={cameraProps.reducedMotion} />
      {model.anchors.map((anchor) => <AnchorPresence key={anchor.id} anchor={anchor} selected={selected?.id === anchor.id} onSelect={onSelect} />)}
    </>
  )
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
  return <div ref={shellRef} className="replaySpatialShell" data-testid="replay-spatial-world" data-replay-spatial-renderer="webgl-r3f" data-replay-truth-mode={truthMode} data-replay-playing={playing ? 'true' : 'false'} data-replay-progress-ms={progressMs} {...look}><Canvas camera={{ position: [0, CAMERA_HEIGHT, 7.2], fov: 56, near: 0.08, far: 100 }} dpr={[1, 1.5]} shadows><Suspense fallback={null}><ReplayScene model={model} activeSegmentId={activeSegmentId} input={input} mode={mode} reducedMotion={reducedMotion} yaw={yaw} pitch={pitch} walkTarget={walkTarget} shellRef={shellRef} selected={selected} onSelect={select} /></Suspense></Canvas><div className="replaySpatialPrompt"><strong>{mode === 'guided' ? `Guided - ${activeSegmentId}` : selected?.label ?? 'Explore the memory'}</strong><span>{selected ? replayEvidenceDescription(selected.evidenceLevel) : `${model.anchors.length} anchors visible in ${truthMode} mode`}</span></div><MovementHelp realm="Life Map" summary="Replay is a bounded evidence-aware memory reconstruction." controls="Explore with WASD, arrows, touch controls, or tap the floor. Escape exits." />{mode === 'explore' ? <MobileMovementPad input={input} label="Replay movement controls" /> : null}<div className="replayModeControls"><button type="button" aria-pressed={mode === 'guided'} onClick={() => onModeChange('guided')}>Guided</button><button type="button" aria-pressed={mode === 'explore'} onClick={() => onModeChange('explore')}>Explore</button></div><style jsx>{`.replaySpatialShell{position:absolute;inset:0;overflow:hidden;background:#02060c}.replaySpatialPrompt{position:absolute;z-index:12;left:50%;bottom:max(230px,calc(env(safe-area-inset-bottom) + 220px));transform:translateX(-50%);display:grid;min-width:min(430px,calc(100vw - 32px));padding:10px 16px;border:1px solid #d8faff20;border-radius:18px;background:#03101ad4;backdrop-filter:blur(14px);text-align:center}.replaySpatialPrompt span{font-size:11px;color:#a7bfcc}.replayModeControls{position:absolute;z-index:18;left:14px;bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:7px}.replayModeControls button{min-height:48px;padding:0 16px;border:1px solid #d3f7ff28;border-radius:999px;background:#061521dc;color:#fff}.replayModeControls button[aria-pressed='true']{background:#dffcff;color:#031018}.replaySpatialLoading,.replayWebglFallback{position:absolute;inset:0;display:grid;place-content:center;padding:28px;background:#02060c;color:#fff;text-align:center}@media(max-width:760px){.replaySpatialPrompt{bottom:max(250px,calc(env(safe-area-inset-bottom) + 240px));min-width:calc(100vw - 24px)}.replayModeControls{left:50%;transform:translateX(-50%)}}`}</style></div>
}
