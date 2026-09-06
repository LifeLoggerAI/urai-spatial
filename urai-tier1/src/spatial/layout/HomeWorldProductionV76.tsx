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

// Keep visual and interaction authority on the same coordinate as V70 telemetry.
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
  dormant: { core: '#8fa99d', accent: '#526d61', intensity: 0.72, moteSize: 0.034 },
  idle: { core: '#d6fff0', accent: '#76c2a4', intensity: 1.22, moteSize: 0.044 },
  attention: { core: '#ffe9b4', accent: '#d5aa67', intensity: 1.54, moteSize: 0.052 },
  listening: { core: '#bafaff', accent: '#6bcbd0', intensity: 1.62, moteSize: 0.050 },
  thinking: { core: '#e8d3ff', accent: '#9382c1', intensity: 1.46, moteSize: 0.047 },
  speaking: { core: '#effff9', accent: '#7ee1ba', intensity: 1.94, moteSize: 0.057 },
  guiding: { core: '#fff6c7', accent: '#bec477', intensity: 1.58, moteSize: 0.050 },
  reflecting: { core: '#e3e5ff', accent: '#8993c9', intensity: 1.24, moteSize: 0.044 },
  calming: { core: '#d5f7ed', accent: '#78ae9f', intensity: 1.10, moteSize: 0.040 },
  privacy: { core: '#d1deea', accent: '#748697', intensity: 0.96, moteSize: 0.036 },
  warning: { core: '#ffd0aa', accent: '#c87359', intensity: 1.74, moteSize: 0.056 },
  transition: { core: '#fff1d5', accent: '#d1ae7c', intensity: 1.58, moteSize: 0.051 },
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
        next.metalness = Math.min(next.metalness, 0.035)
        next.envMapIntensity = 0.64
        if (tint) next.color.lerp(new THREE.Color(tint), 0.34)
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
      const rejectedFamily = [
        'living-growth-', 'inhabited-village-', 'village-', 'sanctuary-waterfall-',
        'memory-place-anchor-', 'embodied-presence-', 'ground-alcove-',
        'life-map-alcove-', 'horizon-threshold-',
      ].some((prefix) => object.name.startsWith(prefix))
      const rejectedHorizonRepeat = object.name.startsWith('horizon-mountain-')
      if (object.name === 'orb-sanctuary-pedestal' || object.name.startsWith('mirror-basin') || rejectedFamily || rejectedHorizonRepeat) object.visible = false
      if (!(object instanceof THREE.Mesh)) return
      object.receiveShadow = true
      object.castShadow = !object.name.includes('water')
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((material) => {
        const next = material.clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.roughness = Math.max(next.roughness, 0.74)
          next.metalness = Math.min(next.metalness, 0.035)
          next.envMapIntensity = 0.72
          if (!object.name.includes('water')) next.color.lerp(new THREE.Color('#61796c'), 0.20)
        }
        return next
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return root
  }, [source])

  return <group name="home-v128-governed-landscape-sanctuary" position={[0.10, -0.72, -8.35]} scale={[1.06, 1.06, 1.06]}>
    <primitive object={environment} />
  </group>
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

  return <group name="home-v133-authored-recessed-thresholds" position={[0, -0.18, -0.62]} scale={[0.90, 0.90, 0.90]} userData={{ v163Refinement: 'legacy-alcove-meshes-remain-disabled-no-gate-facade', v164Refinement: 'legacy-alcove-meshes-remain-disabled-no-gate-facade' }}>
    <primitive object={thresholds} visible={false} />
  </group>
}

