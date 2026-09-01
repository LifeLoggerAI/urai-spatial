'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'
const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'

const SPAWN = new THREE.Vector3(0, 0.04, 4.6)
const ORB = new THREE.Vector3(0, 2.18, -9.1)
const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
const BOUNDS = { minX: -6.2, maxX: 6.2, minZ: -10.8, maxZ: 6.7 }

type Vec3 = readonly [number, number, number]
type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const FRAGMENTS: Array<{ id: string; position: Vec3; rotation: Vec3; scale: Vec3; color: string }> = [
  { id: 'port-crown', position: [-0.28, 0.52, -0.08], rotation: [0.32, -0.24, -0.22], scale: [0.30, 0.48, 0.36], color: '#5b625d' },
  { id: 'starboard-crown', position: [0.30, 0.48, -0.10], rotation: [0.26, 0.28, 0.20], scale: [0.29, 0.46, 0.35], color: '#4f5b56' },
  { id: 'port-shoulder', position: [-0.50, 0.10, 0.01], rotation: [0.08, -0.38, -0.42], scale: [0.24, 0.54, 0.42], color: '#394743' },
  { id: 'starboard-shoulder', position: [0.49, 0.08, 0.02], rotation: [-0.10, 0.40, 0.40], scale: [0.23, 0.52, 0.41], color: '#48524d' },
  { id: 'port-keel', position: [-0.30, -0.48, -0.02], rotation: [-0.34, 0.20, -0.18], scale: [0.25, 0.46, 0.36], color: '#50483d' },
  { id: 'starboard-keel', position: [0.29, -0.50, -0.04], rotation: [-0.30, -0.20, 0.17], scale: [0.24, 0.45, 0.35], color: '#3e4945' },
  { id: 'port-fin', position: [-0.61, -0.26, -0.18], rotation: [-0.20, 0.30, -0.56], scale: [0.17, 0.34, 0.29], color: '#2f3c39' },
  { id: 'starboard-fin', position: [0.61, -0.24, -0.19], rotation: [0.22, -0.26, 0.54], scale: [0.17, 0.34, 0.29], color: '#3a4541' },
  { id: 'aperture-upper', position: [0, 0.20, 0.30], rotation: [0.18, 0, 0], scale: [0.33, 0.18, 0.12], color: '#273a36' },
  { id: 'aperture-lower', position: [0, -0.18, 0.31], rotation: [-0.18, 0, 0], scale: [0.31, 0.17, 0.12], color: '#26332f' },
]

function useStoneTextures() {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const clone = (source: THREE.Texture, color = false) => {
      const texture = source.clone(); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.2, 3.2); texture.anisotropy = 4; texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.needsUpdate = true; return texture
    }
    return { color: clone(colorSource, true), normal: clone(normalSource), arm: clone(armSource) }
  }, [armSource, colorSource, normalSource])
}

function prepareAsset(source: THREE.Object3D, span: number, mode: 'rock' | 'metal' | 'light') {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((entry) => {
      const clone = entry.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = Math.max(clone.roughness, mode === 'rock' ? 0.80 : 0.52)
        clone.metalness = mode === 'rock' ? Math.min(clone.metalness, 0.03) : Math.min(Math.max(clone.metalness, 0.22), 0.60)
        clone.envMapIntensity = mode === 'rock' ? 0.58 : 0.64
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
    object.castShadow = true; object.receiveShadow = true
  })
  const box = new THREE.Box3().setFromObject(root); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3())
  root.position.sub(center); root.scale.setScalar(span / Math.max(size.x, size.y, size.z, 0.001)); return root
}

function ProductionAsset({ url, name, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, mode }: { url: string; name: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; mode: 'rock' | 'metal' | 'light' }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => prepareAsset(gltf.scene, span, mode), [gltf.scene, mode, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ runtimeAsset: url, provenance: 'poly-haven-cc0-committed', visibleProductionAsset: true }}><primitive object={model} /></group>
}

