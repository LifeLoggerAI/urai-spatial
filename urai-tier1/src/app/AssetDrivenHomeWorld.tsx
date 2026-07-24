'use client'

import { Html, useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
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
const ORB_POSITION = new THREE.Vector3(0, 1.62, -0.65)
const GROUND_POSITION = new THREE.Vector3(-4.55, 0.25, -6.55)
const LIFE_MAP_POSITION = new THREE.Vector3(4.55, 0.55, -6.65)
const SELF_POSITION = new THREE.Vector3(-2.15, 0, -0.15)
const ORB_STATES: readonly OrbState[] = ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']

const ORB_CLIP: Readonly<Record<OrbState, string>> = {
  dormant: 'Orb_Resting',
  idle: 'Orb_Idle',
  attention: 'Orb_Attention',
  listening: 'Orb_Listening',
  thinking: 'Orb_Thinking',
  speaking: 'Orb_Speaking',
  guiding: 'Orb_Guiding',
  reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming',
  privacy: 'Orb_Privacy',
  warning: 'Orb_Degraded',
  transition: 'Orb_Transition',
}

const PORTAL_CLIP = {
  closed: 'Portal_Closed',
  available: 'Portal_Available',
  attention: 'Portal_Attention',
  active: 'Portal_Active',
  opening: 'Portal_Opening',
  traversal: 'Portal_Traversal',
  closing: 'Portal_Closing',
} as const

const TONE = {
  clear: '#6dc9ae',
  soft: '#a7c8bd',
  active: '#a78ce3',
  heavy: '#bd7d8c',
  recovering: '#7ed0a0',
  forming: '#79aeb0',
} as const

type Props = { onOrbOpen: () => void; webglAvailable: true }
type Nearby = 'orb' | 'ground' | 'life-map' | 'self' | null
type PortalPhase = keyof typeof PORTAL_CLIP

type AnimatedAssetProps = {
  path: string
  name: string
  clips: readonly string[]
  reducedMotion: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

type HomeFallbackReason = 'no-webgl' | 'forced-asset-failure' | 'missing-asset' | 'canonical-fallback' | 'runtime-error'

function HomeFallback({ reason, onOrbOpen }: { reason: HomeFallbackReason; onOrbOpen: () => void }) {
  return <div className="urai-home-asset-fallback" data-home-fallback-reason={reason} data-home-primary-owner="procedural-degraded-fallback">
    <FinalHomeWorld webglAvailable={true} onOrbOpen={onOrbOpen} />
  </div>
}

class AssetRuntimeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(onReady) })
    return () => { cancelAnimationFrame(first); if (second) cancelAnimationFrame(second) }
  }, [onReady])
  return null
}

function AnimatedAsset({ path, name, clips, reducedMotion, position, rotation, scale }: AnimatedAssetProps) {
  const root = useRef<THREE.Group>(null)
  const gltf = useGLTF(path)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const { actions, mixer } = useAnimations(gltf.animations, root)
  const clipKey = clips.join('|')

  useEffect(() => {
    const requested = clipKey.split('|').filter(Boolean)
    for (const action of Object.values(actions)) action?.fadeOut(0.12)
    for (const clip of requested) {
      const action = actions[clip]
      if (!action) continue
      action.reset().fadeIn(0.18).play()
      if (reducedMotion) {
        action.paused = true
        action.time = Math.min(action.getClip().duration, Math.max(0, action.getClip().duration * 0.72))
      }
    }
    return () => {
      for (const clip of requested) actions[clip]?.fadeOut(0.1)
    }
  }, [actions, clipKey, reducedMotion])

  useEffect(() => () => { mixer.stopAllAction() }, [mixer])

  return <group ref={root} name={name} position={position} rotation={rotation} scale={scale}>
    <primitive object={scene} />
  </group>
}

function organicArchCurve(width: number, height: number) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width, 0, 0),
    new THREE.Vector3(-width * 0.86, height * 0.52, 0.03),
    new THREE.Vector3(-width * 0.42, height * 0.94, -0.02),
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(width * 0.42, height * 0.94, 0.02),
    new THREE.Vector3(width * 0.86, height * 0.52, -0.03),
    new THREE.Vector3(width, 0, 0),
  ])
}