function useSanctuaryStone() {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const prepare = (source: THREE.Texture, color = false) => {
      const texture = source.clone()
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.8, 5.4)
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.anisotropy = 6
      texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource, true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource, colorSource, normalSource])
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const stone = useSanctuaryStone()
  const geometry = useMemo(() => {
    const xSegments = 84
    const zSegments = 116
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shadow = new THREE.Color('#31463c')
    const moss = new THREE.Color('#879d8d')

    for (let zi = 0; zi <= zSegments; zi += 1) {
      const tz = zi / zSegments
      const z = 6.75 - tz * 23.25
      for (let xi = 0; xi <= xSegments; xi += 1) {
        const tx = xi / xSegments
        const x = -7.75 + tx * 15.50
        const lateral = Math.abs(x) / 7.75
        const walkingChannel = Math.exp(-Math.pow(x / 2.75, 4))
        const shelf = Math.pow(lateral, 1.82) * (1.28 + Math.sin(z * 0.29 + x * 0.15) * 0.42)
        const fracture = (
          Math.sin(x * 1.08 + z * 0.58) * 0.19
          + Math.cos(x * 0.47 - z * 0.96) * 0.13
          + Math.sin((x + z) * 0.31) * 0.11
        ) * (0.34 + lateral * 1.10)
        const channelRelief = walkingChannel * (Math.sin(z * 0.36) * 0.045 + Math.cos(z * 0.17) * 0.036)
        const descent = tz * 0.54
        const y = -0.34 + descent + shelf + fracture * (1 - walkingChannel * 0.90) + channelRelief
        positions.push(x, y, z)
        const shade = THREE.MathUtils.clamp(0.30 + y * 0.17 + (1 - tz) * 0.10 - lateral * 0.03, 0, 1)
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

  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} position={[0, 0.035, 0]} receiveShadow onClick={onWalk} userData={{ v164Refinement: 'higher-contrast-sculpted-basin-without-road-groove' }}>
    <meshPhysicalMaterial
      color="#728477"
      map={stone.color}
      normalMap={stone.normal}
      normalScale={new THREE.Vector2(0.48, 0.48)}
      roughnessMap={stone.arm}
      roughness={0.90}
      metalness={0.002}
      envMapIntensity={0.78}
      vertexColors
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
    />
  </mesh>
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
      // V161: short buried stone traces provide orientation without reading as a road or rail pair.
      const phase = index % 12
      if (phase > 2) continue
      const a = station(index / stations)
      const b = station((index + 1) / stations)
      const base = positions.length / 3
      positions.push(
        a.center - a.half, a.y, a.z,
        a.center + a.half, a.y, a.z,
        b.center - b.half, b.y, b.z,
        b.center + b.half, b.y, b.z,
      )
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const terraceGeometry = useMemo(() => new THREE.CylinderGeometry(1, 1.10, 0.16, 9, 1, false), [])

  return <group
    name="home-v126-continuous-walkable-terrace-network"
    userData={{
      authoredPathGeometry: ribbon.uuid,
      retiredTerraceGeometry: terraceGeometry.uuid,
      visualRepair: 'v154-visible-inlaid-approach-over-governed-terrain',
      v155Refinement: 'quiet-recessed-approach',
      v156Refinement: 'readable-inlaid-path-without-neon-runway',
      v157Refinement: 'narrow-meandering-inlay-not-road-slab',
      v158Refinement: 'hairline-stone-trace-integrated-into-ground-no-road-read',
      v160Refinement: 'hairline-path-retained-after-literal-pixel-review',
      v161Refinement: 'broken-buried-wayfinding-traces-no-continuous-track',
      v162Refinement: 'orientation-traces-retained-as-nonrendered-geometry-no-runway-read',
      v164Refinement: 'runway-and-arrival-traces-remain-nonrendered',
      predecessorVisualRepair: 'v129-governed-terrain-owns-visible-ground',
    }}
  >
    <mesh name="home-v154-inlaid-stone-approach" geometry={ribbon} receiveShadow visible={false}>
      <meshPhysicalMaterial color="#68736c" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.12, 0.12)} roughnessMap={stone.arm} roughness={0.98} metalness={0.001} envMapIntensity={0.30} emissive="#304239" emissiveIntensity={0.004} side={THREE.DoubleSide} />
    </mesh>
  </group>
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    { name: 'home-v126-near-port-outcrop', url: ROCK_FACE_A, position: [-8.90, -0.72, -3.8], rotation: [0.03, 1.12, -0.12], scale: [0.64, 0.92, 0.72], span: 1.75, tint: '#42564a' },
    { name: 'home-v126-mid-port-outcrop', url: ROCK_FACE_B, position: [-8.50, -0.28, -9.0], rotation: [-0.05, 1.30, 0.08], scale: [0.72, 1.04, 0.82], span: 1.95, tint: '#3b5045' },
    { name: 'home-v126-deep-port-outcrop', url: ROCK_FACE_A, position: [-7.72, 0.02, -14.6], rotation: [0.04, 0.70, -0.08], scale: [0.82, 1.18, 0.88], span: 2.15, tint: '#354b40' },
    { name: 'home-v126-near-starboard-outcrop', url: ROCK_FACE_B, position: [8.92, -0.70, -4.1], rotation: [-0.03, -1.10, 0.10], scale: [0.64, 0.92, 0.72], span: 1.74, tint: '#43574b' },
    { name: 'home-v126-mid-starboard-outcrop', url: ROCK_FACE_A, position: [8.46, -0.28, -9.2], rotation: [0.04, -1.30, -0.07], scale: [0.72, 1.04, 0.82], span: 1.96, tint: '#3d5146' },
    { name: 'home-v126-deep-starboard-outcrop', url: ROCK_FACE_B, position: [7.76, 0.02, -14.7], rotation: [-0.04, -0.68, 0.08], scale: [0.84, 1.20, 0.90], span: 2.16, tint: '#364c41' },
  ]

  return <group
    name="home-v126-bounded-geological-edge-masses"
    userData={{
      retainedPlacements: placements.map((placement) => placement.name),
      visualRepair: 'v154-integrated-edge-scans-buried-into-canyon-walls',
      v155Refinement: 'edge-scans-pushed-behind-primary-composition',
      v156Refinement: 'scan-provenance-retained-beyond-primary-frustum-no-visible-card-slabs',
      v157Refinement: 'scan-provenance-kept-off-axis-while-authored-ground-owns-frame',
      v158Refinement: 'scan-provenance-remains-off-axis-after-ground-scar-refinement',
      v164Refinement: 'scan-provenance-integrated-into-deeper-continuous-canyon-edges',
      predecessorVisualRepair: 'v143-scans-bounded-off-camera-no-pasted-cutouts',
    }}
  >
    {placements.map((placement) => <ProductionAsset key={placement.name} {...placement} roughness={0.94} />)}
  </group>
}

