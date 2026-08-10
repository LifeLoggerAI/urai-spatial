'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stars, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const HOME_PROVIDER_ENVIRONMENT = '/assets/urai/replay/replay-memory-film-main.webp'
const HOME_FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const HOME_SCANNED_COMPOSITION_V1 = 'natural-terrain-plus-cc0-fern-plus-living-orb'
const HOME_BOUNDS = { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }
const SPAWN = new THREE.Vector3(-0.85, 0, 8.4)
const ORB = new THREE.Vector3(0, 0.82, -4.25)
const GROUND_THRESHOLD = new THREE.Vector3(-5.4, 0, -10.8)
const LIFE_MAP_LOOKOUT = new THREE.Vector3(5.4, 0, -10.8)
const ASCENT_DURATION_SECONDS = 3.4
const GROUND_DESCENT_DURATION_SECONDS = 2.6

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const ORB_PALETTE: Record<OrbState, { core: string; emissive: string; aura: string; light: string }> = {
  dormant: { core: '#b7c7c6', emissive: '#355b59', aura: '#708d8a', light: '#8ca8a6' },
  idle: { core: '#d3f4ef', emissive: '#5eaaa3', aura: '#8de1d4', light: '#a7f0e5' },
  attention: { core: '#f2fbf8', emissive: '#91d9d1', aura: '#c8f7f0', light: '#e6fffb' },
  listening: { core: '#e4fbff', emissive: '#63d7e8', aura: '#8cecff', light: '#c6f7ff' },
  thinking: { core: '#eee9ff', emissive: '#8e75d8', aura: '#a58be8', light: '#cfc2ff' },
  speaking: { core: '#fff9e8', emissive: '#e1b96d', aura: '#f1d596', light: '#fff0bd' },
  guiding: { core: '#f5fff4', emissive: '#80c58b', aura: '#a8e6ad', light: '#d3ffd5' },
  reflecting: { core: '#eef1ff', emissive: '#827bb5', aura: '#a7a2d9', light: '#d8d5ff' },
  calming: { core: '#e6fff5', emissive: '#5fae91', aura: '#86d6b9', light: '#c4f6df' },
  privacy: { core: '#f5fbff', emissive: '#6ba7d2', aura: '#8fc7ee', light: '#d2edff' },
  warning: { core: '#fff1d8', emissive: '#c07b36', aura: '#dc9952', light: '#ffd59a' },
  transition: { core: '#f8ffff', emissive: '#8cd9e3', aura: '#c3f6ff', light: '#f0ffff' },
}

type Nearby = 'orb' | 'ground' | 'life-map' | null
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type PathPoint = readonly [number, number]

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453
  return value - Math.floor(value)
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * .12) * .34 + Math.cos(z * .09) * .28 + Math.sin((x + z) * .065) * .18
  const detail = Math.sin(x * .43 + z * .19) * .055 + Math.cos(z * .34 - x * .18) * .045
  const clearing = -Math.exp(-((x / 8.2) ** 2 + ((z + 1.5) / 9.8) ** 2)) * .32
  return broad + detail + clearing - .18
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(90, 90, 180, 180)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const low = new THREE.Color('#304b39')
  const high = new THREE.Color('#61745b')
  const color = new THREE.Color()
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = terrainHeight(x, z)
    position.setY(i, y)
    const variation = THREE.MathUtils.clamp(.42 + y * .3 + Math.sin(x * .19 + z * .13) * .08, .12, .82)
    color.copy(low).lerp(high, variation)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makePathPoints(from: THREE.Vector3, to: THREE.Vector3, bend: number, count = 24): PathPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1)
    const x = THREE.MathUtils.lerp(from.x, to.x, t) + Math.sin(t * Math.PI) * bend
    const z = THREE.MathUtils.lerp(from.z, to.z, t)
    return [x, z] as const
  })
}

