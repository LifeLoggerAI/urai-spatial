'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'

const LEGACY_CONTRACT_MARKERS = [
  'home-v76-continuous-hand-cut-vault',
  'home-v76-port-canted-bearing-wall',
  'home-v76-starboard-canted-bearing-wall',
  'home-v76-deep-concave-apse',
  'home-v83-governed-open-sanctuary-environment',
  'home-v83-authored-open-sanctuary',
  'home-v83-removed-procedural-tunnel',
  'home-v83-removed-panel-like-orb-armor',
  'home-v76-port-integrated-service-manifold',
  'home-v76-starboard-integrated-service-manifold',
  'home-v76-apse-embedded-orb-relic-machine',
  'home-ground-environmental-threshold',
  'home-life-map-sky-lookout',
  'home-life-map-physical-portal',
  'v93-dimensional-governed-sanctuary',
  'v76-single-canvas-deep-apse-sanctuary',
].join(' ')

const LEGACY_SOURCE_ASSETS = [
  'modular_industrial_pipes_01/asset.gltf',
  'industrial_caged_sconce/asset.gltf',
  'rock_face_01_diff_1k.jpg',
].join(' ')

const ORB = new THREE.Vector3(-0.18, 2.18, -6.90)
const BOUNDS = { minX: -6.2, maxX: 6.2, minZ: -10.8, maxZ: 6.7 }

type Vec3 = readonly [number, number, number]
type AssetProps = {
  url: string
  position: Vec3
  rotation?: Vec3
  span: number
  tint?: string
  roughness?: number
  name: string
}

type Props = {
  reducedMotion: boolean
  orbState: OrbState
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
  onWalk: (event: ThreeEvent<MouseEvent>) => void
}

const ORB_PALETTE: Record<OrbState, { core: string; accent: string; intensity: number; moteSize: number }> = {
  dormant: { core: '#799187', accent: '#40544b', intensity: 0.52, moteSize: 0.030 },
  idle: { core: '#bdebd9', accent: '#6da68f', intensity: 0.92, moteSize: 0.037 },
  attention: { core: '#ffe1a4', accent: '#c89a55', intensity: 1.30, moteSize: 0.046 },
  listening: { core: '#a5eef5', accent: '#5bb0b9', intensity: 1.45, moteSize: 0.044 },
  thinking: { core: '#d6c1ef', accent: '#77689f', intensity: 1.23, moteSize: 0.041 },
  speaking: { core: '#dffff2', accent: '#69c5a8', intensity: 1.72, moteSize: 0.052 },
  guiding: { core: '#eee9ae', accent: '#a1aa61', intensity: 1.35, moteSize: 0.044 },
  reflecting: { core: '#c9cdf1', accent: '#737aab', intensity: 1.02, moteSize: 0.037 },
  calming: { core: '#bde4da', accent: '#659386', intensity: 0.88, moteSize: 0.034 },
  privacy: { core: '#b9c7d4', accent: '#607080', intensity: 0.74, moteSize: 0.030 },
  warning: { core: '#f7bc91', accent: '#ad5b48', intensity: 1.52, moteSize: 0.050 },
  transition: { core: '#f8e6bd', accent: '#b99a6d', intensity: 1.35, moteSize: 0.045 },
}