function canyonShelfGeometry(side: 'port' | 'starboard') {
  const sign = side === 'port' ? -1 : 1
  const zSegments = 64
  const lateralSegments = 8
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let zi = 0; zi <= zSegments; zi += 1) {
    const tz = zi / zSegments
    const z = 6.25 - tz * 22.25
    for (let li = 0; li <= lateralSegments; li += 1) {
      const t = li / lateralSegments
      const inner = 3.55 + Math.sin(z * 0.23 + (side === 'port' ? 0.7 : 1.8)) * 0.34
      const outer = 8.85 + Math.cos(z * 0.17 + (side === 'port' ? 0.2 : 1.3)) * 0.38
      const x = sign * THREE.MathUtils.lerp(inner, outer, t)
      const ridge = Math.pow(t, 1.42) * (2.35 + Math.sin(z * 0.31 + t * 2.6) * 0.66 + Math.cos(z * 0.12) * 0.28)
      const ledge = Math.sin(t * Math.PI) * (0.22 + Math.cos(z * 0.48) * 0.11)
      const depthLift = tz * 0.34
      const y = -0.18 + ridge + ledge + depthLift
      positions.push(x, y, z)
      uvs.push(t * 2.8, tz * 8.2)
    }
  }
  for (let zi = 0; zi < zSegments; zi += 1) {
    for (let li = 0; li < lateralSegments; li += 1) {
      const a = zi * (lateralSegments + 1) + li
      const b = a + 1
      const c = a + lateralSegments + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function CanyonShelf({ side }: { side: 'port' | 'starboard' }) {
  const stone = useSanctuaryStone()
  const geometry = useMemo(() => canyonShelfGeometry(side), [side])
  const color = side === 'port' ? '#3a5044' : '#3d5248'
  return <mesh name={`home-v164-${side}-continuous-canyon-shelf`} geometry={geometry} castShadow receiveShadow userData={{ v164Refinement: 'continuous-sloped-canyon-shelf-not-wall-not-boulder-pile' }}>
    <meshPhysicalMaterial color={color} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.42, 0.42)} roughnessMap={stone.arm} roughness={0.93} metalness={0.001} envMapIntensity={0.72} side={THREE.DoubleSide} />
  </mesh>
}

