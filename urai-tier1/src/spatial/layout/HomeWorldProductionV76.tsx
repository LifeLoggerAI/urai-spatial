'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'

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
  'v153-localized-signal-fissures-no-facade-hoops-or-translucent-panels',
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
  scale?: Vec3
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
  dormant: { core: '#8fa99d', accent: '#526d61', intensity: 0.70, moteSize: 0.034 },
  idle: { core: '#d6fff0', accent: '#76c2a4', intensity: 1.18, moteSize: 0.044 },
  attention: { core: '#ffe9b4', accent: '#d5aa67', intensity: 1.48, moteSize: 0.052 },
  listening: { core: '#bafaff', accent: '#6bcbd0', intensity: 1.56, moteSize: 0.050 },
  thinking: { core: '#e8d3ff', accent: '#9382c1', intensity: 1.40, moteSize: 0.047 },
  speaking: { core: '#effff9', accent: '#7ee1ba', intensity: 1.86, moteSize: 0.057 },
  guiding: { core: '#fff6c7', accent: '#bec477', intensity: 1.52, moteSize: 0.050 },
  reflecting: { core: '#e3e5ff', accent: '#8993c9', intensity: 1.20, moteSize: 0.044 },
  calming: { core: '#d5f7ed', accent: '#78ae9f', intensity: 1.06, moteSize: 0.040 },
  privacy: { core: '#d1deea', accent: '#748697', intensity: 0.92, moteSize: 0.036 },
  warning: { core: '#ffd0aa', accent: '#c87359', intensity: 1.68, moteSize: 0.056 },
  transition: { core: '#fff1d5', accent: '#d1ae7c', intensity: 1.52, moteSize: 0.051 },
}

function normalizeAsset(source: THREE.Object3D, span: number, tint?: string, roughness = 0.90) {
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
        next.metalness = Math.min(next.metalness, 0.035)
        next.envMapIntensity = 0.56
        if (tint) next.color.lerp(new THREE.Color(tint), 0.30)
      }
      return next
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return root
}

function ProductionAsset({ url, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, tint, roughness, name }: AssetProps) {
  const source = useGLTF(url).scene
  const asset = useMemo(() => normalizeAsset(source, span, tint, roughness), [roughness, source, span, tint])
  return <group name={name} position={position} rotation={rotation} scale={scale}><primitive object={asset} /></group>
}

function AuthoredSanctuaryEnvironment() {
  const source = useGLTF(GOVERNED_HOME).scene
  const environment = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const rejectedFamily = ['living-growth-', 'inhabited-village-', 'village-', 'sanctuary-waterfall-', 'memory-place-anchor-', 'embodied-presence-', 'ground-alcove-', 'life-map-alcove-', 'horizon-threshold-'].some((prefix) => object.name.startsWith(prefix))
      const rejectedHorizonRepeat = object.name.startsWith('horizon-mountain-')
      if (object.name === 'orb-sanctuary-pedestal' || object.name.startsWith('mirror-basin') || rejectedFamily || rejectedHorizonRepeat) object.visible = false
      if (!(object instanceof THREE.Mesh)) return
      object.receiveShadow = true
      object.castShadow = !object.name.includes('water')
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      object.material = Array.isArray(object.material) ? originals.map((material) => {
        const next = material.clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.roughness = Math.max(next.roughness, 0.78)
          next.metalness = Math.min(next.metalness, 0.035)
          next.envMapIntensity = 0.58
          if (!object.name.includes('water')) next.color.lerp(new THREE.Color('#61766a'), 0.18)
        }
        return next
      }) : (() => {
        const next = originals[0].clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.roughness = Math.max(next.roughness, 0.78)
          next.metalness = Math.min(next.metalness, 0.035)
          next.envMapIntensity = 0.58
          if (!object.name.includes('water')) next.color.lerp(new THREE.Color('#61766a'), 0.18)
        }
        return next
      })()
    })
    return root
  }, [source])
  return <group name="home-v128-governed-landscape-sanctuary" position={[0.10, -0.72, -8.35]} scale={[1.06, 1.06, 1.06]}><primitive object={environment} /></group>
}

