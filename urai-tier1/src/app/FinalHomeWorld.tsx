'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type Props = { onOrbOpen: () => void; webglAvailable: true }
type Nearby = 'orb' | 'avatar' | 'ground' | 'life-map' | null

type SceneProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<Nearby>
  nearbyState: Nearby
  reducedMotion: boolean
  shellRef: MutableRefObject<HTMLDivElement | null>
  position: MutableRefObject<THREE.Vector3>
  velocity: MutableRefObject<THREE.Vector3>
  onNearbyChange: (target: Nearby) => void
  onOrbOpen: () => void
  onTravel: (destination: 'life-map' | 'infrastructure-hub') => void
}

const HOME_BOUNDS = { minX: -8.6, maxX: 8.6, minZ: -10.4, maxZ: 8.6 }
const HOME_SPAWN = new THREE.Vector3(0, 0, 7.6)
const ORB_POSITION = new THREE.Vector3(0, 1.55, -1.2)
const AVATAR_POSITION = new THREE.Vector3(-2.25, 0, -0.15)
const GROUND_GATE_POSITION = new THREE.Vector3(0, 0, -8.9)
const LIFE_MAP_POSITION = new THREE.Vector3(0, 0, -5.5)
const HOME_OBSTACLES = [
  { x: AVATAR_POSITION.x, z: AVATAR_POSITION.z, radius: 0.85 },
  { x: ORB_POSITION.x, z: ORB_POSITION.z, radius: 0.82 },
]
const PAVERS = [6.6, 5.25, 3.9, 2.55, 1.2, -0.15, -1.5, -2.85, -4.2, -5.55, -6.9, -8.25]
const MEMORY_SCENES = [
  { id: 'place-loved', side: -1, z: 3.25, accent: '#dcbf7e', kind: 'home' },
  { id: 'ride-home', side: 1, z: 1.2, accent: '#77c5c2', kind: 'ride' },
  { id: 'voices-dinner', side: -1, z: -2.5, accent: '#a495c7', kind: 'family' },
  { id: 'song-returned', side: 1, z: -4.45, accent: '#c287a7', kind: 'music' },
  { id: 'quiet-growth', side: -1, z: -7.2, accent: '#78a27c', kind: 'tree' },
] as const

function useMediaPreference(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [query])
  return matches
}

function distance2D(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.12, 0.2, 1.55, 10]} /><meshStandardMaterial color="#3b3027" roughness={0.94} /></mesh>
      <mesh position={[0, 1.85, 0]} castShadow scale={[0.95, 1.15, 0.95]}><icosahedronGeometry args={[0.76, 2]} /><meshStandardMaterial color="#4d7158" roughness={0.9} /></mesh>
      <mesh position={[-0.42, 1.52, 0.08]} castShadow scale={0.62}><icosahedronGeometry args={[0.62, 1]} /><meshStandardMaterial color="#45664f" roughness={0.92} /></mesh>
      <mesh position={[0.45, 1.58, -0.08]} castShadow scale={0.68}><icosahedronGeometry args={[0.62, 1]} /><meshStandardMaterial color="#55795f" roughness={0.92} /></mesh>
    </group>
  )
}

