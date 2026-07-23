'use client'

import { Html, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber'
import { Component, Suspense, useCallback, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import * as THREE from 'three'
import FinalHomeWorld from './FinalHomeWorld'
import { resolveHomeRuntimeAsset } from './home/homeReviewCandidateState'
import { useHomePersonalizedScene } from './home/useHomePersonalizedScene'
import { resolveOrbSensoryOutput, type OrbState } from './home/orbStateController'
import {
  MobileMovementPad,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const SPAWN = new THREE.Vector3(0, 0, 7.2)
const BOUNDS = { minX: -8.2, maxX: 8.2, minZ: -9.8, maxZ: 8.2 }
const ORB_POSITION = new THREE.Vector3(0, 1.55, -0.75)
const GROUND_POSITION = new THREE.Vector3(-3.8, 0, -6.7)
const LIFE_MAP_POSITION = new THREE.Vector3(3.8, 0, -6.7)
const ORB_STATES: readonly OrbState[] = ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']

type Props = { onOrbOpen: () => void; webglAvailable: true }
type Nearby = 'orb' | 'ground' | 'life-map' | 'self' | null

class AssetRuntimeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function AssetModel({ path, name, ...props }: { path: string; name: string } & ThreeElements['group']) {
  const gltf = useGLTF(path)
  return <primitive object={gltf.scene.clone(true)} name={name} {...props} />
}

function PersonalizedPlaces({ scene }: { scene: ReturnType<typeof useHomePersonalizedScene>['scene'] }) {
  const positions = [[-5.1, 0, 3.2], [5.1, 0, 2], [-5.2, 0, -1.7], [5.2, 0, -3.4], [-4.8, 0, -6.4], [4.8, 0, -7]] as const
  const tone = scene.environment.weatherTone
  const emissive = tone === 'heavy' ? '#7b5a69' : tone === 'recovering' ? '#78b899' : tone === 'active' ? '#8b72c4' : '#79aaa8'
  return <group name={`home-personalized-places-${scene.mode}`}>
    {scene.places.slice(0, positions.length).map((place, index) => {
      const [x, y, z] = positions[index]
      const height = place.form === 'relationship-presence' ? 2.2 : place.form === 'world-forming' ? 1.1 : 1.55
      return <group key={place.id} position={[x, y, z]} name={`home-place-${place.id}`} userData={{ explanation: place.explanation, sample: place.sample }}>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[place.form === 'path' ? 0.35 : 0.72, 0.92, height, 8]} />
          <meshStandardMaterial color="#25383b" emissive={emissive} emissiveIntensity={0.22} roughness={0.72} metalness={0.16} />
        </mesh>
        <mesh position={[0, height + 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.5, 32]} />
          <meshBasicMaterial color={emissive} transparent opacity={0.62} />
        </mesh>
      </group>
    })}
  </group>
}

function SymbolicSelf({ onApproach }: { onApproach: (event: ThreeEvent<MouseEvent>) => void }) {
  const shape = useMemo(() => {
    const result = new THREE.Shape()
    result.moveTo(0, 0)
    result.bezierCurveTo(-0.52, 0.65, -0.42, 1.72, -0.18, 2.08)
    result.bezierCurveTo(-0.4, 2.62, -0.18, 3.02, 0, 3.05)
    result.bezierCurveTo(0.18, 3.02, 0.4, 2.62, 0.18, 2.08)
    result.bezierCurveTo(0.42, 1.72, 0.52, 0.65, 0, 0)
    return result
  }, [])
  return <group position={[-2.2, 0.02, -0.4]} rotation={[0, 0.3, 0]} name="home-symbolic-embodied-self" onClick={onApproach}>
    <mesh castShadow>
      <extrudeGeometry args={[shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 3 }]} />
      <meshPhysicalMaterial color="#657477" emissive="#2b4b4d" emissiveIntensity={0.2} roughness={0.52} metalness={0.18} clearcoat={0.45} />
    </mesh>
    <pointLight position={[0, 1.5, 0.8]} color="#abc7c3" intensity={0.42} distance={3.2} />
  </group>
}

function OrbRepresentation({ path, state, reducedMotion, muted, nearby, onActivate }: { path: string; state: OrbState; reducedMotion: boolean; muted: boolean; nearby: boolean; onActivate: (event: ThreeEvent<MouseEvent>) => void }) {
  const group = useRef<THREE.Group>(null)
  const output = resolveOrbSensoryOutput(state, reducedMotion, muted)
  useFrame(({ clock }, delta) => {
    const node = group.current
    if (!node) return
    node.position.y = ORB_POSITION.y + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * (state === 'thinking' ? 1.8 : 0.8)) * 0.08)
    if (!reducedMotion && ['thinking', 'transition', 'reflecting'].includes(state)) node.rotation.y += delta * 0.55
  })
  const color = output.light.temperature === 'warm' ? '#f0c98a' : output.light.temperature === 'violet' ? '#b9a0ff' : '#bde8e5'
  return <group ref={group} position={ORB_POSITION} name={`home-orb-state-${state}`} onClick={onActivate}>
    <AssetModel path={path} name="home-candidate-orb" scale={[1.25, 1.25, 1.25]} />
    <pointLight color={color} intensity={output.light.intensity * (nearby ? 2.1 : 1.45)} distance={7} decay={2} />
    <mesh scale={nearby ? 1.34 : 1.05}>
      <sphereGeometry args={[0.72, 32, 24]} />
      <meshBasicMaterial color={color} transparent opacity={state === 'warning' ? 0.12 : 0.06} depthWrite={false} />
    </mesh>
  </group>
}