function AuthoredThresholdEnvironment() {
  const source = useGLTF(GOVERNED_HOME).scene
  const thresholds = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const retained = object.name.startsWith('ground-alcove-') || object.name.startsWith('life-map-alcove-')
      if (!(object instanceof THREE.Mesh)) return
      object.visible = retained
      object.castShadow = true
      object.receiveShadow = true
    })
    return root
  }, [source])
  return <group name="home-v133-authored-recessed-thresholds" position={[0, -0.18, -0.62]} scale={[0.90, 0.90, 0.90]} userData={{ v165Refinement: 'legacy-alcove-meshes-remain-disabled-no-gate-facade' }}><primitive object={thresholds} visible={false} /></group>
}

function useSanctuaryStone() {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const prepare = (source: THREE.Texture, color = false) => {
      const texture = source.clone()
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.2, 4.8)
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.anisotropy = 4
      texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource, true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource, colorSource, normalSource])
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const stone = useSanctuaryStone()
  const geometry = useMemo(() => {
    const xSegments = 64
    const zSegments = 88
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shadow = new THREE.Color('#34493f')
    const moss = new THREE.Color('#87988c')
    for (let zi = 0; zi <= zSegments; zi += 1) {
      const tz = zi / zSegments
      const z = 6.75 - tz * 22.40
      for (let xi = 0; xi <= xSegments; xi += 1) {
        const tx = xi / xSegments
        const x = -7.55 + tx * 15.10
        const lateral = Math.abs(x) / 7.55
        const walkingChannel = Math.exp(-Math.pow(x / 2.95, 4))
        const sideRise = Math.pow(lateral, 1.90) * (0.92 + Math.sin(z * 0.26 + x * 0.12) * 0.22)
        const fracture = (Math.sin(x * 1.02 + z * 0.52) * 0.12 + Math.cos(x * 0.44 - z * 0.88) * 0.09 + Math.sin((x + z) * 0.28) * 0.07) * (0.28 + lateral * 0.72)
        const channelRelief = walkingChannel * (Math.sin(z * 0.32) * 0.028 + Math.cos(z * 0.15) * 0.022)
        const descent = tz * 0.46
        const y = -0.32 + descent + sideRise + fracture * (1 - walkingChannel * 0.92) + channelRelief
        positions.push(x, y, z)
        const shade = THREE.MathUtils.clamp(0.32 + y * 0.16 + (1 - tz) * 0.08, 0, 1)
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
  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} position={[0, 0.035, 0]} receiveShadow onClick={onWalk} userData={{ v165Refinement: 'smoothed-open-basin-clear-camera-corridors-no-road-groove' }}><meshPhysicalMaterial color="#75867a" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.38, 0.38)} roughnessMap={stone.arm} roughness={0.92} metalness={0.002} envMapIntensity={0.68} vertexColors polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
}

