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
type FlagstonePack = { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }

function seededNoise(x: number, y: number, seed: number) {
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function smoothstep01(value: number) {
  const x = THREE.MathUtils.clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

function configureTexture(texture: THREE.DataTexture, repeat: number, color = false) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function makeFlagstoneTexturePack(repeat = 4.2, seed = 31): FlagstonePack {
  const size = 256
  const grid = 7
  const cell = size / grid
  const centers = Array.from({ length: grid * grid }, (_, index) => {
    const gx = index % grid
    const gy = Math.floor(index / grid)
    return {
      gx,
      gy,
      x: (gx + 0.5 + (seededNoise(gx, gy, seed) - 0.5) * 0.48) * cell,
      y: (gy + 0.5 + (seededNoise(gx, gy, seed + 7) - 0.5) * 0.48) * cell,
      tone: seededNoise(gx, gy, seed + 13),
      warmth: seededNoise(gx, gy, seed + 19),
    }
  })
  const colorBytes = new Uint8Array(size * size * 4)
  const heightBytes = new Uint8Array(size * size * 4)
  const roughBytes = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const baseGX = Math.floor(x / cell)
      const baseGY = Math.floor(y / cell)
      let nearest = Number.POSITIVE_INFINITY
      let second = Number.POSITIVE_INFINITY
      let nearestCell = centers[0]
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const gx = (baseGX + ox + grid) % grid
          const gy = (baseGY + oy + grid) % grid
          const candidate = centers[gy * grid + gx]
          const rawDX = Math.abs(x - candidate.x)
          const rawDY = Math.abs(y - candidate.y)
          const dx = Math.min(rawDX, size - rawDX)
          const dy = Math.min(rawDY, size - rawDY)
          const distance = dx * dx + dy * dy
          if (distance < nearest) {
            second = nearest
            nearest = distance
            nearestCell = candidate
          } else if (distance < second) second = distance
        }
      }

      const separation = Math.sqrt(second) - Math.sqrt(nearest)
      const face = smoothstep01((separation - 0.9) / 3.9)
      const coarse = Math.sin(x * 0.081 + seed) * 0.45 + Math.cos(y * 0.071 - seed * 0.6) * 0.36
      const medium = Math.sin((x + y) * 0.19 + seed * 1.7) * 0.17 + Math.cos((x - y) * 0.13) * 0.13
      const grain = seededNoise(x, y, seed + 29) - 0.5
      const cellTone = nearestCell.tone - 0.5
      const warmth = nearestCell.warmth - 0.5
      const surface = coarse + medium + grain * 0.42
      const height = THREE.MathUtils.clamp(0.55 + surface * 0.08 + cellTone * 0.07 - (1 - face) * 0.25, 0, 1)
      const roughness = THREE.MathUtils.clamp(0.79 + (1 - face) * 0.15 - cellTone * 0.05 - surface * 0.025, 0.68, 0.98)

      const stoneR = 42 + cellTone * 25 + warmth * 10 + surface * 8
      const stoneG = 49 + cellTone * 26 + warmth * 4 + surface * 9
      const stoneB = 51 + cellTone * 25 - warmth * 5 + surface * 10
      const jointR = 19 + surface * 2
      const jointG = 22 + surface * 2
      const jointB = 21 + surface * 2
      const index = (y * size + x) * 4
      colorBytes[index] = THREE.MathUtils.clamp(Math.round(stoneR * face + jointR * (1 - face)), 8, 105)
      colorBytes[index + 1] = THREE.MathUtils.clamp(Math.round(stoneG * face + jointG * (1 - face)), 8, 112)
      colorBytes[index + 2] = THREE.MathUtils.clamp(Math.round(stoneB * face + jointB * (1 - face)), 8, 118)
      colorBytes[index + 3] = 255
      const h = Math.round(height * 255)
      const r = Math.round(roughness * 255)
      heightBytes[index] = h; heightBytes[index + 1] = h; heightBytes[index + 2] = h; heightBytes[index + 3] = 255
      roughBytes[index] = r; roughBytes[index + 1] = r; roughBytes[index + 2] = r; roughBytes[index + 3] = 255
    }
  }

  return {
    color: configureTexture(new THREE.DataTexture(colorBytes, size, size, THREE.RGBAFormat), repeat, true),
    height: configureTexture(new THREE.DataTexture(heightBytes, size, size, THREE.RGBAFormat), repeat),
    roughness: configureTexture(new THREE.DataTexture(roughBytes, size, size, THREE.RGBAFormat), repeat),
  }
}

