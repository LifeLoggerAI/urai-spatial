'use client'

import { Html, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber'
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
const GROUND_POSITION = new THREE.Vector3(-4.25, 0.25, -6.5)
const LIFE_MAP_POSITION = new THREE.Vector3(4.25, 0.55, -6.6)
const ORB_STATES: readonly OrbState[] = ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']

const TONE = {
  clear: '#73c7b5',
  soft: '#b6c9c1',
  active: '#a88ce0',
  heavy: '#a06f78',
  recovering: '#8ad2a4',
  forming: '#7fa8aa',
} as const

type Props = { onOrbOpen: () => void; webglAvailable: true }
type Nearby = 'orb' | 'ground' | 'life-map' | 'self' | null

type PortalPhase = 'closed' | 'available' | 'attention' | 'active' | 'opening' | 'traversal' | 'closing'

class AssetRuntimeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function AssetModel({ path, name, ...props }: { path: string; name: string } & ThreeElements['group']) {
  const gltf = useGLTF(path)
  return <primitive object={gltf.scene.clone(true)} name={name} {...props} />
}

function SanctuaryTerrain({ tone, reducedMotion }: { tone: keyof typeof TONE; reducedMotion: boolean }) {
  const breath = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!breath.current || reducedMotion) return
    breath.current.position.y = Math.sin(clock.elapsedTime * 0.22) * 0.025
  })
  const pathMaterial = TONE[tone]
  const curves = useMemo(() => [
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.03, 7.5), new THREE.Vector3(-0.8, 0.04, 3.8), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(-4.25, 0.14, -6.5)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.03, 7.5), new THREE.Vector3(0.8, 0.04, 3.8), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(4.25, 0.38, -6.6)]),
  ], [])
  return <group ref={breath} name="home-authored-terrain">
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, -1]} receiveShadow>
      <circleGeometry args={[13.5, 96]} />
      <meshPhysicalMaterial color="#152321" roughness={0.9} metalness={0.05} clearcoat={0.08} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.265, -1.2]} receiveShadow>
      <ringGeometry args={[4.1, 11.8, 96]} />
      <meshStandardMaterial color="#20362f" roughness={0.82} metalness={0.04} />
    </mesh>
    {curves.map((curve, index) => <mesh key={index} castShadow receiveShadow>
      <tubeGeometry args={[curve, 72, 0.32, 10, false]} />
      <meshPhysicalMaterial color={index === 0 ? '#385347' : '#354657'} emissive={pathMaterial} emissiveIntensity={0.07} roughness={0.7} clearcoat={0.18} />
    </mesh>)}
    <mesh position={[0, 0.02, -0.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[2.25, 64]} />
      <meshPhysicalMaterial color="#263b36" roughness={0.48} metalness={0.12} clearcoat={0.35} />
    </mesh>
    {[[-7.2, -3.2, 1.2], [-6.2, -7.3, 1.5], [6.8, -3.6, 1.1], [6.1, -7.6, 1.4], [-8.1, 2.1, 0.9], [7.8, 1.7, 1.05]].map(([x, z, scale], index) => (
      <group key={index} position={[x, -0.18, z]} scale={scale}>
        <mesh castShadow position={[0, 0.6, 0]}><coneGeometry args={[0.72, 2.6, 9]} /><meshStandardMaterial color="#233d31" roughness={0.92} /></mesh>
        <mesh castShadow position={[0.15, 1.75, -0.05]}><icosahedronGeometry args={[0.7, 2]} /><meshStandardMaterial color="#315947" emissive="#18362d" emissiveIntensity={0.1} roughness={0.86} /></mesh>
      </group>
    ))}
    {Array.from({ length: 28 }, (_, index) => {
      const side = index % 2 ? 1 : -1
      const row = Math.floor(index / 2)
      const z = 6.4 - row * 0.95
      const x = side * (2.4 + (row % 3) * 0.55)
      const height = 0.45 + (index % 5) * 0.12
      return <mesh key={index} position={[x, height / 2 - 0.18, z]} rotation={[0, index * 0.7, side * 0.08]} castShadow>
        <coneGeometry args={[0.08, height, 5]} />
        <meshStandardMaterial color={index % 3 === 0 ? '#6e8f70' : '#466c58'} roughness={0.9} />
      </mesh>
    })}
  </group>
}

