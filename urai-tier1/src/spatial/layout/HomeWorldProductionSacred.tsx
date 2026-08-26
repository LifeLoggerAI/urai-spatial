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
const SPAWN = new THREE.Vector3(2.35, 0.04, 7.9)
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
type TerrainPack = { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }
const DEFAULT_YAW = 0.18

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
      colorBytes[index] = THREE.MathUtils.clamp(Math.round((stoneR + 54) * face + (jointR + 30) * (1 - face)), 24, 178)
      colorBytes[index + 1] = THREE.MathUtils.clamp(Math.round((stoneG + 56) * face + (jointG + 31) * (1 - face)), 25, 184)
      colorBytes[index + 2] = THREE.MathUtils.clamp(Math.round((stoneB + 50) * face + (jointB + 29) * (1 - face)), 24, 180)
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

function makeTerrainTexturePack(repeat = 7.4, seed = 109): TerrainPack {
  const size = 192
  const colorBytes = new Uint8Array(size * size * 4)
  const heightBytes = new Uint8Array(size * size * 4)
  const roughBytes = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin(x * 0.052 + seed) * 0.34 + Math.cos(y * 0.041 - seed) * 0.3
      const cross = Math.sin((x + y) * 0.103) * 0.17 + Math.cos((x - y) * 0.077) * 0.13
      const grain = seededNoise(x, y, seed + 43) - 0.5
      const moss = smoothstep01(0.45 + broad * 0.28 + cross * 0.2 + grain * 0.34)
      const stone = smoothstep01(0.62 - broad * 0.24 + cross * 0.18 - grain * 0.18)
      const index = (y * size + x) * 4
      colorBytes[index] = Math.round(86 + moss * 32 + stone * 24)
      colorBytes[index + 1] = Math.round(104 + moss * 48 + stone * 18)
      colorBytes[index + 2] = Math.round(76 + moss * 28 + stone * 22)
      colorBytes[index + 3] = 255
      const h = Math.round(THREE.MathUtils.clamp(0.48 + broad * 0.1 + cross * 0.08 + grain * 0.12, 0, 1) * 255)
      const rough = Math.round(THREE.MathUtils.clamp(0.86 + moss * 0.08 - stone * 0.04 + grain * 0.035, 0.76, 0.98) * 255)
      heightBytes[index] = h; heightBytes[index + 1] = h; heightBytes[index + 2] = h; heightBytes[index + 3] = 255
      roughBytes[index] = rough; roughBytes[index + 1] = rough; roughBytes[index + 2] = rough; roughBytes[index + 3] = 255
    }
  }
  return {
    color: configureTexture(new THREE.DataTexture(colorBytes, size, size, THREE.RGBAFormat), repeat, true),
    height: configureTexture(new THREE.DataTexture(heightBytes, size, size, THREE.RGBAFormat), repeat),
    roughness: configureTexture(new THREE.DataTexture(roughBytes, size, size, THREE.RGBAFormat), repeat),
  }
}

function useTerrainTexturePack(repeat = 7.4, seed = 109) {
  const pack = useMemo(() => makeTerrainTexturePack(repeat, seed), [repeat, seed])
  useEffect(() => () => {
    pack.color.dispose()
    pack.height.dispose()
    pack.roughness.dispose()
  }, [pack])
  return pack
}