function OrbPanelGeometry() {
  return useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.56, -0.22, -0.50, 0.44, -0.18, -0.58, 0.34, 0.24, -0.52, -0.28, 0.30, -0.48,
      -0.22, -0.14, 0.62, 0.30, -0.10, 0.58, 0.22, 0.18, 0.64, -0.18, 0.23, 0.60,
    ]), 3))
    geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0])
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function OrbPanel({ fragment }: { fragment: (typeof FRAGMENTS)[number] }) {
  const geometry = OrbPanelGeometry()
  return <mesh geometry={geometry} position={fragment.position as [number, number, number]} rotation={fragment.rotation as [number, number, number]} scale={fragment.scale as [number, number, number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={fragment.color} roughness={0.34} metalness={0.58} clearcoat={0.22} clearcoatRoughness={0.46} envMapIntensity={0.82} flatShading />
  </mesh>
}

function OrbMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const coreGeometry = OrbPanelGeometry()
  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.20) * 0.025
    root.current.position.y = reducedMotion ? ORB.y : ORB.y + Math.sin(clock.elapsedTime * 0.42) * 0.025
  })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v70-scanned-wall-integrated-service-reliquary', governedIdentity: GOVERNED_ORB }}>
    <ProductionAsset url={ROCK_FACE_A} name="home-v70-orb-niche-back" position={[0, 2.42, -10.72]} rotation={[0, 0.02, 0]} scale={[0.82, 0.72, 0.42]} span={3.65} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v70-orb-niche-port" position={[-1.48, 2.16, -10.06]} rotation={[0.06, 0.82, -0.05]} scale={[0.56, 0.80, 0.52]} span={2.34} mode="rock" />
    <ProductionAsset url={ROCK_FACE_A} name="home-v70-orb-niche-starboard" position={[1.46, 2.18, -10.04]} rotation={[0.04, -0.80, 0.04]} scale={[0.55, 0.79, 0.50]} span={2.30} mode="rock" />
    <ProductionAsset url={PIPE_SYSTEM} name="home-v70-orb-service-spine" position={[0, 3.66, -9.86]} rotation={[0, Math.PI / 2, 0]} scale={[0.78, 0.72, 0.70]} span={2.10} mode="metal" />
    <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v70-asymmetric-ten-panel-industrial-machine-core', governedOrbIdentity: GOVERNED_ORB }}>
      {FRAGMENTS.map((fragment) => <OrbPanel key={fragment.id} fragment={fragment} />)}
      <mesh geometry={coreGeometry} scale={[0.36, 0.48, 0.30]} castShadow receiveShadow><meshPhysicalMaterial color="#18322d" emissive="#82b9a8" emissiveIntensity={state === 'warning' ? 0.38 : 0.22} roughness={0.24} metalness={0.52} clearcoat={0.28} clearcoatRoughness={0.30} /></mesh>
      <mesh geometry={coreGeometry} position={[0, 0, 0.34]} rotation={[0, 0, Math.PI / 4]} scale={[0.075, 0.32, 0.045]} castShadow><meshPhysicalMaterial color="#d1f2e7" emissive="#9fd8c6" emissiveIntensity={0.72} roughness={0.18} metalness={0.20} clearcoat={0.42} /></mesh>
      <pointLight color="#9ed0c0" intensity={state === 'dormant' ? 0.34 : 0.78} distance={4.2} decay={2} />
      <mesh visible={false}><sphereGeometry args={[1.20, 12, 8]} /><meshBasicMaterial /></mesh>
    </group>
  </group>
}