function useFlagstoneTexturePack(repeat = 4.2, seed = 31) {
  const pack = useMemo(() => makeFlagstoneTexturePack(repeat, seed), [repeat, seed])
  useEffect(() => () => {
    pack.color.dispose()
    pack.height.dispose()
    pack.roughness.dispose()
  }, [pack])
  return pack
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
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.36, 0.66)
      clone.metalness = Math.max(clone.metalness, 0.46)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 0.96)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.5, clone.roughness), 0.5, 0.94)
      clone.metalness = Math.min(clone.metalness, 0.24)
      clone.envMapIntensity = Math.min(Math.max(clone.envMapIntensity, 0.7), 0.9)
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

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-grounded-material-sanctuary-v11'
  return root
}

function makeIrregularShape(radius: number, seed: number, points = 96) {
  const shape = new THREE.Shape()
  for (let index = 0; index < points; index += 1) {
    const angle = index / points * Math.PI * 2
    const radiusNoise = 1
      + Math.sin(angle * 5 + seed) * 0.014
      + Math.sin(angle * 11 - seed * 0.71) * 0.007
      + (seededNoise(index, seed, 47) - 0.5) * 0.009
    const x = Math.cos(angle) * radius * radiusNoise
    const y = Math.sin(angle) * radius * radiusNoise
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function FlagstoneMaterial({ pack, tint = '#657073', bumpScale = 0.09 }: { pack: FlagstonePack; tint?: string; bumpScale?: number }) {
  return <meshPhysicalMaterial
    color={tint}
    map={pack.color}
    bumpMap={pack.height}
    bumpScale={bumpScale}
    roughnessMap={pack.roughness}
    roughness={0.88}
    metalness={0.015}
    clearcoat={0.035}
    clearcoatRoughness={0.88}
    envMapIntensity={0.72}
  />
}

function GroundClearing({ pack }: { pack: FlagstonePack }) {
  const apronPack = useFlagstoneTexturePack(8.1, 73)
  const clearing = useMemo(() => makeIrregularShape(10.7, 13, 112), [])
  return <group name="home-grounded-flagstone-clearing" position={[0, 0, -1.8]}>
    <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[33, 33]} />
      <meshPhysicalMaterial color="#263033" map={apronPack.color} bumpMap={apronPack.height} bumpScale={0.11} roughnessMap={apronPack.roughness} roughness={0.95} metalness={0} envMapIntensity={0.52} />
    </mesh>
    <mesh position={[0, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[clearing, { depth: 0.16, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.035, bevelSegments: 2, curveSegments: 2 }]} />
      <FlagstoneMaterial pack={pack} tint="#6a7475" bumpScale={0.095} />
    </mesh>
  </group>
}

function ApproachPath({ pack }: { pack: FlagstonePack }) {
  const slabs = useMemo(() => Array.from({ length: 12 }, (_, index) => ({
    z: 6.0 - index * 0.7,
    x: Math.sin(index * 1.37) * 0.08,
    yaw: Math.sin(index * 0.83) * 0.035,
    width: 2.45 + seededNoise(index, 2, 7) * 0.28,
    depth: 0.48 + seededNoise(index, 8, 5) * 0.14,
  })), [])
  return <group name="home-sanctuary-approach">
    {slabs.map((slab, index) => <mesh key={index} position={[slab.x, 0.1 + index * 0.002, slab.z]} rotation={[0, slab.yaw, 0]} castShadow receiveShadow>
      <boxGeometry args={[slab.width, 0.055, slab.depth]} />
      <FlagstoneMaterial pack={pack} tint={index % 3 === 0 ? '#788080' : '#687173'} bumpScale={0.07} />
    </mesh>)}
  </group>
}

const AUTHORED_STONE_NAMES = [
  'sanctuary-vault-1-stone-1','sanctuary-vault-1-stone-3','sanctuary-vault-1-stone-6','sanctuary-vault-1-stone-9',
  'sanctuary-vault-2-stone-2','sanctuary-vault-2-stone-5','sanctuary-vault-2-stone-8','sanctuary-vault-2-stone-11',
  'sanctuary-vault-3-stone-1','sanctuary-vault-3-stone-4','sanctuary-vault-3-stone-7','sanctuary-vault-3-stone-10',
] as const
const AUTHORED_STONE_PLACEMENTS: readonly [number, number, number, number, number, number][] = [
  [-5.8,0.12,3.7,0.25,1.45,0.9],[-6.25,0.08,1.2,-0.38,1.15,1.08],[-6.35,0.1,-2.15,0.55,1.55,0.88],[-5.85,0.16,-5.7,-0.2,1.35,1.05],
  [5.9,0.1,3.5,-0.31,1.22,0.96],[6.25,0.1,0.85,0.45,1.48,0.86],[6.35,0.12,-2.45,-0.5,1.28,1.04],[5.9,0.14,-5.9,0.28,1.42,0.9],
  [-2.75,0.19,-4.2,0.38,1.05,0.84],[2.7,0.18,-4.45,-0.46,1.12,0.9],[-3.1,0.1,-7.4,-0.17,1.18,0.82],[3.0,0.1,-7.55,0.33,1.08,0.93],
]

function AuthoredMasonryGarden({ source }: { source: THREE.Object3D }) {
  const stones = useMemo(() => AUTHORED_STONE_PLACEMENTS.map((placement, index) => {
    const sourceStone = source.getObjectByName(AUTHORED_STONE_NAMES[index])
    if (!sourceStone) return null
    const stone = cloneAuthoredModel(sourceStone)
    const [x, y, z, yaw, scaleXZ, scaleY] = placement
    stone.name = `home-authored-ground-stone-${index + 1}`
    stone.position.set(x, y, z)
    stone.rotation.set(0.08 * Math.sin(index * 0.7), yaw, 0.06 * Math.cos(index * 0.9))
    stone.scale.set(scaleXZ, scaleY, scaleXZ * (0.86 + seededNoise(index, 4, 63) * 0.22))
    stone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return
        material.color.lerp(new THREE.Color(index % 3 === 0 ? '#343b39' : '#2c3435'), 0.48)
        material.roughness = Math.max(material.roughness, 0.82)
        material.metalness = Math.min(material.metalness, 0.08)
        material.envMapIntensity = Math.min(material.envMapIntensity, 0.7)
        material.needsUpdate = true
      })
    })
    return stone
  }), [source])
  return <group name="home-authored-masonry-garden">{stones.map((stone, index) => stone ? <primitive key={index} object={stone} /> : null)}</group>
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const retainedModel = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const flagstone = useFlagstoneTexturePack(4.5, 31)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain">
    <primitive object={retainedModel} />
    <GroundClearing pack={flagstone} />
    <ApproachPath pack={flagstone} />
    <AuthoredMasonryGarden source={sanctuary.scene} />
    <mesh name="home-walkable-navigation-surface" position={[0, 0.22, -1.8]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[21, 21]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={1.05}>
    <Lightformer form="rect" intensity={4.1} color="#edf3f4" position={[0, 10, 6]} scale={[12, 5, 1]} target={[0, 0.8, -4]} />
    <Lightformer form="rect" intensity={2.05} color="#79aab8" position={[-10, 4, -6]} scale={[8, 4, 1]} target={[0, 1, -4]} />
    <Lightformer form="rect" intensity={1.55} color="#79749d" position={[10, 4, -8]} scale={[8, 4, 1]} target={[0, 1, -4]} />
    <Lightformer form="ring" intensity={1.15} color="#d6b47c" position={[0, 5, -14]} scale={7} target={[0, 1, -4]} />
  </Environment>
}