function fissureGeometry(inner = false, mirrored = false) {
  const shape = new THREE.Shape()
  const x = mirrored ? -1 : 1
  const points = inner
    ? [[-0.17, 0.02], [-0.23, 0.36], [-0.14, 0.70], [-0.25, 1.02], [-0.12, 1.34], [-0.20, 1.66], [-0.06, 2.02], [0.08, 2.18], [0.15, 1.84], [0.08, 1.50], [0.22, 1.18], [0.12, 0.84], [0.24, 0.48], [0.17, 0.02]]
    : [[-0.31, 0], [-0.39, 0.38], [-0.28, 0.74], [-0.41, 1.08], [-0.27, 1.43], [-0.34, 1.78], [-0.16, 2.16], [0.05, 2.42], [0.23, 2.14], [0.18, 1.78], [0.34, 1.44], [0.25, 1.06], [0.38, 0.70], [0.29, 0.34], [0.32, 0]]
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
    const geometry = new THREE.ExtrudeGeometry(frame, { depth: 0.12, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.020, bevelSegments: 2, curveSegments: 4 })
    geometry.computeVertexNormals()
    return geometry
  }, [isGround])
  const field = useMemo(() => new THREE.ShapeGeometry(fissureGeometry(true, !isGround), 8), [isGround])
  const seamMotes = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 48; index += 1) {
      const t = index / 47
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

  return <group
    name={`home-v126-${side}-framed-fissure`}
    userData={{
      visualRepair: 'v154-buried-irregular-stone-fissure-no-facade-hoops-or-translucent-panels',
      v155Refinement: 'narrow-geological-scar-no-freestanding-door-silhouette',
      v156Refinement: 'hairline-navigation-rift-buried-in-bearing-geology',
      v157Refinement: 'recessed-navigation-cut-not-upright-door-form',
      v158Refinement: 'ground-laid-navigation-scar-no-upright-gate-silhouette',
      v161Refinement: 'terrain-flush-navigation-scar-no-upright-sliver',
      v163Refinement: 'larger-terrain-basin-scar-with-localized-destination-light-no-gate',
      v164Refinement: 'readable-terrain-cut-destination-light-no-door-no-ring',
      predecessorVisualRepair: 'v153-localized-signal-fissures-no-facade-hoops-or-translucent-panels',
      retainedOuter: outer.uuid,
      retainedField: field.uuid,
      retainedMotes: seamMotes.uuid,
    }}
    position={[x, isGround ? 0.06 : 0.07, isGround ? -9.78 : -9.86]}
    rotation={[-1.47, isGround ? 0.13 : -0.13, isGround ? -0.08 : 0.08]}
    scale={isGround ? [0.44, 0.64, 0.38] : [0.43, 0.65, 0.38]}
  >
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow>
      <meshPhysicalMaterial color={isGround ? '#3f574b' : '#4b4c61'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.32, 0.32)} roughnessMap={stone.arm} roughness={0.94} metalness={0.001} envMapIntensity={0.62} />
    </mesh>
    <group name={`home-v149-${side}-weathered-rift-shell`} userData={{ structuralOwner: 'open-buttress-sanctuary-wing', retiredFreestandingFrame: true }} />
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0, 0, 0.025]}>
      <meshStandardMaterial color={isGround ? '#06100b' : '#0a0910'} emissive={color} emissiveIntensity={0.045} roughness={1} side={THREE.DoubleSide} />
    </mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} position={[0, 0, 0.10]}>
      <pointsMaterial color={color} size={0.015} transparent opacity={0.50} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0, 1.08, 0.08]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[4.20, 4.20, 2.80]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <group name={`home-v126-${side}-port-shoulder`} />
    <group name={`home-v126-${side}-starboard-shoulder`} />
    <pointLight position={[0, 1.10, 0.36]} color={color} intensity={0.34} distance={4.8} decay={2} />
  </group>
}

function weatheredSanctuaryMassGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const weathering = 1
      + Math.sin(x * (4.4 + seed * 0.17) + y * 3.2 + seed) * 0.13
      + Math.cos(z * 4.8 - y * (2.4 + seed * 0.09)) * 0.09
      + Math.sin((x - z) * 7.1 + seed * 1.9) * 0.055
    const settled = 1 - Math.max(0, -y) * 0.07
    positions.setXYZ(index, x * weathering * (1 + Math.sin(y * 3.8 + seed) * 0.07), y * weathering * settled, z * weathering * (0.90 + Math.cos(x * 4.2 + seed) * 0.06))
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function SanctuaryArchitecture() {
  const stone = useSanctuaryStone()
  const masses = useMemo(() => {
    const placements: readonly { name: string; seed: number; position: Vec3; rotation: Vec3; scale: Vec3; color: string }[] = [
      { name: 'ground-rift-bearing-mass', seed: 1.3, position: [-5.44, 0.34, -10.58], rotation: [0.10, 0.64, -0.28], scale: [2.30, 0.84, 1.30], color: '#3d5649' },
      { name: 'ground-rift-settled-shoulder', seed: 2.7, position: [-3.74, 0.18, -10.96], rotation: [-0.12, 0.76, 0.10], scale: [1.86, 0.52, 1.12], color: '#4b6255' },
      { name: 'life-map-rift-bearing-mass', seed: 4.1, position: [5.48, 0.34, -10.66], rotation: [-0.16, -0.66, 0.26], scale: [2.24, 0.82, 1.28], color: '#42594e' },
      { name: 'life-map-rift-settled-shoulder', seed: 5.6, position: [3.80, 0.18, -11.00], rotation: [0.12, -0.68, -0.10], scale: [1.84, 0.50, 1.14], color: '#4d6458' },
      { name: 'apse-port-broken-crown', seed: 6.8, position: [-2.42, 0.54, -12.34], rotation: [0.20, 0.32, -0.32], scale: [2.20, 1.02, 1.36], color: '#364d42' },
      { name: 'apse-starboard-broken-crown', seed: 8.2, position: [2.28, 0.50, -12.46], rotation: [-0.18, -0.28, 0.30], scale: [2.12, 0.98, 1.38], color: '#3b5247' },
      { name: 'apse-port-lower-shelf', seed: 9.7, position: [-2.92, 0.22, -10.30], rotation: [0.06, 0.44, -0.10], scale: [1.96, 0.46, 1.16], color: '#4a6254' },
      { name: 'apse-starboard-lower-shelf', seed: 11.1, position: [2.78, 0.22, -10.42], rotation: [-0.04, -0.38, 0.08], scale: [1.92, 0.44, 1.16], color: '#4d6558' },
      { name: 'far-port-weathered-ridge', seed: 12.6, position: [-6.64, 1.18, -14.06], rotation: [0.06, 0.42, -0.12], scale: [4.86, 2.34, 1.82], color: '#31483d' },
      { name: 'far-starboard-weathered-ridge', seed: 14.0, position: [6.92, 1.24, -14.34], rotation: [-0.05, -0.48, 0.10], scale: [5.18, 2.48, 1.92], color: '#354c42' },
      { name: 'mid-port-canyon-shoulder', seed: 15.5, position: [-6.02, 0.70, -8.62], rotation: [-0.04, 0.72, -0.15], scale: [3.10, 1.56, 1.34], color: '#40594b' },
      { name: 'mid-starboard-canyon-shoulder', seed: 16.9, position: [6.28, 0.66, -8.98], rotation: [0.05, -0.66, 0.13], scale: [3.28, 1.50, 1.40], color: '#3e574a' },
    ]
    return placements.map((placement) => ({ ...placement, geometry: weatheredSanctuaryMassGeometry(placement.seed) }))
  }, [])

  return <group name="home-v149-weathered-rift-threshold-sanctuary" userData={{
    visualRepair: 'v154-faceted-broken-buttresses-no-rounded-boulder-gates',
    v155Refinement: 'lower-silhouette-masses-frame-negative-space',
    v156Refinement: 'settled-bearing-shelves-no-boulder-gate-silhouette',
    v157Refinement: 'low-eroded-shelves-replace-boulder-piles',
    v158Refinement: 'terrain-relief-shelves-sunk-into-ground-no-boulder-piles',
    v161Refinement: 'asymmetric-canyon-ridges-add-depth-without-gates-or-boulder-piles',
    v163Refinement: 'deep-overlapping-canyon-basin-landmarks-without-rings-facades-or-boulder-piles',
    v164Refinement: 'continuous-canyon-shelves-foreground-midground-horizon-no-gate-family',
    predecessorVisualRepair: 'v149-weathered-grounded-rift-masses-no-flat-facades',
    composition: 'layered-continuous-canyon-depth-with-recessed-lit-destination-cuts',
  }}>
    {masses.map((mass) => <mesh key={mass.name} name={`home-v149-${mass.name}`} geometry={mass.geometry} position={mass.position} rotation={mass.rotation} scale={mass.scale} castShadow receiveShadow>
      <meshPhysicalMaterial color={mass.color} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.40, 0.40)} roughnessMap={stone.arm} roughness={0.93} metalness={0.001} envMapIntensity={0.70} />
    </mesh>)}
    <group name="home-v149-open-apse-crown" userData={{ treatment: 'weathered-rift-masses-preserve-negative-space' }} />
    <group name="home-v149-recessed-service-light-coves" userData={{ treatment: 'signal-light-is-contained-inside-geological-scars' }} />
  </group>
}

