'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Stars, useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const SANCTUARY = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const PORTAL_MODEL = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const HUMAN = '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb'
const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const SPAWN = new THREE.Vector3(0, 0.04, 6.9)
const ORB = new THREE.Vector3(0, 1.62, -2.65)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -10.5, maxX: 10.5, minZ: -12.5, maxZ: 8.5 }
const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-mountain-horizon', 'home-living-vegetation', 'home-sanctuary-pavilion',
] as const

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Vec3 = readonly [number, number, number]

function seededNoise(x: number, y: number, seed: number) {
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function makeSurfaceTexture(seed: number, repeat = 6) {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4
      const broad = Math.sin(x * 0.11 + seed) * 0.24 + Math.cos(y * 0.09 - seed) * 0.22
      const grain = seededNoise(x, y, seed) * 2 - 1
      const hairline = Math.sin((x + y * 0.7) * 0.34 + seed * 2.1) * 0.08
      const value = THREE.MathUtils.clamp(148 + broad * 38 + grain * 34 + hairline * 44, 62, 224)
      data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function useSurfaceTexture(seed: number, repeat = 6) {
  const texture = useMemo(() => makeSurfaceTexture(seed, repeat), [repeat, seed])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function cloneAuthoredMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    const materialName = `${material.name} ${clone.name}`.toLowerCase()
    const hasEmission = clone.emissive.r > 0 || clone.emissive.g > 0 || clone.emissive.b > 0
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.72)
    if (/eye|cornea|iris/.test(materialName)) {
      clone.roughness = 0.05; clone.metalness = 0; clone.envMapIntensity = 1.35
      if (clone instanceof THREE.MeshPhysicalMaterial) { clone.clearcoat = 1; clone.clearcoatRoughness = 0.04 }
    } else if (/skin|body|face|head|ear|hand|foot/.test(materialName)) {
      clone.roughness = 0.6; clone.metalness = 0; clone.envMapIntensity = 0.46
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.clearcoat = 0.03; clone.clearcoatRoughness = 0.78; clone.sheen = 0.04; clone.sheenRoughness = 0.92
      }
    } else if (/cloth|shirt|pants|garment|fabric|shoe/.test(materialName)) {
      clone.roughness = 0.84; clone.metalness = 0; clone.envMapIntensity = 0.34
    } else if (/hair|brow|lash/.test(materialName)) {
      clone.roughness = 0.62; clone.metalness = 0; clone.envMapIntensity = 0.4
    } else if (/metal|steel|chrome|bronze|gold|alloy/.test(materialName)) {
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.34, 0.62)
      clone.metalness = Math.max(clone.metalness, 0.5)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 1.05)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.4, clone.roughness), 0.4, 0.9)
      clone.metalness = Math.min(clone.metalness, 0.38)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 0.76)
    }
    clone.needsUpdate = true
  }
  return clone
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material) ? object.material.map(cloneAuthoredMaterial) : cloneAuthoredMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

const AUTHORED_VISIBLE_STRUCTURE = /sanctuary-vault-\d+-stone-|living-grove-(trunk|crown)-|ground-descent-path|life-map-ascent-path|memory-garden-path|horizon-monolith|horizon-bridge|horizon-memory-veil/i

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  let visibleMeshes = 0
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const keep = AUTHORED_VISIBLE_STRUCTURE.test(object.name)
    object.visible = keep
    if (!keep) return
    visibleMeshes += 1
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return
      material.roughness = Math.max(material.roughness, 0.68)
      material.metalness = Math.min(material.metalness, 0.28)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.92)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.clearcoat = Math.min(material.clearcoat, 0.12)
        material.clearcoatRoughness = Math.max(material.clearcoatRoughness, 0.68)
      }
      material.needsUpdate = true
    })
  })
  root.visible = true
  root.userData.retainedForGovernedCompatibilityOnly = false
  root.userData.visibleWorldOwner = 'home-authored-selective-sanctuary-v10'
  root.userData.visibleAuthoredMeshes = visibleMeshes
  root.userData.suppressedEmbodiedAndLegacyOccluders = true
  return root
}