function makeRibbonGeometry(points: readonly PathPoint[], width: number) {
  const positions: number[] = []
  const indices: number[] = []
  points.forEach(([x, z], index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const dx = next[0] - previous[0]
    const dz = next[1] - previous[1]
    const length = Math.max(.001, Math.hypot(dx, dz))
    const nx = -dz / length
    const nz = dx / length
    const half = width * (.46 + Math.sin(index * 1.71) * .028)
    const y = terrainHeight(x, z) + .018
    positions.push(x + nx * half, y, z + nz * half, x - nx * half, y, z - nz * half)
    if (index < points.length - 1) {
      const a = index * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeIrregularPatchGeometry(centerX: number, centerZ: number, radiusX: number, radiusZ: number, salt: number, segments = 36) {
  const shape = new THREE.Shape()
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const radius = .92 + seeded(index, salt) * .16
    const x = Math.cos(angle) * radiusX * radius
    const y = -Math.sin(angle) * radiusZ * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape, 3)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(centerX, terrainHeight(centerX, centerZ) + .02, centerZ)
  geometry.computeVertexNormals()
  return geometry
}

function makeRidgeGeometry(width: number, amplitude: number, salt: number, segments = 72) {
  const shape = new THREE.Shape()
  const bottom = -10
  const topAt = (index: number) => {
    const x = (index / segments - .5) * width
    return .8 + Math.sin(x * .075 + salt) * amplitude + Math.sin(x * .17 + salt * 1.7) * amplitude * .34 + seeded(index, salt) * amplitude * .24
  }
  shape.moveTo(-width / 2, bottom)
  shape.lineTo(-width / 2, topAt(0))
  for (let index = 1; index <= segments; index += 1) {
    const x = (index / segments - .5) * width
    shape.lineTo(x, topAt(index))
  }
  shape.lineTo(width / 2, bottom)
  shape.closePath()
  return new THREE.ShapeGeometry(shape, 2)
}

const TERRAIN_GEOMETRY = makeTerrainGeometry()
const MAIN_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(SPAWN, new THREE.Vector3(0, 0, -5.4), -.72, 30), 1.35)
const GROUND_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(new THREE.Vector3(-.2, 0, -5.15), GROUND_THRESHOLD, -.48, 18), .92)
const LIFE_MAP_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(new THREE.Vector3(.25, 0, -5.15), LIFE_MAP_LOOKOUT, .55, 18), .92)
const ORB_CLEARING_GEOMETRY = makeIrregularPatchGeometry(ORB.x, ORB.z, 2.7, 1.85, 41)
const POND_GEOMETRY = makeIrregularPatchGeometry(5.55, -11.15, 3.25, 2.15, 73)
const POND_INNER_GEOMETRY = makeIrregularPatchGeometry(5.55, -11.15, 2.9, 1.86, 91)
const RIDGE_NEAR = makeRidgeGeometry(88, 2.45, .6)
const RIDGE_MID = makeRidgeGeometry(96, 2.8, 1.7)
const RIDGE_FAR = makeRidgeGeometry(104, 3.1, 2.8)

const FERN_PLACEMENTS = [
  [-11.2,5.8,.58,-.2],[-9.6,3.8,.66,.6],[-8.4,1.4,.72,1.5],[-10.6,-1.7,.62,2.2],[-9.4,-4.5,.8,-1.1],[-11.3,-7.8,.68,.2],[-9.3,-11.2,.78,2.7],[-7.4,-13.8,.62,.8],
  [10.8,5.1,.62,.4],[9.1,2.9,.72,-1.4],[8.2,.4,.58,1.9],[10.5,-2.1,.68,-.7],[9.6,-5.4,.76,2.3],[11.2,-8.2,.66,.4],[9.4,-12.7,.74,-1.9],[7.8,-14.7,.6,1.1],
  [-6.8,4.9,.52,2],[-5.8,1.8,.56,-.9],[-5.3,-1.8,.62,.6],[-6.2,-5.7,.54,1.7],[-6.8,-9.6,.66,-2.2],[-5.1,-12.9,.58,.1],
  [5.9,4.4,.5,-1.8],[5.1,1.2,.58,.9],[5.4,-2.5,.52,2.4],[6.4,-6.1,.58,-.5],[7.4,-9.1,.62,1.5],[7.8,-12.5,.54,-2.4],
  [-3.8,-7.8,.46,.6],[-2.8,-10.2,.5,-1.2],[2.9,-8.1,.46,2.1],[3.6,-10.3,.5,-.6],
] as const