function MemoryPlace({ place, position, tone, reducedMotion }: { place: ReturnType<typeof useHomePersonalizedScene>['scene']['places'][number]; position: readonly [number, number, number]; tone: keyof typeof TONE; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.18 + position[0]) * 0.08
    root.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.42 + position[2]) * 0.035
  })
  const accent = TONE[tone]
  const form = place.form
  return <group ref={root} position={position} name={`home-place-${place.id}`} userData={{ explanation: place.explanation, sample: place.sample, form }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1.18, 48]} />
      <meshPhysicalMaterial color="#243832" emissive={accent} emissiveIntensity={0.07} roughness={0.7} clearcoat={0.2} />
    </mesh>
    {form === 'relationship-presence' ? <>
      <mesh position={[-0.34, 0.92, 0]} castShadow><sphereGeometry args={[0.31, 24, 18]} /><meshPhysicalMaterial color="#a5b8b0" roughness={0.55} clearcoat={0.2} /></mesh>
      <mesh position={[0.34, 0.92, 0.08]} castShadow><sphereGeometry args={[0.31, 24, 18]} /><meshPhysicalMaterial color="#7fa8a1" roughness={0.55} clearcoat={0.2} /></mesh>
      <mesh position={[0, 0.55, 0]}><torusGeometry args={[0.58, 0.04, 12, 48]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.65} /></mesh>
    </> : form === 'path' ? <>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.38, 0.9, 48, 1, 0.25, Math.PI * 1.5]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} side={THREE.DoubleSide} /></mesh>
      {[0, 1, 2].map((step) => <mesh key={step} position={[-0.55 + step * 0.55, 0.18 + step * 0.19, -0.18 * step]} castShadow><dodecahedronGeometry args={[0.22, 0]} /><meshPhysicalMaterial color="#8da19a" roughness={0.48} /></mesh>)}
    </> : form === 'weather' ? <>
      <mesh position={[0, 0.75, 0]}><icosahedronGeometry args={[0.72, 2]} /><meshPhysicalMaterial color="#283b42" emissive={accent} emissiveIntensity={0.42} transparent opacity={0.78} roughness={0.3} clearcoat={0.5} /></mesh>
      {[0, 1, 2].map((ring) => <mesh key={ring} position={[0, 0.75, 0]} rotation={[ring * 0.7, ring * 0.4, ring * 0.8]}><torusGeometry args={[0.86 + ring * 0.12, 0.018, 8, 64]} /><meshBasicMaterial color={accent} transparent opacity={0.34} /></mesh>)}
    </> : form === 'threshold' ? <>
      <mesh position={[0, 0.86, 0]} castShadow><torusGeometry args={[0.62, 0.15, 18, 64]} /><meshPhysicalMaterial color="#6b8078" emissive={accent} emissiveIntensity={0.25} roughness={0.35} clearcoat={0.5} /></mesh>
      <mesh position={[0, 0.84, 0]}><circleGeometry args={[0.5, 48]} /><meshBasicMaterial color={accent} transparent opacity={0.12} side={THREE.DoubleSide} /></mesh>
    </> : form === 'world-forming' ? <>
      {[0, 1, 2, 3].map((piece) => <mesh key={piece} position={[Math.sin(piece * 1.7) * 0.55, 0.45 + piece * 0.22, Math.cos(piece * 1.7) * 0.32]} rotation={[piece * 0.4, piece * 0.8, 0]} castShadow><tetrahedronGeometry args={[0.28 + piece * 0.04, 0]} /><meshPhysicalMaterial color="#6f8680" emissive={accent} emissiveIntensity={0.18} roughness={0.5} /></mesh>)}
    </> : <>
      <mesh position={[0, 0.72, 0]} castShadow><dodecahedronGeometry args={[0.68, 1]} /><meshPhysicalMaterial color="#728b82" emissive={accent} emissiveIntensity={0.2} roughness={0.46} clearcoat={0.28} /></mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.92, 0.025, 10, 64]} /><meshBasicMaterial color={accent} transparent opacity={0.48} /></mesh>
    </>}
    <pointLight position={[0, 1.1, 0.5]} color={accent} intensity={0.55} distance={3.8} decay={2} />
  </group>
}