function makeGroundGeometry() {
  const geometry = new THREE.PlaneGeometry(52, 64, 56, 72)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const low = new THREE.Color('#63775a')
  const high = new THREE.Color('#9aa27a')
  const stone = new THREE.Color('#a39778')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index) - 4
    const pathCenter = Math.sin((z + 2) * 0.12) * 0.42
    const pathDistance = Math.abs(x - pathCenter)
    const pathBlend = Math.exp(-pathDistance * pathDistance * 0.52)
    const sideRise = smoothstep01((Math.abs(x) - 4.6) / 16) * 1.3
    const farRise = smoothstep01((-z - 10) / 26) * 1.15
    const broad = Math.sin(x * 0.29 + z * 0.13) * 0.18 + Math.cos(z * 0.23 - x * 0.07) * 0.13
    const detail = (seededNoise(index, 17, 71) - 0.5) * 0.12
    const clearing = Math.exp(-((x * x) / 18 + ((z + 2.7) * (z + 2.7)) / 22))
    const height = -0.19 + sideRise + farRise + broad + detail - pathBlend * 0.12 - clearing * 0.16
    position.setZ(index, height)
    const tint = low.clone().lerp(high, THREE.MathUtils.clamp((height + 0.25) / 1.8, 0, 1)).lerp(stone, pathBlend * 0.24)
    colors[index * 3] = tint.r; colors[index * 3 + 1] = tint.g; colors[index * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeRidgeGeometry(width: number, depth: number, seed: number, amplitude: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 56, 30)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const valley = new THREE.Color('#30464a')
  const slope = new THREE.Color('#52645d')
  const crown = new THREE.Color('#8a9283')
  const peaks = [
    { x: -width * 0.3, spread: width * 0.15, scale: 0.82 },
    { x: -width * 0.04, spread: width * 0.18, scale: 1 },
    { x: width * 0.27, spread: width * 0.17, scale: 0.76 },
  ]
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index)
    const depthEnvelope = smoothstep01((z + depth * 0.5) / (depth * 0.68))
    let peak = 0
    for (const candidate of peaks) {
      const dx = (x - candidate.x) / candidate.spread
      peak += Math.exp(-dx * dx * 1.8) * candidate.scale
    }
    const erosion = Math.abs(Math.sin(x * 0.19 + z * 0.13 + seed)) * 0.72
      + Math.abs(Math.cos(x * 0.071 - z * 0.21 - seed)) * 0.42
      + (seededNoise(index, seed, 97) - 0.5) * 0.42
    const height = -2.1 + depthEnvelope * amplitude * (0.2 + peak * 0.62) + erosion
    position.setZ(index, height)
    const elevation = THREE.MathUtils.clamp((height + 1.5) / (amplitude * 0.9), 0, 1)
    const tint = valley.clone().lerp(slope, elevation).lerp(crown, smoothstep01((elevation - 0.72) / 0.28) * 0.38)
    colors[index * 3] = tint.r; colors[index * 3 + 1] = tint.g; colors[index * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeApproachShape() {
  const shape = new THREE.Shape()
  const left: THREE.Vector2[] = []
  const right: THREE.Vector2[] = []
  for (let index = 0; index <= 18; index += 1) {
    const t = index / 18
    const z = 7.2 - t * 8.5
    const center = Math.sin(t * Math.PI * 1.15) * 0.34 - t * 0.18
    const half = 0.6 + Math.sin(t * Math.PI) * 0.13 + (seededNoise(index, 3, 19) - 0.5) * 0.07
    left.push(new THREE.Vector2(center - half, z))
    right.push(new THREE.Vector2(center + half, z))
  }
  shape.moveTo(left[0].x, left[0].y)
  left.slice(1).forEach((point) => shape.lineTo(point.x, point.y))
  right.reverse().forEach((point) => shape.lineTo(point.x, point.y))
  shape.closePath()
  return shape
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
  const terrainPack = useTerrainTexturePack(8.6, 109)
  const terrain = useMemo(() => makeGroundGeometry(), [])
  const clearing = useMemo(() => makeIrregularShape(2.72, 13, 112), [])
  useEffect(() => () => terrain.dispose(), [terrain])
  return <group name="home-grounded-flagstone-clearing">
    <mesh name="home-natural-walkable-terrain" geometry={terrain} position={[0, -0.05, -4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color="#d5d7b4" vertexColors map={terrainPack.color} bumpMap={terrainPack.height} bumpScale={0.13} roughnessMap={terrainPack.roughness} roughness={0.94} metalness={0} envMapIntensity={0.78} />
    </mesh>
    <mesh position={[0, -0.04, -2.65]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[clearing, { depth: 0.08, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 3 }]} />
      <FlagstoneMaterial pack={pack} tint="#6a716d" bumpScale={0.1} />
    </mesh>
  </group>
}

function ApproachPath({ pack }: { pack: FlagstonePack }) {
  const shape = useMemo(() => makeApproachShape(), [])
  return <group name="home-sanctuary-approach">
    <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 3 }]} />
      <FlagstoneMaterial pack={pack} tint="#747873" bumpScale={0.075} />
    </mesh>
  </group>
}