function Terrain({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain">
    <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
      <meshStandardMaterial color="#ffffff" vertexColors roughness={.98} metalness={0} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, .7, -2]} onClick={onWalk}>
      <planeGeometry args={[28, 34]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function SanctuaryPath() {
  return <group name="home-sanctuary-path" userData={{ role: 'walkable-natural-stone-thread' }}>
    <mesh geometry={MAIN_PATH_GEOMETRY} receiveShadow><meshStandardMaterial color="#6b7367" roughness={.98} metalness={0} /></mesh>
    <mesh geometry={GROUND_PATH_GEOMETRY} receiveShadow><meshStandardMaterial color="#596a5f" roughness={1} metalness={0} /></mesh>
    <mesh geometry={LIFE_MAP_PATH_GEOMETRY} receiveShadow><meshStandardMaterial color="#5b7069" roughness={1} metalness={0} /></mesh>
  </group>
}

function Vegetation() {
  const fern = useGLTF(HOME_FERN_MODEL)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#76946f', roughness: .94, metalness: 0, side: THREE.DoubleSide }), [])
  useEffect(() => () => material.dispose(), [material])
  const instances = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,rotation], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, terrainHeight(x,z) + .025, z)
    object.rotation.y = rotation
    object.scale.set(scale * (1 + seeded(index, 16) * .08), scale * (.9 + seeded(index, 22) * .18), scale * (1 + seeded(index, 29) * .08))
    object.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = material; child.castShadow = index < 14; child.receiveShadow = true } })
    return object
  }), [fern.scene, material])
  return <group name="home-living-vegetation" userData={{ role: 'edge-clustered-scanned-cc0-nature' }}>{instances.map((object) => <primitive key={object.name} object={object} />)}</group>
}

function Horizon() {
  return <group name="home-mountain-horizon">
    <mesh geometry={RIDGE_FAR} position={[0, -1.05, -54]}><meshBasicMaterial color="#29454b" side={THREE.DoubleSide} /></mesh>
    <mesh geometry={RIDGE_MID} position={[0, -1.35, -46]}><meshBasicMaterial color="#31514f" side={THREE.DoubleSide} /></mesh>
    <mesh geometry={RIDGE_NEAR} position={[0, -1.65, -39]}><meshBasicMaterial color="#385b50" side={THREE.DoubleSide} /></mesh>
    <group position={[-17, 13.5, -52]}>
      <mesh><sphereGeometry args={[1.5, 32, 32]} /><meshBasicMaterial color="#e5eee4" toneMapped={false} /></mesh>
      <mesh scale={1.7}><sphereGeometry args={[1.5, 24, 24]} /><meshBasicMaterial color="#d9ede4" transparent opacity={.035} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  </group>
}