function PersonalizedPlaces({ scene, reducedMotion }: { scene: ReturnType<typeof useHomePersonalizedScene>['scene']; reducedMotion: boolean }) {
  const positions = [[-5.45, 0.02, 3.1], [5.25, 0.02, 2.2], [-5.6, 0.02, -1.5], [5.7, 0.02, -2.7], [-5.3, 0.02, -6.7], [5.3, 0.02, -7.3]] as const
  return <group name={`home-personalized-places-${scene.mode}`}>
    {scene.places.slice(0, positions.length).map((place, index) => <MemoryPlace key={place.id} place={place} position={positions[index]} tone={scene.environment.weatherTone} reducedMotion={reducedMotion} />)}
  </group>
}

function EmbodiedSelf({ reducedMotion, onApproach }: { reducedMotion: boolean; onApproach: (event: ThreeEvent<MouseEvent>) => void }) {
  const root = useRef<THREE.Group>(null)
  const bodyProfile = useMemo(() => [
    new THREE.Vector2(0.18, 0), new THREE.Vector2(0.42, 0.28), new THREE.Vector2(0.5, 0.9),
    new THREE.Vector2(0.36, 1.55), new THREE.Vector2(0.28, 2.05), new THREE.Vector2(0.08, 2.3),
  ], [])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = 0.26 + Math.sin(clock.elapsedTime * 0.35) * 0.06
    root.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 0.5) * 0.025
  })
  return <group ref={root} position={[-2.15, 0.02, -0.2]} rotation={[0, 0.26, 0]} name="home-authored-embodied-self" onClick={onApproach}>
    <mesh castShadow position={[0, 0.18, 0]}><latheGeometry args={[bodyProfile, 36]} /><meshPhysicalMaterial color="#667b74" emissive="#294842" emissiveIntensity={0.16} roughness={0.55} metalness={0.08} clearcoat={0.3} /></mesh>
    <mesh castShadow position={[0, 2.56, 0]}><sphereGeometry args={[0.31, 32, 24]} /><meshPhysicalMaterial color="#889b95" roughness={0.48} clearcoat={0.22} /></mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[0.62, 48]} /><shadowMaterial transparent opacity={0.34} /></mesh>
    <mesh position={[0, 1.65, 0.12]}><torusGeometry args={[0.48, 0.018, 8, 64]} /><meshBasicMaterial color="#9fc8bb" transparent opacity={0.28} /></mesh>
    <pointLight position={[0, 1.6, 0.8]} color="#abc7c3" intensity={0.5} distance={3.6} />
  </group>
}