function ApseAndOrbCradle() {
  const stone = useSanctuaryStone()
  const supportGeometry = useMemo(() => weatheredSanctuaryMassGeometry(13.4), [])

  return <group name="home-v126-layered-apse-orb-cradle" userData={{
    visualRepair: 'v154-broken-side-shelves-frame-orb-without-pedestal',
    v155Refinement: 'quiet-side-shelves-leave-air-around-memory-core',
    v156Refinement: 'settled-side-ledges-with-clear-orb-negative-space',
    v157Refinement: 'low-apse-ledges-anchor-orb-without-pedestal',
    v158Refinement: 'apse-ledges-sunk-into-terrain-clear-orb-air-gap',
    v163Refinement: 'raised-side-geology-frames-orb-without-under-orb-pedestal',
    v164Refinement: 'taller-lateral-apse-geology-frames-larger-orb-with-clear-air-gap',
    predecessorVisualRepair: 'v149-retired-detached-cradle-blades',
    loadPath: 'orb-memory-volume-rises-from-continuous-central-geology',
    retiredFreestandingSupports: true,
  }} position={[ORB.x, 0, ORB.z - 0.62]}>
    <mesh geometry={supportGeometry} position={[-2.18, 0.64, -0.92]} rotation={[0.20, 0.52, -0.28]} scale={[1.72, 0.58, 1.02]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#41584b" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.38, 0.38)} roughnessMap={stone.arm} roughness={0.94} metalness={0.001} envMapIntensity={0.68} />
    </mesh>
    <mesh geometry={supportGeometry} position={[2.04, 0.58, -1.02]} rotation={[-0.16, -0.46, 0.24]} scale={[1.60, 0.54, 0.98]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#3e5549" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.36, 0.36)} roughnessMap={stone.arm} roughness={0.94} metalness={0.001} envMapIntensity={0.66} />
    </mesh>
    <pointLight position={[-1.46, 1.02, 0.18]} color="#7fc0a1" intensity={0.20} distance={3.6} decay={2} />
    <pointLight position={[1.34, 0.98, 0.14]} color="#a194ce" intensity={0.18} distance={3.4} decay={2} />
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
      if (index < 84) {
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
  useFrame(({ clock }) => {
    if (path.current && !reducedMotion) (path.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.010 + Math.sin(clock.elapsedTime * 0.72) * 0.003
  })

  return <mesh ref={path} name="home-v131-passive-signal-arrival-path" geometry={geometry} receiveShadow visible={false}>
    <meshStandardMaterial color="#45554d" emissive="#527163" emissiveIntensity={0.010} roughness={0.97} transparent opacity={0.10} side={THREE.DoubleSide} />
  </mesh>
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
    for (let index = 0; index < 980; index += 1) {
      const verticalSample = ((((index * 613) % 977) / 976) * 2) - 1
      const shell = Math.sqrt(Math.max(0, 1 - verticalSample * verticalSample))
      const angle = index * 2.3999632297 + Math.sin(index * 0.31) * 0.11
      const radialSample = ((index * 431) % 983) / 982
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
      const x = positions.getX(index)
      const y = positions.getY(index)
      const z = positions.getZ(index)
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
    return {
      position: [Math.cos(angle) * radius, Math.sin(angle * 1.37) * 0.22, Math.sin(angle) * radius * 0.72] as Vec3,
      rotation: [angle * 0.10, angle * 0.18, angle * 0.14] as Vec3,
      scale: 0.026 + ((index * 3) % 5) * 0.003,
    }
  }), [])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.position.y = ORB.y + Math.sin(t * (state === 'speaking' ? 1.30 : 0.62)) * 0.032
    group.current.rotation.y = Math.sin(t * 0.14) * 0.035
  })

  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x, ORB.y, ORB.z]} scale={[1.42, 1.42, 1.42]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{
    v155Refinement: 'contained-memory-core-not-particle-fountain',
    v156Refinement: 'orb-kept-contained-while-sanctuary-composition-is-refined',
    v157Refinement: 'contained-memory-core-remains-primary-focal-presence',
    v158Refinement: 'orb-floats-over-continuous-terrain-without-rock-cradle-clutter',
    v160Refinement: 'compact-memory-cloud-no-vertical-plume-or-starburst',
    v161Refinement: 'compact-memory-cloud-preserved-unchanged',
    v163Refinement: 'orb-primary-focal-presence-framed-by-side-geology-not-pedestal',
    v164Refinement: 'larger-memory-core-primary-presence-no-aura-no-pedestal',
  }}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.72, 0.76, 0.68]}>
      <meshPhysicalMaterial color="#4d8a72" emissive={palette.accent} emissiveIntensity={0.16} roughness={0.54} metalness={0.004} transmission={0.05} thickness={0.24} transparent opacity={0.30} depthWrite={false} clearcoat={0.06} clearcoatRoughness={0.70} />
    </mesh>
    <primitive object={orb} visible={false} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[1.02, 1.04, 0.98]}>
      <pointsMaterial color={palette.core} size={palette.moteSize * 0.62} transparent opacity={0.48} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[1.14, 1.12, 1.08]}>
      <pointsMaterial color={palette.accent} size={palette.moteSize * 0.30} transparent opacity={0.13} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.32, 0.36, 0.30]}>
      <meshPhysicalMaterial color="#72b096" emissive={palette.accent} emissiveIntensity={0.32} roughness={0.40} metalness={0.004} clearcoat={0.10} clearcoatRoughness={0.58} />
    </mesh>
    {shards.map((shard, index) => <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={palette.core} emissive={palette.accent} emissiveIntensity={0.12} roughness={0.54} transparent opacity={0.48} />
    </mesh>)}
    <mesh name="home-v126-orb-generous-hit-target"><sphereGeometry args={[1.50, 16, 12]} /><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} /></mesh>
    <pointLight color={palette.core} intensity={palette.intensity * 0.84} distance={5.8} decay={2} />
    <pointLight position={[0.58, -0.12, 0.62]} color={palette.accent} intensity={palette.intensity * 0.28} distance={3.4} decay={2} />
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }} />
  </group>
}