function Lantern({ position, scale = 1, yaw = 0 }: { position: Vec3; scale?: number; yaw?: number }) {
  return <group position={position as [number, number, number]} scale={scale} rotation={[0, yaw, 0]}>
    <mesh castShadow receiveShadow position={[0, 0.12, 0]}><cylinderGeometry args={[0.11, 0.16, 0.22, 18]} /><meshStandardMaterial color="#242827" roughness={0.72} metalness={0.28} /></mesh>
    <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.105,0.105,0.34,20]} /><meshPhysicalMaterial color="#b68a52" transparent opacity={0.23} transmission={0.63} roughness={0.22} metalness={0} clearcoat={0.45} clearcoatRoughness={0.27} /></mesh>
    <mesh position={[0, 0.38, 0]}><sphereGeometry args={[0.045,18,18]} /><meshBasicMaterial color="#ffd098" toneMapped={false} /></mesh>
    <mesh position={[0, 0.61, 0]} castShadow><cylinderGeometry args={[0.145,0.1,0.08,18]} /><meshStandardMaterial color="#242827" roughness={0.7} metalness={0.3} /></mesh>
    <pointLight position={[0, 0.38, 0]} color="#d89b58" intensity={0.34} distance={4.2} decay={2} />
  </group>
}

function ArchitecturalPracticals() {
  const fixtures = [
    { p: [-2.85,0.18,4.45] as Vec3, s: 0.84, y: 0.08 }, { p: [2.95,0.18,4.1] as Vec3, s: 0.8, y: -0.1 },
    { p: [-3.65,0.2,-0.75] as Vec3, s: 0.92, y: -0.06 }, { p: [3.75,0.2,-1.15] as Vec3, s: 0.88, y: 0.1 },
  ]
  return <group name="home-cinematic-practical-lighting">{fixtures.map((fixture, index) => <Lantern key={index} position={fixture.p} scale={fixture.s} yaw={fixture.y} />)}</group>
}