const AUTHORED_STONE_NAMES = [
  'sanctuary-vault-1-stone-1','sanctuary-vault-1-stone-3','sanctuary-vault-1-stone-6','sanctuary-vault-1-stone-9',
  'sanctuary-vault-2-stone-2','sanctuary-vault-2-stone-5','sanctuary-vault-2-stone-8','sanctuary-vault-2-stone-11',
  'sanctuary-vault-3-stone-1','sanctuary-vault-3-stone-4','sanctuary-vault-3-stone-7','sanctuary-vault-3-stone-10',
] as const
const AUTHORED_STONE_PLACEMENTS: readonly [number, number, number, number, number, number][] = [
  [-6.8,-0.12,4.5,0.25,1.18,0.72],[-8.1,0.04,1.6,-0.38,0.92,0.84],[-6.9,-0.05,-3.1,0.55,1.26,0.68],[-8.4,0.08,-6.4,-0.2,1.08,0.8],
  [7.7,-0.08,3.1,-0.31,0.96,0.74],[6.6,0.02,0.2,0.45,1.18,0.68],[8.2,0.05,-3.9,-0.5,1.02,0.76],[6.9,0.01,-7.1,0.28,1.12,0.7],
  [-4.1,0.05,-5.4,0.38,0.86,0.7],[3.8,0.03,-6.2,-0.46,0.92,0.68],[-5.0,-0.02,-9.4,-0.17,0.98,0.66],[4.6,0.02,-10.1,0.33,0.9,0.72],
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
    <group visible={false}><AuthoredMasonryGarden source={sanctuary.scene} /></group>
    <mesh name="home-walkable-navigation-surface" position={[0, 0.22, -1.8]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[21, 21]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={1.12}>
    <Lightformer form="rect" intensity={5.2} color="#fff0d0" position={[-6, 11, 7]} scale={[13, 6, 1]} target={[0, 0.8, -4]} />
    <Lightformer form="rect" intensity={2.4} color="#91c1cb" position={[-12, 5, -8]} scale={[9, 5, 1]} target={[0, 1, -5]} />
    <Lightformer form="rect" intensity={1.3} color="#a49bc2" position={[12, 5, -10]} scale={[8, 4, 1]} target={[0, 1, -5]} />
    <Lightformer form="ring" intensity={1.5} color="#e0b878" position={[0, 6, -16]} scale={8} target={[0, 1, -5]} />
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

function MountainRange() {
  const near = useMemo(() => makeRidgeGeometry(76, 38, 11, 10.5), [])
  const far = useMemo(() => makeRidgeGeometry(104, 48, 29, 14.5), [])
  useEffect(() => () => { near.dispose(); far.dispose() }, [far, near])
  return <group name="home-distant-natural-horizon" userData={{ geometry: 'layered-eroded-mountain-terrain' }}>
    <mesh geometry={far} position={[-8,-2.8,-60]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <meshStandardMaterial color="#9aa99b" vertexColors roughness={1} metalness={0} envMapIntensity={0.38} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={near} position={[8,-2.2,-40]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <meshStandardMaterial color="#aab09b" vertexColors roughness={0.99} metalness={0} envMapIntensity={0.46} side={THREE.DoubleSide} />
    </mesh>
  </group>
}

const FERN_PLACEMENTS: readonly [number, number, number, number][] = [
  [-4.8,6.3,1.3,0.2],[-3.7,5.4,0.92,1.25],[-4.5,3.4,1.12,-0.65],[-3.4,1.7,0.82,2.15],
  [4.6,6.0,1.18,-0.25],[3.55,4.8,0.9,-1.35],[4.35,2.7,1.06,0.72],[3.35,1.05,0.78,-2.05],
  [-8.8,5.4,1.08,0.3],[-7.4,4.7,0.74,1.5],[-9.5,3.3,0.9,-0.8],[-6.9,2.2,0.58,2.3],
  [-10.2,-0.7,1.02,-1.1],[-8.7,-1.9,0.68,0.5],[-9.3,-4.6,0.88,1.8],[-7.5,-6.8,0.72,-1.4],
  [-5.8,-8.9,0.66,0.8],[-3.9,-10.1,0.52,2.5],[-5.1,-5.9,0.48,-0.4],
  [8.2,5.8,0.94,-0.3],[9.6,4.1,1.04,-1.7],[7.1,2.9,0.64,0.9],[10.1,0.6,0.82,-2.2],
  [8.9,-2.5,0.76,1.2],[10.4,-4.8,0.96,-0.6],[7.6,-7.1,0.7,-1.8],[5.8,-9.4,0.62,0.7],
  [3.8,-10.8,0.5,1.6],[-6.2,0.7,0.46,-0.9],[5.9,-0.5,0.5,1.9],[-4.6,-3.8,0.42,0.4],[4.9,-5.1,0.44,-1.1],
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

const SKY_VERTEX = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAGMENT = `
  varying vec3 vSkyDirection;
  void main() {
    vec3 direction = normalize(vSkyDirection);
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizon = vec3(0.48, 0.57, 0.59);
    vec3 middle = vec3(0.19, 0.35, 0.41);
    vec3 zenith = vec3(0.045, 0.12, 0.18);
    vec3 color = mix(horizon, middle, smoothstep(0.06, 0.42, height));
    color = mix(color, zenith, smoothstep(0.42, 0.95, height));
    vec3 lightDirection = normalize(vec3(-0.55, 0.24, -0.8));
    float glow = pow(max(dot(direction, lightDirection), 0.0), 84.0);
    float core = pow(max(dot(direction, lightDirection), 0.0), 520.0);
    color += vec3(0.3, 0.18, 0.08) * glow + vec3(0.82, 0.58, 0.28) * core;
    gl_FragColor = vec4(color, 1.0);
  }
`

function SkyDome() {
  return <mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-10}>
    <sphereGeometry args={[170,48,32]} />
    <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
  </mesh>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-14.5,10.8,-48]}>
        <mesh><sphereGeometry args={[0.86,48,48]} /><meshBasicMaterial color="#f0e7d2" toneMapped={false} /></mesh>
        <mesh position={[0.34,0.05,0.22]}><sphereGeometry args={[0.86,48,48]} /><meshBasicMaterial color="#173039" /></mesh>
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
      const pulse = state === 'speaking' ? 0.13 : state === 'listening' ? 0.125 : 0.12 + Math.sin(clock.elapsedTime * 0.95) * 0.003
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh castShadow>
      <sphereGeometry args={[0.49,64,64]} />
      <meshPhysicalMaterial color="#a8f4f8" transparent opacity={0.16} transmission={0.74} thickness={0.2} roughness={0.1} metalness={0} clearcoat={0.82} clearcoatRoughness={0.12} ior={1.2} envMapIntensity={1.3} />
    </mesh>
    <mesh><sphereGeometry args={[0.34,56,56]} /><meshStandardMaterial color="#a9f8fb" emissive="#54dfe8" emissiveIntensity={state === 'speaking' ? 2.1 : 1.5} roughness={0.24} metalness={0.02} /></mesh>
    <group ref={authoredCore} scale={0.12}><primitive object={authoredOrb} /></group>
    <mesh><sphereGeometry args={[0.06,28,28]} /><meshStandardMaterial color="#fff8e8" emissive="#f4d590" emissiveIntensity={1.6} roughness={0.38} metalness={0} /></mesh>
    <mesh rotation={[0.32,0.5,0.18]}><torusGeometry args={[0.45,0.004,8,96]} /><meshStandardMaterial color="#d6fbfd" emissive="#7cebf0" emissiveIntensity={0.34} metalness={0.08} roughness={0.52} transparent opacity={0.72} /></mesh>
    <pointLight color="#9ff7f8" intensity={state === 'speaking' ? 3.1 : 2.15} distance={8} decay={2} />
  </group>
}

function OrbPlatform() {
  const pack = useFlagstoneTexturePack(1.7, 49)
  const platform = useMemo(() => makeIrregularShape(1.08, 29, 72), [])
  return <group name="home-sanctuary-pavilion" position={[0,0,-2.65]} userData={{ visualOwner: 'grounded-natural-sanctuary-v12' }}>
    <mesh position={[0,0.2,0]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <extrudeGeometry args={[platform,{depth:0.14,bevelEnabled:true,bevelSize:0.05,bevelThickness:0.04,bevelSegments:3,curveSegments:3}]} />
      <FlagstoneMaterial pack={pack} tint="#777b73" bumpScale={0.09} />
    </mesh>
    <mesh position={[0,0.225,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.74,0.008,8,96]} /><meshStandardMaterial color="#b8a57b" emissive="#665334" emissiveIntensity={0.05} metalness={0.14} roughness={0.76} /></mesh>
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
  const color = tone === 'ground' ? '#5ba8b1' : '#7770b5'
  return <group userData={{ treatment: 'environmental-threshold-not-hero-arch' }}>
    <mesh position={[-0.84,0.28,0.08]} rotation={[0.18,0.42,0.12]} scale={[0.74,0.42,0.58]} castShadow receiveShadow><icosahedronGeometry args={[1,2]} /><meshStandardMaterial color="#72796f" roughness={1} metalness={0} /></mesh>
    <mesh position={[0.79,0.22,-0.04]} rotation={[-0.08,-0.3,-0.16]} scale={[0.62,0.34,0.5]} castShadow receiveShadow><icosahedronGeometry args={[1,2]} /><meshStandardMaterial color="#667068" roughness={1} metalness={0} /></mesh>
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
    camera.near = 0.1
    camera.far = 240
    camera.updateProjectionMatrix()
    camera.position.set(2.42,1.72,8.12)
    camera.lookAt(0.42,1.38,-2.9)
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
    <color attach="background" args={[cosmic?'#01030a':'#18313a']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#536d73',cosmic?0.0022:0.0046]} />
    {!cosmic?<SkyDome />:null}
    <Stars radius={190} depth={100} count={cosmic?2800:180} factor={cosmic?3:0.65} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.62} color="#d7ddd3" />
    <hemisphereLight args={['#c8e0e5','#3a3328',1.28]} />
    <directionalLight position={[-12,17,9]} intensity={3.4} color="#ffe5b8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[12,8,-14]} intensity={0.72} color="#89a9bd" />
    <directionalLight position={[-5,5,10]} intensity={0.54} color="#d2b27a" />
    <spotLight position={[1,11,8]} intensity={0.9} color="#f5eee0" distance={38} angle={0.5} penumbra={0.98} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.05,-2.2]} opacity={0.38} scale={20} blur={2.8} far={7} resolution={256} frames={1} color="#171b17" />
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
  const yaw=useRef(DEFAULT_YAW)
  const pitch=useRef(-0.035)
  const target=useRef<THREE.Vector3|null>(null)
  const avatar=useRef<THREE.Group|null>(null)
  const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=-0.035}})
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

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v12-natural-sanctuary" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb generated-terrain-pbr-v1 authored-irregular-masonry eroded-mountain-terrain" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#18313a'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.35]} shadows camera={{position:[2.42,1.72,8.12],fov:43,near:0.1,far:240}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.28;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
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