function MemoryContent({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'home') return <group><mesh position={[0, 0.68, -0.24]} castShadow><boxGeometry args={[1.75, 1.22, 0.9]} /><meshStandardMaterial color="#342f2a" roughness={0.84} /></mesh><mesh position={[0, 1.52, -0.24]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.22, 0.78, 4]} /><meshStandardMaterial color="#27211e" roughness={0.9} /></mesh>{[-0.5, 0.5].map((x) => <mesh key={x} position={[x, 0.75, 0.22]}><boxGeometry args={[0.4, 0.5, 0.04]} /><meshStandardMaterial color="#ffd7a0" emissive="#ffd7a0" emissiveIntensity={0.85} /></mesh>)}</group>
  if (kind === 'ride') return <group position={[0, 0.42, 0]}>{[-0.62, 0.62].map((x) => <mesh key={x} position={[x, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.42, 0.045, 12, 42]} /><meshStandardMaterial color="#12191b" metalness={0.72} roughness={0.34} /></mesh>)}<mesh position={[0, 0.35, 0]}><boxGeometry args={[1.2, 0.08, 0.08]} /><meshStandardMaterial color={accent} metalness={0.58} roughness={0.3} /></mesh></group>
  if (kind === 'family') return <group><mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.92, 0.98, 0.16, 32]} /><meshStandardMaterial color="#66523d" roughness={0.62} /></mesh>{[-1.2, -0.4, 0.4, 1.2].map((angle, index) => <group key={angle} position={[Math.sin(angle) * 1.22, 0, Math.cos(angle) * 0.72]} rotation={[0, angle + Math.PI, 0]}><mesh position={[0, 1.05, 0]} castShadow><sphereGeometry args={[0.17, 18, 16]} /><meshStandardMaterial color={index % 2 ? '#725f55' : '#897267'} roughness={0.8} /></mesh><mesh position={[0, 0.63, 0]} castShadow><cylinderGeometry args={[0.2, 0.26, 0.66, 14]} /><meshStandardMaterial color={index % 2 ? '#435969' : '#5c516b'} roughness={0.82} /></mesh></group>)}</group>
  if (kind === 'music') return <group><mesh position={[0, 0.62, -0.08]} castShadow><boxGeometry args={[1.75, 1.08, 0.72]} /><meshStandardMaterial color="#171a1f" metalness={0.32} roughness={0.34} /></mesh>{Array.from({ length: 11 }, (_, index) => <mesh key={index} position={[-0.75 + index * 0.15, 0.58, 0.66]}><boxGeometry args={[0.12, 0.035, index % 2 ? 0.32 : 0.42]} /><meshStandardMaterial color={index % 2 ? '#34353d' : '#d5d0c6'} /></mesh>)}</group>
  return <group><Tree position={[0, 0, -0.1]} scale={0.9} /><Tree position={[-0.9, 0, 0.2]} scale={0.52} /><Tree position={[0.9, 0, 0.22]} scale={0.46} /></group>
}

function MemoryRoom({ spec, walkTarget }: { spec: typeof MEMORY_SCENES[number]; walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const x = spec.side * 5.25
  const approach = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    walkTarget.current = new THREE.Vector3(x, 0, spec.z + 1.7)
  }
  return (
    <group position={[x, 0, spec.z]} rotation={[0, spec.side * -0.35, 0]} name={`home-memory-vignette-${spec.id}`}>
      <mesh position={[0, 1.25, -0.88]} castShadow receiveShadow><boxGeometry args={[3.45, 2.5, 0.24]} /><meshStandardMaterial color="#152326" roughness={0.82} /></mesh>
      <mesh position={[-1.72, 1.2, -0.48]} castShadow><boxGeometry args={[0.24, 2.4, 1.08]} /><meshStandardMaterial color="#223236" roughness={0.8} /></mesh>
      <mesh position={[1.72, 1.2, -0.48]} castShadow><boxGeometry args={[0.24, 2.4, 1.08]} /><meshStandardMaterial color="#223236" roughness={0.8} /></mesh>
      <mesh position={[0, 2.42, -0.48]} castShadow><boxGeometry args={[3.7, 0.22, 1.08]} /><meshStandardMaterial color="#2a3a3d" roughness={0.72} metalness={0.12} /></mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[3.65, 0.1, 2.9]} /><meshStandardMaterial color="#1b2a2d" roughness={0.86} /></mesh>
      <MemoryContent kind={spec.kind} accent={spec.accent} />
      <pointLight position={[0, 1.5, 0.72]} color={spec.accent} intensity={0.82} distance={5.2} decay={2} />
      <mesh position={[0, 1.25, 0.12]} onClick={approach}><boxGeometry args={[3.8, 2.8, 3.1]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh>
    </group>
  )
}