function leafShape(scale = 1) {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.78 * scale)
  shape.bezierCurveTo(0.52 * scale, -0.42 * scale, 0.58 * scale, 0.28 * scale, 0, 0.82 * scale)
  shape.bezierCurveTo(-0.58 * scale, 0.28 * scale, -0.52 * scale, -0.42 * scale, 0, -0.78 * scale)
  return shape
}

function petalGeometry(scale = 1) {
  return new THREE.ExtrudeGeometry(leafShape(scale), {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    curveSegments: 20,
  })
}

function OrganicArch({ accent, width = 0.86, height = 1.7 }: { accent: string; width?: number; height?: number }) {
  const curve = useMemo(() => organicArchCurve(width, height), [height, width])
  return <mesh castShadow>
    <tubeGeometry args={[curve, 64, 0.075, 12, false]} />
    <meshPhysicalMaterial color="#243c35" emissive={accent} emissiveIntensity={0.16} roughness={0.72} clearcoat={0.18} />
  </mesh>
}

function WovenLeaf({ position, rotation, scale, accent, opacity = 1 }: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; accent: string; opacity?: number }) {
  const geometry = useMemo(() => petalGeometry(1), [])
  return <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow>
    <meshPhysicalMaterial color="#476f5c" emissive={accent} emissiveIntensity={0.12} roughness={0.66} clearcoat={0.2} transparent={opacity < 1} opacity={opacity} />
  </mesh>
}

function GroundedGlow({ accent, size = 0.78 }: { accent: string; size?: number }) {
  return <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[size, 64]} />
    <meshBasicMaterial color={accent} transparent opacity={0.09} depthWrite={false} />
  </mesh>
}

function PlaceLight({ accent, intensity = 0.58 }: { accent: string; intensity?: number }) {
  return <pointLight position={[0, 1.2, 0.55]} color={accent} intensity={intensity} distance={4.6} decay={2} />
}

function MemoryPlace({ place, position, tone, reducedMotion }: { place: ReturnType<typeof useHomePersonalizedScene>['scene']['places'][number]; position: readonly [number, number, number]; tone: keyof typeof TONE; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const accent = TONE[tone]
  const seed = useMemo(() => place.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0), [place.id])
  const phase = (seed % 17) * 0.33

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.16 + phase) * 0.035
    root.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.34 + phase) * 0.018
  })

  return <group ref={root} position={position} name={`home-place-${place.id}`} userData={{ explanation: place.explanation, sample: place.sample, form: place.form }}>
    <GroundedGlow accent={accent} />
    {place.form === 'relationship-presence' ? <>
      <OrganicArch accent={accent} width={0.92} height={1.65} />
      <WovenLeaf position={[-0.34, 0.82, 0]} rotation={[0.08, 0.2, -0.32]} scale={[0.54, 0.82, 0.45]} accent={accent} />
      <WovenLeaf position={[0.34, 0.82, 0.06]} rotation={[-0.08, -0.2, 0.32]} scale={[0.54, 0.82, 0.45]} accent={accent} />
      <mesh position={[0, 0.9, 0.14]}><sphereGeometry args={[0.09, 18, 14]} /><meshBasicMaterial color={accent} /></mesh>
    </> : place.form === 'path' ? <>
      <OrganicArch accent={accent} width={0.78} height={1.52} />
      {[0, 1, 2, 3].map((step) => <WovenLeaf key={step} position={[-0.55 + step * 0.34, 0.09 + step * 0.11, 0.22 - step * 0.14]} rotation={[-Math.PI / 2, 0, -0.7 + step * 0.36]} scale={[0.34, 0.24, 0.20]} accent={accent} />)}
      <WovenLeaf position={[0.38, 0.9, -0.04]} rotation={[0.12, 0.2, -0.45]} scale={[0.50, 0.85, 0.32]} accent={accent} />
    </> : place.form === 'weather' ? <>
      <OrganicArch accent={accent} width={0.96} height={1.62} />
      <WovenLeaf position={[0, 1.38, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 0.74, 0.42]} accent={accent} opacity={0.82} />
      {[-0.48, -0.16, 0.16, 0.48].map((x, index) => {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 1.18, 0), new THREE.Vector3(x + (index % 2 ? 0.09 : -0.09), 0.72, 0.02), new THREE.Vector3(x * 0.82, 0.26, 0.08)])
        return <mesh key={x}><tubeGeometry args={[curve, 24, 0.018, 7, false]} /><meshBasicMaterial color={accent} transparent opacity={0.46} /></mesh>
      })}
    </> : place.form === 'threshold' ? <>
      <OrganicArch accent={accent} width={0.9} height={1.72} />
      <WovenLeaf position={[0, 0.86, -0.04]} rotation={[0, 0, 0]} scale={[0.82, 0.96, 0.2]} accent={accent} opacity={0.35} />
      <WovenLeaf position={[-0.64, 0.55, 0.08]} rotation={[0.12, 0.2, -0.55]} scale={[0.38, 0.72, 0.3]} accent={accent} />
      <WovenLeaf position={[0.64, 0.55, 0.08]} rotation={[-0.12, -0.2, 0.55]} scale={[0.38, 0.72, 0.3]} accent={accent} />
    </> : place.form === 'world-forming' ? <>
      {[0, 1, 2].map((piece) => {
        const x = -0.48 + piece * 0.48
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.04, 0), new THREE.Vector3(x + (piece - 1) * 0.08, 0.48, 0), new THREE.Vector3(x * 0.8, 0.92 + piece * 0.12, 0.02)])
        return <group key={piece}>
          <mesh><tubeGeometry args={[curve, 28, 0.028, 8, false]} /><meshStandardMaterial color="#365d4b" emissive={accent} emissiveIntensity={0.12} /></mesh>
          <WovenLeaf position={[x + 0.18, 0.72 + piece * 0.12, 0.02]} rotation={[0.08, 0.18, -0.62 + piece * 0.34]} scale={[0.34, 0.54, 0.28]} accent={accent} />
        </group>
      })}
      <GroundedGlow accent={accent} size={0.62} />
    </> : <>
      <OrganicArch accent={accent} width={0.94} height={1.72} />
      <WovenLeaf position={[-0.52, 0.7, 0]} rotation={[0.12, 0.3, -0.52]} scale={[0.44, 0.82, 0.32]} accent={accent} />
      <WovenLeaf position={[0.5, 0.74, 0.04]} rotation={[-0.08, -0.25, 0.52]} scale={[0.44, 0.82, 0.32]} accent={accent} />
      <WovenLeaf position={[0, 1.13, -0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.72, 0.46, 0.28]} accent={accent} opacity={0.8} />
      <mesh position={[0, 0.88, 0.18]}><sphereGeometry args={[0.12, 20, 14]} /><meshBasicMaterial color={accent} /></mesh>
    </>}
    <PlaceLight accent={accent} intensity={place.form === 'weather' ? 0.72 : 0.56} />
  </group>
}

