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
  { id: 'port-crown', position: [-0.27, 0.50, 0.10], rotation: [0.06, -0.08, -0.08], scale: [0.66, 0.70, 0.62], color: '#43534d' },
  { id: 'starboard-crown', position: [0.29, 0.48, 0.08], rotation: [0.05, 0.09, 0.09], scale: [0.65, 0.69, 0.62], color: '#3a4b46' },
  { id: 'port-shoulder', position: [-0.48, 0.10, 0.09], rotation: [0.02, -0.14, -0.16], scale: [0.61, 0.70, 0.64], color: '#2f423d' },
  { id: 'starboard-shoulder', position: [0.49, 0.08, 0.08], rotation: [-0.02, 0.14, 0.16], scale: [0.60, 0.69, 0.64], color: '#354843' },
  { id: 'port-keel', position: [-0.27, -0.49, 0.08], rotation: [-0.07, 0.07, -0.08], scale: [0.64, 0.68, 0.61], color: '#45483f' },
  { id: 'starboard-keel', position: [0.27, -0.50, 0.07], rotation: [-0.07, -0.07, 0.08], scale: [0.63, 0.68, 0.61], color: '#30433e' },
  { id: 'port-fin', position: [-0.65, -0.14, 0.00], rotation: [-0.04, 0.12, -0.24], scale: [0.48, 0.56, 0.58], color: '#263b36' },
  { id: 'starboard-fin', position: [0.66, -0.13, -0.01], rotation: [0.04, -0.12, 0.24], scale: [0.47, 0.55, 0.58], color: '#2d423c' },
  { id: 'aperture-upper', position: [0, 0.20, 0.45], rotation: [0.04, 0, 0], scale: [0.56, 0.32, 0.22], color: '#172d28' },
  { id: 'aperture-lower', position: [0, -0.19, 0.46], rotation: [-0.04, 0, 0], scale: [0.54, 0.31, 0.22], color: '#192e29' },
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

function EngineeredOrbHullGeometry() {
  return useMemo(() => {
    const profile = [
      new THREE.Vector2(0.24, -1.02),
      new THREE.Vector2(0.62, -0.82),
      new THREE.Vector2(0.88, -0.38),
      new THREE.Vector2(0.94, 0.18),
      new THREE.Vector2(0.76, 0.68),
      new THREE.Vector2(0.34, 0.98),
      new THREE.Vector2(0.18, 1.04),
    ]
    const geometry = new THREE.LatheGeometry(profile, 12)
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function RuggedPanel({ name, position, rotation = [0, 0, 0], scale, seed, textures, tint = '#3f4640' }: { name: string; position: Vec3; rotation?: Vec3; scale: Vec3; seed: number; textures: { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture }; tint?: string }) {
  const geometry = useMemo(() => {
    const columns = 12
    const rows = 8
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns
        const v = row / rows
        const edge = Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
        const relief = (Math.sin((u * 5.7 + seed) * Math.PI) + Math.cos((v * 4.3 - seed) * Math.PI) * 0.72 + Math.sin((u + v) * 9.1 + seed) * 0.38) * 0.055 * edge
        positions.push((u - 0.5) * 2, (v - 0.5) * 2, relief)
        uvs.push(u * 2.8, v * 2.2)
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = row * (columns + 1) + column
        const b = a + 1
        const d = (row + 1) * (columns + 1) + column
        const e = d + 1
        indices.push(a, b, e, a, e, d)
      }
    }
    const panel = new THREE.BufferGeometry()
    panel.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    panel.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    panel.setIndex(indices)
    panel.computeVertexNormals()
    return panel
  }, [seed])
  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} receiveShadow castShadow userData={{ construction: 'authored-subdivided-rock-surface', visibleProductionAsset: true }}>
    <meshPhysicalMaterial color={tint} map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.42, 0.42)} roughnessMap={textures.arm} roughness={0.92} metalness={0.01} envMapIntensity={0.62} side={THREE.DoubleSide} />
  </mesh>
}

