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

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain',
  'home-authored-embodied-self',
  'home-orb-sanctuary',
  'home-ground-environmental-threshold',
  'home-life-map-sky-lookout',
  'home-life-map-physical-portal',
  'home-mountain-horizon',
  'home-living-vegetation',
  'home-sanctuary-pavilion',
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
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
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
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.78)
    if (/eye|cornea|iris/.test(materialName)) {
      clone.roughness = 0.05
      clone.metalness = 0
      clone.envMapIntensity = 1.45
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.clearcoat = 1
        clone.clearcoatRoughness = 0.035
      }
    } else if (/skin|body|face|head|ear|hand|foot/.test(materialName)) {
      clone.roughness = 0.58
      clone.metalness = 0
      clone.envMapIntensity = 0.48
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.clearcoat = 0.035
        clone.clearcoatRoughness = 0.74
        clone.sheen = 0.04
        clone.sheenRoughness = 0.9
      }
    } else if (/cloth|shirt|pants|garment|fabric|shoe/.test(materialName)) {
      clone.roughness = 0.82
      clone.metalness = 0
      clone.envMapIntensity = 0.36
    } else if (/hair|brow|lash/.test(materialName)) {
      clone.roughness = 0.6
      clone.metalness = 0
      clone.envMapIntensity = 0.42
    } else if (/metal|steel|chrome|bronze|gold|alloy/.test(materialName)) {
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.3, 0.56)
      clone.metalness = Math.max(clone.metalness, 0.55)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 1.12)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.32, clone.roughness), 0.32, 0.88)
      clone.metalness = Math.min(clone.metalness, 0.48)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 0.84)
    }
    clone.needsUpdate = true
  }
  return clone
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneAuthoredMaterial)
      : cloneAuthoredMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-cinematic-architectural-sanctuary-v8'
  return root
}

function ApproachPath({ texture }: { texture: THREE.Texture }) {
  const slabs = useMemo(() => Array.from({ length: 13 }, (_, index) => {
    const z = 6.15 - index * 0.64
    const offset = Math.sin(index * 1.73) * 0.08
    const yaw = Math.sin(index * 0.91) * 0.018
    return { z, offset, yaw, tone: index % 3 }
  }), [])

  return <group name="home-sanctuary-approach">
    {slabs.map((slab, index) => <mesh key={index} position={[slab.offset, 0.09 + index * 0.008, slab.z]} rotation={[0, slab.yaw, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.25 + (index % 2) * 0.14, 0.11, 0.54]} />
      <meshPhysicalMaterial
        color={slab.tone === 0 ? '#29343d' : slab.tone === 1 ? '#34414a' : '#26323a'}
        roughness={0.8}
        metalness={0.04}
        bumpMap={texture}
        bumpScale={0.045}
        roughnessMap={texture}
        clearcoat={0.08}
        clearcoatRoughness={0.7}
        envMapIntensity={0.82}
      />
    </mesh>)}
  </group>
}

function EngravedTerraces({ texture }: { texture: THREE.Texture }) {
  const terraces = [
    { radius: 10.15, y: -0.12, h: 0.2, color: '#171f27' },
    { radius: 8.35, y: 0.015, h: 0.24, color: '#202a32' },
    { radius: 6.45, y: 0.16, h: 0.26, color: '#26313a' },
    { radius: 4.75, y: 0.31, h: 0.28, color: '#2d3942' },
  ] as const

  return <group name="home-stone-terraces" position={[0, 0, -2.1]}>
    {terraces.map((terrace, index) => <mesh key={terrace.radius} position={[0, terrace.y, 0]} receiveShadow castShadow>
      <cylinderGeometry args={[terrace.radius, terrace.radius + 0.05, terrace.h, 128]} />
      <meshPhysicalMaterial
        color={terrace.color}
        roughness={0.78 + index * 0.025}
        metalness={0.055}
        bumpMap={texture}
        bumpScale={0.055}
        roughnessMap={texture}
        clearcoat={0.1}
        clearcoatRoughness={0.72}
        envMapIntensity={0.82}
      />
    </mesh>)}
    {[2.75, 4.3, 5.9].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.47 + index * 0.005, 0]}>
      <torusGeometry args={[radius, index === 0 ? 0.035 : 0.024, 10, 128]} />
      <meshStandardMaterial color="#9d8763" emissive="#4b3922" emissiveIntensity={0.16} roughness={0.42} metalness={0.58} />
    </mesh>)}
  </group>
}