function PortalFrame({ destination, position, onActivate }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#789b8d' : '#8b90ac'
  const name = destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'
  const facing = destination === 'ground' ? 0.30 : -0.30
  const sideAsset = destination === 'ground' ? ROCK_FACE_B : ROCK_FACE_A
  return <group name={name} position={position} rotation={[0, facing, 0]} userData={{ treatment: 'v70-scanned-rock-service-threshold', destination, governedPortalIdentity: GOVERNED_PORTAL }}>
    <ProductionAsset url={sideAsset} name={destination + '-scanned-threshold-shell'} position={[0, 1.78, -0.78]} rotation={[0.04, destination === 'ground' ? 0.18 : -0.18, 0]} scale={[0.78, 0.88, 0.46]} span={3.05} mode="rock" />
    <ProductionAsset url={PIPE_SYSTEM} name={destination + '-service-threshold-manifold'} position={[0, 2.86, -0.10]} rotation={[0, Math.PI / 2, 0]} scale={[0.62, 0.48, 0.52]} span={1.78} mode="metal" />
    <mesh name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'} position={[0, 1.46, -0.22]} receiveShadow><planeGeometry args={[1.42, 2.24]} /><meshPhysicalMaterial color="#09100e" emissive={tone} emissiveIntensity={0.16} roughness={0.78} metalness={0.08} clearcoat={0.08} /></mesh>
    <mesh position={[0, 1.48, 0.08]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[2.12, 3.10, 0.76]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <pointLight position={[0, 1.92, 0.02]} color={tone} intensity={0.62} distance={4.0} decay={2} />
  </group>
}

function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const textures = useStoneTextures()
  const onWalk = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v70-continuous-pbr-stone-floor' }}><mesh position={[0, -0.12, -2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[13.4, 19.8, 10, 16]} /><meshPhysicalMaterial color="#242825" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.34, 0.34)} roughnessMap={textures.arm} roughness={0.91} metalness={0.01} envMapIntensity={0.56} /></mesh><mesh name="home-walkable-navigation-surface" position={[0, 0.08, -2]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}><planeGeometry args={[12.4, 18.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v70-deep-photogrammetry-industrial-sanctuary', construction: 'deep-scanned-rock-apse-with-integrated-service-machine', governedHomeIdentity: GOVERNED_HOME }}>
      <ProductionAsset url={ROCK_FACE_A} name="home-v70-scanned-reliquary-back" position={[0.05, 3.0, -13.0]} rotation={[0.02, 0.04, 0.01]} scale={[1.02, 0.80, 0.44]} span={5.25} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v70-scanned-left-shell" position={[-5.58, 2.48, -8.2]} rotation={[0.03, 1.16, -0.02]} scale={[1.18, 1.12, 0.80]} span={5.35} mode="rock" /><ProductionAsset url={ROCK_FACE_A} name="home-v70-scanned-right-shell" position={[5.60, 2.5, -8.05]} rotation={[0.02, -1.14, 0.03]} scale={[1.15, 1.08, 0.78]} span={5.15} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v70-left-apse-shoulder" position={[-2.90, 2.66, -11.05]} rotation={[0.02, 0.72, -0.03]} scale={[0.80, 0.90, 0.60]} span={3.45} mode="rock" /><ProductionAsset url={ROCK_FACE_A} name="home-v70-right-apse-shoulder" position={[2.88, 2.68, -10.98]} rotation={[0.01, -0.70, 0.03]} scale={[0.78, 0.88, 0.58]} span={3.40} mode="rock" />
      <ProductionAsset url={PIPE_SYSTEM} name="home-v70-left-service-manifold" position={[-4.62, 1.30, -9.15]} rotation={[0.02, 0.90, 0.02]} scale={[0.62, 0.68, 0.56]} span={1.85} mode="metal" /><ProductionAsset url={PIPE_SYSTEM} name="home-v70-right-service-manifold" position={[4.60, 1.28, -9.18]} rotation={[0.01, -0.88, -0.02]} scale={[0.60, 0.66, 0.54]} span={1.82} mode="metal" />
      <ProductionAsset url={CAGED_SCONCE} name="home-v70-left-sconce" position={[-3.26, 2.38, -9.86]} rotation={[0, 0.56, 0]} span={0.48} mode="light" /><ProductionAsset url={CAGED_SCONCE} name="home-v70-right-sconce" position={[3.24, 2.36, -9.84]} rotation={[0, -0.56, 0]} span={0.48} mode="light" />
      <ProductionAsset url={ROCK_FACE_A} name="home-v70-lower-port-foundation" position={[-4.02, 0.68, -8.68]} rotation={[-0.06, 0.98, -0.10]} scale={[0.82, 0.58, 0.66]} span={3.30} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v70-lower-starboard-foundation" position={[4.02, 0.70, -8.62]} rotation={[-0.04, -0.96, 0.08]} scale={[0.80, 0.57, 0.64]} span={3.26} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v70-scanned-vault" position={[0, 4.92, -10.08]} rotation={[Math.PI / 2, 0.04, Math.PI]} scale={[1.08, 0.72, 0.78]} span={5.35} mode="rock" />
      <pointLight position={[-3.20, 2.30, -9.55]} color="#c5935a" intensity={0.40} distance={4.2} decay={2} /><pointLight position={[3.18, 2.28, -9.54]} color="#899f98" intensity={0.30} distance={4.0} decay={2} />
      <group name="home-v47-reliquary-cavity" /><group name="home-v47-side-gallery" /><group name="home-v47-reliquary-apse" />
    </group>
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v70-deep-multi-face-photogrammetry-shell' }} /><group name="home-v49-authored-practicals" userData={{ treatment: 'v70-wall-integrated-industrial-service' }} />
    <OrbMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} /><PortalFrame destination="ground" position={GROUND} onActivate={onGround} /><PortalFrame destination="life-map" position={LIFE_MAP} onActivate={onLifeMap} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v70' }} /><group name="home-mountain-horizon" userData={{ presentation: 'deep-photogrammetry-sanctuary-depth-v70' }} /><group name="home-living-vegetation" userData={{ treatment: 'suppressed-from-primary-sanctuary-composition-v70' }} />
    <pointLight position={[0, 3.15, -9.0]} color="#b9c5bf" intensity={0.40} distance={6.2} decay={2} /><spotLight position={[0, 5.25, -5.6]} target-position={[0, 2.0, -9.15]} angle={0.40} penumbra={0.80} intensity={0.62} color="#cbb99e" distance={11} decay={2} />
  </>
}