function SanctuaryWorld({ walkTarget, reducedMotion }: { walkTarget: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean }) {
  const dust = useRef<THREE.Points>(null)
  const dustPositions = useMemo(() => {
    const data = new Float32Array(900)
    for (let i = 0; i < 300; i += 1) {
      const seed = Math.sin((i + 863) * 12.9898) * 43758.5453
      const r = seed - Math.floor(seed)
      data[i * 3] = (r - 0.5) * 22
      data[i * 3 + 1] = 0.2 + ((r * 7.31) % 1) * 6
      data[i * 3 + 2] = -11 + ((r * 13.7) % 1) * 21
    }
    return data
  }, [])
  useFrame((_, delta) => { if (dust.current && !reducedMotion) dust.current.rotation.y += delta * 0.004 })
  return (
    <group name="home-visible-navigable-sanctuary-world" data-testid="urai-home-visible-world">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, -1]} receiveShadow><circleGeometry args={[13.5, 96]} /><meshStandardMaterial color="#0e181a" roughness={0.96} /></mesh>
      {PAVERS.map((z, index) => <mesh key={z} position={[Math.sin(index * 0.5) * 0.08, 0.01, z]} castShadow receiveShadow><boxGeometry args={[2.55 + (index % 3) * 0.12, 0.12, 0.9]} /><meshStandardMaterial color={index % 2 ? '#26363a' : '#2c3c40'} roughness={0.78} /></mesh>)}
      {[-1, 1].flatMap((side) => [5.3, 1.9, -1.5, -4.9, -8.1].map((z, row) => <group key={`${side}-${z}`} position={[side * 7.05, 0, z]}><mesh position={[0, 1.45, 0]} castShadow receiveShadow><boxGeometry args={[0.62, 2.9, 1.18]} /><meshStandardMaterial color="#1a292d" roughness={0.76} metalness={0.12} /></mesh><mesh position={[side * -0.38, 2.72, 0]} castShadow><boxGeometry args={[1.32, 0.26, 1.2]} /><meshStandardMaterial color={row % 2 ? '#625d55' : '#706344'} roughness={0.3} metalness={0.72} /></mesh><pointLight position={[side * -0.4, 2.18, 0.35]} color={row % 2 ? '#a8d8d4' : '#e5cb96'} intensity={0.38} distance={4} /></group>))}
      <mesh position={[0, 0.02, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[2.05, 64]} /><meshStandardMaterial color="#193035" roughness={0.18} metalness={0.12} /></mesh>
      <mesh position={[0, 0.06, -1.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.78, 64]} /><meshPhysicalMaterial color="#34757a" emissive="#1e5155" emissiveIntensity={0.18} roughness={0.1} transmission={0.28} clearcoat={1} transparent opacity={0.82} /></mesh>
      {MEMORY_SCENES.map((spec) => <MemoryRoom key={spec.id} spec={spec} walkTarget={walkTarget} />)}
      <points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[dustPositions, 3]} /></bufferGeometry><pointsMaterial color="#d8eee8" size={0.025} transparent opacity={0.34} depthWrite={false} /></points>
    </group>
  )
}

function HomeFloor({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const choose = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta <= 6) walkTarget.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ)) }
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -1]} onClick={choose} data-testid="urai-home-walkable-surface"><planeGeometry args={[19, 21]} /><meshBasicMaterial transparent opacity={0.001} depthWrite={false} colorWrite={false} /></mesh>
}

function Orb({ walkTarget, nearby, onOrbOpen }: Pick<SceneProps, 'walkTarget' | 'nearby' | 'onOrbOpen'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (nearby.current === 'orb') onOrbOpen(); else walkTarget.current = new THREE.Vector3(0, 0, 0.4) }
  return <group position={ORB_POSITION} name="home-authored-orb" data-testid="urai-home-webgl-orb"><mesh onClick={activate} castShadow><sphereGeometry args={[0.62, 42, 42]} /><meshPhysicalMaterial color="#b7f0e9" emissive="#5fc7c7" emissiveIntensity={1.15} roughness={0.12} transmission={0.2} clearcoat={1} /></mesh><pointLight color="#7edfd9" intensity={3.2} distance={8} /><mesh onClick={activate}><sphereGeometry args={[0.95, 22, 22]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh></group>
}