function SanctuaryPavilion() {
  return <group name="home-sanctuary-pavilion" userData={{ role: 'open-air-natural-stone-resting-place' }}>
    <mesh geometry={ORB_CLEARING_GEOMETRY} receiveShadow><meshStandardMaterial color="#566356" roughness={1} metalness={0} /></mesh>
    <mesh position={[-2.85, terrainHeight(-2.85,-6.15) + .34, -6.15]} rotation={[0,.28,-.04]} scale={[1.5,.34,.72]} castShadow receiveShadow>
      <sphereGeometry args={[1, 36, 22]} /><meshStandardMaterial color="#667166" roughness={.98} metalness={0} />
    </mesh>
    <mesh position={[2.75, terrainHeight(2.75,-6.35) + .29, -6.35]} rotation={[.02,-.24,.03]} scale={[1.35,.3,.66]} castShadow receiveShadow>
      <sphereGeometry args={[1, 36, 22]} /><meshStandardMaterial color="#5e6b60" roughness={.99} metalness={0} />
    </mesh>
    <mesh position={[-.25, terrainHeight(-.25,-7.1) + .22, -7.1]} rotation={[0,.05,0]} scale={[1.1,.22,.52]} receiveShadow>
      <sphereGeometry args={[1, 32, 18]} /><meshStandardMaterial color="#526158" roughness={1} metalness={0} />
    </mesh>
  </group>
}

function Water() {
  return <group name="home-reflecting-water" userData={{ role: 'integrated-natural-pond' }}>
    <mesh geometry={POND_GEOMETRY} receiveShadow><meshStandardMaterial color="#40564e" roughness={1} metalness={0} /></mesh>
    <mesh geometry={POND_INNER_GEOMETRY} position={[0,.018,0]}>
      <meshPhysicalMaterial color="#477b82" roughness={.24} metalness={0} clearcoat={.58} clearcoatRoughness={.2} transparent opacity={.78} />
    </mesh>
  </group>
}

function OrbMotes({ reducedMotion, color }: { reducedMotion: boolean; color: string }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(54 * 3)
    for (let index = 0; index < 54; index += 1) {
      const radius = .72 + seeded(index, 51) * .46
      const angle = seeded(index, 52) * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = (seeded(index, 53) - .5) * 1.15
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return next
  }, [])
  useFrame((_, delta) => { if (!reducedMotion && ref.current) ref.current.rotation.y += delta * .065 })
  return <points ref={ref} geometry={geometry}><pointsMaterial color={color} size={.024} transparent opacity={.38} depthWrite={false} toneMapped={false} /></points>
}

function OrbGroundGlow({ state }: { state: OrbState }) {
  const palette = ORB_PALETTE[state]
  return <group position={[ORB.x, terrainHeight(ORB.x, ORB.z) + .032, ORB.z]} rotation={[-Math.PI / 2, 0, 0]}>
    <mesh><circleGeometry args={[1.34, 64]} /><meshBasicMaterial color={palette.aura} transparent opacity={.042} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
    <mesh position={[0,0,.008]}><ringGeometry args={[.82,.86,64]} /><meshBasicMaterial color={palette.light} transparent opacity={.18} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[0,0,.012]}><ringGeometry args={[1.12,1.15,64]} /><meshBasicMaterial color={palette.aura} transparent opacity={.07} depthWrite={false} toneMapped={false} /></mesh>
  </group>
}