function PortalArchitecture({ destination, tone, onActivate }: { destination: 'ground' | 'life-map'; tone: string; onActivate: () => void }) {
  const fieldGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.78, 0.12); shape.lineTo(0.78, 0.12); shape.lineTo(0.78, 1.82)
    shape.absarc(0, 1.82, 0.78, 0, Math.PI, false)
    shape.lineTo(-0.78, 0.12)
    return new THREE.ShapeGeometry(shape, 32)
  }, [])
  const archGeometry = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-1.18, 0); outer.lineTo(1.18, 0); outer.lineTo(1.18, 1.88)
    outer.absarc(0, 1.88, 1.18, 0, Math.PI, false)
    outer.lineTo(-1.18, 0)
    const opening = new THREE.Path()
    opening.moveTo(-0.78, 0.18); opening.lineTo(-0.78, 1.82)
    opening.absarc(0, 1.82, 0.78, Math.PI, 0, true)
    opening.lineTo(0.78, 0.18); opening.closePath()
    outer.holes.push(opening)
    return new THREE.ExtrudeGeometry(outer, { depth: 0.32, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 32 })
  }, [])
  return <group name={destination + '-native-doorway-architecture'} position={[0, 0.02, -0.18]}>
    <mesh geometry={archGeometry} position={[0, 0, -0.12]} castShadow receiveShadow><meshPhysicalMaterial color={destination === 'ground' ? '#27332e' : '#292d3a'} roughness={0.58} metalness={0.34} clearcoat={0.12} clearcoatRoughness={0.62} envMapIntensity={0.78} /></mesh>
    <mesh geometry={fieldGeometry} position={[0, 0, 0.12]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}><meshPhysicalMaterial color="#07100e" emissive={tone} emissiveIntensity={destination === 'ground' ? 0.34 : 0.48} roughness={0.34} metalness={0.12} clearcoat={0.24} clearcoatRoughness={0.38} side={THREE.DoubleSide} /></mesh>
  </group>
}

