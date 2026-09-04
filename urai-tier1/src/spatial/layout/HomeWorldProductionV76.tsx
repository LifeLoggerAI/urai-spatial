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
      if (object.name === 'orb-sanctuary-pedestal' || object.name === 'mirror-basin-rim' || rejectedFamily || rejectedHorizonRepeat) object.visible = false
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
  const x = isGround ? -3.72 : 3.82
  const color = isGround ? '#8dd9ad' : '#b7a3e3'
  const outer = useMemo(() => {
    const frame = fissureGeometry(false, !isGround)
    frame.holes.push(new THREE.Path(fissureGeometry(true, !isGround).getPoints(18).reverse()))
    return new THREE.ExtrudeGeometry(frame, { depth: 0.78, bevelEnabled: true, bevelSize: 0.075, bevelThickness: 0.09, bevelSegments: 2, curveSegments: 4 })
  }, [isGround])
  const field = useMemo(() => new THREE.ShapeGeometry(fissureGeometry(true, !isGround)), [isGround])
  const seamMotes = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 96; index += 1) {
      const t = index / 95
      const y = 0.08 + t * 2.62
      const bend = Math.sin(t * Math.PI * 2.7 + (isGround ? 0.4 : 1.2)) * 0.16
      const width = 0.05 + Math.sin(t * Math.PI) * 0.28
      const sideOffset = ((index * 17) % 23) / 22 - 0.5
      positions.push(bend + sideOffset * width, y, (((index * 29) % 19) / 18 - 0.5) * 0.34)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{ visualRepair: 'v132-recessed-threshold-inhabits-architectural-wing' }} position={[x, 0.10, isGround ? -7.54 : -7.70]} rotation={[0, isGround ? 0.07 : -0.10, isGround ? -0.025 : 0.035]} scale={isGround ? [0.72, 0.76, 0.76] : [0.69, 0.73, 0.73]}>
    <points name={`home-v126-${side}-irregular-light-seam`} geometry={seamMotes} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <pointsMaterial color={color} size={0.046} transparent opacity={0.56} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name={`home-v126-${side}-carved-stone-frame`} geometry={outer} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <meshStandardMaterial color={isGround ? '#44584d' : '#4c4b5d'} roughness={0.91} metalness={0.025} />
    </mesh>
    <mesh name={`home-v132-${side}-recessed-memory-field`} geometry={field} position={[0, 0, 0.13]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} roughness={0.46} transparent opacity={0.30} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <group name={`home-v126-${side}-port-shoulder`} />
    <group name={`home-v126-${side}-starboard-shoulder`} />
    <pointLight position={[0, 1.42, 0.55]} color={color} intensity={0.72} distance={3.4} decay={2} />
  </group>
}

function sanctuaryWingGeometry(side: 'left' | 'right', layer: number) {
  const direction = side === 'left' ? -1 : 1
  const inset = layer * 0.26
  const shape = new THREE.Shape()
  const points: Array<[number, number]> = side === 'left'
    ? [[-5.65 + inset, 0], [-5.48 + inset, 3.18 - inset * 0.2], [-4.72 + inset, 4.16 - inset * 0.35], [-3.62 + inset, 4.52 - inset * 0.42], [-2.48 + inset, 4.06 - inset * 0.28], [-1.72 + inset, 2.92], [-1.42 + inset, 0]]
    : [[1.34 - inset, 0], [1.66 - inset, 2.56], [2.26 - inset, 3.70 - inset * 0.2], [3.18 - inset, 4.28 - inset * 0.34], [4.44 - inset, 4.04 - inset * 0.38], [5.42 - inset, 3.08 - inset * 0.22], [5.72 - inset, 0]]
  shape.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.48 + layer * 0.16,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.10,
    bevelSegments: 2,
    curveSegments: 2,
  })
  geometry.translate(direction * layer * 0.05, 0, 0)
  return geometry
}