function ApproachPath({ texture }: { texture: THREE.Texture }) {
  const slabs = useMemo(() => Array.from({ length: 13 }, (_, index) => ({
    z: 6.12 - index * 0.64,
    offset: Math.sin(index * 1.73) * 0.11,
    yaw: Math.sin(index * 0.91) * 0.025,
    width: 3.05 + seededNoise(index, 2, 7) * 0.28,
    depth: 0.48 + seededNoise(index, 8, 5) * 0.11,
    tone: index % 3,
  })), [])
  return <group name="home-sanctuary-approach">
    {slabs.map((slab, index) => <mesh key={index} position={[slab.offset, 0.085 + index * 0.007, slab.z]} rotation={[0, slab.yaw, 0]} castShadow receiveShadow>
      <boxGeometry args={[slab.width, 0.09, slab.depth]} />
      <meshPhysicalMaterial color={slab.tone === 0 ? '#313a3c' : slab.tone === 1 ? '#394244' : '#2b3537'} roughness={0.91} metalness={0.015} bumpMap={texture} bumpScale={0.065} roughnessMap={texture} clearcoat={0.025} clearcoatRoughness={0.9} envMapIntensity={0.66} />
    </mesh>)}
  </group>
}

function makeIrregularTerraceGeometry(radius: number, height: number, seed: number) {
  const geometry = new THREE.CylinderGeometry(radius, radius + 0.035, height, 128, 1, false)
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i); const z = position.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.01) continue
    const angle = Math.atan2(z, x)
    const irregularity = 1 + Math.sin(angle * 5 + seed) * 0.006 + Math.sin(angle * 11 - seed * 0.7) * 0.0035
    position.setX(i, x * irregularity)
    position.setZ(i, z * irregularity)
  }
  geometry.computeVertexNormals()
  return geometry
}

function StoneTerrace({ radius, height, y, offset, seed, color, texture }: { radius: number; height: number; y: number; offset: readonly [number, number]; seed: number; color: string; texture: THREE.Texture }) {
  const geometry = useMemo(() => makeIrregularTerraceGeometry(radius, height, seed), [height, radius, seed])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[offset[0], y, offset[1]]} receiveShadow castShadow>
    <meshPhysicalMaterial color={color} roughness={0.9} metalness={0.012} bumpMap={texture} bumpScale={0.072} roughnessMap={texture} clearcoat={0.025} clearcoatRoughness={0.92} envMapIntensity={0.68} />
  </mesh>
}

function EngravedTerraces({ texture }: { texture: THREE.Texture }) {
  const terraces = [
    { radius: 10.15, y: -0.12, h: 0.18, color: '#1d2528', offset: [-0.06, 0.03] as const, seed: 3 },
    { radius: 8.0, y: 0.005, h: 0.2, color: '#263034', offset: [0.07, -0.07] as const, seed: 7 },
    { radius: 5.85, y: 0.14, h: 0.22, color: '#2e383b', offset: [-0.04, 0.05] as const, seed: 11 },
    { radius: 4.15, y: 0.265, h: 0.22, color: '#354044', offset: [0.035, -0.025] as const, seed: 17 },
  ] as const
  return <group name="home-stone-terraces" position={[0, 0, -2.1]}>
    {terraces.map((terrace) => <StoneTerrace key={terrace.radius} radius={terrace.radius} height={terrace.h} y={terrace.y} offset={terrace.offset} seed={terrace.seed} color={terrace.color} texture={texture} />)}
  </group>
}