function SanctuaryTerraces() {
  const stone = useSanctuaryStone()
  const ribbon = useMemo(() => {
    const positions: number[] = []
    const indices: number[] = []
    const stations = 80
    const station = (t: number) => {
      const z = 5.85 - t * 16.10
      const center = Math.sin(t * Math.PI * 1.55) * 0.42 + Math.sin(t * Math.PI * 4.0) * 0.10 - t * 0.08
      const half = 0.024 - t * 0.007
      const y = -0.125 + t * 0.39 + Math.sin(z * 0.38) * 0.024
      return { z, center, half, y }
    }
    for (let index = 0; index < stations; index += 1) {
      const phase = index % 12
      if (phase > 2) continue
      const a = station(index / stations)
      const b = station((index + 1) / stations)
      const base = positions.length / 3
      positions.push(a.center - a.half, a.y, a.z, a.center + a.half, a.y, a.z, b.center - b.half, b.y, b.z, b.center + b.half, b.y, b.z)
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  return <group name="home-v126-continuous-walkable-terrace-network" userData={{ v162Refinement: 'orientation-traces-retained-as-nonrendered-geometry-no-runway-read', v165Refinement: 'runway-and-arrival-traces-remain-nonrendered' }}><mesh name="home-v154-inlaid-stone-approach" geometry={ribbon} receiveShadow visible={false}><meshPhysicalMaterial color="#68736c" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.12, 0.12)} roughnessMap={stone.arm} roughness={0.98} metalness={0.001} envMapIntensity={0.30} side={THREE.DoubleSide} /></mesh></group>
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    { name: 'home-v126-near-port-outcrop', url: ROCK_FACE_A, position: [-9.20, -0.82, -3.8], rotation: [0.03, 1.12, -0.12], scale: [0.48, 0.70, 0.58], span: 1.60, tint: '#42564a' },
    { name: 'home-v126-mid-port-outcrop', url: ROCK_FACE_B, position: [-8.86, -0.54, -9.4], rotation: [-0.05, 1.30, 0.08], scale: [0.54, 0.78, 0.64], span: 1.72, tint: '#3b5045' },
    { name: 'home-v126-deep-port-outcrop', url: ROCK_FACE_A, position: [-8.15, -0.18, -14.7], rotation: [0.04, 0.70, -0.08], scale: [0.62, 0.88, 0.70], span: 1.88, tint: '#354b40' },
    { name: 'home-v126-near-starboard-outcrop', url: ROCK_FACE_B, position: [9.22, -0.80, -4.1], rotation: [-0.03, -1.10, 0.10], scale: [0.48, 0.70, 0.58], span: 1.60, tint: '#43574b' },
    { name: 'home-v126-mid-starboard-outcrop', url: ROCK_FACE_A, position: [8.82, -0.54, -9.6], rotation: [0.04, -1.30, -0.07], scale: [0.54, 0.78, 0.64], span: 1.72, tint: '#3d5146' },
    { name: 'home-v126-deep-starboard-outcrop', url: ROCK_FACE_B, position: [8.18, -0.18, -14.8], rotation: [-0.04, -0.68, 0.08], scale: [0.62, 0.90, 0.72], span: 1.88, tint: '#364c41' },
  ]
  return <group name="home-v126-bounded-geological-edge-masses" userData={{ v165Refinement: 'scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs' }}>{placements.map((placement) => <ProductionAsset key={placement.name} {...placement} roughness={0.95} />)}</group>
}

function fissureGeometry(inner = false, mirrored = false) {
  const shape = new THREE.Shape()
  const x = mirrored ? -1 : 1
  const points = inner ? [[-0.17, 0.02], [-0.23, 0.36], [-0.14, 0.70], [-0.25, 1.02], [-0.12, 1.34], [-0.20, 1.66], [-0.06, 2.02], [0.08, 2.18], [0.15, 1.84], [0.08, 1.50], [0.22, 1.18], [0.12, 0.84], [0.24, 0.48], [0.17, 0.02]] : [[-0.31, 0], [-0.39, 0.38], [-0.28, 0.74], [-0.41, 1.08], [-0.27, 1.43], [-0.34, 1.78], [-0.16, 2.16], [0.05, 2.42], [0.23, 2.14], [0.18, 1.78], [0.34, 1.44], [0.25, 1.06], [0.38, 0.70], [0.29, 0.34], [0.32, 0]]
  shape.moveTo(points[0][0] * x, points[0][1])
  for (const [px, py] of points.slice(1)) shape.lineTo(px * x, py)
  shape.closePath()
  return shape
}