function AtmosphericDepth({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 260; index += 1) {
      const angle = index * 2.3999632297
      const radius = 5.8 + ((index * 37) % 200) / 10
      const y = 0.55 + ((index * 29) % 96) / 10
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius - 9.2)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])
  const points = useRef<THREE.Points>(null)
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * 0.0016 })

  return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry} userData={{ v164Refinement: 'denser-spatial-depth-without-screen-overlay' }}>
    <pointsMaterial color="#d9e9df" size={0.030} transparent opacity={0.23} depthWrite={false} fog />
  </points>
}

export function HomeV76Sanctuary({ reducedMotion, orbState, onOrb, onGround, onLifeMap, onWalk }: Props) {
  return <group name="home-v126-ground-owned-open-sanctuary" userData={{
    activeArtRevision: 'v154-visible-canyon-fissures-memory-swarm-no-pedestal',
    visualIteration: 'v158-ground-scar-thresholds-hairline-path-sunken-geology',
    currentVisualRefinement: 'v164-finished-layered-canyon-memory-sanctuary-no-runway',
    predecessorVisualIteration: 'v157-canyon-path-thin-rifts-low-geology-contained-orb',
    predecessorArtRevision: 'v153-localized-fissures-asymmetric-orb-plume-no-pedestal',
    compatibilityMarkers: LEGACY_CONTRACT_MARKERS,
    legacySourceAssets: LEGACY_SOURCE_ASSETS,
    historicalV76ContractOnly: true,
  }}>
    <SculptedCanyonGround onWalk={onWalk} />
    <AuthoredSanctuaryEnvironment />
    <AuthoredThresholdEnvironment />
    <CanyonShelf side="port" />
    <CanyonShelf side="starboard" />
    <SanctuaryArchitecture />
    <SanctuaryTerraces />
    <GeologicalFrame />
    <FramedFissure side="ground" onActivate={onGround} />
    <FramedFissure side="life-map" onActivate={onLifeMap} />
    <ApseAndOrbCradle />
    <ArrivalSignalPath reducedMotion={reducedMotion} />
    <LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <AtmosphericDepth reducedMotion={reducedMotion} />
    <ambientLight intensity={0.92} color="#dcebe2" />
    <hemisphereLight args={['#dceee4', '#26352d', 1.26]} />
    <directionalLight position={[-4, 8, 5]} intensity={2.05} color="#f0d9b5" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.92} color="#8dbdad" />
    <spotLight position={[0, 7.8, -2.6]} target-position={[ORB.x, ORB.y, ORB.z]} angle={0.62} penumbra={0.90} intensity={1.68} color="#e2f5ec" distance={20} />
    <pointLight position={[0, 1.8, 2.8]} intensity={0.48} color="#edd7b4" distance={9} decay={2} />
    <group name="home-authored-terrain" userData={{ treatment: 'v154-visible-sculpted-ground-and-inlaid-approach', v157Refinement: 'narrow-meandering-inlay-not-road-slab', v158Refinement: 'hairline-stone-trace-no-road-slab', v160Refinement: 'lifted-ground-exposure-without-neon-or-flat-fill', v161Refinement: 'broken-buried-wayfinding-with-faint-single-signal-thread', v163Refinement: 'runway-remains-hidden-while-basin-geology-owns-orientation', v164Refinement: 'continuous-canyon-shelves-and-contrast-pbr-own-depth-no-runway' }} />
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v154-buried-fissure-canyon-sanctuary', construction: 'asymmetric-faceted-geology-local-signal-fissures-no-panels-no-facade-hoops-no-pedestal', v155Refinement: 'background-scans-embedded-rifts-contained-memory-core', v156Refinement: 'no-visible-scan-cards-hairline-rifts-settled-geology', v157Refinement: 'low-eroded-shelves-recessed-rifts-narrow-path', v158Refinement: 'ground-laid-rifts-sunken-relief-clear-orb-silhouette', v160Refinement: 'readable-depth-with-contained-orb-cloud', v161Refinement: 'deep-asymmetric-canyon-shoulders-terrain-flush-rifts', v163Refinement: 'deep-basin-ridges-localized-rift-light-and-apse-framed-orb', v164Refinement: 'foreground-midground-horizon-canyon-hierarchy-with-readable-terrain-cuts' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v155-background-edge-scans-not-camera-walls', v156Refinement: 'scan-provenance-beyond-primary-frustum', v157Refinement: 'off-axis-provenance-only', v158Refinement: 'off-axis-provenance-remains-secondary', v164Refinement: 'textured-edge-provenance-integrated-not-card-wall' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v155-contained-memory-core-and-recessed-rift-light', v156Refinement: 'subtle-navigation-scar-practicals', v157Refinement: 'quiet-rift-light-primary-orb-focus', v158Refinement: 'ground-scar-light-below-orb-focus', v160Refinement: 'compact-orb-light-no-starburst-plume', v161Refinement: 'subtle-ground-scar-light-with-orb-primary', v163Refinement: 'destination-basin-light-without-gate-facade', v164Refinement: 'readable-destination-cut-light-below-larger-orb-primary' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v126' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'v155-open-negative-space-between-low-broken-buttresses', v156Refinement: 'settled-horizon-masses-with-clear-central-air', v157Refinement: 'low-eroded-horizon-with-clear-orb-silhouette', v158Refinement: 'sunken-terrain-relief-with-open-central-air', v160Refinement: 'lifted-readable-horizon-depth', v161Refinement: 'asymmetric-weathered-ridges-frame-open-orb-air', v163Refinement: 'taller-overlapping-ridges-reduce-empty-sky-without-wall-or-ring', v164Refinement: 'continuous-sloped-ridges-fill-side-sky-while-preserving-central-orb-air' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v126' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