function EmbodiedSelf({ walkTarget, nearby }: Pick<SceneProps, 'walkTarget' | 'nearby'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (nearby.current === 'avatar') window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'final-home-world' } })); else walkTarget.current = new THREE.Vector3(-2.25, 0, 1.2) }
  return <group position={AVATAR_POSITION} name="home-embodied-self" data-testid="urai-home-embodied-avatar"><mesh position={[0, 2.55, 0]} onClick={activate} castShadow><sphereGeometry args={[0.24, 28, 28]} /><meshPhysicalMaterial color="#d6edf0" emissive="#a7a0d8" emissiveIntensity={0.2} transparent opacity={0.84} roughness={0.34} /></mesh><mesh position={[0, 1.32, 0]} onClick={activate} castShadow><capsuleGeometry args={[0.3, 1.46, 12, 24]} /><meshPhysicalMaterial color="#8bc9cf" emissive="#69b7bd" emissiveIntensity={0.14} transparent opacity={0.72} roughness={0.44} /></mesh></group>
}

function Threshold({ kind, position, walkTarget, active, onTravel }: { kind: 'ground' | 'life-map'; position: THREE.Vector3; active: boolean } & Pick<SceneProps, 'walkTarget' | 'onTravel'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (active) onTravel(kind === 'ground' ? 'infrastructure-hub' : 'life-map'); else walkTarget.current = new THREE.Vector3(position.x, 0, position.z + 1.4) }
  return <group position={position} name={`home-${kind}-physical-threshold`} data-testid={`urai-home-${kind}-walk-threshold`} userData={{ label: kind === 'ground' ? 'Ground threshold' : 'Life Map threshold' }}><mesh onClick={activate} position={[0, kind === 'ground' ? 1.6 : 0.05, 0]} rotation={kind === 'ground' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]} castShadow>{kind === 'ground' ? <boxGeometry args={[2.5, 3.2, 0.32]} /> : <circleGeometry args={[1.55, 64]} />}<meshPhysicalMaterial color={kind === 'ground' ? '#28464b' : '#526b79'} emissive={kind === 'ground' ? '#16383d' : '#334e66'} emissiveIntensity={active ? 0.55 : 0.18} roughness={0.28} metalness={0.28} transmission={kind === 'life-map' ? 0.22 : 0} transparent opacity={active ? 0.94 : 0.78} /></mesh><pointLight position={[0, kind === 'ground' ? 1.6 : 0.6, 0.5]} color={kind === 'ground' ? '#8ad4d0' : '#b8c9ff'} intensity={active ? 1.6 : 0.55} distance={5} /></group>
}

function synchronizeHomeOwner(shell: HTMLDivElement, position: THREE.Vector3, moving: boolean, renderedFrames: number) {
  const distance = distance2D(position, HOME_SPAWN)
  shell.dataset.homeReady = renderedFrames >= 8 ? 'true' : 'warming'
  shell.dataset.homePlayerX = position.x.toFixed(3)
  shell.dataset.homePlayerZ = position.z.toFixed(3)
  shell.dataset.homeDistance = distance.toFixed(3)
  shell.dataset.homeMoving = moving ? 'true' : 'false'
  shell.style.setProperty('--home-parallax-x', `${(-position.x * 3.2).toFixed(1)}px`)
  shell.style.setProperty('--home-parallax-y', `${((position.z - HOME_SPAWN.z) * 1.35).toFixed(1)}px`)
}