function PersonalizedPlaces({ scene, reducedMotion }: { scene: ReturnType<typeof useHomePersonalizedScene>['scene']; reducedMotion: boolean }) {
  const positions = [[-5.25, 0.02, 3.0], [5.25, 0.02, 2.25], [-5.55, 0.02, -1.45], [5.55, 0.02, -2.55], [-5.2, 0.02, -5.5], [5.2, 0.02, -5.8]] as const
  return <group name={`home-personalized-places-${scene.mode}`}>
    {scene.places.slice(0, positions.length).map((place, index) => <MemoryPlace key={place.id} place={place} position={positions[index]} tone={scene.environment.weatherTone} reducedMotion={reducedMotion} />)}
  </group>
}

function AuthoredHomeAsset({ path, mode, reducedMotion }: { path: string; mode: ReturnType<typeof useHomePersonalizedScene>['scene']['mode']; reducedMotion: boolean }) {
  const presenceClip = mode === 'permission-limited' || mode === 'unavailable' || mode === 'offline'
    ? 'Presence_Privacy'
    : mode === 'world-forming'
      ? 'Presence_Forming'
      : 'Presence_Idle'
  return <AnimatedAsset path={path} name="home-authored-entry-chamber" clips={['Home_Breathing', presenceClip]} reducedMotion={reducedMotion} position={[0, -0.12, -1.2]} scale={[1.08, 1.08, 1.08]} />
}

function EmbodiedPresenceInteraction({ onApproach }: { onApproach: (event: ThreeEvent<MouseEvent>) => void }) {
  return <mesh name="home-embodied-presence-interaction" position={[-2.15, 1.25, -0.15]} onClick={onApproach}>
    <boxGeometry args={[1.5, 2.8, 1.2]} />
    <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
  </mesh>
}

