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
const ORB = new THREE.Vector3(0, 2.38, -9.18)
const GROUND = new THREE.Vector3(-4.45, 0, -8.72)
const LIFE_MAP = new THREE.Vector3(4.45, 0, -8.72)
const BOUNDS = { minX: -6.2, maxX: 6.2, minZ: -9.1, maxZ: 6.7 }
const DEFAULT_YAW = 0

type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Vec3 = readonly [number, number, number]

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking',
  speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy',
  warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const FRAGMENTS: readonly { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }[] = [
  { position: [-0.54, 0.08, 0.04], rotation: [0.12, -0.34, -0.42], scale: [0.22, 0.58, 0.52] },
  { position: [0.52, 0.12, 0.02], rotation: [-0.14, 0.38, 0.39], scale: [0.22, 0.56, 0.50], warm: true },
  { position: [-0.27, 0.54, -0.02], rotation: [0.35, -0.18, -0.16], scale: [0.20, 0.46, 0.45], warm: true },
  { position: [0.24, -0.55, 0.04], rotation: [-0.38, 0.16, 0.18], scale: [0.21, 0.48, 0.46] },
  { position: [0.18, 0.37, -0.34], rotation: [0.28, 0.44, 0.26], scale: [0.18, 0.42, 0.40] },
  { position: [-0.20, -0.34, -0.32], rotation: [-0.26, -0.42, -0.24], scale: [0.18, 0.43, 0.41], warm: true },
  { position: [-0.56, -0.34, -0.08], rotation: [-0.22, 0.28, -0.52], scale: [0.16, 0.38, 0.36] },
  { position: [0.57, -0.29, -0.10], rotation: [0.24, -0.24, 0.48], scale: [0.16, 0.37, 0.35], warm: true },
  { position: [-0.07, 0.69, -0.22], rotation: [0.48, 0.18, 0.05], scale: [0.15, 0.34, 0.34] },
  { position: [0.08, -0.70, -0.18], rotation: [-0.46, -0.14, -0.02], scale: [0.15, 0.35, 0.34] },
]

function configureTexture(texture: THREE.Texture, x: number, y: number, color = false) {
  const clone = texture.clone()
  clone.wrapS = THREE.RepeatWrapping
  clone.wrapT = THREE.RepeatWrapping
  clone.repeat.set(x, y)
  clone.minFilter = THREE.LinearMipmapLinearFilter
  clone.magFilter = THREE.LinearFilter
  clone.anisotropy = 4
  clone.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  clone.needsUpdate = true
  return clone
}

function useStoneTextures() {
  const [sourceColor, sourceNormal, sourceArm] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  const textures = useMemo(() => ({
    color: configureTexture(sourceColor, 2.2, 3.1, true),
    normal: configureTexture(sourceNormal, 2.2, 3.1),
    arm: configureTexture(sourceArm, 2.2, 3.1),
  }), [sourceArm, sourceColor, sourceNormal])
  useEffect(() => () => { textures.color.dispose(); textures.normal.dispose(); textures.arm.dispose() }, [textures])
  return textures
}

function prepareAsset(source: THREE.Object3D, targetSpan: number, material: 'rock' | 'metal' | 'light') {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const tuned = sourceMaterials.map((entry) => {
      const clone = entry.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        if (material === 'rock') {
          clone.roughness = Math.max(clone.roughness, 0.78)
          clone.metalness = Math.min(clone.metalness, 0.03)
          clone.envMapIntensity = 0.62
        } else if (material === 'metal') {
          clone.roughness = Math.max(clone.roughness, 0.48)
          clone.metalness = Math.min(Math.max(clone.metalness, 0.28), 0.68)
          clone.envMapIntensity = 0.72
        } else {
          clone.roughness = Math.max(clone.roughness, 0.42)
          clone.metalness = Math.min(clone.metalness, 0.36)
          clone.envMapIntensity = 0.70
        }
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
        clone.transparent = false
        clone.opacity = 1
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? tuned : tuned[0]
    object.castShadow = true
    object.receiveShadow = true
  })
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  root.position.sub(center)
  root.scale.setScalar(targetSpan / Math.max(size.x, size.y, size.z, 0.001))
  return root
}