function PlayerRig({ input, yaw, pitch, target, onNearby, transition, owner }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; onNearby: (value: Nearby) => void; transition: Transition; owner: MutableRefObject<HTMLElement | null> }) {
  const { camera, size } = useThree(); const position = useRef(SPAWN.clone()); const velocity = useRef(new THREE.Vector3()); const lastNearby = useRef<Nearby>(null); const renderedFrames = useRef(0)
  useEffect(() => { camera.near = 0.1; camera.far = 110; camera.position.set(SPAWN.x, 1.60, SPAWN.z); camera.lookAt(0, 1.92, -8.75); camera.updateProjectionMatrix() }, [camera])
  useFrame((_, delta) => {
    if (transition === 'none') stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: 0, delta, speed: 2.9, acceleration: 9, deceleration: 12, bounds: BOUNDS, arrivalRadius: 0.32 }); else velocity.current.multiplyScalar(0.7)
    renderedFrames.current += 1
    const shell = owner.current
    if (shell) {
      shell.dataset.homeInputReady = 'true'; shell.dataset.homeInteractionReady = 'true'; shell.dataset.homeReady = renderedFrames.current >= 8 ? 'true' : 'warming'
      shell.dataset.homePlayerX = position.current.x.toFixed(3); shell.dataset.homePlayerZ = position.current.z.toFixed(3); shell.dataset.homeDistance = position.current.distanceTo(SPAWN).toFixed(3)
      shell.dataset.homeDistanceOrb = Math.hypot(position.current.x - ORB.x, position.current.z - ORB.z).toFixed(3); shell.dataset.homeDistanceGround = Math.hypot(position.current.x - GROUND.x, position.current.z - GROUND.z).toFixed(3); shell.dataset.homeDistanceLifeMap = Math.hypot(position.current.x - LIFE_MAP.x, position.current.z - LIFE_MAP.z).toFixed(3)
      shell.dataset.homeMoving = velocity.current.lengthSq() > 0.0004 ? 'true' : 'false'
    }
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 56 : 46; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() } }
    camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * 0.10, portrait ? 1.54 : 1.59, Math.cos(yaw.current) * 0.10)), 1 - Math.pow(0.0008, delta))
    camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 10.5, 1.56 + pitch.current * 0.5, -Math.cos(yaw.current) * 10.5)))
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.35], ['ground', GROUND, 2.65], ['life-map', LIFE_MAP, 2.65]]; let nearby: Nearby = null; let best = Infinity
    for (const [name, point, radius] of candidates) { const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z); if (distance < radius && distance < best) { best = distance; nearby = name } }
    if (nearby !== lastNearby.current) { lastNearby.current = nearby; onNearby(nearby) }
  })
  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) { useEffect(() => onReady(), [onReady]); return null }

function Scene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; nearby: (value: Nearby) => void; transition: Transition; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onReady: () => void; owner: MutableRefObject<HTMLElement | null> }) {
  return <><color attach="background" args={['#080b0b']} /><fogExp2 attach="fog" args={['#101514', 0.013]} /><Environment files={HOME_HDR} background={false} environmentIntensity={0.62} /><ambientLight intensity={0.32} color="#c6d0ca" /><hemisphereLight args={['#8f9f98', '#090b0a', 0.42]} /><directionalLight position={[-6, 9, 4]} intensity={0.96} color="#d7c49e" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} /><directionalLight position={[6, 6, -9]} intensity={0.30} color="#79958e" /><Sanctuary target={props.target} reducedMotion={props.reducedMotion} orbState={props.orbState} onOrb={props.onOrb} onGround={props.onGround} onLifeMap={props.onLifeMap} /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.nearby} transition={props.transition} owner={props.owner} /><ReadySignal onReady={props.onReady} /></>
}