function makeMountainShape(width: number, height: number, seed: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-width * 0.5, -4)
  const steps = 24
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const x = -width * 0.5 + width * t
    const primary = Math.pow(Math.sin(Math.PI * t), 1.2) * height
    const secondary = Math.abs(Math.sin(t * Math.PI * 4.2 + seed)) * height * 0.22
    const tertiary = Math.abs(Math.sin(t * Math.PI * 9.7 - seed * 0.7)) * height * 0.08
    const noise = (seededNoise(index, seed, 83) - 0.5) * height * 0.08
    shape.lineTo(x, -1.8 + primary + secondary + tertiary + noise)
  }
  shape.lineTo(width * 0.5, -4)
  shape.closePath()
  return shape
}

function MountainMass({ width, height, depth, position, color, seed }: { width: number; height: number; depth: number; position: Vec3; color: string; seed: number }) {
  const shape = useMemo(() => makeMountainShape(width, height, seed), [height, seed, width])
  return <mesh position={position as [number, number, number]} receiveShadow>
    <extrudeGeometry args={[shape, { depth, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.65, bevelSegments: 2, curveSegments: 2 }]} />
    <meshStandardMaterial color={color} roughness={0.98} metalness={0} envMapIntensity={0.32} />
  </mesh>
}

function MountainRange() {
  return <group name="home-distant-natural-horizon" userData={{ geometry: 'volumetric-fogged-mountain-masses' }}>
    <MountainMass width={66} height={9.5} depth={9} position={[0,-0.8,-67]} color="#111e24" seed={11} />
    <MountainMass width={54} height={7.1} depth={8} position={[-14,-1.25,-54]} color="#17272d" seed={5} />
    <MountainMass width={48} height={6.3} depth={7} position={[18,-1.5,-49]} color="#1b2c31" seed={2} />
    <mesh position={[0,-0.38,-26]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[58,30]} />
      <meshPhysicalMaterial color="#071b25" roughness={0.16} metalness={0.02} clearcoat={0.7} clearcoatRoughness={0.16} transparent opacity={0.72} envMapIntensity={1.0} />
    </mesh>
  </group>
}