function OrbPanel({ fragment }: { fragment: (typeof FRAGMENTS)[number] }) {
  const geometry = OrbPanelGeometry()
  return <mesh geometry={geometry} position={fragment.position as [number, number, number]} rotation={fragment.rotation as [number, number, number]} scale={fragment.scale as [number, number, number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={fragment.color} roughness={0.48} metalness={0.46} clearcoat={0.14} clearcoatRoughness={0.54} envMapIntensity={0.76} />
  </mesh>
}

function OrbMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const coreGeometry = OrbPanelGeometry()
  const hullGeometry = EngineeredOrbHullGeometry()
  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.20) * 0.025
    root.current.position.y = reducedMotion ? ORB.y : ORB.y + Math.sin(clock.elapsedTime * 0.42) * 0.025
  })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v71-wall-integrated-armored-orb', governedIdentity: GOVERNED_ORB }}>
    <ProductionAsset url={PIPE_SYSTEM} name="home-v71-orb-service-spine" position={[0, 4.18, -11.42]} rotation={[0, Math.PI / 2, 0]} scale={[0.42, 0.34, 0.34]} span={1.34} mode="metal" />
    <mesh name="home-v71-orb-recess" position={[0, 2.26, -11.76]} scale={[1.62, 1.46, 0.18]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 0.5, 12]} />
      <meshPhysicalMaterial color="#1b2723" roughness={0.86} metalness={0.10} envMapIntensity={0.48} />
    </mesh>
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={[1.68, 1.68, 1.68]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v71-continuous-armored-ovoid-ten-panel-machine', governedOrbIdentity: GOVERNED_ORB }}>
      <mesh geometry={hullGeometry} rotation={[Math.PI / 2, 0, 0]} scale={[0.86, 0.82, 0.94]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#172b25" emissive="#285b4f" emissiveIntensity={state === 'warning' ? 0.28 : 0.10} roughness={0.42} metalness={0.48} clearcoat={0.16} clearcoatRoughness={0.52} envMapIntensity={0.82} flatShading />
      </mesh>
      {FRAGMENTS.map((fragment) => <OrbPanel key={fragment.id} fragment={fragment} />)}
      <mesh geometry={coreGeometry} position={[0, 0, 0.76]} rotation={[0, 0, Math.PI / 4]} scale={[0.12, 0.68, 0.065]} castShadow>
        <meshPhysicalMaterial color="#e8fff8" emissive="#9fe5d2" emissiveIntensity={1.42} roughness={0.12} metalness={0.10} clearcoat={0.52} />
      </mesh>
      <pointLight position={[0, 0, 0.72]} color="#9ed0c0" intensity={state === 'dormant' ? 0.62 : 1.28} distance={6.0} decay={2} />
    </group>
  </group>
}
function PortalFrame({ destination, position, onActivate }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#789b8d' : '#8b90ac'
  const name = destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'
  const facing = destination === 'ground' ? 0.22 : -0.22
  const sideAsset = destination === 'ground' ? ROCK_FACE_B : ROCK_FACE_A
  return <group name={name} position={position} rotation={[0, facing, 0]} userData={{ treatment: 'v70-native-arched-service-threshold', destination, governedPortalIdentity: GOVERNED_PORTAL }}>
    <ProductionAsset url={sideAsset} name={destination + '-scanned-threshold-shell'} position={[0, 2.30, -2.02]} rotation={[0.02, 0, 0]} scale={[0.50, 0.42, 0.035]} span={1.62} mode="rock" />
    <ProductionAsset url={PIPE_SYSTEM} name={destination + '-service-threshold-manifold'} position={[destination === 'ground' ? -1.18 : 1.18, 2.72, -0.46]} rotation={[0, Math.PI / 2, 0]} scale={[0.26, 0.24, 0.22]} span={0.90} mode="metal" />
    <group name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'}><PortalArchitecture destination={destination} tone={tone} onActivate={onActivate} /></group>
    <pointLight position={[0, 1.92, 0.12]} color={tone} intensity={0.92} distance={5.4} decay={2} />
  </group>
}
function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const textures = useStoneTextures()
  const onWalk = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v70-continuous-pbr-stone-floor' }}><mesh position={[0, -0.12, -2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[13.4, 19.8, 36, 48]} /><meshPhysicalMaterial color="#343b36" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.34, 0.34)} roughnessMap={textures.arm} roughness={0.91} metalness={0.01} envMapIntensity={0.56} /></mesh><mesh name="home-walkable-navigation-surface" position={[0, 0.08, -2]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}><planeGeometry args={[12.4, 18.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v70-deep-photogrammetry-industrial-sanctuary', construction: 'continuous-authored-rock-shell-with-scanned-relief-and-integrated-service-machine', governedHomeIdentity: GOVERNED_HOME }}>
      <RuggedPanel name="home-v70-continuous-back-shell" position={[0, 3.05, -11.92]} scale={[6.35, 3.55, 1]} seed={0.31} textures={textures} tint="#34423b" />
      <RuggedPanel name="home-v70-continuous-port-shell" position={[-6.18, 3.0, -3.0]} rotation={[0, Math.PI / 2, 0]} scale={[8.9, 3.55, 1]} seed={0.67} textures={textures} tint="#2d3934" />
      <RuggedPanel name="home-v70-continuous-starboard-shell" position={[6.18, 3.0, -3.0]} rotation={[0, -Math.PI / 2, 0]} scale={[8.9, 3.55, 1]} seed={1.13} textures={textures} tint="#303b36" />
      <RuggedPanel name="home-v70-continuous-vault-shell" position={[0, 6.18, -3.25]} rotation={[Math.PI / 2, 0, 0]} scale={[6.35, 8.75, 1]} seed={1.79} textures={textures} tint="#2b3531" />
      <RuggedPanel name="home-v71-port-back-buttress" position={[-5.20, 2.62, -11.72]} scale={[0.78, 2.58, 1]} seed={2.17} textures={textures} tint="#3b4942" />
      <RuggedPanel name="home-v71-inner-port-rib" position={[-2.72, 2.82, -11.64]} scale={[0.36, 2.82, 1]} seed={2.71} textures={textures} tint="#46534b" />
      <RuggedPanel name="home-v71-inner-starboard-rib" position={[2.72, 2.82, -11.64]} scale={[0.36, 2.82, 1]} seed={3.19} textures={textures} tint="#46534b" />
      <RuggedPanel name="home-v71-starboard-back-buttress" position={[5.20, 2.62, -11.72]} scale={[0.78, 2.58, 1]} seed={3.67} textures={textures} tint="#3b4942" />
      <ProductionAsset url={PIPE_SYSTEM} name="home-v70-left-service-manifold" position={[-4.30, 1.24, -10.92]} rotation={[0.02, 0.18, 0.02]} scale={[0.42, 0.48, 0.38]} span={1.30} mode="metal" /><ProductionAsset url={PIPE_SYSTEM} name="home-v70-right-service-manifold" position={[4.30, 1.22, -10.94]} rotation={[0.01, -0.18, -0.02]} scale={[0.41, 0.47, 0.37]} span={1.28} mode="metal" />
      <ProductionAsset url={CAGED_SCONCE} name="home-v70-left-sconce" position={[-3.38, 2.48, -10.98]} rotation={[0, 0.12, 0]} span={0.52} mode="light" /><ProductionAsset url={CAGED_SCONCE} name="home-v70-right-sconce" position={[3.38, 2.46, -10.98]} rotation={[0, -0.12, 0]} span={0.52} mode="light" />
      <ProductionAsset url={ROCK_FACE_A} name="home-v71-port-foundation-mass" position={[-5.52, 0.70, -11.18]} rotation={[-0.02, 0.18, -0.04]} scale={[0.72, 0.82, 0.58]} span={2.36} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v71-starboard-foundation-mass" position={[5.52, 0.72, -11.18]} rotation={[-0.02, -0.18, 0.04]} scale={[0.72, 0.82, 0.58]} span={2.34} mode="rock" />
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
  useEffect(() => { camera.near = 0.1; camera.far = 110; camera.position.set(SPAWN.x, 1.60, SPAWN.z); camera.lookAt(0, 2.02, -8.75); camera.updateProjectionMatrix() }, [camera])
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
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 70 : 46; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() } }
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
  return <><color attach="background" args={['#07110f']} /><fogExp2 attach="fog" args={['#14201c', 0.006]} /><Environment files={HOME_HDR} background={false} environmentIntensity={0.76} /><ambientLight intensity={0.66} color="#d2ddd7" /><hemisphereLight args={['#b5c8bf', '#111915', 0.78]} /><directionalLight position={[-6, 9, 4]} intensity={1.42} color="#d7c49e" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} /><directionalLight position={[6, 6, -9]} intensity={0.30} color="#79958e" /><Sanctuary target={props.target} reducedMotion={props.reducedMotion} orbState={props.orbState} onOrb={props.onOrb} onGround={props.onGround} onLifeMap={props.onLifeMap} /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.nearby} transition={props.transition} owner={props.owner} /><ReadySignal onReady={props.onReady} /></>
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
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v70-deep-photogrammetry-industrial-reliquary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="deep-scanned-rock-industrial-machine-sanctuary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-input-owner="window-capture-movement" data-home-telemetry-owner="embodied-motion-kernel" data-home-input-ready={ready ? 'true' : 'false'} data-home-interaction-ready={ready ? 'true' : 'false'} data-home-ready={ready ? 'true' : 'warming'} data-home-player-x={SPAWN.x.toFixed(3)} data-home-player-z={SPAWN.z.toFixed(3)} data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x - ORB.x, SPAWN.z - ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x - GROUND.x, SPAWN.z - GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x - LIFE_MAP.x, SPAWN.z - LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-visual-grade="cinematic-pbr-v70-deep-scanned-industrial" data-home-final-art-revision="v71-continuous-armored-apse-rebuild" data-home-art-certification="v71-retained-pixel-candidate-not-certified" data-home-scanned-composition="deep-multi-face-photogrammetry-apse-integrated-service-v70" data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock_face_01/asset.gltf rock_face_02/asset.gltf modular_industrial_pipes_01/asset.gltf industrial_caged_sconce/asset.gltf rock-tile-floor-pbr studio-small-08-1k.hdr" data-home-governed-identity-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb" data-home-visible-production-assets="rock_face_01 rock_face_02 modular_industrial_pipes_01 industrial_caged_sconce rock-tile-floor-pbr" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="v71-continuous-armored-ten-panel-orb-machine" data-home-input-locked={transition !== 'none' ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', background: '#080b0b' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows camera={{ position: [SPAWN.x, 1.60, SPAWN.z], fov: 46, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.58; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} owner={worldRef} /></Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}{transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}<span className="sr-only" data-testid="urai-home-webgl-orb">The continuous armored Orb machine is integrated into the deep scanned industrial sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

useGLTF.preload(GOVERNED_HOME); useGLTF.preload(GOVERNED_PORTAL); useGLTF.preload(GOVERNED_ORB); useGLTF.preload(ROCK_FACE_A); useGLTF.preload(ROCK_FACE_B); useGLTF.preload(PIPE_SYSTEM); useGLTF.preload(CAGED_SCONCE); useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