export function HomeWorldProductionV70({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false); const [sceneReady, setSceneReady] = useState(false); const [nearby, setNearby] = useState<Nearby>(null); const [dragging, setDragging] = useState(false); const [reducedMotion, setReducedMotion] = useState(false); const [mobile, setMobile] = useState(false); const [orbState, setOrbState] = useState<OrbState>('idle'); const [transition, setTransition] = useState<Transition>('none'); const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const yaw = useRef(0); const pitch = useRef(0.06); const target = useRef<THREE.Vector3 | null>(null); const worldRef = useRef<HTMLElement>(null); const markSceneReady = useCallback(() => setSceneReady(true), [])
  const openOrb = useCallback(() => { if (transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition]); const openGround = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('ground') } }, [transition]); const openLifeMap = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('life-map') } }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') openGround(); else if (nearby === 'life-map') openLifeMap() }, [nearby, openGround, openLifeMap, openOrb])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = 0; pitch.current = 0.06 } }); const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.50, onDragState: setDragging })
  useEffect(() => { const rm = window.matchMedia('(prefers-reduced-motion: reduce)'); const mq = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(rm.matches); setMobile(mq.matches) }; apply(); rm.addEventListener?.('change', apply); mq.addEventListener?.('change', apply); return () => { rm.removeEventListener?.('change', apply); mq.removeEventListener?.('change', apply) } }, [])
  useEffect(() => { const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }; window.addEventListener(URAI_ORB_STATE_EVENT, listener); return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener) }, [transition])
  useEffect(() => { if (transition === 'none') { setPortalSequence('idle'); return }; const traversal = `${transition}:traversal` as TransitionSequence; const closing = `${transition}:closing` as TransitionSequence; setPortalSequence(`${transition}:opening` as TransitionSequence); const traversalTimer = window.setTimeout(() => setPortalSequence(traversal), reducedMotion ? 180 : 900); const closingTimer = window.setTimeout(() => setPortalSequence(closing), reducedMotion ? 700 : 2500); const navigationTimer = window.setTimeout(() => { if (transition === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }); else requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }) }, reducedMotion ? 1200 : 3600); return () => { window.clearTimeout(traversalTimer); window.clearTimeout(closingTimer); window.clearTimeout(navigationTimer) } }, [reducedMotion, transition])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && transition !== 'none') { event.preventDefault(); setTransition('none'); setPortalSequence('idle'); setOrbState('idle') } }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [transition])
  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady; const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'The threshold opens to your Life Map' : null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v70-deep-photogrammetry-industrial-reliquary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="deep-scanned-rock-industrial-machine-sanctuary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-input-owner="window-capture-movement" data-home-telemetry-owner="embodied-motion-kernel" data-home-input-ready={ready ? 'true' : 'false'} data-home-interaction-ready={ready ? 'true' : 'false'} data-home-ready={ready ? 'true' : 'warming'} data-home-player-x={SPAWN.x.toFixed(3)} data-home-player-z={SPAWN.z.toFixed(3)} data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x - ORB.x, SPAWN.z - ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x - GROUND.x, SPAWN.z - GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x - LIFE_MAP.x, SPAWN.z - LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-visual-grade="cinematic-pbr-v70-deep-scanned-industrial" data-home-final-art-revision="v70-recessed-apse-rebuild" data-home-art-certification="v70-retained-pixel-candidate-not-certified" data-home-scanned-composition="deep-multi-face-photogrammetry-apse-integrated-service-v70" data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock_face_01/asset.gltf rock_face_02/asset.gltf modular_industrial_pipes_01/asset.gltf industrial_caged_sconce/asset.gltf rock-tile-floor-pbr studio-small-08-1k.hdr" data-home-governed-identity-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb" data-home-visible-production-assets="rock_face_01 rock_face_02 modular_industrial_pipes_01 industrial_caged_sconce rock-tile-floor-pbr" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="v70-asymmetric-ten-panel-orb-machine" data-home-input-locked={transition !== 'none' ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', background: '#080b0b' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows camera={{ position: [SPAWN.x, 1.60, SPAWN.z], fov: 46, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.52; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} owner={worldRef} /></Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}{transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}<span className="sr-only" data-testid="urai-home-webgl-orb">The compact engineered Orb machine is integrated into the deep scanned industrial sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

useGLTF.preload(GOVERNED_HOME); useGLTF.preload(GOVERNED_PORTAL); useGLTF.preload(GOVERNED_ORB); useGLTF.preload(ROCK_FACE_A); useGLTF.preload(ROCK_FACE_B); useGLTF.preload(PIPE_SYSTEM); useGLTF.preload(CAGED_SCONCE); useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