function ReflectingChannels() {
  return <group name="home-reflecting-water">
    <mesh position={[-6.15, 0.075, -3.1]} rotation={[-Math.PI / 2, 0, -0.025]} receiveShadow>
      <planeGeometry args={[3.0, 8.6]} />
      <meshPhysicalMaterial color="#123641" roughness={0.12} metalness={0.01} transmission={0.2} transparent opacity={0.58} clearcoat={0.82} clearcoatRoughness={0.13} envMapIntensity={1.02} />
    </mesh>
    <mesh position={[6.08, 0.075, -3.0]} rotation={[-Math.PI / 2, 0, 0.018]} receiveShadow>
      <planeGeometry args={[3.15, 8.35]} />
      <meshPhysicalMaterial color="#133746" roughness={0.12} metalness={0.01} transmission={0.2} transparent opacity={0.56} clearcoat={0.82} clearcoatRoughness={0.13} envMapIntensity={1.02} />
    </mesh>
  </group>
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const model = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const stoneTexture = useSurfaceTexture(7, 7)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain">
    <primitive object={model} />
    <EngravedTerraces texture={stoneTexture} />
    <ApproachPath texture={stoneTexture} />
    <ReflectingChannels />
    <mesh name="home-walkable-navigation-surface" position={[0, 0.7, -1.8]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[21, 21]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={0.94}>
    <Lightformer form="rect" intensity={3.7} color="#eff3f2" position={[0, 10, 7]} scale={[12, 5, 1]} target={[0, 0.9, -3]} />
    <Lightformer form="rect" intensity={1.85} color="#7daebb" position={[-9, 4, -5]} scale={[7, 4, 1]} target={[0, 1, -3]} />
    <Lightformer form="rect" intensity={1.55} color="#8178a8" position={[9, 4.5, -6]} scale={[7, 4, 1]} target={[0, 1, -3]} />
    <Lightformer form="ring" intensity={1.25} color="#ddbd86" position={[0, 5.5, -12]} scale={6.5} target={[0, 1, -3]} />
  </Environment>
}

function archCurve(width: number, height: number) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width * 0.5, 0, 0), new THREE.Vector3(-width * 0.47, height * 0.31, 0.015),
    new THREE.Vector3(-width * 0.33, height * 0.69, -0.02), new THREE.Vector3(-width * 0.09, height * 0.96, 0.018),
    new THREE.Vector3(width * 0.08, height * 0.98, -0.012), new THREE.Vector3(width * 0.32, height * 0.7, 0.018),
    new THREE.Vector3(width * 0.47, height * 0.32, -0.015), new THREE.Vector3(width * 0.5, 0, 0),
  ], false, 'centripetal', 0.5)
}

function SanctuaryArch({ position, width, height, thickness, color = '#2b3536', accent = '#6aaab3', rotationY = 0 }: { position: Vec3; width: number; height: number; thickness: number; color?: string; accent?: string; rotationY?: number }) {
  const curve = useMemo(() => archCurve(width, height), [height, width])
  const surface = useSurfaceTexture(Math.round(width * 13 + height * 7), 3)
  return <group position={position as [number, number, number]} rotation={[0, rotationY, 0]}>
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 96, thickness, 16, false]} />
      <meshPhysicalMaterial color={color} roughness={0.72} metalness={0.12} bumpMap={surface} bumpScale={0.06} roughnessMap={surface} clearcoat={0.05} clearcoatRoughness={0.8} envMapIntensity={0.78} />
    </mesh>
    <mesh position={[0, 0, 0.035]}>
      <tubeGeometry args={[curve, 96, Math.max(0.01, thickness * 0.06), 10, false]} />
      <meshStandardMaterial color="#828b8b" emissive={accent} emissiveIntensity={0.13} roughness={0.62} metalness={0.26} />
    </mesh>
  </group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0, 1.52, 0.12]}>
    <mesh scale={[1.05, 1.34, 1]}>
      <circleGeometry args={[1, 72]} />
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.14} transparent opacity={0.075} transmission={0.52} roughness={0.22} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <pointLight color={color} intensity={0.42} distance={4.8} decay={2} />
  </group>
}

function Lantern({ position, scale = 1, yaw = 0 }: { position: Vec3; scale?: number; yaw?: number }) {
  return <group position={position as [number, number, number]} scale={scale} rotation={[0, yaw, 0]}>
    <mesh castShadow receiveShadow position={[0, 0.11, 0]}><cylinderGeometry args={[0.11, 0.145, 0.22, 20]} /><meshStandardMaterial color="#242624" roughness={0.68} metalness={0.32} /></mesh>
    <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.17, 0.3, 0.17]} /><meshPhysicalMaterial color="#8d6c45" transparent opacity={0.32} transmission={0.5} roughness={0.3} metalness={0} clearcoat={0.45} clearcoatRoughness={0.3} /></mesh>
    <mesh position={[0, 0.36, 0]}><sphereGeometry args={[0.047, 18, 18]} /><meshBasicMaterial color="#ffd49a" toneMapped={false} /></mesh>
    <mesh position={[0, 0.57, 0]} castShadow><cylinderGeometry args={[0.13, 0.095, 0.085, 20]} /><meshStandardMaterial color="#242624" roughness={0.66} metalness={0.34} /></mesh>
    <pointLight position={[0, 0.37, 0]} color="#e5aa67" intensity={0.3} distance={3.7} decay={2} />
  </group>
}