function FramedFissure({ side, onActivate }: { side: 'ground' | 'life-map'; onActivate: () => void }) {
  const stone = useSanctuaryStone()
  const isGround = side === 'ground'
  const x = isGround ? -4.92 : 4.92
  const color = isGround ? '#78c09e' : '#a497d0'
  const outer = useMemo(() => {
    const frame = fissureGeometry(false, !isGround)
    frame.holes.push(new THREE.Path(fissureGeometry(true, !isGround).getPoints(18).reverse()))
    const geometry = new THREE.ExtrudeGeometry(frame, { depth: 0.10, bevelEnabled: true, bevelSize: 0.016, bevelThickness: 0.018, bevelSegments: 2, curveSegments: 4 })
    geometry.computeVertexNormals()
    return geometry
  }, [isGround])
  const field = useMemo(() => new THREE.ShapeGeometry(fissureGeometry(true, !isGround), 8), [isGround])
  const seamMotes = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 42; index += 1) {
      const t = index / 41
      const y = 0.08 + t * 2.02
      const bend = Math.sin(t * Math.PI * 2.7 + (isGround ? 0.35 : 1.15)) * 0.034
      const width = 0.012 + Math.sin(t * Math.PI) * 0.052
      const sideOffset = ((index * 31) % 61) / 60 - 0.5
      positions.push(bend + sideOffset * width, y, 0.014 + (((index * 29) % 47) / 46 - 0.5) * 0.055)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{ v165Refinement: 'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring' }} position={[x, isGround ? 0.05 : 0.06, isGround ? -9.72 : -9.80]} rotation={[-1.47, isGround ? 0.13 : -0.13, isGround ? -0.08 : 0.08]} scale={isGround ? [0.38, 0.58, 0.34] : [0.37, 0.59, 0.34]}>
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow><meshPhysicalMaterial color={isGround ? '#3f574b' : '#4b4c61'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={stone.arm} roughness={0.95} metalness={0.001} envMapIntensity={0.54} /></mesh>
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0, 0, 0.025]}><meshStandardMaterial color={isGround ? '#06100b' : '#0a0910'} emissive={color} emissiveIntensity={0.040} roughness={1} side={THREE.DoubleSide} /></mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} position={[0, 0, 0.10]}><pointsMaterial color={color} size={0.014} transparent opacity={0.46} depthWrite={false} sizeAttenuation toneMapped={false} /></points>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0, 1.08, 0.08]} onClick={(event) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[4.20, 4.20, 2.80]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh>
    <pointLight position={[0, 1.08, 0.34]} color={color} intensity={0.30} distance={4.4} decay={2} />
  </group>
}

function weatheredSanctuaryMassGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const weathering = 1 + Math.sin(x * (4.4 + seed * 0.17) + y * 3.2 + seed) * 0.10 + Math.cos(z * 4.8 - y * (2.4 + seed * 0.09)) * 0.07 + Math.sin((x - z) * 7.1 + seed * 1.9) * 0.04
    positions.setXYZ(index, x * weathering, y * weathering * 0.92, z * weathering * (0.92 + Math.cos(x * 4.2 + seed) * 0.04))
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function SanctuaryArchitecture() {
  const stone = useSanctuaryStone()
  const masses = useMemo(() => {
    const placements: readonly { name: string; seed: number; position: Vec3; rotation: Vec3; scale: Vec3; color: string }[] = [
      { name: 'ground-rift-bearing-mass', seed: 1.3, position: [-6.24, 0.02, -11.42], rotation: [0.08, 0.64, -0.16], scale: [1.72, 0.28, 0.94], color: '#3d5649' },
      { name: 'ground-rift-settled-shoulder', seed: 2.7, position: [-4.02, -0.02, -12.00], rotation: [-0.08, 0.76, 0.06], scale: [1.36, 0.22, 0.88], color: '#4b6255' },
      { name: 'life-map-rift-bearing-mass', seed: 4.1, position: [6.28, 0.02, -11.50], rotation: [-0.10, -0.66, 0.16], scale: [1.68, 0.28, 0.92], color: '#42594e' },
      { name: 'life-map-rift-settled-shoulder', seed: 5.6, position: [4.08, -0.02, -12.02], rotation: [0.08, -0.68, -0.06], scale: [1.34, 0.22, 0.90], color: '#4d6458' },
      { name: 'apse-port-broken-crown', seed: 6.8, position: [-2.48, 0.20, -12.66], rotation: [0.14, 0.32, -0.16], scale: [1.62, 0.46, 1.02], color: '#364d42' },
      { name: 'apse-starboard-broken-crown', seed: 8.2, position: [2.34, 0.18, -12.76], rotation: [-0.12, -0.28, 0.16], scale: [1.58, 0.44, 1.04], color: '#3b5247' },
      { name: 'far-port-weathered-ridge', seed: 12.6, position: [-6.90, 0.46, -14.34], rotation: [0.04, 0.42, -0.08], scale: [4.20, 0.88, 1.50], color: '#31483d' },
      { name: 'far-starboard-weathered-ridge', seed: 14.0, position: [7.08, 0.50, -14.56], rotation: [-0.04, -0.48, 0.08], scale: [4.46, 0.94, 1.56], color: '#354c42' },
      { name: 'mid-port-canyon-shoulder', seed: 15.5, position: [-6.74, 0.22, -8.84], rotation: [-0.03, 0.72, -0.08], scale: [2.72, 0.54, 1.14], color: '#40594b' },
      { name: 'mid-starboard-canyon-shoulder', seed: 16.9, position: [6.92, 0.22, -9.16], rotation: [0.03, -0.66, 0.08], scale: [2.84, 0.54, 1.18], color: '#3e574a' },
    ]
    return placements.map((placement) => ({ ...placement, geometry: weatheredSanctuaryMassGeometry(placement.seed) }))
  }, [])
  return <group name="home-v149-weathered-rift-threshold-sanctuary" userData={{ v165Refinement: 'low-broad-canyon-silhouettes-clear-destination-camera-corridors-no-piles', composition: 'open-navigation-basin-with-layered-side-ridges-and-recessed-lit-cuts' }}>{masses.map((mass) => <mesh key={mass.name} name={`home-v149-${mass.name}`} geometry={mass.geometry} position={mass.position} rotation={mass.rotation} scale={mass.scale} castShadow receiveShadow><meshPhysicalMaterial color={mass.color} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.30, 0.30)} roughnessMap={stone.arm} roughness={0.95} metalness={0.001} envMapIntensity={0.58} /></mesh>)}</group>
}

function ApseAndOrbCradle() {
  const stone = useSanctuaryStone()
  const supportGeometry = useMemo(() => weatheredSanctuaryMassGeometry(13.4), [])
  return <group name="home-v126-layered-apse-orb-cradle" userData={{ v165Refinement: 'low-lateral-apse-geology-clear-under-orb-air-gap-no-pedestal', retiredFreestandingSupports: true }} position={[ORB.x, 0, ORB.z - 0.62]}>
    <mesh geometry={supportGeometry} position={[-1.98, 0.18, -1.00]} rotation={[0.16, 0.52, -0.18]} scale={[1.30, 0.24, 0.82]} castShadow receiveShadow><meshPhysicalMaterial color="#41584b" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={stone.arm} roughness={0.95} metalness={0.001} envMapIntensity={0.56} /></mesh>
    <mesh geometry={supportGeometry} position={[1.86, 0.16, -1.08]} rotation={[-0.12, -0.46, 0.18]} scale={[1.22, 0.22, 0.80]} castShadow receiveShadow><meshPhysicalMaterial color="#3e5549" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.26, 0.26)} roughnessMap={stone.arm} roughness={0.95} metalness={0.001} envMapIntensity={0.54} /></mesh>
    <pointLight position={[-1.34, 0.74, 0.18]} color="#7fc0a1" intensity={0.14} distance={3.0} decay={2} />
    <pointLight position={[1.22, 0.72, 0.14]} color="#a194ce" intensity={0.13} distance={2.9} decay={2} />
  </group>
}