function ReflectingChannels() {
  return <group name="home-reflecting-water">
    <mesh position={[-6.1, 0.08, -2.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3.4, 9.2, 1, 1]} />
      <meshPhysicalMaterial color="#103e50" roughness={0.08} metalness={0.03} transmission={0.22} transparent opacity={0.72} clearcoat={1} clearcoatRoughness={0.07} envMapIntensity={1.3} />
    </mesh>
    <mesh position={[6.1, 0.08, -2.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3.4, 9.2, 1, 1]} />
      <meshPhysicalMaterial color="#12374f" roughness={0.08} metalness={0.03} transmission={0.22} transparent opacity={0.72} clearcoat={1} clearcoatRoughness={0.07} envMapIntensity={1.3} />
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
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    )
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
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={1.02}>
    <Lightformer form="rect" intensity={4.6} color="#f2f5f7" position={[0, 10, 7]} scale={[12, 5, 1]} target={[0, 0.9, -3]} />
    <Lightformer form="rect" intensity={2.3} color="#85c1cf" position={[-9, 4, -5]} scale={[7, 4, 1]} target={[0, 1, -3]} />
    <Lightformer form="rect" intensity={2.0} color="#9084c0" position={[9, 4.5, -6]} scale={[7, 4, 1]} target={[0, 1, -3]} />
    <Lightformer form="ring" intensity={1.65} color="#f0d294" position={[0, 5.5, -12]} scale={6.5} target={[0, 1, -3]} />
  </Environment>
}

function archCurve(width: number, height: number) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width * 0.5, 0, 0),
    new THREE.Vector3(-width * 0.48, height * 0.35, 0),
    new THREE.Vector3(-width * 0.32, height * 0.72, 0),
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(width * 0.32, height * 0.72, 0),
    new THREE.Vector3(width * 0.48, height * 0.35, 0),
    new THREE.Vector3(width * 0.5, 0, 0),
  ], false, 'centripetal', 0.5)
}

function SanctuaryArch({ position, width, height, thickness, color = '#25333a', accent = '#6fc6d5', rotationY = 0 }: { position: Vec3; width: number; height: number; thickness: number; color?: string; accent?: string; rotationY?: number }) {
  const curve = useMemo(() => archCurve(width, height), [height, width])
  const surface = useSurfaceTexture(Math.round(width * 13 + height * 7), 3)
  return <group position={position as [number, number, number]} rotation={[0, rotationY, 0]}>
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 96, thickness, 16, false]} />
      <meshPhysicalMaterial color={color} roughness={0.31} metalness={0.64} bumpMap={surface} bumpScale={0.025} clearcoat={0.42} clearcoatRoughness={0.25} envMapIntensity={1.45} />
    </mesh>
    <mesh position={[0, 0, 0.04]}>
      <tubeGeometry args={[curve, 96, Math.max(0.018, thickness * 0.13), 10, false]} />
      <meshStandardMaterial color="#b6cbd0" emissive={accent} emissiveIntensity={0.5} roughness={0.28} metalness={0.72} />
    </mesh>
    <spotLight position={[-width * 0.48, 0.35, 0.35]} target-position={[0, height * 0.5, 0]} intensity={0.72} color={accent} angle={0.42} penumbra={0.8} distance={10} decay={2} />
    <spotLight position={[width * 0.48, 0.35, 0.35]} target-position={[0, height * 0.5, 0]} intensity={0.72} color={accent} angle={0.42} penumbra={0.8} distance={10} decay={2} />
  </group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0, 1.65, 0.12]}>
    <mesh scale={[1.28, 1.6, 1]}>
      <circleGeometry args={[1, 72]} />
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.34} transparent opacity={0.13} transmission={0.42} roughness={0.14} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <pointLight color={color} intensity={1.1} distance={7} decay={2} />
  </group>
}