function OrbRepresentation({ path, state, reducedMotion, muted, nearby, onActivate }: { path: string; state: OrbState; reducedMotion: boolean; muted: boolean; nearby: boolean; onActivate: (event: ThreeEvent<MouseEvent>) => void }) {
  const output = resolveOrbSensoryOutput(state, reducedMotion, muted)
  const color = output.light.temperature === 'warm' ? '#efc27c' : output.light.temperature === 'violet' ? '#b7a0ff' : '#b9ece5'
  const stateScale = state === 'speaking' ? 1.08 : state === 'attention' ? 1.06 : state === 'transition' ? 1.12 : state === 'privacy' ? 0.94 : 1
  return <group position={ORB_POSITION} name={`home-orb-state-${state}`} onClick={onActivate} userData={{ clip: ORB_CLIP[state] }}>
    <AnimatedAsset path={path} name="home-authored-orb" clips={[ORB_CLIP[state]]} reducedMotion={reducedMotion} scale={[1.22 * stateScale, 1.22 * stateScale, 1.22 * stateScale]} />
    <pointLight color={color} intensity={output.light.intensity * (nearby ? 2.2 : 1.4)} distance={8.5} decay={2} castShadow />
    <mesh scale={nearby ? 1.38 : state === 'warning' ? 1.12 : 1}>
      <sphereGeometry args={[0.78, 32, 24]} />
      <meshBasicMaterial color={color} transparent opacity={state === 'warning' ? 0.13 : state === 'privacy' ? 0.09 : 0.055} depthWrite={false} />
    </mesh>
    {state === 'guiding' || state === 'transition' ? Array.from({ length: 8 }, (_, index) => <mesh key={index} position={[Math.sin(index * 1.8) * 1.26, -0.62 + index * 0.17, Math.cos(index * 1.8) * 0.68]}><sphereGeometry args={[0.025 + index * 0.004, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={0.64 - index * 0.05} /></mesh>) : null}
  </group>
}

function DestinationPortal({ destination, path, position, nearby, phase, reducedMotion, onClick }: { destination: 'ground' | 'life-map'; path: string; position: THREE.Vector3; nearby: boolean; phase: PortalPhase; reducedMotion: boolean; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const ascent = destination === 'life-map'
  const color = ascent ? '#a9b7ff' : '#78d9b4'
  const targetScale = phase === 'traversal' ? 1.12 : nearby || phase === 'active' || phase === 'opening' ? 1.05 : 1
  const root = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!root.current) return
    root.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, delta * 5))
  })

  return <group ref={root} position={position} rotation={[0, ascent ? -0.28 : 0.28, 0]} onClick={onClick} name={`home-${destination}-portal-${phase}`} userData={{ destination, phase, clip: PORTAL_CLIP[phase] }}>
    <AnimatedAsset path={path} name={`home-${destination}-authored-portal`} clips={[PORTAL_CLIP[phase]]} reducedMotion={reducedMotion} scale={[0.72, 0.72, 0.72]} />
    <pointLight color={color} intensity={nearby ? 2.05 : phase === 'opening' || phase === 'traversal' ? 2.4 : 0.62} distance={8} decay={2} />
    {phase === 'opening' || phase === 'traversal' ? Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI
      return <mesh key={index} position={[Math.cos(angle) * 1.72, 1.02 + Math.sin(angle) * 1.55, 0.35 + (index % 2) * 0.18]}><sphereGeometry args={[0.026 + (index % 3) * 0.006, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={0.68} /></mesh>
    }) : null}
  </group>
}

function AmbientLife({ tone, reducedMotion }: { tone: keyof typeof TONE; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const accent = TONE[tone]
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.04
  })
  return <group ref={root} name="home-restrained-ambient-life">
    {Array.from({ length: 18 }, (_, index) => {
      const angle = (index / 18) * Math.PI * 2
      const radius = 3.2 + (index % 5) * 0.66
      return <mesh key={index} position={[Math.cos(angle) * radius, 0.7 + (index % 6) * 0.43, Math.sin(angle) * radius - 1.2]}>
        <sphereGeometry args={[0.018 + (index % 3) * 0.005, 8, 6]} />
        <meshBasicMaterial color={index % 5 === 0 ? '#e5b66f' : accent} transparent opacity={0.52} />
      </mesh>
    })}
  </group>
}