function ArchitecturalPracticals() {
  const fixtures = [
    { p: [-2.15, 0.4, 4.9] as Vec3, s: 0.82, y: 0.07 }, { p: [2.28, 0.4, 4.75] as Vec3, s: 0.86, y: -0.09 },
    { p: [-3.0, 0.53, 1.2] as Vec3, s: 0.92, y: -0.06 }, { p: [3.15, 0.53, 0.95] as Vec3, s: 0.88, y: 0.1 },
    { p: [-4.15, 0.57, -4.45] as Vec3, s: 0.96, y: 0.13 }, { p: [4.35, 0.57, -4.2] as Vec3, s: 0.9, y: -0.12 },
  ]
  return <group name="home-cinematic-practical-lighting">{fixtures.map((fixture, index) => <Lantern key={index} position={fixture.p} scale={fixture.s} yaw={fixture.y} />)}</group>
}

function horizonShape(seed: number, amplitude: number) {
  const shape = new THREE.Shape(); shape.moveTo(-58, -5); shape.lineTo(-58, -1.4)
  for (let i = 0; i <= 28; i += 1) {
    const x = -58 + (116 * i) / 28
    const ridge = Math.abs(Math.sin(i * 0.71 + seed) * 0.52 + Math.sin(i * 0.29 - seed) * 0.35)
    const shoulder = Math.exp(-Math.pow((i - 14) / 8.5, 2)) * 0.75
    const y = -1.15 + ridge * amplitude + shoulder * amplitude * 0.52 + (seededNoise(i, seed * 4, seed + 3) - 0.5) * 0.22
    shape.lineTo(x, y)
  }
  shape.lineTo(58, -5); shape.closePath(); return shape
}

function HorizonRidge({ seed, amplitude, position, color, opacity }: { seed: number; amplitude: number; position: Vec3; color: string; opacity: number }) {
  const shape = useMemo(() => horizonShape(seed, amplitude), [amplitude, seed])
  return <mesh position={position as [number, number, number]}><shapeGeometry args={[shape]} /><meshBasicMaterial color={color} transparent opacity={opacity} fog depthWrite={false} /></mesh>
}

function MountainRange() {
  return <group name="home-distant-natural-horizon" userData={{ geometry: 'fog-softened-silhouette-not-displaced-grid' }}>
    <HorizonRidge seed={11} amplitude={4.6} position={[0, 1.1, -58]} color="#12232d" opacity={0.68} />
    <HorizonRidge seed={5} amplitude={3.7} position={[0, 0.45, -48]} color="#172b34" opacity={0.6} />
    <HorizonRidge seed={2} amplitude={2.7} position={[0, -0.05, -40]} color="#1b3037" opacity={0.46} />
  </group>
}