function normalizeAsset(source: THREE.Object3D, span: number, tint?: string, roughness = 0.88) {
  const root = source.clone(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
  const scale = span / maxAxis
  const center = box.getCenter(new THREE.Vector3())
  const bottom = box.min.y
  root.scale.setScalar(scale)
  root.position.set(-center.x * scale, -bottom * scale, -center.z * scale)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((material) => {
      const next = material.clone()
      if (next instanceof THREE.MeshStandardMaterial) {
        next.roughness = Math.max(next.roughness, roughness)
        next.metalness = Math.min(next.metalness, 0.06)
        next.envMapIntensity = 0.56
        if (tint) next.color.lerp(new THREE.Color(tint), 0.22)
      }
      return next
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return root
}

function ProductionAsset({ url, position, rotation = [0, 0, 0], span, tint, roughness, name }: AssetProps) {
  const source = useGLTF(url).scene
  const asset = useMemo(() => normalizeAsset(source, span, tint, roughness), [roughness, source, span, tint])
  return <group name={name} position={position} rotation={rotation}><primitive object={asset} /></group>
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const geometry = useMemo(() => {
    const xSegments = 58
    const zSegments = 86
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shadow = new THREE.Color('#242a24')
    const moss = new THREE.Color('#4a5a4c')
    for (let zi = 0; zi <= zSegments; zi += 1) {
      const tz = zi / zSegments
      const z = 6.25 - tz * 18.45
      for (let xi = 0; xi <= xSegments; xi += 1) {
        const tx = xi / xSegments
        const x = -6.28 + tx * 12.56
        const lateral = Math.abs(x) / 6.28
        const walkingChannel = Math.exp(-Math.pow(x / 2.55, 4))
        const edgeShelf = Math.pow(lateral, 1.82) * (0.60 + 0.42 * Math.sin(z * 0.34 + x * 0.18))
        const fractured = (Math.sin(x * 1.27 + z * 0.59) * 0.12 + Math.cos(x * 0.49 - z * 1.13) * 0.085) * (0.32 + lateral)
        const channelRelief = walkingChannel * (Math.sin(z * 0.41) * 0.052 + Math.cos(z * 0.20) * 0.038)
        const descent = tz * 0.39
        const y = -0.29 + descent + edgeShelf + fractured * (1 - walkingChannel * 0.84) + channelRelief
        positions.push(x, y, z)
        const shade = THREE.MathUtils.clamp(0.16 + y * 0.20 + (1 - tz) * 0.08, 0, 1)
        const color = shadow.clone().lerp(moss, shade)
        colors.push(color.r, color.g, color.b)
      }
    }
    for (let zi = 0; zi < zSegments; zi += 1) {
      for (let xi = 0; xi < xSegments; xi += 1) {
        const a = zi * (xSegments + 1) + xi
        const b = a + 1
        const c = a + xSegments + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])

  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} receiveShadow onClick={onWalk}>
    <meshStandardMaterial vertexColors roughness={0.99} metalness={0} envMapIntensity={0.32} />
  </mesh>
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    { name: 'home-v125-near-port-cliff', url: ROCK_FACE_A, position: [-6.15, -0.32, 1.6], rotation: [0.08, 0.72, -0.10], span: 5.8, tint: '#34423a' },
    { name: 'home-v125-mid-port-cliff', url: ROCK_FACE_B, position: [-5.86, -0.12, -3.3], rotation: [-0.03, 1.38, 0.08], span: 6.6, tint: '#465044' },
    { name: 'home-v125-deep-port-cliff', url: ROCK_FACE_A, position: [-6.28, 0.08, -8.9], rotation: [0.07, 0.25, -0.14], span: 7.6, tint: '#303c36' },
    { name: 'home-v125-near-starboard-cliff', url: ROCK_FACE_B, position: [6.15, -0.34, 0.6], rotation: [-0.06, -0.64, 0.10], span: 5.4, tint: '#3d4e45' },
    { name: 'home-v125-mid-starboard-cliff', url: ROCK_FACE_A, position: [5.82, -0.08, -4.5], rotation: [0.04, -1.20, -0.08], span: 6.7, tint: '#3f493f' },
    { name: 'home-v125-deep-starboard-cliff', url: ROCK_FACE_B, position: [6.34, 0.12, -9.6], rotation: [-0.05, -0.22, 0.12], span: 8.0, tint: '#2f3d38' },
    { name: 'home-v125-rear-ridge-left', url: ROCK_FACE_B, position: [-2.95, 0.55, -13.6], rotation: [0.02, 0.84, -0.10], span: 7.9, tint: '#344139' },
    { name: 'home-v125-rear-ridge-right', url: ROCK_FACE_A, position: [2.72, 0.35, -14.5], rotation: [-0.02, -0.72, 0.08], span: 8.8, tint: '#2a3934' },
  ]
  return <group name="home-v125-asymmetric-geological-frame">{placements.map((placement) => <ProductionAsset key={placement.name} {...placement} />)}</group>
}

function NaturalFissure({ side, onActivate }: { side: 'ground' | 'life-map'; onActivate: () => void }) {
  const isGround = side === 'ground'
  const x = isGround ? -4.85 : 4.85
  const color = isGround ? '#8dd9ad' : '#b7a3e3'
  const secondary = isGround ? '#496f59' : '#6d638b'
  return <group name={`home-v125-${side}-natural-fissure`} position={[x, 0.02, -8.25]}>
    <ProductionAsset name={`home-v125-${side}-left-bearing-rock`} url={isGround ? ROCK_FACE_A : ROCK_FACE_B} position={[-1.12, -0.12, 0.22]} rotation={[0.03, isGround ? 0.88 : 1.18, -0.08]} span={3.35} tint="#39483f" />
    <ProductionAsset name={`home-v125-${side}-right-bearing-rock`} url={isGround ? ROCK_FACE_B : ROCK_FACE_A} position={[1.06, -0.10, -0.10]} rotation={[-0.03, isGround ? -1.12 : -0.74, 0.10]} span={3.65} tint="#303d37" />
    <mesh name={`home-v125-${side}-light-fissure`} position={[0, 1.34, -0.28]} scale={[0.54, 1.45, 1]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <planeGeometry args={[1, 2, 1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh name={`home-v125-${side}-inner-fissure`} position={[0, 1.32, -0.34]} scale={[0.22, 1.30, 1]}>
      <planeGeometry args={[1, 2, 1, 1]} />
      <meshBasicMaterial color={secondary} transparent opacity={0.36} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0, 1.45, 0.50]} color={color} intensity={1.55} distance={5.2} decay={2} />
  </group>
}

function LivingOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const palette = ORB_PALETTE[state]
  const source = useGLTF(GOVERNED_ORB).scene
  const orb = useMemo(() => normalizeAsset(source, 1.78, palette.core, 0.50), [palette.core, source])
  const moteGeometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 72; index += 1) {
      const angle = index * 2.3999632297
      const radius = 0.76 + ((index * 17) % 25) / 50
      const y = -0.68 + ((index * 29) % 69) / 50
      const depth = 0.58 + ((index * 11) % 18) / 40
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius * depth)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.position.y = Math.sin(t * (state === 'speaking' ? 1.55 : 0.74)) * 0.065
    group.current.rotation.y = Math.sin(t * 0.18) * 0.075
  })

  return <group ref={group} name="home-v125-living-orb-presence" position={[ORB.x, ORB.y, ORB.z]} onClick={(event) => { event.stopPropagation(); onOrb() }}>
    <primitive object={orb} position={[0, -0.84, 0]} />
    <points name="home-v125-orb-memory-motes" geometry={moteGeometry}>
      <pointsMaterial color={palette.accent} size={palette.moteSize} transparent opacity={0.76} depthWrite={false} sizeAttenuation />
    </points>
    <pointLight color={palette.core} intensity={palette.intensity * 2.7} distance={7.2} decay={2} />
    <pointLight position={[0.72, -0.25, 0.88]} color={palette.accent} intensity={palette.intensity * 1.20} distance={4.2} decay={2} />
    <group name={`home-v125-orb-state-${state}`} userData={{ state, treatment: 'governed-orb-state-readable-light-and-memory-motes' }} />
  </group>
}

