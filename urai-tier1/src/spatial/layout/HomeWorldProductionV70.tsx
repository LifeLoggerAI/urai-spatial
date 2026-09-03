'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'
import { HomeV76Sanctuary } from './HomeWorldProductionV76'

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
const GROUND_PORTAL = new THREE.Vector3(-4.48, 0, -10.72)
const LIFE_MAP_PORTAL = new THREE.Vector3(4.48, 0, -10.72)
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
  { id: 'port-crown', position: [-0.42, 0.78, 0.54], rotation: [0.06, -0.08, -0.12], scale: [0.38, 0.27, 0.34], color: '#5a665f' },
  { id: 'starboard-crown', position: [0.38, 0.84, 0.50], rotation: [0.03, 0.10, 0.10], scale: [0.34, 0.24, 0.32], color: '#3d5149' },
  { id: 'port-shoulder', position: [-0.58, 0.28, 0.56], rotation: [0.02, -0.12, -0.16], scale: [0.34, 0.30, 0.34], color: '#344b42' },
  { id: 'starboard-shoulder', position: [0.54, 0.22, 0.52], rotation: [-0.02, 0.14, 0.14], scale: [0.32, 0.28, 0.32], color: '#45574f' },
  { id: 'port-keel', position: [-0.38, -0.78, 0.54], rotation: [-0.06, 0.06, -0.08], scale: [0.36, 0.26, 0.32], color: '#50564e' },
  { id: 'starboard-keel', position: [0.32, -0.84, 0.50], rotation: [-0.05, -0.08, 0.08], scale: [0.32, 0.24, 0.30], color: '#31483f' },
  { id: 'port-fin', position: [-0.72, -0.24, 0.46], rotation: [-0.03, 0.14, -0.24], scale: [0.26, 0.32, 0.30], color: '#2d433a' },
  { id: 'starboard-fin', position: [0.68, -0.18, 0.44], rotation: [0.04, -0.13, 0.22], scale: [0.25, 0.30, 0.29], color: '#3a5047' },
  { id: 'aperture-upper', position: [-0.18, 0.30, 0.60], rotation: [0.03, 0.02, -0.03], scale: [0.24, 0.22, 0.28], color: '#1b342b' },
  { id: 'aperture-lower', position: [0.16, -0.32, 0.60], rotation: [-0.03, -0.02, 0.04], scale: [0.22, 0.21, 0.27], color: '#20382f' },
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
      -0.58, -0.45, -0.12, 0.52, -0.38, -0.16, 0.42, 0.46, -0.12, -0.34, 0.52, -0.10,
      -0.52, -0.40, 0.16, 0.46, -0.34, 0.14, 0.38, 0.41, 0.17, -0.30, 0.46, 0.15,
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

function RelicShellGeometry(side: 'port' | 'starboard') {
  return useMemo(() => {
    const shape = new THREE.Shape()
    const points = side === 'port'
      ? [[-0.08, -1.18], [-0.54, -1.02], [-0.88, -0.48], [-0.82, 0.30], [-0.50, 0.96], [-0.12, 1.20], [-0.08, 0.42], [-0.20, 0.02], [-0.08, -0.46]]
      : [[0.10, -1.14], [0.48, -1.04], [0.82, -0.54], [0.90, 0.18], [0.62, 0.88], [0.16, 1.16], [0.10, 0.38], [0.22, -0.04], [0.10, -0.50]]
    shape.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.075, bevelThickness: 0.075, curveSegments: 10 })
    geometry.center()
    geometry.computeVertexNormals()
    return geometry
  }, [side])
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