const FERN_PLACEMENTS: readonly [number, number, number, number][] = [
  [-9.0,5.2,1.15,0.3],[-8.2,3.6,0.78,1.4],[-8.75,1.2,0.95,-0.7],[-8.5,-1.4,0.72,2.2],[-8.8,-4.2,1.05,-1.2],[-8.1,-7.1,0.84,0.6],
  [-6.2,6.15,0.68,2.4],[-5.5,3.0,0.58,-0.8],[-5.9,-6.5,0.7,1.7],[-6.4,-9.4,0.82,0.9],[-3.9,-8.7,0.62,-1.5],[-3.6,1.6,0.52,0.4],
  [9.0,5.0,1.08,-0.2],[8.25,3.3,0.8,-1.6],[8.8,0.9,0.98,0.8],[8.4,-1.8,0.74,-2.3],[8.85,-4.6,1.02,1.1],[8.0,-7.2,0.86,-0.5],
  [6.2,6.1,0.66,-2.1],[5.45,2.8,0.6,0.7],[5.9,-6.7,0.7,-1.7],[6.45,-9.5,0.82,-0.8],[3.8,-8.8,0.64,1.5],[3.55,1.5,0.54,-0.4],
  [-4.5,-4.7,0.48,1.1],[4.6,-4.9,0.5,-1.2],[-2.7,-7.3,0.46,0.2],[2.8,-7.5,0.48,-0.3],
]

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#405a4b', roughness: 0.98, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#4e6854', roughness: 0.97, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#374f43', roughness: 0.99, metalness: 0, side: THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x, z, scale, yaw], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, 0.08 + Math.sin(x * 0.25 + z * 0.17) * 0.05, z)
    object.rotation.y = yaw
    object.rotation.z = (seededNoise(index, 9, 3) - 0.5) * 0.08
    object.scale.setScalar(scale * (0.9 + seededNoise(index, 5, 13) * 0.2))
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = materials[index % materials.length]
      child.castShadow = true
      child.receiveShadow = true
    })
    return object
  }), [fern.scene, materials])
  return <group userData={{ reducedMotion, treatment: 'scanned-natural-perimeter-garden' }}>{plants.map((plant) => <primitive key={plant.name} object={plant} />)}</group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-11.2,11.2,-43]}>
        <mesh><sphereGeometry args={[1.05,48,48]} /><meshBasicMaterial color="#dfe7e6" toneMapped={false} /></mesh>
        <mesh position={[0.4,0.06,0.24]}><sphereGeometry args={[1.04,48,48]} /><meshBasicMaterial color="#08151d" /></mesh>
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
    if (reducedMotion) { allActions.forEach((action) => action.stop()); activeAction.current = null; return }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play()
    activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.018
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.62) * 0.025
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.5 : state === 'listening' ? 0.48 : 0.46 + Math.sin(clock.elapsedTime * 0.95) * 0.008
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh castShadow>
      <sphereGeometry args={[0.62,72,72]} />
      <meshPhysicalMaterial color="#d4e8e9" transparent opacity={0.13} transmission={0.91} thickness={0.18} roughness={0.065} metalness={0} clearcoat={1} clearcoatRoughness={0.05} ior={1.28} envMapIntensity={1.52} />
    </mesh>
    <group ref={authoredCore} scale={0.46}><primitive object={authoredOrb} /></group>
    <mesh><sphereGeometry args={[0.105,32,32]} /><meshStandardMaterial color="#eadab1" emissive="#e3af55" emissiveIntensity={2.4} roughness={0.24} metalness={0.08} /></mesh>
    <mesh rotation={[0.32,0.5,0.18]}><torusGeometry args={[0.46,0.0045,8,128]} /><meshStandardMaterial color="#b7cbcc" emissive="#5f9298" emissiveIntensity={0.22} metalness={0.32} roughness={0.42} /></mesh>
    <pointLight color="#efbd70" intensity={state === 'speaking' ? 3.4 : 2.6} distance={8} decay={2} />
    <pointLight color="#75bac4" intensity={0.8} distance={10} decay={2} />
  </group>
}