function Player({ input, yaw, pitch, target, position, velocity, nearby, setNearby, reducedMotion }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; position: MutableRefObject<THREE.Vector3>; velocity: MutableRefObject<THREE.Vector3>; nearby: MutableRefObject<Nearby>; setNearby: (value: Nearby) => void; reducedMotion: boolean }) {
  const { camera } = useThree()
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const previous = useRef<Nearby>(null)
  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: reducedMotion ? 2.2 : 3.1, acceleration: 11, deceleration: 14, bounds: BOUNDS, obstacles: [{ x: 0, z: -0.75, radius: 1.05 }] })
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB_POSITION, 1.8], ['ground', GROUND_POSITION, 2.1], ['life-map', LIFE_MAP_POSITION, 2.1], ['self', new THREE.Vector3(-2.2, 0, -0.4), 1.7]]
    let next: Nearby = null
    let best = Infinity
    for (const [name, point, radius] of candidates) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z)
      if (distance < radius && distance < best) { next = name; best = distance }
    }
    nearby.current = next
    if (next !== previous.current) { previous.current = next; setNearby(next) }
    camera.position.set(position.current.x, 1.68, position.current.z)
    direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
    camera.lookAt(lookAt.current.copy(camera.position).add(direction.current))
  })
  return null
}