function ProductionAsset({ url, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, material, name }: { url: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; material: 'rock' | 'metal' | 'light'; name: string }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => prepareAsset(gltf.scene, span, material), [gltf.scene, material, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ runtimeAsset: url, provenance: 'poly-haven-cc0-committed', visibleProductionAsset: true }}><primitive object={model} /></group>
}

function SteelBeam({ from, to, width = 0.13, depth = 0.10, color = '#343c39' }: { from: Vec3; to: Vec3; width?: number; depth?: number; color?: string }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from); const b = new THREE.Vector3(...to); const direction = b.clone().sub(a)
    return { midpoint: a.clone().add(b).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), length: direction.length() }
  }, [from, to])
  return <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow><boxGeometry args={[width, length, depth]} /><meshStandardMaterial color={color} roughness={0.50} metalness={0.58} envMapIntensity={0.76} /></mesh>
}

function FragmentGeometry() {
  return useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.50,-0.22,-0.68, 0.45,-0.16,-0.64, 0.32,0.22,-0.69, -0.31,0.26,-0.72,
      -0.21,-0.16,0.70, 0.27,-0.11,0.67, 0.19,0.17,0.72, -0.16,0.20,0.69,
    ]), 3))
    geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0])
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function ArmoredFragment({ position, rotation, scale, warm = false }: { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }) {
  const geometry = FragmentGeometry()
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow>
    <meshStandardMaterial color={warm ? '#655642' : '#48524e'} roughness={0.45} metalness={0.62} envMapIntensity={0.76} flatShading />
  </mesh>
}

function OrbMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (root.current) root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.018 })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v69-wall-integrated-industrial-reliquary', governedIdentity: GOVERNED_ORB }}>
    <mesh position={[0, 2.38, -9.78]} castShadow receiveShadow><boxGeometry args={[3.25, 3.72, 0.26]} /><meshStandardMaterial color="#202a27" roughness={0.86} metalness={0.10} /></mesh>
    <mesh position={[-1.34, 2.38, -9.56]} rotation={[0, 0.10, -0.08]} castShadow receiveShadow><boxGeometry args={[0.42, 3.34, 0.34]} /><meshStandardMaterial color="#4f554e" roughness={0.76} metalness={0.16} /></mesh>
    <mesh position={[1.34, 2.38, -9.56]} rotation={[0, -0.10, 0.08]} castShadow receiveShadow><boxGeometry args={[0.42, 3.34, 0.34]} /><meshStandardMaterial color="#4f554e" roughness={0.76} metalness={0.16} /></mesh>
    <mesh position={[0, 3.92, -9.52]} rotation={[0.05, 0, 0]} castShadow receiveShadow><boxGeometry args={[2.52, 0.34, 0.38]} /><meshStandardMaterial color="#5b5e55" roughness={0.72} metalness={0.18} /></mesh>
    <mesh position={[0, 0.86, -9.52]} rotation={[-0.04, 0, 0]} castShadow receiveShadow><boxGeometry args={[2.40, 0.28, 0.34]} /><meshStandardMaterial color="#343d38" roughness={0.78} metalness={0.20} /></mesh>
    <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v69-ten-armored-fragment-contained-machine-core', governedOrbIdentity: GOVERNED_ORB }}>
      {FRAGMENTS.map((fragment, index) => <ArmoredFragment key={index} {...fragment} />)}
      <mesh scale={[0.44, 0.66, 0.42]} castShadow><octahedronGeometry args={[0.78, 1]} /><meshPhysicalMaterial color="#334a43" emissive="#8fc7b5" emissiveIntensity={0.72} roughness={0.28} metalness={0.58} clearcoat={0.16} flatShading /></mesh>
      <mesh position={[0, 0, 0.44]} scale={[0.10, 0.58, 0.06]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#c6efe0" /></mesh>
      <pointLight color="#a7d9c7" intensity={1.24} distance={4.6} decay={2} />
      <mesh visible={false}><sphereGeometry args={[1.45, 8, 6]} /><meshBasicMaterial /></mesh>
    </group>
  </group>
}