function PortalArchitecture({ destination, tone, onActivate, textures }: { destination: 'ground' | 'life-map'; tone: string; onActivate: () => void; textures: { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture } }) {
  const fieldGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.70, 0.14); shape.lineTo(0.70, 0.14); shape.lineTo(0.70, 1.78)
    shape.absarc(0, 1.78, 0.70, 0, Math.PI, false)
    shape.lineTo(-0.70, 0.14)
    return new THREE.ShapeGeometry(shape, 32)
  }, [])
  const archGeometry = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-1.22, 0); outer.lineTo(1.22, 0); outer.lineTo(1.22, 1.90)
    outer.absarc(0, 1.90, 1.22, 0, Math.PI, false)
    outer.lineTo(-1.22, 0)
    const opening = new THREE.Path()
    opening.moveTo(-0.74, 0.16); opening.lineTo(-0.74, 1.78)
    opening.absarc(0, 1.78, 0.74, Math.PI, 0, true)
    opening.lineTo(0.74, 0.16); opening.closePath()
    outer.holes.push(opening)
    return new THREE.ExtrudeGeometry(outer, { depth: 0.82, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.07, bevelThickness: 0.07, curveSegments: 36 })
  }, [])
  return <group name={destination + '-native-doorway-architecture'} position={[0, 0.02, -0.18]}>
    <mesh geometry={archGeometry} position={[0, 0, -0.92]} castShadow receiveShadow>
      <meshPhysicalMaterial color={destination === 'ground' ? '#29372f' : '#2d3040'} map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={textures.arm} roughness={0.82} metalness={0.08} clearcoat={0.04} envMapIntensity={0.62} />
    </mesh>
    <mesh position={[-0.91, 1.36, -0.48]} rotation={[0, 0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.22, 2.42, 0.92]} /><meshPhysicalMaterial color="#27332f" roughness={0.54} metalness={0.42} envMapIntensity={0.76} /></mesh>
    <mesh position={[0.91, 1.36, -0.48]} rotation={[0, -0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.22, 2.42, 0.92]} /><meshPhysicalMaterial color="#27332f" roughness={0.54} metalness={0.42} envMapIntensity={0.76} /></mesh>
    <mesh position={[0, 0.09, -0.34]} receiveShadow castShadow><boxGeometry args={[1.72, 0.18, 1.34]} /><meshPhysicalMaterial color="#252e2a" map={textures.color} normalMap={textures.normal} roughness={0.88} metalness={0.06} /></mesh>
    <mesh geometry={fieldGeometry} position={[0, 0, -0.96]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <meshBasicMaterial color={destination === 'ground' ? '#030806' : '#05050b'} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    <mesh position={[-0.66, 1.36, -0.91]}><boxGeometry args={[0.035, 1.82, 0.035]} /><meshBasicMaterial color={tone} toneMapped={false} /></mesh>
    <mesh position={[0.66, 1.36, -0.91]}><boxGeometry args={[0.035, 1.82, 0.035]} /><meshBasicMaterial color={tone} toneMapped={false} /></mesh>
    <pointLight position={[0, 1.52, -0.58]} color={tone} intensity={0.78} distance={3.8} decay={2} />
  </group>
}

function OrbPanel({ fragment, textures }: { fragment: (typeof FRAGMENTS)[number]; textures: { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture } }) {
  const geometry = OrbPanelGeometry()
  return <mesh geometry={geometry} position={fragment.position as [number, number, number]} rotation={fragment.rotation as [number, number, number]} scale={fragment.scale as [number, number, number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={fragment.color} map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.22, 0.22)} roughnessMap={textures.arm} roughness={0.72} metalness={0.24} clearcoat={0.05} clearcoatRoughness={0.68} envMapIntensity={0.62} />
  </mesh>
}

function GovernedOrbMechanism() {
  const gltf = useGLTF(GOVERNED_ORB)
  const mechanism = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.traverse((object) => {
      if (object.name === 'orb-aura' || object.name === 'orb-core' || object.name.startsWith('orb-orbit-')) {
        object.visible = false
        return
      }
      if (!(object instanceof THREE.Mesh)) return
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((entry) => {
        const clone = entry.clone()
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.transparent = false
          clone.opacity = 1
          clone.roughness = Math.max(clone.roughness, 0.40)
          clone.metalness = Math.min(Math.max(clone.metalness, 0.20), 0.64)
          clone.envMapIntensity = 0.72
          if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
        }
        return clone
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
      object.castShadow = true
      object.receiveShadow = true
    })
    return root
  }, [gltf.scene])
  return <primitive object={mechanism} />
}

function OrbMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const coreGeometry = OrbPanelGeometry()
  const hullGeometry = EngineeredOrbHullGeometry()
  const relicTextures = useStoneTextures()
  const portShell = RelicShellGeometry('port')
  const starboardShell = RelicShellGeometry('starboard')
  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.20) * 0.018
    root.current.position.y = reducedMotion ? ORB.y : ORB.y + Math.sin(clock.elapsedTime * 0.42) * 0.018
  })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v72-wall-integrated-vertical-armored-orb', governedIdentity: GOVERNED_ORB }}>
    <ProductionAsset url={PIPE_SYSTEM} name="home-v71-orb-service-spine" position={[0, 4.28, -11.46]} rotation={[0, Math.PI / 2, 0]} scale={[0.50, 0.38, 0.38]} span={1.46} mode="metal" />
    <mesh name="home-v72-orb-wall-keel" position={[0, 2.26, -11.44]} castShadow receiveShadow><boxGeometry args={[0.52, 4.24, 0.46]} /><meshPhysicalMaterial color="#1b2723" roughness={0.60} metalness={0.46} envMapIntensity={0.64} /></mesh>
    <mesh name="home-v72-orb-upper-yoke" position={[0, 3.74, -10.72]} castShadow receiveShadow><boxGeometry args={[2.62, 0.24, 0.32]} /><meshPhysicalMaterial color="#36423d" roughness={0.50} metalness={0.54} envMapIntensity={0.72} /></mesh>
    <mesh name="home-v72-orb-lower-yoke" position={[0, 0.70, -10.72]} castShadow receiveShadow><boxGeometry args={[2.28, 0.22, 0.30]} /><meshPhysicalMaterial color="#2a3732" roughness={0.56} metalness={0.48} envMapIntensity={0.66} /></mesh>
    <mesh position={[-1.15, 2.22, -10.65]} rotation={[0, 0, -0.14]} castShadow receiveShadow><boxGeometry args={[0.18, 2.86, 0.26]} /><meshPhysicalMaterial color="#34423c" roughness={0.52} metalness={0.50} /></mesh>
    <mesh position={[1.15, 2.22, -10.65]} rotation={[0, 0, 0.14]} castShadow receiveShadow><boxGeometry args={[0.18, 2.86, 0.26]} /><meshPhysicalMaterial color="#34423c" roughness={0.52} metalness={0.50} /></mesh>
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={[1.34, 1.34, 1.34]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v72-vertical-armored-ovoid-ten-panel-machine', governedOrbIdentity: GOVERNED_ORB }}>
      <mesh geometry={hullGeometry} scale={[0.20, 0.62, 0.18]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#10241f" emissive="#1f4c40" emissiveIntensity={state === 'warning' ? 0.24 : 0.07} roughness={0.50} metalness={0.54} clearcoat={0.12} clearcoatRoughness={0.58} envMapIntensity={0.76} flatShading />
      </mesh>
      <mesh geometry={coreGeometry} position={[0, -0.02, 0.10]} scale={[0.20, 0.54, 0.26]} castShadow receiveShadow><meshPhysicalMaterial color="#182d27" roughness={0.46} metalness={0.58} envMapIntensity={0.74} /></mesh>
      <group name="home-v72-governed-inner-mechanism-no-orbits" position={[0, 0, 0.16]} rotation={[0, 0, 0.06]} scale={[0.72, 1.10, 0.68]} userData={{ governedIdentity: GOVERNED_ORB, orbitNodesVisible: false }}><GovernedOrbMechanism /></group>
      <mesh name="home-v72-port-relic-shell" geometry={portShell} position={[-0.12, 0.02, 0.18]} rotation={[0.02, -0.12, -0.03]} scale={[0.92, 0.96, 0.92]} castShadow receiveShadow><meshPhysicalMaterial color="#263d35" map={relicTextures.color} normalMap={relicTextures.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={relicTextures.arm} roughness={0.68} metalness={0.24} clearcoat={0.05} clearcoatRoughness={0.70} envMapIntensity={0.66} /></mesh>
      <mesh name="home-v72-starboard-relic-shell" geometry={starboardShell} position={[0.12, -0.03, 0.16]} rotation={[-0.02, 0.13, 0.025]} scale={[0.92, 0.96, 0.92]} castShadow receiveShadow><meshPhysicalMaterial color="#344a42" map={relicTextures.color} normalMap={relicTextures.normal} normalScale={new THREE.Vector2(0.26, 0.26)} roughnessMap={relicTextures.arm} roughness={0.70} metalness={0.22} clearcoat={0.04} clearcoatRoughness={0.72} envMapIntensity={0.64} /></mesh>
      {FRAGMENTS.map((fragment) => <OrbPanel key={fragment.id} fragment={fragment} textures={relicTextures} />)}
      <mesh position={[0, 0.02, 0.48]} castShadow><boxGeometry args={[0.050, 0.88, 0.038]} /><meshPhysicalMaterial color="#f5dfb8" emissive="#c79b63" emissiveIntensity={0.78} roughness={0.12} metalness={0.08} clearcoat={0.48} toneMapped={false} /></mesh>
      <mesh position={[-0.66, 0.10, -0.22]} rotation={[0.05, 0.20, -0.18]} castShadow receiveShadow><boxGeometry args={[0.12, 1.92, 0.18]} /><meshPhysicalMaterial color="#263b35" roughness={0.46} metalness={0.58} /></mesh>
      <mesh position={[0.64, -0.06, -0.24]} rotation={[-0.05, -0.20, 0.16]} castShadow receiveShadow><boxGeometry args={[0.12, 1.82, 0.18]} /><meshPhysicalMaterial color="#2f443d" roughness={0.46} metalness={0.58} /></mesh>
      <pointLight position={[0, 0, 0.82]} color="#9ed0c0" intensity={state === 'dormant' ? 0.54 : 1.10} distance={5.6} decay={2} />
    </group>
  </group>
}

function PortalFrame({ destination, position, onActivate, textures }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void; textures: { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture } }) {
  const tone = destination === 'ground' ? '#789b8d' : '#8b90ac'
  const name = destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'
  const facing = destination === 'ground' ? 0.12 : -0.12
  return <group name={name} position={position} rotation={[0, facing, 0]} scale={[1.08, 1.08, 1.08]} userData={{ treatment: 'v70-native-arched-service-threshold', destination, governedPortalIdentity: GOVERNED_PORTAL }}>
    <RuggedPanel name={destination + '-threshold-port-buttress'} position={[-1.52, 1.58, -0.82]} rotation={[0, 0.10, -0.02]} scale={[0.54, 1.72, 1]} seed={destination === 'ground' ? 4.12 : 4.68} textures={textures} tint="#35423c" />
    <RuggedPanel name={destination + '-threshold-starboard-buttress'} position={[1.52, 1.58, -0.82]} rotation={[0, -0.10, 0.02]} scale={[0.54, 1.72, 1]} seed={destination === 'ground' ? 5.18 : 5.72} textures={textures} tint="#35423c" />
    <ProductionAsset url={PIPE_SYSTEM} name={destination + '-service-threshold-manifold'} position={[destination === 'ground' ? -1.30 : 1.30, 2.78, -0.70]} rotation={[0, Math.PI / 2, 0]} scale={[0.30, 0.28, 0.26]} span={0.96} mode="metal" />
    <group name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'}><PortalArchitecture destination={destination} tone={tone} onActivate={onActivate} textures={textures} /></group>
    <pointLight position={[0, 1.90, -0.24]} color={tone} intensity={0.82} distance={4.8} decay={2} />
  </group>
}

function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const onWalk = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ)) }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v76-continuous-photogrammetry-floor' }}>
      <HomeV76Sanctuary reducedMotion={reducedMotion} orbState={orbState} onOrb={onOrb} onGround={onGround} onLifeMap={onLifeMap} onWalk={onWalk} />
    </group>
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v76-single-canvas-deep-apse-sanctuary', construction: 'continuous-photogrammetry-shell-curved-load-bearing-relic-machine', governedHomeIdentity: GOVERNED_HOME }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v76-embedded-photogrammetry-foundations' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v76-integrated-industrial-service' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v76' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'deep-concave-apse-sanctuary-depth-v76' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'suppressed-from-primary-sanctuary-composition-v76' }} />
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
      // Readiness is owned declaratively by the Canvas + Scene lifecycle below.
      // CI's software WebGL renderer can legitimately settle after only a few
      // frames; never overwrite that truthful lifecycle signal with an arbitrary
      // frame-count threshold. Keep the count as diagnostics only.
      shell.dataset.homeInputReady = 'true'; shell.dataset.homeInteractionReady = 'true'; shell.dataset.homeRenderedFrames = String(renderedFrames.current)
      shell.dataset.homePlayerX = position.current.x.toFixed(3); shell.dataset.homePlayerZ = position.current.z.toFixed(3); shell.dataset.homeDistance = position.current.distanceTo(SPAWN).toFixed(3)
      shell.dataset.homeDistanceOrb = Math.hypot(position.current.x - ORB.x, position.current.z - ORB.z).toFixed(3); shell.dataset.homeDistanceGround = Math.hypot(position.current.x - GROUND.x, position.current.z - GROUND.z).toFixed(3); shell.dataset.homeDistanceLifeMap = Math.hypot(position.current.x - LIFE_MAP.x, position.current.z - LIFE_MAP.z).toFixed(3)
      shell.dataset.homeMoving = velocity.current.lengthSq() > 0.0004 ? 'true' : 'false'
    }
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 86 : 42; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() } }
    camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * 0.10, portrait ? 1.54 : 1.59, Math.cos(yaw.current) * 0.10)), 1 - Math.pow(0.0008, delta))
    camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 10.5, 1.82 + pitch.current * 0.5, -Math.cos(yaw.current) * 10.5)))
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.35], ['ground', GROUND, 2.65], ['life-map', LIFE_MAP, 2.65]]; let nearby: Nearby = null; let best = Infinity
    for (const [name, point, radius] of candidates) { const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z); if (distance < radius && distance < best) { best = distance; nearby = name } }
    if (nearby !== lastNearby.current) { lastNearby.current = nearby; onNearby(nearby) }
  })
  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) { useEffect(() => onReady(), [onReady]); return null }