function Scene({ chamberPath, portalPath, orbPath, scene, orbState, setOrbState, onOrbOpen, reducedMotion, muted, input, yaw, pitch, target, position, velocity, nearby, nearbyState, setNearby }: { chamberPath: string; portalPath: string; orbPath: string; scene: ReturnType<typeof useHomePersonalizedScene>['scene']; orbState: OrbState; setOrbState: (state: OrbState) => void; onOrbOpen: () => void; reducedMotion: boolean; muted: boolean; input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; position: MutableRefObject<THREE.Vector3>; velocity: MutableRefObject<THREE.Vector3>; nearby: MutableRefObject<Nearby>; nearbyState: Nearby; setNearby: (value: Nearby) => void }) {
  const travel = (destination: 'life-map' | 'ground') => {
    setOrbState('transition')
    requestUraiWorldTravel(destination === 'life-map'
      ? { destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
      : { destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
  }
  const approach = (point: THREE.Vector3) => (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); target.current = point.clone() }
  const activateOrb = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'orb') {
      const index = ORB_STATES.indexOf(orbState)
      setOrbState(ORB_STATES[(index + 1) % ORB_STATES.length])
      onOrbOpen()
    } else target.current = new THREE.Vector3(0, 0, 0.7)
  }
  return <>
    <color attach="background" args={[scene.environment.timeOfDay === 'day' ? '#102629' : scene.environment.timeOfDay === 'dusk' ? '#111d28' : '#071112']} />
    <fog attach="fog" args={['#071112', 10, 34]} />
    <Player input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} setNearby={setNearby} reducedMotion={reducedMotion} />
    <hemisphereLight intensity={0.95} color="#d9eee6" groundColor="#142c2a" />
    <directionalLight position={[5, 10, 6]} intensity={1.75} color="#ffe8bd" castShadow />
    <AssetModel path={chamberPath} name="home-review-entry-chamber" position={[0, -0.12, -1.2]} scale={[1.12, 1.12, 1.12]} />
    <PersonalizedPlaces scene={scene} />
    <SymbolicSelf onApproach={approach(new THREE.Vector3(-2.2, 0, 1.2))} />
    <OrbRepresentation path={orbPath} state={orbState} reducedMotion={reducedMotion} muted={muted} nearby={nearbyState === 'orb'} onActivate={activateOrb} />
    <group position={GROUND_POSITION} rotation={[0, 0.32, 0]} onClick={(event) => { event.stopPropagation(); nearby.current === 'ground' ? travel('ground') : target.current = new THREE.Vector3(-3.2, 0, -5.2) }}>
      <AssetModel path={portalPath} name="home-ground-descent-portal" scale={[0.72, 0.72, 0.72]} />
      <pointLight color="#6ad6be" intensity={nearbyState === 'ground' ? 1.8 : 0.65} distance={6} />
    </group>
    <group position={LIFE_MAP_POSITION} rotation={[0, -0.32, 0]} onClick={(event) => { event.stopPropagation(); nearby.current === 'life-map' ? travel('life-map') : target.current = new THREE.Vector3(3.2, 0, -5.2) }}>
      <AssetModel path={portalPath} name="home-life-map-ascent-portal" scale={[0.72, 0.72, 0.72]} />
      <pointLight color="#a7baff" intensity={nearbyState === 'life-map' ? 1.8 : 0.65} distance={6} />
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -1]} receiveShadow onClick={(event) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }}>
      <planeGeometry args={[18, 20]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    {nearbyState ? <Html center position={[0, 2.8, -1.1]}><div className="home-world-context">{nearbyState === 'orb' ? resolveOrbSensoryOutput(orbState, reducedMotion, muted).caption : nearbyState === 'ground' ? 'Descend into Ground' : nearbyState === 'life-map' ? 'Ascend into Life Map' : 'Your symbolic self'}</div></Html> : null}
  </>
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const reviewMode = useMemo(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('homeAssetReview') === '1', [])
  const { scene, loading } = useHomePersonalizedScene()
  const chamber = resolveHomeRuntimeAsset('home-entry-chamber-model-v1', reviewMode)
  const portal = resolveHomeRuntimeAsset('portal-ring-master-glb-v1', reviewMode)
  const orb = resolveHomeRuntimeAsset('urai-orb-avatar-glb-v1', reviewMode)
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [muted] = useState(true)
  const [orbState, setOrbState] = useState<OrbState>(scene.mode === 'permission-limited' ? 'privacy' : scene.mode === 'offline' || scene.mode === 'unavailable' ? 'warning' : 'idle')
  const [nearbyState, setNearbyState] = useState<Nearby>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const target = useRef<THREE.Vector3 | null>(null)
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const nearby = useRef<Nearby>(null)
  const activateNearby = useCallback(() => {
    if (nearby.current === 'orb') onOrbOpen()
    if (nearby.current === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
    if (nearby.current === 'life-map') requestUraiWorldTravel({ destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })
  }, [onOrbOpen])
  const reset = useCallback(() => { position.current.copy(SPAWN); velocity.current.set(0, 0, 0); target.current = null; yaw.current = 0; pitch.current = -0.04 }, [])
  const input = useMovementInput({ onInteract: activateNearby, onEscape: reset, onReset: reset })
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging })

  if (!webglAvailable || !chamber.path || !portal.path || !orb.path || [chamber.mode, portal.mode, orb.mode].includes('fallback')) {
    return <FinalHomeWorld webglAvailable={true} onOrbOpen={onOrbOpen} />
  }

  const fallback = <FinalHomeWorld webglAvailable={true} onOrbOpen={onOrbOpen} />
  return <AssetRuntimeBoundary fallback={fallback}>
    <div className="urai-asset-home-world" data-home-primary-owner="asset-driven" data-home-asset-mode={reviewMode ? 'disclosed-review-candidate' : 'ready'} data-home-personalization-mode={scene.mode} data-home-orb-state={orbState} data-home-camera-mode={dragging ? 'look' : 'embodied'} {...look}>
      <Canvas shadows dpr={[1, 1.4]} camera={{ position: [0, 1.68, 7.2], fov: 54, near: 0.08, far: 130 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene chamberPath={chamber.path} portalPath={portal.path} orbPath={orb.path} scene={scene} orbState={orbState} setOrbState={setOrbState} onOrbOpen={onOrbOpen} reducedMotion={reducedMotion} muted={muted} input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} nearbyState={nearbyState} setNearby={setNearbyState} />
        </Suspense>
      </Canvas>
      {reviewMode ? <div role="status" className="home-review-disclosure">Review candidate assets — technically validated, visually unapproved.</div> : null}
      <button className="home-why" type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((value) => !value)}>Why am I seeing this?</button>
      {whyOpen ? <aside className="home-provenance" aria-label="Home source explanation"><strong>{scene.mode === 'explicit-sample' ? 'Disclosed sample world' : loading ? 'World forming' : 'Private Home source'}</strong><p>{scene.environment.explanation}</p>{scene.places.slice(0, 4).map((place) => <p key={place.id}>{place.title}: {place.explanation}</p>)}<a href="/privacy-controls">Review consent</a><a href="/passport">Correct, hide, or delete sources</a></aside> : null}
      <nav className="home-semantic-navigation sr-only" aria-label="Accessible Home destinations">
        <button type="button" aria-label="Open Orb directly" data-testid="home-semantic-orb" onClick={onOrbOpen}>Open Orb</button>
        <button type="button" aria-label="Open Ground directly" data-testid="home-semantic-ground" onClick={() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })}>Open Ground</button>
        <button type="button" aria-label="Open Life Map directly" data-testid="home-semantic-life-map" onClick={() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })}>Open Life Map</button>
      </nav>
      <MobileMovementPad input={input} label="Home movement controls" />
      <div className="sr-only" aria-live="polite">{resolveOrbSensoryOutput(orbState, reducedMotion, muted).announcement}</div>
      <style jsx>{`
        .urai-asset-home-world{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:${dragging ? 'grabbing' : 'grab'};background:#071112}
        .urai-asset-home-world :global(canvas){position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
        .home-review-disclosure{position:absolute;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:40;padding:8px 12px;border:1px solid rgba(255,211,130,.38);border-radius:999px;background:rgba(20,15,8,.76);color:#ffe0a6;font:650 11px/1.2 system-ui;pointer-events:none}
        .home-why{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:40;min-height:44px;padding:0 14px;border:1px solid rgba(220,241,236,.24);border-radius:999px;background:rgba(7,18,19,.72);color:#eff9f5}
        .home-provenance{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(68px,calc(env(safe-area-inset-bottom) + 58px));z-index:41;width:min(360px,calc(100vw - 28px));max-height:50vh;overflow:auto;padding:16px;border:1px solid rgba(220,241,236,.2);border-radius:18px;background:rgba(7,18,19,.92);color:#eff9f5;font:500 12px/1.45 system-ui}.home-provenance p{margin:8px 0}.home-provenance a{display:inline-block;margin:8px 14px 0 0;color:#bde8e5}
        :global(.home-world-context){padding:8px 12px;border:1px solid rgba(230,246,240,.25);border-radius:999px;background:rgba(6,18,19,.76);color:#f3fbf8;font:650 12px/1 system-ui;white-space:nowrap;pointer-events:none}
        @media(max-width:700px){.home-review-disclosure{max-width:calc(100vw - 32px);text-align:center}.home-why{bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))}.home-provenance{bottom:max(146px,calc(env(safe-area-inset-bottom) + 136px));max-height:42vh}}
      `}</style>
    </div>
  </AssetRuntimeBoundary>
}