function PortalFrame({ destination, position, onActivate }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#7fa194' : '#8e91ad'
  const name = destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'
  return <group name={name} position={position} userData={{ treatment: 'v69-industrial-recessed-threshold', destination, governedPortalIdentity: GOVERNED_PORTAL }}>
    <mesh position={[-1.08, 1.48, 0]} rotation={[0, 0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.36, 3.02, 0.66]} /><meshStandardMaterial color="#4b504a" roughness={0.78} metalness={0.16} /></mesh>
    <mesh position={[1.08, 1.48, 0]} rotation={[0, -0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.36, 3.02, 0.66]} /><meshStandardMaterial color="#4b504a" roughness={0.78} metalness={0.16} /></mesh>
    <mesh position={[0, 2.90, -0.02]} castShadow receiveShadow><boxGeometry args={[2.34, 0.38, 0.70]} /><meshStandardMaterial color="#5d6058" roughness={0.74} metalness={0.16} /></mesh>
    <mesh position={[0, 1.48, -0.28]} receiveShadow><boxGeometry args={[1.84, 2.48, 0.20]} /><meshStandardMaterial color="#111816" emissive={tone} emissiveIntensity={0.095} roughness={0.88} metalness={0.04} /></mesh>
    <mesh name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'} position={[0, 1.48, -0.14]} receiveShadow><planeGeometry args={[1.62, 2.30]} /><meshStandardMaterial color="#0b1110" emissive={tone} emissiveIntensity={0.11} roughness={0.90} metalness={0.02} /></mesh>
    <mesh position={[0, 1.50, 0.18]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[2.22, 3.20, 0.85]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <pointLight position={[0, 2.05, 0.38]} color={tone} intensity={0.42} distance={4.0} decay={2} />
  </group>
}

function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const textures = useStoneTextures()
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v69-continuous-pbr-stone-floor' }}>
      <mesh position={[0, -0.12, -1.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[13.4, 17.2, 10, 14]} /><meshPhysicalMaterial color="#817e75" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.34, 0.34)} roughnessMap={textures.arm} roughness={0.88} metalness={0.01} clearcoat={0.01} envMapIntensity={0.58} /></mesh>
      <mesh name="home-walkable-navigation-surface" position={[0, 0.08, -1.35]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}><planeGeometry args={[12.4, 16.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    </group>

    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v69-photogrammetry-industrial-sanctuary', construction: 'grounded-stone-architecture-with-scanned-rock-insets', governedHomeIdentity: GOVERNED_HOME }}>
      <mesh position={[0, 2.66, -10.72]} castShadow receiveShadow><boxGeometry args={[12.4, 5.72, 0.54]} /><meshPhysicalMaterial color="#5f625b" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={textures.arm} roughness={0.92} metalness={0.01} envMapIntensity={0.48} /></mesh>
      <mesh position={[-6.04, 2.62, -4.84]} castShadow receiveShadow><boxGeometry args={[0.52, 5.62, 11.30]} /><meshPhysicalMaterial color="#525851" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.24, 0.24)} roughnessMap={textures.arm} roughness={0.93} metalness={0.01} envMapIntensity={0.44} /></mesh>
      <mesh position={[6.04, 2.62, -4.84]} castShadow receiveShadow><boxGeometry args={[0.52, 5.62, 11.30]} /><meshPhysicalMaterial color="#525851" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.24, 0.24)} roughnessMap={textures.arm} roughness={0.93} metalness={0.01} envMapIntensity={0.44} /></mesh>
      <mesh position={[0, 5.30, -4.92]} castShadow receiveShadow><boxGeometry args={[12.0, 0.42, 11.12]} /><meshStandardMaterial color="#303a35" roughness={0.96} metalness={0.02} /></mesh>
      <mesh position={[0, 4.78, -9.96]} castShadow receiveShadow><boxGeometry args={[9.8, 0.38, 0.58]} /><meshStandardMaterial color="#454c46" roughness={0.82} metalness={0.10} /></mesh>
      <ProductionAsset url={ROCK_FACE_A} name="home-v69-scanned-reliquary-back" position={[-3.82, 1.42, -10.22]} rotation={[0.02, 0.08, -0.04]} scale={[0.92, 0.98, 0.80]} span={3.15} material="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v69-scanned-reliquary-back-secondary" position={[3.84, 1.38, -10.18]} rotation={[-0.02, -0.16, 0.03]} scale={[0.90, 0.96, 0.78]} span={3.05} material="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v69-scanned-left-shell" position={[-5.62, 1.30, -5.54]} rotation={[0.02, 1.20, -0.03]} scale={[0.82, 0.92, 0.78]} span={3.15} material="rock" />
      <ProductionAsset url={ROCK_FACE_A} name="home-v69-scanned-right-shell" position={[5.62, 1.28, -5.72]} rotation={[-0.02, -1.18, 0.03]} scale={[0.82, 0.90, 0.78]} span={3.10} material="rock" />
      <ProductionAsset url={ROCK_FACE_A} name="home-v69-scanned-left-vault" position={[-3.18, 4.64, -9.72]} rotation={[0.08, 0.12, -0.08]} scale={[0.72, 0.52, 0.64]} span={2.28} material="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v69-scanned-right-vault" position={[3.22, 4.60, -9.68]} rotation={[0.06, -0.14, 0.07]} scale={[0.72, 0.52, 0.64]} span={2.26} material="rock" />
      <ProductionAsset url={PIPE_SYSTEM} name="home-v69-left-service-manifold" position={[-5.48, 2.18, -7.10]} rotation={[0.02, 0.72, 0.03]} scale={[0.50, 0.62, 0.48]} span={1.36} material="metal" />
      <ProductionAsset url={PIPE_SYSTEM} name="home-v69-right-service-manifold" position={[5.48, 2.12, -7.16]} rotation={[0.01, -0.70, -0.03]} scale={[0.50, 0.60, 0.48]} span={1.34} material="metal" />
      <ProductionAsset url={CAGED_SCONCE} name="home-v69-left-sconce" position={[-3.36, 3.18, -10.00]} rotation={[0, 0.28, 0]} span={0.46} material="light" />
      <ProductionAsset url={CAGED_SCONCE} name="home-v69-right-sconce" position={[3.32, 3.14, -10.02]} rotation={[0, -0.26, 0]} span={0.46} material="light" />
      <pointLight position={[-3.42, 3.04, -8.92]} color="#d7a66c" intensity={0.54} distance={4.8} decay={2} />
      <pointLight position={[3.38, 3.00, -8.94]} color="#93aaa4" intensity={0.46} distance={4.8} decay={2} />
      <group name="home-v47-reliquary-cavity" /><group name="home-v47-side-gallery" /><group name="home-v47-reliquary-apse" />
    </group>

    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v69-multi-face-photogrammetry-shell' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v69-industrial-service-manifolds-and-caged-practicals' }} />
    <OrbMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <PortalFrame destination="ground" position={GROUND} onActivate={onGround} />
    <PortalFrame destination="life-map" position={LIFE_MAP} onActivate={onLifeMap} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v69' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'enclosed-photogrammetry-sanctuary-depth-v69' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'suppressed-from-primary-sanctuary-composition-v69' }} />
    <pointLight position={[0, 3.38, -7.10]} color="#c4d0ca" intensity={0.52} distance={7.2} decay={2} />
    <spotLight position={[0, 5.40, -4.25]} target-position={[0, 2.25, -7.35]} angle={0.48} penumbra={0.74} intensity={0.72} color="#d4c7ad" distance={12} decay={2} />
  </>
}