function PlayerCamera({ input, yaw, pitch, walkTarget, nearby, reducedMotion, shellRef, position, velocity, onNearbyChange }: Pick<SceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearby' | 'reducedMotion' | 'shellRef' | 'position' | 'velocity' | 'onNearbyChange'>) {
  const { camera } = useThree()
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const renderedFrames = useRef(0)
  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target: walkTarget, yaw: yaw.current, delta, speed: reducedMotion ? 2.3 : 3.25, acceleration: reducedMotion ? 16 : 10, deceleration: reducedMotion ? 20 : 12, bounds: HOME_BOUNDS, obstacles: HOME_OBSTACLES })
    let nearest: Nearby = null
    let minDistance = Infinity
    const dOrb = distance2D(position.current, ORB_POSITION); if (dOrb < minDistance) { minDistance = dOrb; nearest = 'orb' }
    const dAvatar = distance2D(position.current, AVATAR_POSITION); if (dAvatar < minDistance) { minDistance = dAvatar; nearest = 'avatar' }
    const dGround = distance2D(position.current, GROUND_GATE_POSITION); if (dGround < minDistance) { minDistance = dGround; nearest = 'ground' }
    const dLifeMap = distance2D(position.current, LIFE_MAP_POSITION); if (dLifeMap < minDistance) { minDistance = dLifeMap; nearest = 'life-map' }
    const nextNearby = nearest && minDistance < (nearest === 'ground' ? 1.9 : 1.65) ? nearest : null
    nearby.current = nextNearby
    if (nextNearby !== lastNearby.current) { lastNearby.current = nextNearby; onNearbyChange(nextNearby) }
    camera.position.set(position.current.x, 1.68, position.current.z)
    direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
    camera.lookAt(lookAt.current.copy(camera.position).add(direction.current))
    renderedFrames.current += 1
    if (shellRef.current) synchronizeHomeOwner(shellRef.current, position.current, motion.moving, renderedFrames.current)
  })
  return null
}

function Scene(props: SceneProps) {
  return <><color attach="background" args={['#071112']} /><fog attach="fog" args={['#071112', 9, 31]} /><PlayerCamera {...props} /><hemisphereLight intensity={0.82} color="#dfe9df" groundColor="#152326" /><directionalLight position={[4, 10, 6]} intensity={1.7} color="#fff2d0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} /><Stars radius={60} depth={35} count={380} factor={1.6} saturation={0.08} fade speed={props.reducedMotion ? 0 : 0.018} /><SanctuaryWorld walkTarget={props.walkTarget} reducedMotion={props.reducedMotion} /><HomeFloor walkTarget={props.walkTarget} /><Orb walkTarget={props.walkTarget} nearby={props.nearby} onOrbOpen={props.onOrbOpen} /><EmbodiedSelf walkTarget={props.walkTarget} nearby={props.nearby} /><Threshold kind="life-map" position={LIFE_MAP_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'life-map'} onTravel={props.onTravel} /><Threshold kind="ground" position={GROUND_GATE_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'ground'} onTravel={props.onTravel} /></>
}