const FERN_PLACEMENTS: readonly [number, number, number, number][] = [
  [-8.5, 4.2, 1.1, 0.3], [-7.6, 1.1, 0.82, 1.4], [-8.2, -2.8, 1.02, -0.7], [-7.4, -6.6, 0.9, 2.2],
  [-4.9, -5.1, 0.7, -1.2], [-4.4, 1.5, 0.62, 0.6], [8.5, 4.0, 1.08, -0.2], [7.7, 0.8, 0.84, -1.6],
  [8.1, -3.0, 1.0, 0.8], [7.4, -6.7, 0.92, -2.3], [4.8, -5.2, 0.72, 1.1], [4.3, 1.4, 0.64, -0.5],
  [-6.1, 5.8, 0.66, 2.4], [6.0, 5.8, 0.66, -2.1], [-6.3, -9.9, 0.76, 0.9], [6.3, -9.9, 0.76, -0.8],
]

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#536f5c', roughness: 0.96, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#607b64', roughness: 0.94, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#496554', roughness: 0.97, metalness: 0, side: THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x, z, scale, yaw], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, 0.38 + Math.sin(x * 0.25 + z * 0.17) * 0.07, z)
    object.rotation.y = yaw
    object.rotation.z = (seededNoise(index, 9, 3) - 0.5) * 0.05
    object.scale.setScalar(scale * (0.94 + seededNoise(index, 5, 13) * 0.12))
    object.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = materials[index % materials.length]; child.castShadow = true; child.receiveShadow = true } })
    return object
  }), [fern.scene, materials])
  return <group userData={{ reducedMotion, treatment: 'scanned-natural-variation' }}>{plants.map((plant) => <primitive key={plant.name} object={plant} />)}</group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-10.6, 10.6, -39]}><mesh><sphereGeometry args={[1.1, 48, 48]} /><meshBasicMaterial color="#dce4e2" toneMapped={false} /></mesh><mesh position={[0.42, 0.06, 0.26]}><sphereGeometry args={[1.08, 48, 48]} /><meshBasicMaterial color="#0a1720" /></mesh></group>
    </group>
    <group name="home-living-vegetation"><FernGarden reducedMotion={reducedMotion} /></group>
  </>
}

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state, reducedMotion])

  useEffect(() => {
    const allActions = Object.values(actions).filter((action): action is THREE.AnimationAction => Boolean(action))
    if (reducedMotion) { allActions.forEach((action) => action.stop()); activeAction.current = null; return }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play(); activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.024
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.68) * 0.03
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.75 : state === 'listening' ? 0.72 : 0.7 + Math.sin(clock.elapsedTime * 1.05) * 0.01
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh><sphereGeometry args={[0.64, 64, 64]} /><meshPhysicalMaterial color="#c9e2e5" transparent opacity={0.09} transmission={0.9} thickness={0.12} roughness={0.1} metalness={0} clearcoat={0.94} ior={1.25} envMapIntensity={1.28} /></mesh>
    <group ref={authoredCore} scale={0.7}><primitive object={authoredOrb} /></group>
    <mesh rotation={[0.18, Math.PI / 2, 0.36]}><torusGeometry args={[0.56, 0.006, 10, 128]} /><meshStandardMaterial color="#cadbdd" emissive="#579ca6" emissiveIntensity={0.46} metalness={0.42} roughness={0.34} /></mesh>
    <mesh rotation={[-0.5, 0.18, 0.14]}><torusGeometry args={[0.73, 0.0035, 8, 128]} /><meshStandardMaterial color="#c6b88d" emissive="#5d4a29" emissiveIntensity={0.2} metalness={0.46} roughness={0.42} /></mesh>
    <pointLight color="#91d0d7" intensity={state === 'speaking' ? 2.8 : 2.2} distance={10} decay={2} />
  </group>
}