function Orb({ onOpen, reducedMotion, state }: { onOpen: () => void; reducedMotion: boolean; state: OrbState }) {
  const root = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [reducedMotion, state])
  const palette = ORB_PALETTE[state]
  useFrame(({ clock }) => {
    if (!root.current) return
    const speed = state === 'speaking' ? 2.4 : state === 'thinking' ? 1.8 : state === 'listening' ? 1.25 : state === 'transition' ? 1.45 : .82
    const amplitude = state === 'speaking' ? .035 : state === 'thinking' ? .03 : state === 'listening' ? .026 : .022
    if (reducedMotion) {
      root.current.position.y = ORB.y
      root.current.rotation.y = 0
      root.current.scale.setScalar(1)
    } else {
      root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * speed) * .028
      root.current.rotation.y = clock.elapsedTime * (.065 + speed * .02)
      root.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * speed) * amplitude)
    }
    if (light.current) {
      const pulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * speed) * .13
      light.current.intensity = sensory.light.intensity * 2.28 + pulse
    }
  })
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, material: sensory.material, movement: sensory.movement }}>
    <mesh castShadow scale={.56}><sphereGeometry args={[1, 64, 64]} /><meshPhysicalMaterial color={palette.core} emissive={palette.emissive} emissiveIntensity={state === 'speaking' ? 1.26 : state === 'thinking' ? 1.02 : .9} roughness={.2} metalness={.03} clearcoat={1} clearcoatRoughness={.13} /></mesh>
    <mesh scale={.33}><sphereGeometry args={[1, 48, 48]} /><meshBasicMaterial color={palette.light} transparent opacity={state === 'speaking' ? .56 : .42} depthWrite={false} toneMapped={false} /></mesh>
    <mesh scale={state === 'listening' ? .74 : state === 'speaking' ? .77 : .7}><sphereGeometry args={[1, 48, 48]} /><meshBasicMaterial color={palette.aura} transparent opacity={state === 'warning' ? .075 : state === 'speaking' ? .065 : .038} depthWrite={false} toneMapped={false} /></mesh>
    <mesh rotation={[Math.PI / 2, .12, 0]}><torusGeometry args={[.72,.009,8,96]} /><meshBasicMaterial color={palette.light} transparent opacity={.18} depthWrite={false} toneMapped={false} /></mesh>
    <mesh rotation={[Math.PI / 2.45, 0, .6]}><torusGeometry args={[.84,.006,8,96]} /><meshBasicMaterial color={palette.aura} transparent opacity={.08} depthWrite={false} toneMapped={false} /></mesh>
    <OrbMotes reducedMotion={reducedMotion} color={palette.light} />
    <pointLight ref={light} color={palette.light} intensity={sensory.light.intensity * 2.28} distance={state === 'speaking' ? 12 : 10} decay={2} />
  </group>
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ representation: 'privacy-preserving-first-person-presence' }}>
    <mesh position={[0,.012,-.52]} rotation={[-Math.PI/2,0,0]} scale={[.52,1.2,1]}><circleGeometry args={[.36,40]} /><meshBasicMaterial color="#020806" transparent opacity={.12} depthWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onGround() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onLifeMap() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, reducedMotion, onGroundComplete, onTransitionSequence }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; groundDescent: boolean; reducedMotion: boolean; onGroundComplete: () => void; onTransitionSequence: (value: TransitionSequence) => void }) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const transitionStarted = useRef<number | null>(null)
  const transitionIssued = useRef(false)
  const lastTransitionSequence = useRef<TransitionSequence>('idle')
  const desired = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0,0,-1))
  const look = useRef(new THREE.Vector3())

  const place = useCallback(() => {
    const portrait = size.height > size.width
    camera.position.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, 1.22 + pitch.current, look.current.z)
  }, [camera, pitch, size.height, size.width, yaw])
  useLayoutEffect(() => place(), [place])

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState()
    const ascending = store.phase === 'ASCENT'
    if (groundDescent || ascending) {
      if (transitionStarted.current === null) transitionStarted.current = clock.elapsedTime
      const duration = reducedMotion ? .42 : ascending ? ASCENT_DURATION_SECONDS : GROUND_DESCENT_DURATION_SECONDS
      const t = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime - transitionStarted.current) / duration, 0, 1), 0, 1)
      const sequence: TransitionSequence = ascending
        ? t < .16 ? 'life-map:opening' : t < .84 ? 'life-map:traversal' : 'life-map:closing'
        : t < .16 ? 'ground:opening' : t < .84 ? 'ground:traversal' : 'ground:closing'
      if (sequence !== lastTransitionSequence.current) { lastTransitionSequence.current = sequence; onTransitionSequence(sequence) }
      if (ascending) {
        camera.position.lerp(new THREE.Vector3(0, 44, -54), 1 - Math.pow(.0018, delta))
        camera.lookAt(0, 20 + t * 28, -38 - t * 24)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }) }
      } else {
        camera.position.lerp(new THREE.Vector3(-5.3, -2.4, -16.5), 1 - Math.pow(.002, delta))
        camera.lookAt(-5.4, -1.2, -18)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; onGroundComplete() }
      }
      return
    }
    transitionStarted.current = null
    transitionIssued.current = false
    if (lastTransitionSequence.current !== 'idle') { lastTransitionSequence.current = 'idle'; onTransitionSequence('idle') }
    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.15, acceleration: 9, deceleration: 12 })
    if (target.current && position.current.distanceTo(target.current) < .2) target.current = null
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current }
    const portrait = size.height > size.width
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    camera.position.lerp(desired.current, 1 - Math.pow(.001, delta))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, 1.22 + pitch.current, look.current.z)
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.4], ['ground', GROUND_THRESHOLD, 2.8], ['life-map', LIFE_MAP_LOOKOUT, 2.8]]
    let next: Nearby = null, best = Infinity
    for (const [name, poi, radius] of candidates) { const distance = Math.hypot(position.current.x - poi.x, position.current.z - poi.z); if (distance < radius && distance < best) { next = name; best = distance } }
    if (next !== lastNearby.current) { lastNearby.current = next; onNearby(next) }
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const { scene } = useThree(); const frames = useRef(0); const done = useRef(false)
  useFrame(() => { if (done.current || ++frames.current < 4) return; const required = ['home-authored-terrain','home-authored-embodied-self','home-orb-sanctuary','home-ground-environmental-threshold','home-life-map-sky-lookout','home-mountain-horizon','home-living-vegetation','home-sanctuary-pavilion','home-sanctuary-path']; if (!required.every((name) => scene.getObjectByName(name))) return; done.current = true; onReady() })
  return null
}