function SanctuaryArchitecture() {
  const wings = useMemo(() => ([0, 1, 2].flatMap((layer) => (['left', 'right'] as const).map((side) => ({
    side,
    layer,
    geometry: sanctuaryWingGeometry(side, layer),
  })))), [])
  const canopy = useMemo(() => new THREE.ExtrudeGeometry((() => {
    const shape = new THREE.Shape()
    shape.moveTo(-3.05, 0)
    shape.bezierCurveTo(-2.15, 0.58, -0.72, 0.88, 0.28, 0.58)
    shape.bezierCurveTo(1.10, 0.38, 1.86, 0.16, 2.58, 0)
    shape.lineTo(2.30, 0.36)
    shape.bezierCurveTo(1.12, 0.92, -1.42, 1.36, -3.18, 0.42)
    shape.closePath()
    return shape
  })(), { depth: 0.62, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 12 }), [])
  return <group name="home-v132-asymmetric-inhabited-sanctuary" position={[0, -0.06, -8.02]}>
    {wings.map(({ side, layer, geometry }) => <mesh key={`${side}-${layer}`} name={`home-v132-${side}-staggered-bearing-mass-${layer}`} geometry={geometry} position={[0, layer * 0.08, -layer * 0.46]} castShadow receiveShadow>
      <meshStandardMaterial color={layer === 0 ? '#34443c' : layer === 1 ? '#48564d' : '#59645a'} roughness={0.94} metalness={0.015} />
    </mesh>)}
    <mesh name="home-v132-cantilevered-open-canopy" geometry={canopy} position={[0.12, 3.62, 0.26]} rotation={[0.08, 0, -0.035]} castShadow receiveShadow>
      <meshStandardMaterial color="#617066" roughness={0.87} metalness={0.04} />
    </mesh>
    <mesh name="home-v132-recessed-apse-shadow" position={[-0.10, 1.74, -0.44]} scale={[1.84, 2.22, 0.18]}>
      <sphereGeometry args={[1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <meshStandardMaterial color="#17231f" roughness={1} side={THREE.BackSide} />
    </mesh>
    {[[-2.18, 0.72, 0.34, 1.82], [2.06, 0.88, 0.26, 1.54], [-1.72, 2.76, 0.22, 1.22], [1.58, 2.56, 0.20, 1.08]].map(([x, y, z, length], index) => <mesh key={index} name={`home-v132-recessed-service-light-${index}`} position={[x, y, z]} rotation={[0, 0, index % 2 ? -0.18 : 0.16]}>
      <boxGeometry args={[0.045, length, 0.055]} />
      <meshStandardMaterial color="#8fb9a5" emissive="#79a58f" emissiveIntensity={0.72} roughness={0.42} />
    </mesh>)}
  </group>
}

function ApseAndOrbCradle() {
  const branches = useMemo(() => [
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.82, 0.02, 0.18), new THREE.Vector3(-1.48, 0.30, 0.10), new THREE.Vector3(-1.02, 0.56, 0.04), new THREE.Vector3(-0.72, 0.90, 0),
    ]), 22, 0.16, 8, false),
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.62, 0.02, 0.10), new THREE.Vector3(1.30, 0.32, 0.18), new THREE.Vector3(0.94, 0.62, 0.10), new THREE.Vector3(0.68, 0.96, 0),
    ]), 22, 0.15, 8, false),
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.10, 0.02, -0.92), new THREE.Vector3(0.04, 0.30, -0.62), new THREE.Vector3(-0.04, 0.62, -0.34), new THREE.Vector3(-0.10, 0.92, -0.12),
    ]), 26, 0.12, 8, false),
  ], [])
  return <group name="home-v126-layered-apse-orb-cradle" userData={{ visualRepair: 'v132-grounded-stone-seat', loadPath: 'three-grounded-branches-to-memory-volume' }} position={[ORB.x, 0.04, ORB.z]}>
    {branches.map((geometry, index) => <mesh key={index} name={`home-v131-grounded-cradle-branch-${index}`} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={index === 2 ? '#65796e' : '#3f5149'} roughness={0.91} metalness={0.03} />
    </mesh>)}
    <mesh name="home-v132-orb-recessed-seat" position={[0, 0.34, 0]} scale={[1.46, 0.24, 1.06]} receiveShadow>
      <cylinderGeometry args={[1, 1.14, 1, 10, 1, false]} />
      <meshStandardMaterial color="#34473e" roughness={0.93} metalness={0.025} />
    </mesh>
  </group>
}