function Lantern({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return <group position={position as [number, number, number]} scale={scale}>
    <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
      <cylinderGeometry args={[0.12, 0.15, 0.24, 20]} />
      <meshStandardMaterial color="#2a2d2d" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.37, 0]} castShadow>
      <boxGeometry args={[0.18, 0.32, 0.18]} />
      <meshPhysicalMaterial color="#ffd7a0" emissive="#ffb660" emissiveIntensity={1.4} transparent opacity={0.6} transmission={0.32} roughness={0.12} metalness={0} />
    </mesh>
    <mesh position={[0, 0.58, 0]} castShadow>
      <cylinderGeometry args={[0.14, 0.1, 0.1, 20]} />
      <meshStandardMaterial color="#2a2d2d" roughness={0.38} metalness={0.62} />
    </mesh>
    <pointLight position={[0, 0.4, 0]} color="#ffc47b" intensity={0.58} distance={4.6} decay={2} />
  </group>
}

function ArchitecturalPracticals() {
  const positions: Vec3[] = [
    [-2.25, 0.42, 5.35], [2.25, 0.42, 5.35],
    [-2.45, 0.48, 2.8], [2.45, 0.48, 2.8],
    [-3.2, 0.58, 0.05], [3.2, 0.58, 0.05],
    [-4.4, 0.6, -4.15], [4.4, 0.6, -4.15],
  ]
  return <group name="home-cinematic-practical-lighting">
    {positions.map((position, index) => <Lantern key={`${position[0]}-${position[2]}`} position={position} scale={index < 2 ? 0.86 : 1} />)}
  </group>
}

function makeMountainGeometry(seed: number, amplitude: number, zOffset: number) {
  const geometry = new THREE.PlaneGeometry(96, 68, 84, 52)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const depth = THREE.MathUtils.clamp((34 - z) / 68, 0, 1)
    const envelope = Math.pow(depth, 1.5)
    const longRidge = Math.abs(Math.sin(x * 0.105 + seed) + Math.sin(x * 0.041 - seed * 0.7) * 0.7)
    const broken = Math.abs(Math.sin(x * 0.29 + z * 0.055 + seed * 3.1)) * 0.85
    const grain = (seededNoise(Math.round(x * 8), Math.round(z * 8), seed) - 0.5) * 0.7
    const valley = Math.exp(-Math.pow(x / 14, 2)) * 2.6
    const y = -2.4 + envelope * (1.4 + longRidge * amplitude + broken * amplitude * 0.34 + grain) - valley * (1 - envelope * 0.45)
    position.setY(i, y)
  }
  geometry.translate(0, 0, zOffset)
  geometry.computeVertexNormals()
  return geometry
}

function MountainRange() {
  const near = useMemo(() => makeMountainGeometry(3, 5.3, -34), [])
  const far = useMemo(() => makeMountainGeometry(11, 7.4, -48), [])
  useEffect(() => () => { near.dispose(); far.dispose() }, [far, near])
  return <group>
    <mesh geometry={far} receiveShadow>
      <meshStandardMaterial color="#14222c" roughness={0.98} metalness={0} />
    </mesh>
    <mesh geometry={near} receiveShadow>
      <meshStandardMaterial color="#1b2c34" roughness={0.96} metalness={0} />
    </mesh>
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
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#64866f', roughness: 0.9, metalness: 0, side: THREE.DoubleSide }), [])
  useEffect(() => () => material.dispose(), [material])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x, z, scale, yaw], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, 0.42 + Math.sin(x * 0.25 + z * 0.17) * 0.08, z)
    object.rotation.y = yaw
    object.scale.setScalar(scale)
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = material
      child.castShadow = true
      child.receiveShadow = true
    })
    return object
  }), [fern.scene, material])

  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (reducedMotion || !root.current) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.003
  })

  return <group ref={root}>{plants.map((plant) => <primitive key={plant.name} object={plant} />)}</group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-11.5, 12.8, -43]}>
        <mesh><sphereGeometry args={[1.5, 64, 64]} /><meshBasicMaterial color="#f2f6f7" toneMapped={false} /></mesh>
        <mesh position={[0.56, 0.1, 0.34]}><sphereGeometry args={[1.48, 64, 64]} /><meshBasicMaterial color="#0d1b26" /></mesh>
      </group>
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
    if (reducedMotion) {
      allActions.forEach((action) => action.stop())
      activeAction.current = null
      return
    }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play()
    activeAction.current = next
  }, [actions, reducedMotion, state])

  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
  }, [actions])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.024
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.68) * 0.035
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.76 : state === 'listening' ? 0.73 : 0.71 + Math.sin(clock.elapsedTime * 1.05) * 0.012
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh>
      <sphereGeometry args={[0.68, 64, 64]} />
      <meshPhysicalMaterial color="#cdebf0" transparent opacity={0.12} transmission={0.86} thickness={0.14} roughness={0.08} metalness={0} clearcoat={1} ior={1.27} envMapIntensity={1.45} />
    </mesh>
    <group ref={authoredCore} scale={0.71}><primitive object={authoredOrb} /></group>
    <mesh rotation={[0.18, Math.PI / 2, 0.36]}>
      <torusGeometry args={[0.58, 0.008, 10, 128]} />
      <meshStandardMaterial color="#d7eef1" emissive="#5fb8c5" emissiveIntensity={0.78} metalness={0.56} roughness={0.24} />
    </mesh>
    <mesh rotation={[-0.5, 0.18, 0.14]}>
      <torusGeometry args={[0.76, 0.004, 8, 128]} />
      <meshStandardMaterial color="#d7c99a" emissive="#715a2c" emissiveIntensity={0.34} metalness={0.62} roughness={0.32} />
    </mesh>
    <pointLight color="#9be5ef" intensity={state === 'speaking' ? 4.2 : 3.2} distance={12} decay={2} />
  </group>
}