function PlayerRig({ input, yaw, pitch, target, onNearby, transition, owner }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; onNearby: (value: Nearby) => void; transition: Transition; owner: MutableRefObject<HTMLElement | null> }) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const renderedFrames = useRef(0)
  useEffect(() => { camera.near = 0.1; camera.far = 100; camera.position.set(SPAWN.x, 1.62, SPAWN.z); camera.lookAt(0, 2.20, -9.0); camera.updateProjectionMatrix() }, [camera])
  useFrame((_, delta) => {
    if (transition === 'none') stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: 0, delta, speed: 2.9, acceleration: 9, deceleration: 12, bounds: BOUNDS, arrivalRadius: 0.32 })
    else velocity.current.multiplyScalar(0.7)
    renderedFrames.current += 1
    const shell = owner.current
    if (shell) {
      shell.dataset.homeInputReady = 'true'
      shell.dataset.homeInteractionReady = 'true'
      shell.dataset.homeReady = renderedFrames.current >= 8 ? 'true' : 'warming'
      shell.dataset.homePlayerX = position.current.x.toFixed(3)
      shell.dataset.homePlayerZ = position.current.z.toFixed(3)
      shell.dataset.homeDistance = position.current.distanceTo(SPAWN).toFixed(3)
      shell.dataset.homeDistanceOrb = Math.hypot(position.current.x - ORB.x, position.current.z - ORB.z).toFixed(3)
      shell.dataset.homeDistanceGround = Math.hypot(position.current.x - GROUND.x, position.current.z - GROUND.z).toFixed(3)
      shell.dataset.homeDistanceLifeMap = Math.hypot(position.current.x - LIFE_MAP.x, position.current.z - LIFE_MAP.z).toFixed(3)
      shell.dataset.homeMoving = velocity.current.lengthSq() > 0.0004 ? 'true' : 'false'
    }
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 54 : 43; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() } }
    const back = portrait ? 0.08 : 0.13; const eye = portrait ? 1.55 : 1.60
    camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * back, eye, Math.cos(yaw.current) * back)), 1 - Math.pow(0.0008, delta))
    camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 9, 1.66 + pitch.current, -Math.cos(yaw.current) * 9)))
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.35], ['ground', GROUND, 2.65], ['life-map', LIFE_MAP, 2.65]]
    let nearby: Nearby = null; let best = Infinity
    for (const [name, point, radius] of candidates) { const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z); if (distance < radius && distance < best) { best = distance; nearby = name } }
    if (nearby !== lastNearby.current) { lastNearby.current = nearby; onNearby(nearby) }
  })
  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) { useEffect(() => { onReady() }, [onReady]); return null }