function Player({ input, yaw, pitch, target, position, velocity, nearby, setNearby, reducedMotion }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; position: MutableRefObject<THREE.Vector3>; velocity: MutableRefObject<THREE.Vector3>; nearby: MutableRefObject<Nearby>; setNearby: (value: Nearby) => void; reducedMotion: boolean }) {
  const { camera } = useThree()
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const previous = useRef<Nearby>(null)
  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: reducedMotion ? 2.2 : 3.1, acceleration: 11, deceleration: 14, bounds: BOUNDS, obstacles: [{ x: 0, z: -0.72, radius: 1.05 }] })
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB_POSITION, 1.8], ['ground', GROUND_POSITION, 2.2], ['life-map', LIFE_MAP_POSITION, 2.2], ['self', SELF_POSITION, 1.7]]
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

function Scene({ chamberPath, portalPath, orbPath, scene, orbState, setOrbState, onOrbOpen, reducedMotion, muted, input, yaw, pitch, target, position, velocity, nearby, nearbyState, setNearby, setPortalEvidence, onAssetsReady, interactionRef }: { chamberPath: string; portalPath: string; orbPath: string; scene: ReturnType<typeof useHomePersonalizedScene>['scene']; orbState: OrbState; setOrbState: (state: OrbState) => void; onOrbOpen: () => void; reducedMotion: boolean; muted: boolean; input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; position: MutableRefObject<THREE.Vector3>; velocity: MutableRefObject<THREE.Vector3>; nearby: MutableRefObject<Nearby>; nearbyState: Nearby; setNearby: (value: Nearby) => void; setPortalEvidence: (value: string) => void; onAssetsReady: () => void; interactionRef: MutableRefObject<() => void> }) {
  const [groundPhase, setGroundPhase] = useState<PortalPhase>('available')
  const [lifeMapPhase, setLifeMapPhase] = useState<PortalPhase>('available')
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)) }, [])
  useEffect(() => {
    if (!['opening', 'traversal', 'closing'].includes(groundPhase)) setGroundPhase(nearbyState === 'ground' ? 'active' : 'available')
    if (!['opening', 'traversal', 'closing'].includes(lifeMapPhase)) setLifeMapPhase(nearbyState === 'life-map' ? 'active' : 'available')
  }, [groundPhase, lifeMapPhase, nearbyState])

  const travel = (destination: 'life-map' | 'ground') => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    setOrbState('transition')
    const setPhase = destination === 'life-map' ? setLifeMapPhase : setGroundPhase
    const route = destination === 'life-map'
      ? { destination: 'life-map' as const, href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
      : { destination: 'infrastructure-hub' as const, href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }
    setPhase('opening')
    setPortalEvidence(`${destination}:opening`)
    const traversalDelay = reducedMotion ? 90 : 620
    const closingDelay = reducedMotion ? 170 : 1180
    const travelDelay = reducedMotion ? 230 : 1540
    timers.current.push(window.setTimeout(() => { setPhase('traversal'); setPortalEvidence(`${destination}:traversal`) }, traversalDelay))
    timers.current.push(window.setTimeout(() => { setPhase('closing'); setPortalEvidence(`${destination}:closing`) }, closingDelay))
    timers.current.push(window.setTimeout(() => requestUraiWorldTravel(route), travelDelay))
  }

  const approach = (point: THREE.Vector3) => (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); target.current = point.clone() }
  const activateOrb = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'orb') {
      const index = ORB_STATES.indexOf(orbState)
      setOrbState(ORB_STATES[(index + 1) % ORB_STATES.length])
      onOrbOpen()
    } else target.current = new THREE.Vector3(0, 0, 0.78)
  }

  useEffect(() => {
    interactionRef.current = () => {
      if (nearby.current === 'orb') {
        const index = ORB_STATES.indexOf(orbState)
        setOrbState(ORB_STATES[(index + 1) % ORB_STATES.length])
        onOrbOpen()
      } else if (nearby.current === 'ground') travel('ground')
      else if (nearby.current === 'life-map') travel('life-map')
    }
    return () => { interactionRef.current = () => {} }
  })

  const background = scene.environment.timeOfDay === 'day' ? '#173c36' : scene.environment.timeOfDay === 'dawn' ? '#243746' : scene.environment.timeOfDay === 'dusk' ? '#1d2b42' : scene.environment.weatherTone === 'heavy' ? '#221b2a' : '#0d2320'
  const fog = scene.environment.weatherTone === 'heavy' ? '#2b202c' : scene.environment.weatherTone === 'recovering' ? '#153a30' : '#102b27'
  const fogNear = scene.environment.weatherTone === 'heavy' ? 13 : 17
  const fogFar = scene.environment.weatherTone === 'heavy' ? 46 : 58

  return <>
    <color attach="background" args={[background]} />
    <fog attach="fog" args={[fog, fogNear, fogFar]} />
    <Player input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} setNearby={setNearby} reducedMotion={reducedMotion} />
    <hemisphereLight intensity={1.48} color="#e8f4ea" groundColor="#1b3d33" />
    <directionalLight position={[6, 12, 7]} intensity={2.5} color="#ffe4b4" castShadow shadow-mapSize={[1536, 1536]} />
    <directionalLight position={[-8, 7, -8]} intensity={1.05} color="#91b5ee" />
    <pointLight position={[0, 5, 4]} intensity={1.0} color="#b8eadb" distance={18} decay={2} />
    <SceneReady onReady={onAssetsReady} />
    <AuthoredHomeAsset path={chamberPath} mode={scene.mode} reducedMotion={reducedMotion} />
    <PersonalizedPlaces scene={scene} reducedMotion={reducedMotion} />
    <AmbientLife tone={scene.environment.weatherTone} reducedMotion={reducedMotion} />
    <EmbodiedPresenceInteraction onApproach={approach(new THREE.Vector3(-2.2, 0, 1.15))} />
    <OrbRepresentation path={orbPath} state={orbState} reducedMotion={reducedMotion} muted={muted} nearby={nearbyState === 'orb'} onActivate={activateOrb} />
    <DestinationPortal destination="ground" path={portalPath} position={GROUND_POSITION} nearby={nearbyState === 'ground'} phase={groundPhase} reducedMotion={reducedMotion} onClick={(event) => { event.stopPropagation(); nearby.current === 'ground' ? travel('ground') : target.current = new THREE.Vector3(-3.55, 0, -5.05) }} />
    <DestinationPortal destination="life-map" path={portalPath} position={LIFE_MAP_POSITION} nearby={nearbyState === 'life-map'} phase={lifeMapPhase} reducedMotion={reducedMotion} onClick={(event) => { event.stopPropagation(); nearby.current === 'life-map' ? travel('life-map') : target.current = new THREE.Vector3(3.55, 0, -5.05) }} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -1]} receiveShadow onClick={(event) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }}>
      <planeGeometry args={[20, 22]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    {nearbyState ? <Html center position={[0, 3.05, -1.1]}><div className="home-world-context">{nearbyState === 'orb' ? resolveOrbSensoryOutput(orbState, reducedMotion, muted).caption : nearbyState === 'ground' ? 'The living path descends into Ground' : nearbyState === 'life-map' ? 'The luminous path rises into Life Map' : 'Your private embodied presence'}</div></Html> : null}
  </>
}