function OrbPlatform() {
  const stone = useSurfaceTexture(23, 5)
  return <group name="home-sanctuary-pavilion" position={[0, 0, 0]} userData={{ visualOwner: 'cinematic-architectural-sanctuary-v8' }}>
    <mesh position={[0, 0.6, -2.65]} castShadow receiveShadow>
      <cylinderGeometry args={[2.35, 2.52, 0.32, 96]} />
      <meshPhysicalMaterial color="#2f3a42" roughness={0.72} metalness={0.06} bumpMap={stone} bumpScale={0.05} roughnessMap={stone} clearcoat={0.12} clearcoatRoughness={0.68} envMapIntensity={0.88} />
    </mesh>
    <mesh position={[0, 0.82, -2.65]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.65, 0.035, 12, 128]} />
      <meshStandardMaterial color="#b4a077" emissive="#4f3d22" emissiveIntensity={0.24} metalness={0.58} roughness={0.35} />
    </mesh>
    <SanctuaryArch position={[0, 0.68, -4.1]} width={6.4} height={6.6} thickness={0.2} color="#213139" accent="#78c7d4" />
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0, Math.PI, 0]} userData={{ presentation: 'privacy-preserving-first-person-presence' }}>
    <primitive object={model} visible={false} scale={0.72} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#67c4cf' : '#8b7ed4'
  return <>
    <SanctuaryArch position={[0, 0.24, 0]} width={3.7} height={4.4} thickness={0.13} color="#1c2b32" accent={color} />
    <PortalMembrane color={color} />
  </>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0, -0.12, 0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} visible={false} />
    <DestinationArch tone="life-map" />
    <mesh position={[0, 1.8, 0]} onClick={(e)=>{e.stopPropagation();onActivate()}}>
      <boxGeometry args={[4.2,4.8,3]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0, 0.12, 0]}>
      <DestinationArch tone="ground" />
      <mesh position={[0,1.8,0]} onClick={(e)=>{e.stopPropagation();onGround()}}>
        <boxGeometry args={[4.2,4.8,3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(v:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const started = useRef<number|null>(null)
  const issued = useRef(false)
  const last = useRef<Nearby>(null)

  useLayoutEffect(()=>{
    camera.near = 0.12
    camera.far = 320
    camera.updateProjectionMatrix()
    camera.position.set(0, 1.72, 7.55)
    camera.lookAt(0, 1.48, -2.65)
  },[camera])

  useFrame(({clock},delta)=>{
    if (transition !== 'none') {
      if (started.current===null) started.current=clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      if (transition==='life-map') {
        camera.position.lerp(new THREE.Vector3(0,34,-34),1-Math.pow(0.002,delta))
        camera.lookAt(0,10+t*22,-20-t*22)
        useSceneStore.getState().setProgress(t)
      } else {
        camera.position.lerp(new THREE.Vector3(-5.2,-2.2,-13.5),1-Math.pow(0.002,delta))
        camera.lookAt(-5.2,-1,-15)
      }
      if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}
      return
    }

    started.current=null
    issued.current=false
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}

    const portrait=size.height>size.width
    const backDistance=portrait?0.16:0.28
    const eyeHeight=portrait?1.56:1.68
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.48+pitch.current,-Math.cos(yaw.current)*9.2))
    camera.lookAt(look)

    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const {scene}=useThree()
  const done=useRef(false)
  useEffect(()=>{
    let timer:number|undefined
    const check=()=>{
      if(done.current)return
      if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){
        done.current=true
        onReady()
        return
      }
      timer=window.setTimeout(check,60)
    }
    check()
    return()=>{if(timer!==undefined)window.clearTimeout(timer)}
  },[onReady,scene])
  return null
}

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(v:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <>
    <color attach="background" args={[cosmic?'#01030a':'#0a1722']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#0b1b26',cosmic?0.0022:0.0062]} />
    <Stars radius={180} depth={90} count={cosmic?2800:420} factor={cosmic?3:0.9} saturation={0.08} fade speed={props.reducedMotion?0:0.018} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.38} color="#b9c9d1" />
    <hemisphereLight args={['#d8e3ea','#1d2225',0.82]} />
    <directionalLight position={[-9,15,8]} intensity={2.9} color="#eff4f7" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[10,8,-10]} intensity={0.74} color="#9488c3" />
    <directionalLight position={[-3,5,10]} intensity={0.62} color="#e6c496" />
    <spotLight position={[0,10,8]} intensity={2.15} color="#f2f4f4" distance={38} angle={0.5} penumbra={0.94} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.5,-2.2]} opacity={0.34} scale={19} blur={2.8} far={7} resolution={256} frames={1} color="#020405" />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionSacred({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false)
  const [sceneReady,setSceneReady]=useState(false)
  const [nearby,setNearby]=useState<Nearby>(null)
  const [dragging,setDragging]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(false)
  const [mobile,setMobile]=useState(false)
  const [orbState,setOrbState]=useState<OrbState>('idle')
  const [transition,setTransition]=useState<'none'|'ground'|'life-map'>('none')
  const yaw=useRef(0)
  const pitch=useRef(-0.04)
  const target=useRef<THREE.Vector3|null>(null)
  const avatar=useRef<THREE.Group|null>(null)
  const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{
    if(!useSceneStore.getState().inputLocked&&transition==='none'){
      setOrbState('attention')
      onOrbOpen()
    }
  },[onOrbOpen,transition])

  const ground=useCallback(()=>{
    if(transition!=='none')return
    target.current=null
    setOrbState('transition')
    setTransition('ground')
  },[transition])

  const lifeMap=useCallback(()=>{
    if(transition!=='none')return
    target.current=null
    setOrbState('transition')
    setTransition('life-map')
    useSceneStore.getState().enterLifeMap()
  },[transition])

  const interact=useCallback(()=>{
    if(nearby==='orb')openOrb()
    else if(nearby==='ground')ground()
    else if(nearby==='life-map')lifeMap()
  },[nearby,openOrb,ground,lifeMap])

  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=-0.04}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})

  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)')
    const m=window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply=()=>{setReducedMotion(rm.matches);setMobile(m.matches)}
    apply()
    rm.addEventListener?.('change',apply)
    m.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);m.removeEventListener?.('change',apply)}
  },[])

  useEffect(()=>{
    const fn=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)}
    window.addEventListener(URAI_ORB_STATE_EVENT,fn)
    return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,fn)
  },[transition])

  useEffect(()=>{
    const cancel=(e:KeyboardEvent)=>{
      if(e.key!=='Escape'||transition==='none')return
      e.preventDefault()
      setTransition('none')
      setOrbState('idle')
      const store=useSceneStore.getState()
      store.setPhase('HOME')
      store.unlock()
    }
    window.addEventListener('keydown',cancel,true)
    return()=>window.removeEventListener('keydown',cancel,true)
  },[transition])

  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady
  const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'Look to the sky':null
  const complete=()=>{
    if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'})
    else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})
  }

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v8-architectural-sanctuary" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb local-stone-pbr local-mountain-terrain" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#0a1722'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[0,1.72,7.55],fov:49,near:0.12,far:320}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.18;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
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