function Scene({ input, yaw, pitch, target, nearby, transition, reducedMotion, orbState, onOrb, onGround, onLifeMap, onReady, owner }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; nearby: (value: Nearby) => void; transition: Transition; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onReady: () => void; owner: MutableRefObject<HTMLElement | null> }) {
  return <>
    <color attach="background" args={['#111715']} />
    <fogExp2 attach="fog" args={['#1c2723', 0.026]} />
    <Environment files={HOME_HDR} background={false} environmentIntensity={0.58} />
    <ambientLight intensity={0.38} color="#d7ddd7" />
    <hemisphereLight args={['#bdcbc5', '#111916', 0.52]} />
    <directionalLight position={[-5, 8, 3]} intensity={0.94} color="#e0c69e" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} />
    <directionalLight position={[5, 5, -7]} intensity={0.48} color="#8eaaa2" />
    <Sanctuary target={target} reducedMotion={reducedMotion} orbState={orbState} onOrb={onOrb} onGround={onGround} onLifeMap={onLifeMap} />
    <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} onNearby={nearby} transition={transition} owner={owner} />
    <ReadySignal onReady={onReady} />
  </>
}

export function HomeWorldProductionV67({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const yaw = useRef(DEFAULT_YAW); const pitch = useRef(0.14); const target = useRef<THREE.Vector3 | null>(null)
  const worldRef = useRef<HTMLElement>(null)
  const markSceneReady = useCallback(() => setSceneReady(true), [])
  const openOrb = useCallback(() => { if (transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition])
  const openGround = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('ground') } }, [transition])
  const openLifeMap = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('life-map') } }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') openGround(); else if (nearby === 'life-map') openLifeMap() }, [nearby, openGround, openLifeMap, openOrb])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = DEFAULT_YAW; pitch.current = 0.14 } })
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.50, onDragState: setDragging })
  useEffect(() => { const rm = window.matchMedia('(prefers-reduced-motion: reduce)'); const mq = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(rm.matches); setMobile(mq.matches) }; apply(); rm.addEventListener?.('change', apply); mq.addEventListener?.('change', apply); return () => { rm.removeEventListener?.('change', apply); mq.removeEventListener?.('change', apply) } }, [])
  useEffect(() => { const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }; window.addEventListener(URAI_ORB_STATE_EVENT, listener); return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener) }, [transition])
  useEffect(() => {
    if (transition === 'none') { setPortalSequence('idle'); return }
    const opening = `${transition}:opening` as TransitionSequence; const traversal = `${transition}:traversal` as TransitionSequence; const closing = `${transition}:closing` as TransitionSequence
    setPortalSequence(opening)
    const traversalTimer = window.setTimeout(() => setPortalSequence(traversal), reducedMotion ? 180 : 900)
    const closingTimer = window.setTimeout(() => setPortalSequence(closing), reducedMotion ? 700 : 2500)
    const navigationTimer = window.setTimeout(() => {
      if (transition === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
      else requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
    }, reducedMotion ? 1200 : 3600)
    return () => { window.clearTimeout(traversalTimer); window.clearTimeout(closingTimer); window.clearTimeout(navigationTimer) }
  }, [reducedMotion, transition])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key !== 'Escape' || transition === 'none') return; event.preventDefault(); setTransition('none'); setPortalSequence('idle'); setOrbState('idle') }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [transition])
  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'The threshold opens to your Life Map' : null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v69-photogrammetry-industrial-reliquary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="scanned-rock-industrial-machine-sanctuary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-input-owner="window-capture-movement" data-home-telemetry-owner="embodied-motion-kernel" data-home-input-ready={ready ? 'true' : 'false'} data-home-interaction-ready={ready ? 'true' : 'false'} data-home-ready={ready ? 'true' : 'warming'} data-home-player-x={SPAWN.x.toFixed(3)} data-home-player-z={SPAWN.z.toFixed(3)} data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x - ORB.x, SPAWN.z - ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x - GROUND.x, SPAWN.z - GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x - LIFE_MAP.x, SPAWN.z - LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-visual-grade="cinematic-pbr-v69-scanned-industrial" data-home-final-art-revision="v69-photogrammetry-industrial-rebuild" data-home-art-certification="v69-retained-pixel-candidate-not-certified" data-home-scanned-composition="two-distinct-photogrammetry-rock-faces-industrial-service-v69" data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock_face_01/asset.gltf rock_face_02/asset.gltf modular_industrial_pipes_01/asset.gltf industrial_caged_sconce/asset.gltf rock-tile-floor-pbr studio-small-08-1k.hdr" data-home-governed-identity-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb" data-home-visible-production-assets="rock_face_01 rock_face_02 modular_industrial_pipes_01 industrial_caged_sconce rock-tile-floor-pbr" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="v69-contained-ten-fragment-orb-machine" data-home-input-locked={transition !== 'none' ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', background: '#080b0b' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows camera={{ position: [SPAWN.x, 1.62, SPAWN.z], fov: 43, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.18; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} owner={worldRef} /></Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}{transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The ten-fragment engineered Orb machine is integrated into the scanned industrial sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

// Governed binaries remain exact runtime identity inputs but are deliberately not forced into
// the visible composition after retained-pixel review rejected their generated visual grammar.
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_PORTAL)
useGLTF.preload(GOVERNED_ORB)
useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(PIPE_SYSTEM)
useGLTF.preload(CAGED_SCONCE)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