function OrbPlatform() {
  const stone = useSurfaceTexture(23, 5)
  return <group name="home-sanctuary-pavilion" position={[0, 0, 0]} userData={{ visualOwner: 'authored-masonry-sanctuary-v10' }}>
    <mesh position={[0.04, 0.55, -2.68]} castShadow receiveShadow>
      <cylinderGeometry args={[1.82, 1.97, 0.22, 96]} />
      <meshPhysicalMaterial color="#394144" roughness={0.92} metalness={0.01} bumpMap={stone} bumpScale={0.075} roughnessMap={stone} clearcoat={0.025} clearcoatRoughness={0.92} envMapIntensity={0.66} />
    </mesh>
    <mesh position={[0.04, 0.68, -2.68]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.32, 0.012, 10, 128]} /><meshStandardMaterial color="#857353" emissive="#34291d" emissiveIntensity={0.06} metalness={0.34} roughness={0.58} /></mesh>
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0, Math.PI, 0]} userData={{ presentation: 'privacy-preserving-first-person-presence' }}><primitive object={model} visible={false} scale={0.72} /></group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#5ba8b1' : '#7770b5'
  return <><SanctuaryArch position={[0, 0.18, 0]} width={2.55} height={3.15} thickness={0.085} color="#263133" accent={color} /><PortalMembrane color={color} /></>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0, -0.12, 0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} visible={false} />
    <DestinationArch tone="life-map" />
    <mesh position={[0, 1.8, 0]} onClick={(e)=>{e.stopPropagation();onActivate()}}><boxGeometry args={[4.2,4.8,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0, 0.12, 0]}><DestinationArch tone="ground" /><mesh position={[0,1.8,0]} onClick={(e)=>{e.stopPropagation();onGround()}}><boxGeometry args={[4.2,4.8,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(v:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone()); const velocity = useRef(new THREE.Vector3()); const started = useRef<number|null>(null); const issued = useRef(false); const last = useRef<Nearby>(null)

  useLayoutEffect(()=>{ camera.near = 0.12; camera.far = 320; camera.updateProjectionMatrix(); camera.position.set(0, 1.72, 7.55); camera.lookAt(0, 1.48, -2.65) },[camera])

  useFrame(({clock},delta)=>{
    if (transition !== 'none') {
      if (started.current===null) started.current=clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      if (transition==='life-map') { camera.position.lerp(new THREE.Vector3(0,34,-34),1-Math.pow(0.002,delta)); camera.lookAt(0,10+t*22,-20-t*22); useSceneStore.getState().setProgress(t) }
      else { camera.position.lerp(new THREE.Vector3(-5.2,-2.2,-13.5),1-Math.pow(0.002,delta)); camera.lookAt(-5.2,-1,-15) }
      if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}
      return
    }
    started.current=null; issued.current=false
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}
    const portrait=size.height>size.width; const backDistance=portrait?0.16:0.28; const eyeHeight=portrait?1.56:1.68
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.48+pitch.current,-Math.cos(yaw.current)*9.2)); camera.lookAt(look)
    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const {scene}=useThree(); const done=useRef(false)
  useEffect(()=>{
    let timer:number|undefined
    const check=()=>{ if(done.current)return; if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}; timer=window.setTimeout(check,60) }
    check(); return()=>{if(timer!==undefined)window.clearTimeout(timer)}
  },[onReady,scene])
  return null
}

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(v:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <>
    <color attach="background" args={[cosmic?'#01030a':'#08141c']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#0a1820',cosmic?0.0022:0.007]} />
    <Stars radius={180} depth={90} count={cosmic?2800:210} factor={cosmic?3:0.7} saturation={0.06} fade speed={props.reducedMotion?0:0.012} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.34} color="#b8c3c5" />
    <hemisphereLight args={['#cfdbdc','#1c2222',0.72]} />
    <directionalLight position={[-9,15,8]} intensity={2.35} color="#edf1ef" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[10,8,-10]} intensity={0.5} color="#817ba5" />
    <directionalLight position={[-3,5,10]} intensity={0.42} color="#d1ae7e" />
    <spotLight position={[0,10,8]} intensity={1.5} color="#edf0ed" distance={34} angle={0.48} penumbra={0.95} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.45,-2.2]} opacity={0.3} scale={18} blur={3.0} far={6.5} resolution={256} frames={1} color="#020405" />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionSacred({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false); const [sceneReady,setSceneReady]=useState(false); const [nearby,setNearby]=useState<Nearby>(null); const [dragging,setDragging]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(false); const [mobile,setMobile]=useState(false); const [orbState,setOrbState]=useState<OrbState>('idle'); const [transition,setTransition]=useState<'none'|'ground'|'life-map'>('none')
  const yaw=useRef(0); const pitch=useRef(-0.04); const target=useRef<THREE.Vector3|null>(null); const avatar=useRef<THREE.Group|null>(null); const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=-0.04}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})

  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)'); const m=window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply=()=>{setReducedMotion(rm.matches);setMobile(m.matches)}; apply(); rm.addEventListener?.('change',apply); m.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);m.removeEventListener?.('change',apply)}
  },[])
  useEffect(()=>{ const fn=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)}; window.addEventListener(URAI_ORB_STATE_EVENT,fn); return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,fn) },[transition])
  useEffect(()=>{
    const cancel=(e:KeyboardEvent)=>{ if(e.key!=='Escape'||transition==='none')return; e.preventDefault(); setTransition('none'); setOrbState('idle'); const store=useSceneStore.getState(); store.setPhase('HOME'); store.unlock() }
    window.addEventListener('keydown',cancel,true); return()=>window.removeEventListener('keydown',cancel,true)
  },[transition])

  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady
  const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'Look to the sky':null
  const complete=()=>{ if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'}); else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'}) }

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v10-authored-depth" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb local-stone-pbr local-mountain-terrain" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#08141c'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[0,1.72,7.55],fov:49,near:0.12,far:320}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.1;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
      <SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={markSceneReady} />
    </Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}
    {transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)