function OrbRepresentation({ path, state, reducedMotion, muted, nearby, onActivate }: { path: string; state: OrbState; reducedMotion: boolean; muted: boolean; nearby: boolean; onActivate: (event: ThreeEvent<MouseEvent>) => void }) {
  const group = useRef<THREE.Group>(null)
  const orbitA = useRef<THREE.Mesh>(null)
  const orbitB = useRef<THREE.Mesh>(null)
  const output = resolveOrbSensoryOutput(state, reducedMotion, muted)
  useFrame(({ clock }, delta) => {
    const node = group.current
    if (!node) return
    const cadence = state === 'thinking' ? 1.8 : state === 'speaking' ? 1.35 : state === 'calming' ? 0.42 : 0.8
    node.position.y = ORB_POSITION.y + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * cadence) * (state === 'attention' ? 0.13 : 0.08))
    const spin = state === 'transition' ? 1.7 : state === 'thinking' ? 1.05 : state === 'reflecting' ? 0.5 : 0.18
    if (!reducedMotion) {
      if (orbitA.current) orbitA.current.rotation.z += delta * spin
      if (orbitB.current) orbitB.current.rotation.x -= delta * spin * 0.76
    }
  })
  const color = output.light.temperature === 'warm' ? '#f0c98a' : output.light.temperature === 'violet' ? '#b9a0ff' : '#bde8e5'
  const pulse = state === 'speaking' ? 1.18 : state === 'attention' ? 1.12 : state === 'warning' ? 1.08 : 1
  return <group ref={group} position={ORB_POSITION} name={`home-orb-state-${state}`} onClick={onActivate}>
    <AssetModel path={path} name="home-candidate-orb" scale={[1.25 * pulse, 1.25 * pulse, 1.25 * pulse]} />
    <mesh ref={orbitA} rotation={[0.7, 0.2, 0.1]}><torusGeometry args={[0.96, 0.026, 10, 72]} /><meshBasicMaterial color={color} transparent opacity={state === 'privacy' ? 0.86 : 0.5} /></mesh>
    <mesh ref={orbitB} rotation={[1.3, 0.3, 0.8]}><torusGeometry args={[1.13, 0.018, 10, 72]} /><meshBasicMaterial color={color} transparent opacity={state === 'transition' ? 0.78 : 0.32} /></mesh>
    <pointLight color={color} intensity={output.light.intensity * (nearby ? 2.35 : 1.55)} distance={8.5} decay={2} castShadow />
    <mesh scale={nearby ? 1.45 : pulse}><sphereGeometry args={[0.78, 32, 24]} /><meshBasicMaterial color={color} transparent opacity={state === 'warning' ? 0.16 : 0.07} depthWrite={false} /></mesh>
    {state === 'guiding' || state === 'transition' ? Array.from({ length: 8 }, (_, index) => <mesh key={index} position={[Math.sin(index * 1.8) * 1.35, -0.65 + index * 0.18, Math.cos(index * 1.8) * 0.75]}><sphereGeometry args={[0.035 + index * 0.005, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={0.7 - index * 0.05} /></mesh>) : null}
  </group>
}

function DestinationPortal({ destination, path, position, nearby, phase, reducedMotion, onClick }: { destination: 'ground' | 'life-map'; path: string; position: THREE.Vector3; nearby: boolean; phase: PortalPhase; reducedMotion: boolean; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const root = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const active = nearby || ['attention', 'active', 'opening', 'traversal'].includes(phase)
    const targetScale = phase === 'traversal' ? 1.18 : active ? 1.06 : 1
    root.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, delta * 5))
    if (inner.current && !reducedMotion) inner.current.rotation.z += delta * (destination === 'life-map' ? 0.22 : -0.12)
    if (!reducedMotion) root.current.position.y = position.y + Math.sin(clock.elapsedTime * 0.45 + (destination === 'life-map' ? 1 : 0)) * 0.035
  })
  const ascent = destination === 'life-map'
  const color = ascent ? '#9db4ff' : '#78d7b4'
  const fill = ascent ? '#5869c8' : '#315f50'
  return <group ref={root} position={position} rotation={[0, ascent ? -0.28 : 0.28, 0]} onClick={onClick} name={`home-${destination}-portal-${phase}`} userData={{ destination, phase }}>
    <AssetModel path={path} name={`home-${destination}-portal-source`} scale={[0.68, 0.68, 0.68]} />
    {ascent ? <>
      <mesh ref={inner} position={[0, 0, 0.08]}><torusKnotGeometry args={[1.12, 0.075, 96, 12, 2, 3]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={nearby ? 1.4 : 0.55} roughness={0.25} /></mesh>
      <mesh position={[0, 0, -0.02]}><circleGeometry args={[1.65, 64]} /><meshBasicMaterial color={fill} transparent opacity={nearby ? 0.24 : 0.1} side={THREE.DoubleSide} /></mesh>
      {[0, 1, 2, 3, 4].map((step) => <mesh key={step} position={[0, -2.45 + step * 0.32, 0.15 + step * 0.16]}><boxGeometry args={[2.8 - step * 0.3, 0.12, 0.72]} /><meshPhysicalMaterial color="#3a475c" emissive={color} emissiveIntensity={0.08 + step * 0.03} roughness={0.6} /></mesh>)}
    </> : <>
      <mesh ref={inner} position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.26, 0.11, 16, 80]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={nearby ? 1.2 : 0.45} roughness={0.3} /></mesh>
      <mesh position={[0, -0.18, -0.02]}><circleGeometry args={[1.58, 64]} /><meshBasicMaterial color={fill} transparent opacity={nearby ? 0.26 : 0.11} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-1.48, -1.2, 0]} castShadow><boxGeometry args={[0.42, 2.7, 0.7]} /><meshPhysicalMaterial color="#31463d" roughness={0.56} clearcoat={0.25} /></mesh>
      <mesh position={[1.48, -1.2, 0]} castShadow><boxGeometry args={[0.42, 2.7, 0.7]} /><meshPhysicalMaterial color="#31463d" roughness={0.56} clearcoat={0.25} /></mesh>
      {[0, 1, 2].map((step) => <mesh key={step} position={[0, -2.25 - step * 0.22, 0.2 + step * 0.42]}><boxGeometry args={[3.5 + step * 0.28, 0.16, 0.72]} /><meshPhysicalMaterial color="#263830" roughness={0.72} /></mesh>)}
    </>}
    {Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2
      const radius = 1.85 + (index % 3) * 0.12
      const y = ascent ? Math.sin(angle) * 1.8 : Math.sin(angle) * 1.55 - 0.15
      return <mesh key={index} position={[Math.cos(angle) * radius, y, 0.35 + (index % 2) * 0.2]}><sphereGeometry args={[nearby ? 0.055 : 0.035, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={nearby ? 0.85 : 0.42} /></mesh>
    })}
    <pointLight color={color} intensity={nearby ? 2.1 : 0.72} distance={7.5} decay={2} />
  </group>
}