function requestedReviewOrbState(reviewMode: boolean): OrbState | null {
  if (!reviewMode || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('homeOrbState') as OrbState | null
  return value && ORB_STATES.includes(value) ? value : null
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const [reviewMode, setReviewMode] = useState(false)
useEffect(() => {
  setReviewMode(new URLSearchParams(window.location.search).get('homeAssetReview') === '1')
}, [])
  const forcedAssetFailure = useMemo(() => reviewMode && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('homeAssetFailure') === '1', [reviewMode])
  const forcedOrbState = useMemo(() => requestedReviewOrbState(reviewMode), [reviewMode])
  const { scene, loading } = useHomePersonalizedScene()
  const chamber = resolveHomeRuntimeAsset('home-entry-chamber-model-v1', reviewMode)
  const portal = resolveHomeRuntimeAsset('portal-ring-master-glb-v1', reviewMode)
  const orb = resolveHomeRuntimeAsset('urai-orb-avatar-glb-v1', reviewMode)
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(true)
  const [orbState, setOrbState] = useState<OrbState>(forcedOrbState ?? (scene.mode === 'permission-limited' ? 'privacy' : scene.mode === 'offline' || scene.mode === 'unavailable' ? 'warning' : 'idle'))
  const [nearbyState, setNearbyState] = useState<Nearby>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [portalEvidence, setPortalEvidence] = useState('idle')
  const [assetsReady, setAssetsReady] = useState(false)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const target = useRef<THREE.Vector3 | null>(null)
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const nearby = useRef<Nearby>(null)
  const interactionRef = useRef<() => void>(() => {})

  const activateNearby = useCallback(() => interactionRef.current(), [])
  const reset = useCallback(() => { position.current.copy(SPAWN); velocity.current.set(0, 0, 0); target.current = null; yaw.current = 0; pitch.current = -0.04 }, [])
  const input = useMovementInput({ onInteract: activateNearby, onEscape: reset, onReset: reset })
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging })

  useEffect(() => {
    if (forcedOrbState) setOrbState(forcedOrbState)
    else if (scene.mode === 'permission-limited') setOrbState('privacy')
    else if (scene.mode === 'offline' || scene.mode === 'unavailable') setOrbState('warning')
    else setOrbState('idle')
  }, [forcedOrbState, scene.mode])

  const markAssetsReady = useCallback(() => setAssetsReady(true), [])

  const toggleAudio = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (muted) {
      audio.muted = false
      try { await audio.play(); setMuted(false) } catch { audio.muted = true; setMuted(true) }
    } else {
      audio.pause()
      audio.muted = true
      setMuted(true)
    }
  }, [muted])

  const missingAsset = !chamber.path || !portal.path || !orb.path
  const canonicalFallback = [chamber.mode, portal.mode, orb.mode].includes('fallback')
  if (!webglAvailable) return <HomeFallback reason="no-webgl" onOrbOpen={onOrbOpen} />
  if (forcedAssetFailure) return <HomeFallback reason="forced-asset-failure" onOrbOpen={onOrbOpen} />
  if (missingAsset) return <HomeFallback reason="missing-asset" onOrbOpen={onOrbOpen} />
  if (canonicalFallback) return <HomeFallback reason="canonical-fallback" onOrbOpen={onOrbOpen} />

  const fallback = <HomeFallback reason="runtime-error" onOrbOpen={onOrbOpen} />
  return <AssetRuntimeBoundary fallback={fallback}>
    <div
      className="urai-asset-home-world"
      data-home-primary-owner="asset-driven"
      data-home-asset-mode={reviewMode ? 'disclosed-review-candidate' : 'ready'}
      data-home-personalization-mode={scene.mode}
      data-home-review-fixture={scene.reviewFixture ?? 'none'}
      data-home-orb-state={orbState}
      data-home-orb-clip={ORB_CLIP[orbState]}
      data-home-animation-owner="gltf-authored-clips"
      data-home-portal-sequence={portalEvidence}
      data-home-nearby={nearbyState ?? 'none'}
      data-home-camera-mode={dragging ? 'look' : 'embodied'}
      data-home-audio={muted ? 'muted' : 'enabled'}
      data-home-review-disclosure={reviewMode ? 'candidate-not-approved' : 'none'}
      data-home-assets-ready={assetsReady ? 'true' : 'false'}
      {...look}
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.68, 7.2], fov: 52, near: 0.08, far: 140 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={<Html center><div className="home-world-loading-canvas" role="status">Your private world is forming</div></Html>}>
          <Scene chamberPath={chamber.path} portalPath={portal.path} orbPath={orb.path} scene={scene} orbState={orbState} setOrbState={setOrbState} onOrbOpen={onOrbOpen} reducedMotion={reducedMotion} muted={muted} input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} nearbyState={nearbyState} setNearby={setNearbyState} setPortalEvidence={setPortalEvidence} onAssetsReady={markAssetsReady} interactionRef={interactionRef} />
        </Suspense>
      </Canvas>
      {!assetsReady ? <div className="home-world-loading" role="status" aria-live="polite"><span aria-hidden="true" /><strong>Your private world is forming</strong></div> : null}
      <audio ref={audioRef} src="/assets/urai/generated/audio/urai-ambient-bed-v1.opus" loop preload="none" muted aria-hidden="true" />
      <div className="home-discreet-controls">
        <button className="home-audio" type="button" aria-pressed={!muted} onClick={toggleAudio}>{muted ? 'Enable ambience' : 'Mute ambience'}</button>
        <button className="home-why" type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((value) => !value)}>Why am I seeing this?</button>
      </div>
      {whyOpen ? <aside className="home-provenance" aria-label="Home source explanation"><strong>{scene.reviewFixture === 'safe-private' ? 'Disclosed safe-private fixture' : scene.mode === 'explicit-sample' ? 'Disclosed sample world' : loading ? 'World forming' : 'Private Home source'}</strong><p>{scene.environment.explanation}</p>{scene.places.slice(0, 4).map((place) => <p key={place.id}>{place.title}: {place.explanation}</p>)}<a href="/privacy-controls">Review consent</a><a href="/passport">Correct, hide, or delete sources</a></aside> : null}
      <nav className="home-semantic-navigation sr-only" aria-label="Accessible Home destinations">
        <button type="button" aria-label="Open Orb directly" data-testid="home-semantic-orb" onClick={onOrbOpen}>Open Orb</button>
        <button type="button" aria-label="Open Ground directly" data-testid="home-semantic-ground" onClick={() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })}>Ground</button>
        <button type="button" aria-label="Open Life Map directly" data-testid="home-semantic-life-map" onClick={() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })}>Life Map</button>
      </nav>
      <MobileMovementPad input={input} label="Home movement controls" />
      <div className="sr-only" aria-live="polite">{resolveOrbSensoryOutput(orbState, reducedMotion, muted).announcement}</div>
      <style jsx>{`
        .urai-asset-home-world{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:${dragging ? 'grabbing' : 'grab'};background:#102521}
        .urai-asset-home-world :global(canvas){position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
        .home-world-loading{position:absolute;inset:0;z-index:35;display:grid;place-content:center;gap:14px;text-align:center;background:radial-gradient(circle at 50% 52%,rgba(80,139,119,.2),rgba(8,25,22,.94) 48%,#081b18 100%);color:#eef8f3;font:600 13px/1.3 system-ui;letter-spacing:.03em;pointer-events:none;transition:opacity .35s ease}.home-world-loading span{width:52px;height:52px;margin:auto;border:1px solid rgba(190,232,218,.34);border-radius:50%;box-shadow:0 0 34px rgba(109,201,174,.2),inset 0 0 22px rgba(109,201,174,.12);animation:home-forming-breath 1.8s ease-in-out infinite}.home-world-loading-canvas{padding:10px 14px;border:1px solid rgba(190,232,218,.25);border-radius:999px;background:rgba(8,25,22,.82);color:#eef8f3;font:600 12px/1.2 system-ui;white-space:nowrap}@keyframes home-forming-breath{50%{transform:scale(1.08);opacity:.68}}
        .home-discreet-controls{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:40;display:flex;gap:8px;align-items:center;opacity:.72;transition:opacity .2s ease}.home-discreet-controls:hover,.home-discreet-controls:focus-within{opacity:1}
        .home-why,.home-audio{min-height:42px;padding:0 13px;border:1px solid rgba(220,241,236,.18);border-radius:999px;background:rgba(7,18,19,.62);color:#eff9f5;font:600 11px/1 system-ui;backdrop-filter:blur(12px)}
        .home-audio[aria-pressed="true"]{border-color:rgba(157,218,198,.48);background:rgba(20,54,45,.7)}
        .home-provenance{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(64px,calc(env(safe-area-inset-bottom) + 54px));z-index:41;width:min(360px,calc(100vw - 28px));max-height:50vh;overflow:auto;padding:16px;border:1px solid rgba(220,241,236,.2);border-radius:18px;background:rgba(7,18,19,.92);color:#eff9f5;font:500 12px/1.45 system-ui}.home-provenance p{margin:8px 0}.home-provenance a{display:inline-block;margin:8px 14px 0 0;color:#bde8e5}
        :global(.home-world-context){padding:8px 12px;border:1px solid rgba(230,246,240,.22);border-radius:999px;background:rgba(6,18,19,.7);color:#f3fbf8;font:650 12px/1 system-ui;white-space:nowrap;pointer-events:none}
        @media(max-width:700px){.home-discreet-controls{bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px));max-width:calc(100vw - 28px);flex-wrap:wrap;opacity:.62}.home-provenance{bottom:max(142px,calc(env(safe-area-inset-bottom) + 132px));max-height:42vh}.home-audio,.home-why{font-size:10px;padding:0 11px}}
        @media(prefers-reduced-motion:reduce){.home-world-loading span{animation:none}}
        @media(forced-colors:active){.home-why,.home-audio{forced-color-adjust:auto;border:1px solid ButtonText;background:Canvas;color:CanvasText}.home-provenance{forced-color-adjust:auto;background:Canvas;color:CanvasText;border-color:CanvasText}}
      `}</style>
    </div>
  </AssetRuntimeBoundary>
}
