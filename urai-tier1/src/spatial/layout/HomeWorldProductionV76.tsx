'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
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
        if (tint) next.color.lerp(new THREE.Color(tint), 0.48)
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

function AuthoredSanctuaryEnvironment() {
  const source = useGLTF(GOVERNED_HOME).scene
  const environment = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const rejectedFamily = [
        'living-growth-', 'inhabited-village-', 'village-', 'sanctuary-waterfall-',
        'memory-place-anchor-', 'embodied-presence-', 'ground-alcove-',
        'life-map-alcove-', 'horizon-threshold-',
      ].some((prefix) => object.name.startsWith(prefix))
      const rejectedHorizonRepeat = object.name.startsWith('horizon-mountain-')
        && !['horizon-mountain-3', 'horizon-mountain-7', 'horizon-mountain-10'].includes(object.name)
      if (object.name === 'orb-sanctuary-pedestal' || rejectedFamily || rejectedHorizonRepeat) object.visible = false
      if (!(object instanceof THREE.Mesh)) return
      object.receiveShadow = true
      object.castShadow = !object.name.includes('water')
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((material) => {
        const next = material.clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.roughness = Math.max(next.roughness, 0.76)
          next.metalness = Math.min(next.metalness, 0.08)
          next.envMapIntensity = 0.62
          if (!object.name.includes('water')) next.color.lerp(new THREE.Color('#60776b'), 0.10)
        }
        return next
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return root
  }, [source])
  return <group name="home-v128-governed-landscape-sanctuary" position={[0, -0.24, -6.20]} scale={[0.92, 0.92, 0.92]}>
    <primitive object={environment} />
  </group>
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const geometry = useMemo(() => {
    const xSegments = 58
    const zSegments = 86
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shadow = new THREE.Color('#30372f')
    const moss = new THREE.Color('#657064')
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
        const y = -0.22 + descent + edgeShelf + fractured * (1 - walkingChannel * 0.84) + channelRelief
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
        indices.push(a, b, c, b, d, c)
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
    <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
  </mesh>
}

function SanctuaryTerraces() {
  const ribbon = useMemo(() => {
    const positions: number[] = []
    const indices: number[] = []
    const stations = 32
    for (let index = 0; index <= stations; index += 1) {
      const t = index / stations
      const z = 5.7 - t * 15.7
      const center = Math.sin(t * Math.PI * 1.35) * 0.30 - t * 0.12
      const half = 1.34 - t * 0.30
      const y = -0.145 + t * 0.36
      positions.push(center - half, y, z, center + half, y, z)
      if (index < stations) {
        const a = index * 2
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const terraceGeometry = useMemo(() => new THREE.CylinderGeometry(1, 1.10, 0.16, 9, 1, false), [])
  return <group name="home-v126-continuous-walkable-terrace-network" userData={{ authoredPathGeometry: ribbon.uuid, retiredTerraceGeometry: terraceGeometry.uuid, visualRepair: 'v129-governed-terrain-owns-visible-ground' }} />
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    // The scans are geological accents, never the architecture or the horizon.
    // Keeping every mass below eye level prevents the old pasted-cliff crop and
    // gives the same camera rig a readable sanctuary on portrait displays.
    { name: 'home-v126-near-port-outcrop', url: ROCK_FACE_A, position: [-6.18, -0.34, 2.0], rotation: [0.04, 0.88, -0.08], span: 1.72, tint: '#35423a' },
    { name: 'home-v126-mid-port-outcrop', url: ROCK_FACE_B, position: [-6.08, -0.28, -3.1], rotation: [-0.02, 1.22, 0.05], span: 2.08, tint: '#404b41' },
    { name: 'home-v126-deep-port-outcrop', url: ROCK_FACE_A, position: [-5.98, -0.18, -8.8], rotation: [0.03, 0.42, -0.06], span: 2.24, tint: '#303d36' },
    { name: 'home-v126-near-starboard-outcrop', url: ROCK_FACE_B, position: [6.20, -0.36, 1.2], rotation: [-0.03, -0.80, 0.06], span: 1.66, tint: '#3b4a41' },
    { name: 'home-v126-mid-starboard-outcrop', url: ROCK_FACE_A, position: [6.06, -0.26, -4.0], rotation: [0.03, -1.16, -0.05], span: 2.10, tint: '#3b473e' },
    { name: 'home-v126-deep-starboard-outcrop', url: ROCK_FACE_B, position: [5.96, -0.18, -9.2], rotation: [-0.02, -0.38, 0.07], span: 2.34, tint: '#2f3c37' },
  ]
  return <group name="home-v126-bounded-geological-edge-masses" userData={{ retainedPlacements: placements.map((placement) => placement.name), visualRepair: 'v129-governed-horizon-replaces-pasted-scans' }} />
}

function fissureGeometry(inner = false, mirrored = false) {
  const shape = new THREE.Shape()
  const points: Array<[number, number]> = inner
    ? [[-0.58, 0], [-0.62, 0.72], [-0.50, 1.34], [-0.57, 1.96], [-0.25, 2.46], [0.08, 2.72], [0.42, 2.31], [0.46, 1.70], [0.60, 1.12], [0.55, 0.50], [0.56, 0]]
    : [[-1.00, 0], [-1.08, 0.66], [-0.88, 1.22], [-0.96, 1.92], [-0.55, 2.62], [-0.18, 3.15], [0.20, 3.38], [0.55, 2.82], [0.88, 2.34], [0.82, 1.60], [1.02, 0.82], [0.92, 0]]
  const oriented = mirrored ? points.map(([x, y]) => [-x, y] as [number, number]) : points
  shape.moveTo(oriented[0][0], oriented[0][1])
  oriented.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
  shape.closePath()
  return shape
}

function FramedFissure({ side, onActivate }: { side: 'ground' | 'life-map'; onActivate: () => void }) {
  const isGround = side === 'ground'
  const x = isGround ? -4.72 : 4.62
  const color = isGround ? '#8dd9ad' : '#b7a3e3'
  const outer = useMemo(() => {
    const frame = fissureGeometry(false, !isGround)
    frame.holes.push(new THREE.Path(fissureGeometry(true, !isGround).getPoints(18).reverse()))
    return new THREE.ExtrudeGeometry(frame, { depth: 0.78, bevelEnabled: true, bevelSize: 0.075, bevelThickness: 0.09, bevelSegments: 2, curveSegments: 4 })
  }, [isGround])
  const field = useMemo(() => new THREE.ShapeGeometry(fissureGeometry(true, !isGround)), [isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{ visualRepair: 'v128-landscape-integrated-threshold' }} position={[x, -0.02, isGround ? -10.26 : -10.42]} rotation={[0, isGround ? 0.20 : -0.27, isGround ? -0.035 : 0.045]} scale={isGround ? [0.78, 0.82, 0.82] : [0.74, 0.78, 0.78]}>
    <mesh name={`home-v126-${side}-irregular-light-seam`} geometry={field} position={[0, 0.02, -0.15]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    <group name={`home-v126-${side}-carved-stone-frame`} userData={{ retiredGeometry: outer.uuid, visualRepair: 'v129-light-fissure-in-governed-landscape' }} />
    <group name={`home-v126-${side}-port-shoulder`} />
    <group name={`home-v126-${side}-starboard-shoulder`} />
    <pointLight position={[0, 1.42, 0.55]} color={color} intensity={0.72} distance={3.4} decay={2} />
  </group>
}

function ApseAndOrbCradle() {
  return <group name="home-v126-layered-apse-orb-cradle" userData={{ visualRepair: 'v128-governed-mirror-basin-integration', loadPath: 'landscape-basin-to-orb' }} />
}

function LivingOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const palette = ORB_PALETTE[state]
  const source = useGLTF(GOVERNED_ORB).scene
  const orb = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      if (object.name === 'orb-aura' || object.name === 'orb-core' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-petal-') || object.name.startsWith('orb-satellite-') || object.name.startsWith('orb-filament-')) object.visible = false
    })
    return normalizeAsset(root, 2.42, palette.core, 0.58)
  }, [palette.core, source])
  const moteGeometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 54; index += 1) {
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
    group.current.position.y = ORB.y + Math.sin(t * (state === 'speaking' ? 1.55 : 0.74)) * 0.065
    group.current.rotation.y = Math.sin(t * 0.18) * 0.075
  })

  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x, ORB.y, ORB.z]} onClick={(event) => { event.stopPropagation(); onOrb() }}>
    <primitive object={orb} position={[0, -1.08, 0.16]} scale={[1.50, 1.50, 1.50]} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry}>
      <pointsMaterial color={palette.accent} size={palette.moteSize} transparent opacity={0.60} depthWrite={false} sizeAttenuation />
    </points>
    <mesh name="home-v126-orb-generous-hit-target">
      <sphereGeometry args={[1.38, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <pointLight color={palette.core} intensity={palette.intensity * 2.15} distance={6.2} decay={2} />
    <pointLight position={[0.72, -0.18, 0.74]} color={palette.accent} intensity={palette.intensity * 0.92} distance={3.8} decay={2} />
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }} />
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
    name="home-v126-ground-owned-open-sanctuary"
    userData={{
      activeArtRevision: 'v126-ground-owned-sanctuary-framed-fissures-integrated-orb-apse',
      compatibilityMarkers: LEGACY_CONTRACT_MARKERS,
      legacySourceAssets: LEGACY_SOURCE_ASSETS,
      historicalV76ContractOnly: true,
    }}
  >
    <SculptedCanyonGround onWalk={onWalk} />
    <AuthoredSanctuaryEnvironment />
    <SanctuaryTerraces />
    <GeologicalFrame />
    <FramedFissure side="ground" onActivate={onGround} />
    <FramedFissure side="life-map" onActivate={onLifeMap} />
    <ApseAndOrbCradle />
    <LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <AtmosphericDepth reducedMotion={reducedMotion} />
    <ambientLight intensity={0.46} color="#d5e2db" />
    <hemisphereLight args={['#c6ddd0', '#202a24', 0.76]} />
    <directionalLight position={[-4, 8, 5]} intensity={1.34} color="#e5cea5" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.36} color="#7da398" />
    <spotLight position={[0, 7.2, -3.4]} target-position={[ORB.x, ORB.y, ORB.z]} angle={0.62} penumbra={0.72} intensity={1.36} color="#c8e6d7" distance={18} />
    <group name="home-authored-terrain" userData={{ treatment: 'v126-continuous-sculpted-ground-and-terraces' }} />
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v126-layered-apse-sanctuary', construction: 'bounded-geology-framed-fissures-structural-orb-cradle' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v126-bounded-lower-edge-geology-only' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v126-apse-orb-and-recessed-fissure-light' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v126' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'v126-open-atmospheric-horizon-above-bounded-masses' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v126' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