export default function FinalHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.03)
  const position = useRef(HOME_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const nearby = useRef<Nearby>(null)
  const [nearbyState, setNearbyState] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => requestUraiWorldTravel(destination === 'life-map' ? { destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' } : { destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), [])
  const activateNearby = useCallback(() => { if (nearby.current === 'orb') onOrbOpen(); if (nearby.current === 'avatar') window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'final-home-world' } })); if (nearby.current === 'ground') travel('infrastructure-hub'); if (nearby.current === 'life-map') travel('life-map') }, [onOrbOpen, travel])
  const synchronizeOwner = useCallback(() => {
    if (shellRef.current) synchronizeHomeOwner(shellRef.current, position.current, velocity.current.lengthSq() > 0.0001, 8)
  }, [])
  const reset = useCallback(() => { position.current.copy(HOME_SPAWN); velocity.current.set(0, 0, 0); walkTarget.current = null; yaw.current = 0; pitch.current = -0.03; synchronizeOwner() }, [synchronizeOwner])
  const input = useMovementInput({ onInteract: activateNearby, onEscape: reset, onReset: reset })
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0023 : 0.0037, onDragState: setDragging })

  useEffect(() => {
    const synchronizeAfterInput = () => {
      synchronizeOwner()
      window.requestAnimationFrame(synchronizeOwner)
    }
    synchronizeOwner()
    window.addEventListener('keyup', synchronizeAfterInput)
    window.addEventListener('pointerup', synchronizeAfterInput)
    window.addEventListener('touchend', synchronizeAfterInput)
    return () => {
      window.removeEventListener('keyup', synchronizeAfterInput)
      window.removeEventListener('pointerup', synchronizeAfterInput)
      window.removeEventListener('touchend', synchronizeAfterInput)
    }
  }, [synchronizeOwner])

  if (!webglAvailable) return null
  const prompt = nearbyState === 'orb' ? 'Open the Orb' : nearbyState === 'avatar' ? 'Meet your embodied self' : nearbyState === 'ground' ? 'Enter Ground' : nearbyState === 'life-map' ? 'Ascend to Life Map' : ''
  return (
    <div ref={shellRef} className="urai-final-home-world" style={{ '--home-parallax-x': '0.0px', '--home-parallax-y': '0.0px' } as React.CSSProperties} data-home-spatial-renderer="webgl" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-visible-world="final-physical-sanctuary-memory-rooms" data-home-ready="warming" data-home-player-x="0.000" data-home-player-z="7.600" data-home-distance="0.000" data-home-moving="false" data-home-camera-mode={dragging ? 'look' : 'embodied'} aria-label="Walkable URAI personal sanctuary" {...look}>
      <Canvas shadows className="urai-final-home-canvas" dpr={[1, 1.4]} camera={{ position: [0, 1.68, 7.6], fov: 55, near: 0.08, far: 120 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <Scene input={input} yaw={yaw} pitch={pitch} walkTarget={walkTarget} nearby={nearby} nearbyState={nearbyState} reducedMotion={reducedMotion} shellRef={shellRef} position={position} velocity={velocity} onNearbyChange={setNearbyState} onOrbOpen={onOrbOpen} onTravel={travel} />
      </Canvas>
      {prompt ? <button className="urai-final-home-context" type="button" onClick={activateNearby}>{prompt}</button> : null}
      <MovementHelp realm="Home" summary="Walk through your private sanctuary, memory rooms, Orb, Ground doorway, and Life Map threshold." controls="WASD or arrows move. Click the ground to walk. Drag to look. Enter interacts. R resets." />
      <MobileMovementPad input={input} label="Home movement controls" />
      <nav className="urai-final-home-doorways" data-movement-ui="true" aria-label="Direct Home destinations">
        <button type="button" aria-label="Open Orb directly" onClick={onOrbOpen}>Orb</button>
        <button type="button" aria-label="Open Ground directly" onClick={() => travel('infrastructure-hub')}>Ground</button>
        <button type="button" aria-label="Open Life Map directly" onClick={() => travel('life-map')}>Life Map</button>
      </nav>
      <style jsx>{`
        .urai-final-home-world{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:${dragging ? 'grabbing' : 'grab'};background:#071112}
        :global(.urai-final-home-canvas){position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
        .urai-final-home-context{position:absolute;left:50%;bottom:max(86px,calc(env(safe-area-inset-bottom) + 76px));z-index:2147483500;transform:translateX(-50%);min-height:48px;padding:0 18px;border:1px solid rgba(227,241,233,.3);border-radius:999px;background:rgba(8,20,21,.78);backdrop-filter:blur(12px);color:#f5fbf7;font:700 12px/1 system-ui;letter-spacing:.04em}
        .urai-final-home-doorways{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483600;display:flex;gap:8px}.urai-final-home-doorways button{min-height:48px;padding:0 15px;border:1px solid rgba(227,241,233,.24);border-radius:999px;background:rgba(8,20,21,.72);backdrop-filter:blur(12px);color:#f5fbf7;font:750 11px/1 system-ui;letter-spacing:.03em;cursor:pointer;pointer-events:auto}
        @media(max-width:700px){.urai-final-home-context{bottom:max(180px,calc(env(safe-area-inset-bottom) + 170px));max-width:calc(100vw - 32px)}.urai-final-home-doorways{left:max(9px,env(safe-area-inset-left));right:max(9px,env(safe-area-inset-right));bottom:max(9px,env(safe-area-inset-bottom));justify-content:center}.urai-final-home-doorways button{flex:1;max-width:112px;padding:0 10px}}
        @media(prefers-reduced-motion:reduce){.urai-final-home-context,.urai-final-home-doorways button{backdrop-filter:none}}
      `}</style>
    </div>
  )
}