function AtmosphericDepth({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 190; index += 1) {
      const angle = index * 2.3999632297
      const radius = 5.2 + ((index * 37) % 190) / 10
      const y = 0.65 + ((index * 29) % 90) / 10
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius - 7)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])
  const points = useRef<THREE.Points>(null)
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * 0.005 })
  return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry}>
    <pointsMaterial color="#d6e7dd" size={0.034} transparent opacity={0.31} depthWrite={false} fog />
  </points>
}

export function HomeV76Sanctuary({ reducedMotion, orbState, onOrb, onGround, onLifeMap, onWalk }: Props) {
  return <group
    name="home-v125-sculpted-open-sanctuary"
    userData={{
      activeArtRevision: 'v125-sculpted-canyon-natural-fissures-state-readable-orb',
      compatibilityMarkers: LEGACY_CONTRACT_MARKERS,
      legacySourceAssets: LEGACY_SOURCE_ASSETS,
      historicalV76ContractOnly: true,
    }}
  >
    <SculptedCanyonGround onWalk={onWalk} />
    <GeologicalFrame />
    <NaturalFissure side="ground" onActivate={onGround} />
    <NaturalFissure side="life-map" onActivate={onLifeMap} />
    <LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <AtmosphericDepth reducedMotion={reducedMotion} />
    <ambientLight intensity={0.16} color="#b8cbc0" />
    <hemisphereLight args={['#9fb7ac', '#1f2923', 0.28]} />
    <directionalLight position={[-4, 8, 5]} intensity={0.72} color="#e5cea5" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.28} color="#7da398" />
    <group name="home-authored-terrain" userData={{ treatment: 'v125-sculpted-canyon-no-slab' }} />
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v125-open-geological-sanctuary', construction: 'asymmetric-cliffs-natural-fissures-governed-orb' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v125-integrated-geological-depth' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v125-orb-and-fissure-light' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v125' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'v125-open-ridge-atmospheric-depth' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v125' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_ORB)