function Scene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; nearby: (value: Nearby) => void; transition: Transition; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onReady: () => void; owner: MutableRefObject<HTMLElement | null> }) {
  return <><ReducedMotionCadence active={props.reducedMotion} /><color attach="background" args={['#08100e']} /><fogExp2 attach="fog" args={['#17201b', 0.010]} /><Environment files={HOME_HDR} background={false} environmentIntensity={0.68} /><ambientLight intensity={0.34} color="#d4ded7" /><hemisphereLight args={['#bccbc2', '#2b241d', 0.54]} /><directionalLight position={[-6, 9, 4]} intensity={1.24} color="#e0c79c" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} /><directionalLight position={[6, 6, -9]} intensity={0.38} color="#789a91" /><Sanctuary target={props.target} reducedMotion={props.reducedMotion} orbState={props.orbState} onOrb={props.onOrb} onGround={props.onGround} onLifeMap={props.onLifeMap} /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.nearby} transition={props.transition} owner={props.owner} /><ReadySignal onReady={props.onReady} /></>
}

function ReducedMotionCadence({ active }: { active: boolean }) {
  const { invalidate, setFrameloop } = useThree()
  useEffect(() => {
    if (!active) {
      setFrameloop('always')
      return
    }
    setFrameloop('demand')
    let disposed = false
    const bootstrap = [0, 40, 80, 120, 180, 260].map((delay) => window.setTimeout(() => {
      if (!disposed) invalidate()
    }, delay))
    let cadenceTimer = 0
    const renderNext = () => {
      if (disposed) return
      invalidate()
      cadenceTimer = window.setTimeout(renderNext, 250)
    }
    cadenceTimer = window.setTimeout(renderNext, 250)
    return () => {
      disposed = true
      bootstrap.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(cadenceTimer)
    }
  }, [active, invalidate, setFrameloop])
  return null
}