function ArrivalSignalPath({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const indices: number[] = []
    for (let index = 0; index <= 84; index += 1) {
      const t = index / 84
      const z = 5.15 - t * 11.80
      const center = Math.sin(t * Math.PI * 1.45) * 0.30 - t * 0.13
      const half = 0.004 + t * 0.002
      positions.push(center - half, 0.006 + t * 0.22, z, center + half, 0.006 + t * 0.22, z)
      if (index < 84) { const a = index * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])
  const path = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (path.current && !reducedMotion) (path.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.010 + Math.sin(clock.elapsedTime * 0.72) * 0.003 })
  return <mesh ref={path} name="home-v131-passive-signal-arrival-path" geometry={geometry} receiveShadow visible={false}><meshStandardMaterial color="#45554d" emissive="#527163" emissiveIntensity={0.010} roughness={0.97} transparent opacity={0.10} side={THREE.DoubleSide} /></mesh>
}

function LivingOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const palette = ORB_PALETTE[state]
  const source = useGLTF(GOVERNED_ORB).scene
  const orb = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const rejectedIdentity = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-satellite-') || object.name.startsWith('orb-filament-')
      object.visible = false
      if (rejectedIdentity) object.userData.uraiRetiredVisualRole = 'v133-no-aura-orbit-satellite-filament'
    })
    return normalizeAsset(root, 2.42, palette.core, 0.58)
  }, [palette.core, source])
  const moteGeometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 820; index += 1) {
      const verticalSample = ((((index * 613) % 817) / 816) * 2) - 1
      const shell = Math.sqrt(Math.max(0, 1 - verticalSample * verticalSample))
      const angle = index * 2.3999632297 + Math.sin(index * 0.31) * 0.11
      const radialSample = ((index * 431) % 823) / 822
      const radius = (0.11 + Math.pow(radialSample, 1.72) * 0.36) * shell
      const drift = Math.sin(index * 0.17) * 0.012
      positions.push(Math.cos(angle) * radius * 0.92 + drift, verticalSample * 0.52, Math.sin(angle) * radius * 0.84)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  const memoryVolume = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(0.72, 3)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index); const y = positions.getY(index); const z = positions.getZ(index)
      const latitude = y / 0.72
      const shoulder = 0.94 + Math.sin(latitude * Math.PI * 1.40) * 0.08 + Math.cos((x + z) * 4.8) * 0.035
      const taper = 0.97 - latitude * 0.06
      positions.setXYZ(index, x * shoulder * taper * 0.88, y * 1.02 + 0.035 * Math.sin(x * 4.8), z * shoulder * (0.78 + 0.05 * latitude))
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const shards = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const angle = index * 2.3999632297
    const radius = 0.10 + ((index * 7) % 5) / 52
    return { position: [Math.cos(angle) * radius, Math.sin(angle * 1.37) * 0.22, Math.sin(angle) * radius * 0.72] as Vec3, rotation: [angle * 0.10, angle * 0.18, angle * 0.14] as Vec3, scale: 0.026 + ((index * 3) % 5) * 0.003 }
  }), [])
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.position.y = ORB.y + Math.sin(t * (state === 'speaking' ? 1.30 : 0.62)) * 0.026
    group.current.rotation.y = Math.sin(t * 0.14) * 0.028
  })
  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x, ORB.y, ORB.z]} scale={[1.18, 1.18, 1.18]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{ v165Refinement: 'contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal' }}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.58, 0.64, 0.56]}><meshPhysicalMaterial color="#4d8a72" emissive={palette.accent} emissiveIntensity={0.10} roughness={0.58} metalness={0.004} transmission={0.02} thickness={0.18} transparent opacity={0.15} depthWrite={false} clearcoat={0.04} clearcoatRoughness={0.74} /></mesh>
    <primitive object={orb} visible={false} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[0.92, 0.94, 0.90]}><pointsMaterial color={palette.core} size={palette.moteSize * 0.62} transparent opacity={0.52} depthWrite={false} sizeAttenuation toneMapped={false} /></points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[0.99, 1.00, 0.96]}><pointsMaterial color={palette.accent} size={palette.moteSize * 0.26} transparent opacity={0.07} depthWrite={false} sizeAttenuation toneMapped={false} /></points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.38, 0.44, 0.34]}><meshPhysicalMaterial color="#7ac0a2" emissive={palette.accent} emissiveIntensity={0.34} roughness={0.40} metalness={0.004} clearcoat={0.08} clearcoatRoughness={0.60} /></mesh>
    {shards.map((shard, index) => <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}><tetrahedronGeometry args={[1, 0]} /><meshStandardMaterial color={palette.core} emissive={palette.accent} emissiveIntensity={0.10} roughness={0.56} transparent opacity={0.46} /></mesh>)}
    <mesh name="home-v126-orb-generous-hit-target"><sphereGeometry args={[1.50, 16, 12]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh>
    <pointLight color={palette.core} intensity={palette.intensity * 0.72} distance={5.0} decay={2} />
    <pointLight position={[0.48, -0.10, 0.52]} color={palette.accent} intensity={palette.intensity * 0.22} distance={3.0} decay={2} />
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }} />
  </group>
}