function ArrivalSignalPath({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const indices: number[] = []
    for (let index = 0; index <= 72; index += 1) {
      const t = index / 72
      const z = 4.8 - t * 11.55
      const center = Math.sin(t * Math.PI * 1.45) * 0.32 - t * 0.16
      const half = 0.025 + t * 0.018
      positions.push(center - half, -0.005 + t * 0.20, z, center + half, -0.005 + t * 0.20, z)
      if (index < 72) {
        const a = index * 2
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])
  const path = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (path.current && !reducedMotion) (path.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.18 + Math.sin(clock.elapsedTime * 0.72) * 0.035 })
  return <mesh ref={path} name="home-v131-passive-signal-arrival-path" geometry={geometry} receiveShadow>
    <meshStandardMaterial color="#587064" emissive="#6f9c87" emissiveIntensity={0.18} roughness={0.82} transparent opacity={0.72} side={THREE.DoubleSide} />
  </mesh>
}

function LivingOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const palette = ORB_PALETTE[state]
  const source = useGLTF(GOVERNED_ORB).scene
  const orb = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      if (object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-satellite-') || object.name.startsWith('orb-filament-')) object.visible = false
    })
    return normalizeAsset(root, 2.42, palette.core, 0.58)
  }, [palette.core, source])
  const moteGeometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 280; index += 1) {
      const t = index / 279
      const y = -1.02 + t * 2.04
      const envelope = Math.sqrt(Math.max(0, 1 - Math.pow(y / 1.08, 2)))
      const angle = index * 2.3999632297 + Math.sin(index * 0.37) * 0.16
      const radius = envelope * (0.54 + ((index * 17) % 31) / 86)
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.72)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  const memoryVolume = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.88, 34, 24)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const z = positions.getZ(index)
      const latitude = y / 0.88
      const shoulder = 0.92 + Math.sin(latitude * Math.PI * 1.15) * 0.055
      positions.setXYZ(index, x * shoulder * 0.76, y * 1.03 + 0.045 * Math.sin(x * 4.2), z * (0.70 + 0.035 * latitude))
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.position.y = ORB.y + Math.sin(t * (state === 'speaking' ? 1.55 : 0.74)) * 0.065
    group.current.rotation.y = Math.sin(t * 0.18) * 0.075
  })

  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x, ORB.y, ORB.z]} onClick={(event) => { event.stopPropagation(); onOrb() }}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow>
      <meshPhysicalMaterial color={palette.core} emissive={palette.accent} emissiveIntensity={0.30} roughness={0.32} metalness={0.04} transmission={0.22} thickness={0.72} transparent opacity={0.78} />
    </mesh>
    <primitive object={orb} position={[0, -1.08, 0.16]} scale={[0.92, 0.92, 0.92]} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} position={[0, 0, 0]} scale={[0.82, 0.88, 0.82]}>
      <pointsMaterial color={palette.core} size={palette.moteSize * 0.72} transparent opacity={0.48} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <points name="home-v130-orb-inner-memory-swarm" geometry={moteGeometry} scale={[0.42, 0.52, 0.42]} rotation={[0.22, 0.54, -0.12]}>
      <pointsMaterial color={palette.accent} size={palette.moteSize * 0.62} transparent opacity={0.52} depthWrite={false} sizeAttenuation toneMapped={false} />
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
    <SanctuaryArchitecture />
    <SanctuaryTerraces />
    <GeologicalFrame />
    <FramedFissure side="ground" onActivate={onGround} />
    <FramedFissure side="life-map" onActivate={onLifeMap} />
    <ApseAndOrbCradle />
    <ArrivalSignalPath reducedMotion={reducedMotion} />
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