function Scene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; onReady: () => void; onTransitionSequence: (value: TransitionSequence) => void; groundDescent: boolean; reducedMotion: boolean; orbState: OrbState }) {
  const phase = useSceneStore((state) => state.phase)
  const cosmic = phase === 'ASCENT'
  return <>
    <color attach="background" args={[cosmic ? '#01050b' : '#496866']} />
    <Stars radius={190} depth={90} count={cosmic ? 2200 : 360} factor={cosmic ? 2.7 : .72} saturation={.12} fade speed={props.reducedMotion ? 0 : .02} />
    <fogExp2 attach="fog" args={[cosmic ? '#050b14' : '#314f49', cosmic ? .0017 : .0062]} />
    <ambientLight intensity={cosmic ? .13 : .72} color="#d9e7dc" />
    <hemisphereLight args={['#c8dddc','#1e2b20',cosmic ? .22 : 1.05]} />
    <directionalLight position={[8,18,7]} intensity={cosmic ? .34 : 2.35} color="#f2ecd8" castShadow />
    <directionalLight position={[-10,7,-8]} intensity={cosmic ? .1 : .54} color="#87b7ad" />
    <Terrain target={props.target} />
    <SanctuaryPath />
    <Horizon />
    <Vegetation />
    <SanctuaryPavilion />
    <Water />
    <OrbGroundGlow state={props.orbState} />
    <Orb onOpen={props.onOrbOpen} reducedMotion={props.reducedMotion} state={props.orbState} />
    <EmbodiedPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} reducedMotion={props.reducedMotion} onGroundComplete={props.onGroundComplete} onTransitionSequence={props.onTransitionSequence} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionPolished({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [groundDescent, setGroundDescent] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobileControls, setMobileControls] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const phase = useSceneStore((state) => state.phase)
  const progress = useSceneStore((state) => state.progress)
  const inputLocked = useSceneStore((state) => state.inputLocked)
  const yaw = useRef(.055), pitch = useRef(-.04), target = useRef<THREE.Vector3 | null>(null), avatar = useRef<THREE.Group | null>(null)

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) { setOrbState('attention'); onOrbOpen() } }, [groundDescent, onOrbOpen])
  const startGround = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState('transition'); setPortalSequence('ground:opening'); setGroundDescent(true) }, [groundDescent])
  const finishGround = useCallback(() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), [])
  const startLifeMap = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === 'ASCENT') return; target.current = null; setOrbState('transition'); setPortalSequence('life-map:opening'); store.enterLifeMap() }, [groundDescent])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') startGround(); else if (nearby === 'life-map') startLifeMap() }, [nearby, openOrb, startGround, startLifeMap])
  const reset = useCallback(() => { if (!groundDescent) { yaw.current = .055; pitch.current = -.04; target.current = SPAWN.clone() } }, [groundDescent])
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interact, onReset: reset })
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== 'ASCENT', sensitivity: .0031, minPitch: -.55, maxPitch: .68, onDragState: setDragging })

  useEffect(() => { const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); const mobile = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(reduced.matches); setMobileControls(mobile.matches) }; apply(); reduced.addEventListener?.('change', apply); mobile.addEventListener?.('change', apply); return () => { reduced.removeEventListener?.('change', apply); mobile.removeEventListener?.('change', apply) } }, [])
  useEffect(() => {
    const onOrbState = (event: CustomEvent<OrbStateEventDetail>) => {
      if (phase === 'ASCENT' || groundDescent) return
      setOrbState(event.detail.state)
    }
    window.addEventListener(URAI_ORB_STATE_EVENT, onOrbState)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, onOrbState)
  }, [groundDescent, phase])
  useEffect(() => { if (phase !== 'ASCENT' && !groundDescent) setOrbState('idle') }, [groundDescent, phase])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; const store = useSceneStore.getState(); if (store.phase === 'ASCENT') { event.preventDefault(); store.setPhase('HOME'); store.unlock(); setPortalSequence('idle'); setOrbState('idle') } else if (groundDescent) { event.preventDefault(); setGroundDescent(false); setPortalSequence('idle'); setOrbState('idle') } }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [groundDescent])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const transitioning = phase === 'ASCENT' || groundDescent
  const orbSensory = resolveOrbSensoryOutput(orbState, reducedMotion, true)
  const context = phase === 'ASCENT' ? 'Ascending through the sky' : groundDescent ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'Look to the sky' : null

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="polyhaven-fern-02-geometry-v1.glb local-three-dimensional-terrain living-orb reflecting-water" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={groundDescent ? 'descent' : phase === 'ASCENT' ? 'ascent' : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={groundDescent ? 'GROUND_DESCENT' : phase} data-home-ascent-progress={phase === 'ASCENT' ? progress.toFixed(3) : '0.000'} data-home-input-locked={transitioning || inputLocked ? 'true' : 'false'} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture="none" data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-orb-animation={orbSensory.animation} data-home-orb-material={orbSensory.material} data-home-orb-movement={orbSensory.movement} data-home-orb-caption={orbSensory.caption} data-home-orb-reduced-motion={reducedMotion ? 'true' : 'false'} data-home-animation-owner={HOME_SCANNED_COMPOSITION_V1} data-testid="home-visible-navigable-sanctuary-world" style={{ position:'relative', overflow:'hidden', background:'#172c27' }} {...look}>
    <div style={{ position:'absolute', inset:0, zIndex:1 }}><Canvas className={styles.canvas} dpr={[1,1.35]} shadows camera={{ position:[SPAWN.x,1.68,SPAWN.z], fov:50, near:.05, far:300 }} gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.22; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGround} onGroundComplete={finishGround} onLifeMap={startLifeMap} onReady={() => setSceneReady(true)} onTransitionSequence={setPortalSequence} groundDescent={groundDescent} reducedMotion={reducedMotion} orbState={orbState} /></Canvas></div>
    <header className={styles.brand} aria-label="URAI" style={{ zIndex:3 }}><strong>URAI</strong></header>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite" style={{ zIndex:3 }}>{context}</div> : null}
    {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The Orb companion is physically present in the Home environment.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
  </main>
}

useGLTF.preload(HOME_FERN_MODEL)