function AtmosphericDepth({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 180; index += 1) {
      const angle = index * 2.3999632297
      const radius = 6.2 + ((index * 37) % 180) / 10
      const y = 0.65 + ((index * 29) % 82) / 11
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius - 9.4)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])
  const points = useRef<THREE.Points>(null)
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * 0.0016 })
  return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry} userData={{ v165Refinement: 'bounded-depth-motes-reduced-render-load-no-screen-overlay' }}><pointsMaterial color="#d9e9df" size={0.026} transparent opacity={0.19} depthWrite={false} fog /></points>
}

export function HomeV76Sanctuary({ reducedMotion, orbState, onOrb, onGround, onLifeMap, onWalk }: Props) {
  return <group name="home-v126-ground-owned-open-sanctuary" userData={{ activeArtRevision: 'v154-visible-canyon-fissures-memory-swarm-no-pedestal', visualIteration: 'v158-ground-scar-thresholds-hairline-path-sunken-geology', currentVisualRefinement: 'v165-smoothed-canyon-corridors-contained-orb-no-runway', v165PixelRepair: 'remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell', compatibilityMarkers: LEGACY_CONTRACT_MARKERS, legacySourceAssets: LEGACY_SOURCE_ASSETS, historicalV76ContractOnly: true }}>
    <SculptedCanyonGround onWalk={onWalk} />
    <AuthoredSanctuaryEnvironment />
    <AuthoredThresholdEnvironment />
    <SanctuaryArchitecture />
    <SanctuaryTerraces />
    <GeologicalFrame />
    <FramedFissure side="ground" onActivate={onGround} />
    <FramedFissure side="life-map" onActivate={onLifeMap} />
    <ApseAndOrbCradle />
    <ArrivalSignalPath reducedMotion={reducedMotion} />
    <LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <AtmosphericDepth reducedMotion={reducedMotion} />
    <ambientLight intensity={0.82} color="#dce9e1" />
    <hemisphereLight args={['#dcece3', '#2c3932', 1.10]} />
    <directionalLight position={[-4, 8, 5]} intensity={1.72} color="#ecd6b6" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.72} color="#8bb5a7" />
    <spotLight position={[0, 7.4, -2.8]} target-position={[ORB.x, ORB.y, ORB.z]} angle={0.60} penumbra={0.90} intensity={1.42} color="#dff2e9" distance={19} />
    <pointLight position={[0, 1.8, 2.8]} intensity={0.36} color="#e8d4b6" distance={8} decay={2} />
    <group name="home-authored-terrain" userData={{ v165Refinement: 'smoothed-open-basin-clear-camera-corridors-runway-hidden' }} />
    <group name="home-sanctuary-pavilion" userData={{ v165Refinement: 'low-broad-side-ridges-readable-terrain-cuts-contained-orb-no-piles' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ v165Refinement: 'off-axis-provenance-no-card-wall-no-camera-clipping' }} />
    <group name="home-v49-authored-practicals" userData={{ v165Refinement: 'localized-destination-cuts-subordinate-to-contained-memory-orb' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v126' }} />
    <group name="home-mountain-horizon" userData={{ v165Refinement: 'low-layered-asymmetric-horizon-central-orb-air-preserved' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v126' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