function OrbPlatform() {
  const pack = useFlagstoneTexturePack(2.2, 49)
  const platform = useMemo(() => makeIrregularShape(2.12, 29, 72), [])
  return <group name="home-sanctuary-pavilion" position={[0,0,-2.65]} userData={{ visualOwner: 'grounded-flagstone-sanctuary-v11' }}>
    <mesh position={[0,0.38,0]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <extrudeGeometry args={[platform,{depth:0.26,bevelEnabled:true,bevelSize:0.055,bevelThickness:0.045,bevelSegments:2,curveSegments:2}]} />
      <FlagstoneMaterial pack={pack} tint="#747d7d" bumpScale={0.085} />
    </mesh>
    <mesh position={[0,0.41,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.38,0.011,8,128]} /><meshStandardMaterial color="#8a7655" emissive="#34291d" emissiveIntensity={0.05} metalness={0.38} roughness={0.58} /></mesh>
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{ presentation: 'privacy-preserving-first-person-presence' }}><primitive object={model} visible={false} scale={0.72} /></group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0,1.34,0.1]}>
    <mesh scale={[0.78,1.12,1]}><circleGeometry args={[1,64]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.1} transparent opacity={0.045} transmission={0.6} roughness={0.24} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={0.28} distance={4} decay={2} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const pack = useFlagstoneTexturePack(1.1, tone === 'ground' ? 91 : 97)
  const color = tone === 'ground' ? '#5ba8b1' : '#7770b5'
  return <group userData={{ treatment: 'environmental-threshold-not-hero-arch' }}>
    <mesh position={[-0.92,0.58,0.08]} rotation={[0.04,0,0.08]} castShadow receiveShadow><boxGeometry args={[0.34,1.18,0.42]} /><FlagstoneMaterial pack={pack} tint="#596364" bumpScale={0.07} /></mesh>
    <mesh position={[0.88,0.5,-0.04]} rotation={[-0.03,0,-0.1]} castShadow receiveShadow><boxGeometry args={[0.3,1.02,0.38]} /><FlagstoneMaterial pack={pack} tint="#505a5b" bumpScale={0.07} /></mesh>
    <PortalMembrane color={color} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.12,0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} visible={false} />
    <DestinationArch tone="life-map" />
    <mesh position={[0,1.55,0]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[4.2,4.2,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.12,0]}><DestinationArch tone="ground" /><mesh position={[0,1.55,0]} onClick={(event)=>{event.stopPropagation();onGround()}}><boxGeometry args={[4.2,4.2,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(value:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
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
    camera.position.set(0,1.68,7.45)
    camera.lookAt(0,1.42,-3.0)
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
    const backDistance=portrait?0.14:0.24
    const eyeHeight=portrait?1.53:1.66
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.6,1.42+pitch.current,-Math.cos(yaw.current)*9.6))
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
      if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}
      timer=window.setTimeout(check,60)
    }
    check()
    return()=>{if(timer!==undefined)window.clearTimeout(timer)}
  },[onReady,scene])
  return null
}

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(value:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <>
    <color attach="background" args={[cosmic?'#01030a':'#06121a']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#0a1820',cosmic?0.0022:0.0062]} />
    <Stars radius={190} depth={100} count={cosmic?2800:520} factor={cosmic?3:0.85} saturation={0.08} fade speed={props.reducedMotion?0:0.012} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.3} color="#aebdc2" />
    <hemisphereLight args={['#c9d9df','#18211f',0.72]} />
    <directionalLight position={[-10,16,8]} intensity={2.65} color="#e7eff2" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[10,7,-12]} intensity={0.52} color="#7c799a" />
    <directionalLight position={[-4,4,9]} intensity={0.38} color="#caa875" />
    <spotLight position={[0,10,7]} intensity={1.25} color="#e8eeee" distance={34} angle={0.48} penumbra={0.96} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.08,-2.2]} opacity={0.28} scale={20} blur={3.2} far={7} resolution={256} frames={1} color="#020405" />
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

  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=-0.04}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})

  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery=window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply=()=>{setReducedMotion(rm.matches);setMobile(mobileQuery.matches)}
    apply()
    rm.addEventListener?.('change',apply)
    mobileQuery.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);mobileQuery.removeEventListener?.('change',apply)}
  },[])

  useEffect(()=>{
    const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)}
    window.addEventListener(URAI_ORB_STATE_EVENT,listener)
    return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)
  },[transition])

  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||transition==='none')return
      event.preventDefault()
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

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v11-grounded-material-world" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb generated-flagstone-pbr-v1 authored-irregular-masonry volumetric-horizon" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#06121a'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[0,1.68,7.45],fov:48,near:0.12,far:320}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.08;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
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