function Player({ input, yaw, pitch, target, position, velocity, nearby, setNearby, reducedMotion }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; position: MutableRefObject<THREE.Vector3>; velocity: MutableRefObject<THREE.Vector3>; nearby: MutableRefObject<Nearby>; setNearby: (value: Nearby) => void; reducedMotion: boolean }) {
  const { camera } = useThree()
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const previous = useRef<Nearby>(null)
  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: reducedMotion ? 2.2 : 3.1, acceleration: 11, deceleration: 14, bounds: BOUNDS, obstacles: [{ x: 0, z: -0.75, radius: 1.05 }] })
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB_POSITION, 1.8], ['ground', GROUND_POSITION, 2.2], ['life-map', LIFE_MAP_POSITION, 2.2], ['self', new THREE.Vector3(-2.2, 0, -0.4), 1.7]]
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
  const [groundPhase, setGroundPhase] = useState<PortalPhase>('available')
  const [lifeMapPhase, setLifeMapPhase] = useState<PortalPhase>('available')
  useEffect(() => {
    setGroundPhase(nearbyState === 'ground' ? 'active' : 'available')
    setLifeMapPhase(nearbyState === 'life-map' ? 'active' : 'available')
  }, [nearbyState])
  const travel = (destination: 'life-map' | 'ground') => {
    setOrbState('transition')
    if (destination === 'life-map') setLifeMapPhase('opening')
    else setGroundPhase('opening')
    window.setTimeout(() => requestUraiWorldTravel(destination === 'life-map'
      ? { destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
      : { destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), reducedMotion ? 80 : 420)
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
  const background = scene.environment.timeOfDay === 'day' ? '#17312e' : scene.environment.timeOfDay === 'dusk' ? '#172332' : scene.environment.weatherTone === 'heavy' ? '#160f18' : '#071311'
  const fog = scene.environment.weatherTone === 'heavy' ? '#20151d' : scene.environment.weatherTone === 'recovering' ? '#0d2620' : '#091a18'
  return <>
    <color attach="background" args={[background]} />
    <fog attach="fog" args={[fog, 8, 38]} />
    <Player input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} setNearby={setNearby} reducedMotion={reducedMotion} />
    <hemisphereLight intensity={1.15} color="#e4f4e9" groundColor="#183027" />
    <directionalLight position={[6, 12, 7]} intensity={2.05} color="#ffe3b1" castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-7, 5, -8]} intensity={0.72} color="#86a8d9" />
    <SanctuaryTerrain tone={scene.environment.weatherTone} reducedMotion={reducedMotion} />
    <AssetModel path={chamberPath} name="home-review-entry-chamber" position={[0, -0.12, -1.2]} scale={[1.12, 1.12, 1.12]} />
    <PersonalizedPlaces scene={scene} reducedMotion={reducedMotion} />
    <EmbodiedSelf reducedMotion={reducedMotion} onApproach={approach(new THREE.Vector3(-2.2, 0, 1.2))} />
    <OrbRepresentation path={orbPath} state={orbState} reducedMotion={reducedMotion} muted={muted} nearby={nearbyState === 'orb'} onActivate={activateOrb} />
    <DestinationPortal destination="ground" path={portalPath} position={GROUND_POSITION} nearby={nearbyState === 'ground'} phase={groundPhase} reducedMotion={reducedMotion} onClick={(event) => { event.stopPropagation(); nearby.current === 'ground' ? travel('ground') : target.current = new THREE.Vector3(-3.4, 0, -5.1) }} />
    <DestinationPortal destination="life-map" path={portalPath} position={LIFE_MAP_POSITION} nearby={nearbyState === 'life-map'} phase={lifeMapPhase} reducedMotion={reducedMotion} onClick={(event) => { event.stopPropagation(); nearby.current === 'life-map' ? travel('life-map') : target.current = new THREE.Vector3(3.4, 0, -5.1) }} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -1]} receiveShadow onClick={(event) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }}>
      <planeGeometry args={[20, 22]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    {nearbyState ? <Html center position={[0, 3.0, -1.1]}><div className="home-world-context">{nearbyState === 'orb' ? resolveOrbSensoryOutput(orbState, reducedMotion, muted).caption : nearbyState === 'ground' ? 'The path descends into Ground' : nearbyState === 'life-map' ? 'The path rises into Life Map' : 'Your private embodied presence'}</div></Html> : null}
  </>
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const reviewMode = useMemo(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('homeAssetReview') === '1', [])
  const { scene, loading } = useHomePersonalizedScene()
  const chamber = resolveHomeRuntimeAsset('home-entry-chamber-model-v1', reviewMode)
  const portal = resolveHomeRuntimeAsset('portal-ring-master-glb-v1', reviewMode)
  const orb = resolveHomeRuntimeAsset('urai-orb-avatar-glb-v1', reviewMode)
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(true)
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

  useEffect(() => {
    if (scene.mode === 'permission-limited') setOrbState('privacy')
    else if (scene.mode === 'offline' || scene.mode === 'unavailable') setOrbState('warning')
    else setOrbState('idle')
  }, [scene.mode])

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

  if (!webglAvailable || !chamber.path || !portal.path || !orb.path || [chamber.mode, portal.mode, orb.mode].includes('fallback')) {
    return <FinalHomeWorld webglAvailable={true} onOrbOpen={onOrbOpen} />
  }

  const fallback = <FinalHomeWorld webglAvailable={true} onOrbOpen={onOrbOpen} />
  return <AssetRuntimeBoundary fallback={fallback}>
    <div className="urai-asset-home-world" data-home-primary-owner="asset-driven" data-home-asset-mode={reviewMode ? 'disclosed-review-candidate' : 'ready'} data-home-personalization-mode={scene.mode} data-home-review-fixture={scene.reviewFixture ?? 'none'} data-home-orb-state={orbState} data-home-camera-mode={dragging ? 'look' : 'embodied'} data-home-audio={muted ? 'muted' : 'enabled'} {...look}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.68, 7.2], fov: 54, near: 0.08, far: 130 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene chamberPath={chamber.path} portalPath={portal.path} orbPath={orb.path} scene={scene} orbState={orbState} setOrbState={setOrbState} onOrbOpen={onOrbOpen} reducedMotion={reducedMotion} muted={muted} input={input} yaw={yaw} pitch={pitch} target={target} position={position} velocity={velocity} nearby={nearby} nearbyState={nearbyState} setNearby={setNearbyState} />
        </Suspense>
      </Canvas>
      <audio ref={audioRef} src="/assets/urai/generated/audio/urai-ambient-bed-v1.opus" loop preload="none" muted aria-hidden="true" />
      {reviewMode ? <div role="status" className="home-review-disclosure">Review candidate composition — visually improved, still unapproved.</div> : null}
      <div className="home-discreet-controls">
        <button className="home-audio" type="button" aria-pressed={!muted} onClick={toggleAudio}>{muted ? 'Enable ambience' : 'Mute ambience'}</button>
        <button className="home-why" type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((value) => !value)}>Why am I seeing this?</button>
      </div>
      {whyOpen ? <aside className="home-provenance" aria-label="Home source explanation"><strong>{scene.reviewFixture === 'safe-private' ? 'Disclosed safe-private fixture' : scene.mode === 'explicit-sample' ? 'Disclosed sample world' : loading ? 'World forming' : 'Private Home source'}</strong><p>{scene.environment.explanation}</p>{scene.places.slice(0, 4).map((place) => <p key={place.id}>{place.title}: {place.explanation}</p>)}<a href="/privacy-controls">Review consent</a><a href="/passport">Correct, hide, or delete sources</a></aside> : null}
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
        .home-discreet-controls{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:40;display:flex;gap:8px;align-items:center}
        .home-why,.home-audio{min-height:44px;padding:0 14px;border:1px solid rgba(220,241,236,.24);border-radius:999px;background:rgba(7,18,19,.72);color:#eff9f5;font:600 12px/1 system-ui;backdrop-filter:blur(12px)}
        .home-audio[aria-pressed="true"]{border-color:rgba(157,218,198,.55);background:rgba(20,54,45,.76)}
        .home-provenance{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(68px,calc(env(safe-area-inset-bottom) + 58px));z-index:41;width:min(360px,calc(100vw - 28px));max-height:50vh;overflow:auto;padding:16px;border:1px solid rgba(220,241,236,.2);border-radius:18px;background:rgba(7,18,19,.92);color:#eff9f5;font:500 12px/1.45 system-ui}.home-provenance p{margin:8px 0}.home-provenance a{display:inline-block;margin:8px 14px 0 0;color:#bde8e5}
        :global(.home-world-context){padding:8px 12px;border:1px solid rgba(230,246,240,.25);border-radius:999px;background:rgba(6,18,19,.76);color:#f3fbf8;font:650 12px/1 system-ui;white-space:nowrap;pointer-events:none}
        @media(max-width:700px){.home-review-disclosure{max-width:calc(100vw - 32px);text-align:center}.home-discreet-controls{bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px));max-width:calc(100vw - 28px);flex-wrap:wrap}.home-provenance{bottom:max(146px,calc(env(safe-area-inset-bottom) + 136px));max-height:42vh}.home-audio,.home-why{font-size:11px;padding:0 12px}}
      `}</style>
    </div>
  </AssetRuntimeBoundary>
}