export function HomeWorldProductionV70({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false); const [sceneReady, setSceneReady] = useState(false); const [nearby, setNearby] = useState<Nearby>(null); const [dragging, setDragging] = useState(false); const [reducedMotion, setReducedMotion] = useState(false); const [mobile, setMobile] = useState(false); const [orbState, setOrbState] = useState<OrbState>('idle'); const [transition, setTransition] = useState<Transition>('none'); const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const yaw = useRef(0); const pitch = useRef(0.06); const target = useRef<THREE.Vector3 | null>(null); const worldRef = useRef<HTMLElement>(null); const markSceneReady = useCallback(() => setSceneReady(true), [])
  const openOrb = useCallback(() => { if (transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition]); const openGround = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('ground') } }, [transition]); const openLifeMap = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('life-map') } }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') openGround(); else if (nearby === 'life-map') openLifeMap() }, [nearby, openGround, openLifeMap, openOrb])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = 0; pitch.current = 0.06 } }); const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.50, onDragState: setDragging })
  useEffect(() => { const rm = window.matchMedia('(prefers-reduced-motion: reduce)'); const mq = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(rm.matches); setMobile(mq.matches) }; apply(); rm.addEventListener?.('change', apply); mq.addEventListener?.('change', apply); return () => { rm.removeEventListener?.('change', apply); mq.removeEventListener?.('change', apply) } }, [])
  useEffect(() => { const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }; window.addEventListener(URAI_ORB_STATE_EVENT, listener); return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener) }, [transition])
  useEffect(() => {
    if (transition === 'none') {
      setPortalSequence('idle')
      return
    }
    const traversal = `${transition}:traversal` as TransitionSequence
    const closing = `${transition}:closing` as TransitionSequence
    let closingTimer: number | undefined
    let navigationTimer: number | undefined
    setPortalSequence(`${transition}:opening` as TransitionSequence)
    const traversalTimer = window.setTimeout(() => {
      setPortalSequence(traversal)
      closingTimer = window.setTimeout(() => {
        setPortalSequence(closing)
        navigationTimer = window.setTimeout(() => {
          if (transition === 'ground') {
            requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
          } else {
            requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
          }
        }, reducedMotion ? 500 : 1100)
      }, reducedMotion ? 520 : 1600)
    }, reducedMotion ? 180 : 900)
    return () => {
      window.clearTimeout(traversalTimer)
      if (closingTimer !== undefined) window.clearTimeout(closingTimer)
      if (navigationTimer !== undefined) window.clearTimeout(navigationTimer)
    }
  }, [reducedMotion, transition])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && transition !== 'none') { event.preventDefault(); setTransition('none'); setPortalSequence('idle'); setOrbState('idle') } }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [transition])
  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady; const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'The threshold opens to your Life Map' : null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v76-deep-apse-relic-machine-sanctuary" data-home-visual-repair="v95-recursive-governed-family-removal-human-scale-thresholds" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="continuous-pbr-rock-industrial-machine-sanctuary" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-input-owner="window-capture-movement" data-home-telemetry-owner="embodied-motion-kernel-v66" data-home-input-ready={ready ? 'true' : 'false'} data-home-interaction-ready={ready ? 'true' : 'false'} data-home-ready={ready ? 'true' : 'warming'} data-home-player-x={SPAWN.x.toFixed(3)} data-home-player-z={SPAWN.z.toFixed(3)} data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x - ORB.x, SPAWN.z - ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x - GROUND.x, SPAWN.z - GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x - LIFE_MAP.x, SPAWN.z - LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-visual-grade="cinematic-pbr-v93-governed-dimensional-sanctuary" data-home-final-art-revision="v93-dimensional-governed-rebuild" data-home-live-art-revision="v93-governed-dimensional-sanctuary" data-home-live-orb-owner="governed-urai-orb-avatar-v1" data-home-art-certification="v76-retained-pixel-candidate-not-certified" data-home-scanned-composition="single-canvas-deep-apse-curved-load-bearing-relic-v76" data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock_face_01/asset.gltf rock_face_02/asset.gltf modular_industrial_pipes_01/asset.gltf industrial_caged_sconce/asset.gltf rock-face-pbr studio-small-08-1k.hdr" data-home-governed-identity-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb" data-home-visible-production-assets="governed-threshold-architecture rock_face_01 rock_face_02 rock-face-pbr" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="v93-dimensional-governed-sanctuary" data-home-input-locked={transition !== 'none' ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#080b0b' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion ? 'demand' : 'always'} camera={{ position: [SPAWN.x, 1.60, SPAWN.z], fov: 42, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.62; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.setClearColor(0x080b0b, 1); setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} owner={worldRef} /></Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}{transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}<span className="sr-only" data-testid="urai-home-webgl-orb">The governed living Orb is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

useGLTF.preload(GOVERNED_HOME); useGLTF.preload(GOVERNED_PORTAL); useGLTF.preload(GOVERNED_ORB); useGLTF.preload(ROCK_FACE_A); useGLTF.preload(ROCK_FACE_B); useGLTF.preload(PIPE_SYSTEM); useGLTF.preload(CAGED_SCONCE); useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
