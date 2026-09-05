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
  dormant: { core: '#82998f', accent: '#4b6258', intensity: 0.58, moteSize: 0.032 },
  idle: { core: '#c9f5e3', accent: '#70b69b', intensity: 1.08, moteSize: 0.041 },
  attention: { core: '#ffe6ae', accent: '#d2a45c', intensity: 1.42, moteSize: 0.050 },
  listening: { core: '#b3f6fb', accent: '#63c0c7', intensity: 1.50, moteSize: 0.048 },
  thinking: { core: '#e0c9f5', accent: '#8776b0', intensity: 1.32, moteSize: 0.045 },
  speaking: { core: '#e5fff5', accent: '#72d2af', intensity: 1.82, moteSize: 0.055 },
  guiding: { core: '#f6efb8', accent: '#b0b66c', intensity: 1.46, moteSize: 0.048 },
  reflecting: { core: '#d8dcff', accent: '#7d85ba', intensity: 1.12, moteSize: 0.042 },
  calming: { core: '#c9eee4', accent: '#6da092', intensity: 0.98, moteSize: 0.038 },
  privacy: { core: '#c5d2df', accent: '#6a7b8b', intensity: 0.84, moteSize: 0.034 },
  warning: { core: '#ffc39a', accent: '#bd6650', intensity: 1.62, moteSize: 0.054 },
  transition: { core: '#ffedc9', accent: '#c6a374', intensity: 1.46, moteSize: 0.049 },
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
        next.metalness = Math.min(next.metalness, 0.04)
        next.envMapIntensity = 0.42
        if (tint) next.color.lerp(new THREE.Color(tint), 0.42)
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
          next.roughness = Math.max(next.roughness, 0.78)
          next.metalness = Math.min(next.metalness, 0.04)
          next.envMapIntensity = 0.50
          if (!object.name.includes('water')) next.color.lerp(new THREE.Color('#59675f'), 0.24)
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
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((material) => {
        const next = material.clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.roughness = Math.max(next.roughness, object.name.includes('veil') ? 0.46 : 0.86)
          next.metalness = Math.min(next.metalness, 0.05)
          next.envMapIntensity = 0.62
          if (!object.name.includes('veil')) next.color.multiplyScalar(0.62)
          next.emissiveIntensity = Math.min(next.emissiveIntensity, 0.28)
        }
        return next
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return root
  }, [source])

  return <group name="home-v133-authored-recessed-thresholds" position={[0, -0.18, -0.62]} scale={[0.90, 0.90, 0.90]}>
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
      texture.repeat.set(3.8, 4.6)
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
    const xSegments = 72
    const zSegments = 104
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shadow = new THREE.Color('#66736a')
    const moss = new THREE.Color('#a0ada2')

    for (let zi = 0; zi <= zSegments; zi += 1) {
      const tz = zi / zSegments
      const z = 6.55 - tz * 20.15
      for (let xi = 0; xi <= xSegments; xi += 1) {
        const tx = xi / xSegments
        const x = -7.20 + tx * 14.40
        const lateral = Math.abs(x) / 7.20
        const walkingChannel = Math.exp(-Math.pow(x / 2.65, 4))
        const shelf = Math.pow(lateral, 2.05) * (0.92 + Math.sin(z * 0.31 + x * 0.17) * 0.34)
        const fracture = (
          Math.sin(x * 1.22 + z * 0.54) * 0.15
          + Math.cos(x * 0.53 - z * 1.04) * 0.10
          + Math.sin((x + z) * 0.34) * 0.08
        ) * (0.30 + lateral * 0.96)
        const pathRelief = walkingChannel * (Math.sin(z * 0.38) * 0.032 + Math.cos(z * 0.19) * 0.028)
        const descent = tz * 0.44
        const y = -0.24 + descent + shelf + fracture * (1 - walkingChannel * 0.88) + pathRelief
        positions.push(x, y, z)
        const shade = THREE.MathUtils.clamp(0.38 + y * 0.14 + (1 - tz) * 0.10 - lateral * 0.05, 0, 1)
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

  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} position={[0, 0.035, 0]} receiveShadow onClick={onWalk}>
    <meshPhysicalMaterial
      color="#87928a"
      map={stone.color}
      normalMap={stone.normal}
      normalScale={new THREE.Vector2(0.30, 0.30)}
      roughnessMap={stone.arm}
      roughness={0.96}
      metalness={0.002}
      envMapIntensity={0.48}
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
    for (let index = 0; index <= stations; index += 1) {
      const t = index / stations
      const z = 5.85 - t * 16.10
      const center = Math.sin(t * Math.PI * 1.55) * 0.42 + Math.sin(t * Math.PI * 4.0) * 0.10 - t * 0.08
      const half = 0.032 - t * 0.010
      const y = -0.125 + t * 0.39 + Math.sin(z * 0.38) * 0.024
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
      predecessorVisualRepair: 'v129-governed-terrain-owns-visible-ground',
    }}
  >
    <mesh name="home-v154-inlaid-stone-approach" geometry={ribbon} receiveShadow>
      <meshPhysicalMaterial
        color="#77827a"
        map={stone.color}
        normalMap={stone.normal}
        normalScale={new THREE.Vector2(0.12, 0.12)}
        roughnessMap={stone.arm}
        roughness={0.96}
        metalness={0.002}
        envMapIntensity={0.38}
        emissive="#344b41"
        emissiveIntensity={0.012}
        side={THREE.DoubleSide}
      />
    </mesh>
  </group>
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    { name: 'home-v126-near-port-outcrop', url: ROCK_FACE_A, position: [-9.65, -1.20, -4.2], rotation: [0.03, 1.12, -0.12], scale: [0.42, 0.58, 0.50], span: 1.55, tint: '#3d4b43' },
    { name: 'home-v126-mid-port-outcrop', url: ROCK_FACE_B, position: [-9.25, -0.82, -9.2], rotation: [-0.05, 1.30, 0.08], scale: [0.48, 0.68, 0.56], span: 1.75, tint: '#39473f' },
    { name: 'home-v126-deep-port-outcrop', url: ROCK_FACE_A, position: [-8.40, -0.52, -14.8], rotation: [0.04, 0.70, -0.08], scale: [0.56, 0.72, 0.60], span: 1.85, tint: '#354139' },
    { name: 'home-v126-near-starboard-outcrop', url: ROCK_FACE_B, position: [9.62, -1.20, -4.5], rotation: [-0.03, -1.10, 0.10], scale: [0.42, 0.58, 0.50], span: 1.54, tint: '#3e4c44' },
    { name: 'home-v126-mid-starboard-outcrop', url: ROCK_FACE_A, position: [9.22, -0.82, -9.4], rotation: [0.04, -1.30, -0.07], scale: [0.48, 0.68, 0.56], span: 1.76, tint: '#3a4840' },
    { name: 'home-v126-deep-starboard-outcrop', url: ROCK_FACE_B, position: [8.38, -0.54, -14.9], rotation: [-0.04, -0.68, 0.08], scale: [0.56, 0.72, 0.60], span: 1.86, tint: '#35423a' },
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
      predecessorVisualRepair: 'v143-scans-bounded-off-camera-no-pasted-cutouts',
    }}
  >
    {placements.map((placement) => <ProductionAsset key={placement.name} {...placement} roughness={0.98} />)}
  </group>
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
  const x = isGround ? -5.08 : 5.08
  const color = isGround ? '#6eae92' : '#8d83ad'
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
      predecessorVisualRepair: 'v153-localized-signal-fissures-no-facade-hoops-or-translucent-panels',
      retainedOuter: outer.uuid,
      retainedField: field.uuid,
      retainedMotes: seamMotes.uuid,
    }}
    position={[x, isGround ? 0.15 : 0.17, isGround ? -10.92 : -10.98]}
    rotation={[-1.02, isGround ? 0.16 : -0.16, isGround ? -0.12 : 0.12]}
    scale={isGround ? [0.24, 0.44, 0.28] : [0.23, 0.46, 0.28]}
  >
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={isGround ? '#44554c' : '#494b57'}
        map={stone.color}
        normalMap={stone.normal}
        normalScale={new THREE.Vector2(0.24, 0.24)}
        roughnessMap={stone.arm}
        roughness={0.99}
        metalness={0.001}
        envMapIntensity={0.26}
      />
    </mesh>
    <group name={`home-v149-${side}-weathered-rift-shell`} userData={{ structuralOwner: 'open-buttress-sanctuary-wing', retiredFreestandingFrame: true }} />
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0, 0, 0.025]}>
      <meshBasicMaterial color={isGround ? '#020604' : '#040407'} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} position={[0, 0, 0.10]}>
      <pointsMaterial color={color} size={0.009} transparent opacity={0.28} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0, 1.08, 0.08]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[4.20, 4.20, 2.80]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <group name={`home-v126-${side}-port-shoulder`} />
    <group name={`home-v126-${side}-starboard-shoulder`} />
    <pointLight position={[0, 1.10, 0.36]} color={color} intensity={0.055} distance={1.8} decay={2} />
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
    positions.setXYZ(
      index,
      x * weathering * (1 + Math.sin(y * 3.8 + seed) * 0.07),
      y * weathering * settled,
      z * weathering * (0.90 + Math.cos(x * 4.2 + seed) * 0.06),
    )
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function SanctuaryArchitecture() {
  const stone = useSanctuaryStone()
  const masses = useMemo(() => {
    const placements: readonly {
      name: string
      seed: number
      position: Vec3
      rotation: Vec3
      scale: Vec3
      color: string
    }[] = [
      { name: 'ground-rift-bearing-mass', seed: 1.3, position: [-5.44, 0.08, -11.24], rotation: [0.10, 0.64, -0.28], scale: [1.08, 0.18, 0.78], color: '#415148' },
      { name: 'ground-rift-settled-shoulder', seed: 2.7, position: [-4.08, 0.02, -11.50], rotation: [-0.12, 0.76, 0.10], scale: [1.18, 0.12, 0.86], color: '#4b5b51' },
      { name: 'life-map-rift-bearing-mass', seed: 4.1, position: [5.46, 0.08, -11.32], rotation: [-0.16, -0.66, 0.26], scale: [1.06, 0.18, 0.76], color: '#45534c' },
      { name: 'life-map-rift-settled-shoulder', seed: 5.6, position: [4.06, 0.02, -11.54], rotation: [0.12, -0.68, -0.10], scale: [1.16, 0.12, 0.86], color: '#4e5d55' },
      { name: 'apse-port-broken-crown', seed: 6.8, position: [-2.10, 0.04, -12.10], rotation: [0.20, 0.32, -0.32], scale: [1.02, 0.12, 0.74], color: '#405047' },
      { name: 'apse-starboard-broken-crown', seed: 8.2, position: [1.90, 0.04, -12.16], rotation: [-0.18, -0.28, 0.30], scale: [0.98, 0.12, 0.74], color: '#45544c' },
      { name: 'apse-port-lower-shelf', seed: 9.7, position: [-2.58, 0.02, -10.54], rotation: [0.06, 0.44, -0.10], scale: [1.20, 0.10, 0.82], color: '#4b5a51' },
      { name: 'apse-starboard-lower-shelf', seed: 11.1, position: [2.44, 0.02, -10.62], rotation: [-0.04, -0.38, 0.08], scale: [1.18, 0.10, 0.82], color: '#4e5d54' },
    ]
    return placements.map((placement) => ({ ...placement, geometry: weatheredSanctuaryMassGeometry(placement.seed) }))
  }, [])

  return <group
    name="home-v149-weathered-rift-threshold-sanctuary"
    userData={{
      visualRepair: 'v154-faceted-broken-buttresses-no-rounded-boulder-gates',
      v155Refinement: 'lower-silhouette-masses-frame-negative-space',
      v156Refinement: 'settled-bearing-shelves-no-boulder-gate-silhouette',
      v157Refinement: 'low-eroded-shelves-replace-boulder-piles',
      v158Refinement: 'terrain-relief-shelves-sunk-into-ground-no-boulder-piles',
      predecessorVisualRepair: 'v149-weathered-grounded-rift-masses-no-flat-facades',
      composition: 'asymmetric-overlapping-geology-with-recessed-navigation-scars',
    }}
  >
    {masses.map((mass) => <mesh
      key={mass.name}
      name={`home-v149-${mass.name}`}
      geometry={mass.geometry}
      position={mass.position}
      rotation={mass.rotation}
      scale={mass.scale}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={mass.color}
        map={stone.color}
        normalMap={stone.normal}
        normalScale={new THREE.Vector2(0.28, 0.28)}
        roughnessMap={stone.arm}
        roughness={0.99}
        metalness={0.001}
        envMapIntensity={0.30}
      />
    </mesh>)}
    <group name="home-v149-open-apse-crown" userData={{ treatment: 'weathered-rift-masses-preserve-negative-space' }} />
    <group name="home-v149-recessed-service-light-coves" userData={{ treatment: 'signal-light-is-contained-inside-geological-scars' }} />
  </group>
}

function ApseAndOrbCradle() {
  const stone = useSanctuaryStone()
  const supportGeometry = useMemo(() => weatheredSanctuaryMassGeometry(13.4), [])

  return <group
    name="home-v126-layered-apse-orb-cradle"
    userData={{
      visualRepair: 'v154-broken-side-shelves-frame-orb-without-pedestal',
      v155Refinement: 'quiet-side-shelves-leave-air-around-memory-core',
      v156Refinement: 'settled-side-ledges-with-clear-orb-negative-space',
      v157Refinement: 'low-apse-ledges-anchor-orb-without-pedestal',
      v158Refinement: 'apse-ledges-sunk-into-terrain-clear-orb-air-gap',
      predecessorVisualRepair: 'v149-retired-detached-cradle-blades',
      loadPath: 'orb-memory-volume-rises-from-continuous-central-geology',
      retiredFreestandingSupports: true,
    }}
    position={[ORB.x, 0, ORB.z - 0.62]}
  >
    <mesh geometry={supportGeometry} position={[-1.80, 0.12, -0.84]} rotation={[0.20, 0.52, -0.28]} scale={[0.92, 0.08, 0.58]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#46564c" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.24, 0.24)} roughnessMap={stone.arm} roughness={0.99} metalness={0.001} envMapIntensity={0.30} />
    </mesh>
    <mesh geometry={supportGeometry} position={[1.64, 0.10, -0.94]} rotation={[-0.16, -0.46, 0.24]} scale={[0.88, 0.08, 0.56]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#435249" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.22, 0.22)} roughnessMap={stone.arm} roughness={0.99} metalness={0.001} envMapIntensity={0.28} />
    </mesh>
    <pointLight position={[-1.26, 0.74, 0.12]} color="#77a993" intensity={0.075} distance={2.0} decay={2} />
    <pointLight position={[1.14, 0.72, 0.10]} color="#9187b8" intensity={0.055} distance={1.9} decay={2} />
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
      const half = 0.008 + t * 0.004
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
    if (path.current && !reducedMotion) {
      (path.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.045 + Math.sin(clock.elapsedTime * 0.72) * 0.008
    }
  })

  return <mesh ref={path} name="home-v131-passive-signal-arrival-path" geometry={geometry} receiveShadow>
    <meshStandardMaterial color="#53665d" emissive="#5f8875" emissiveIntensity={0.042} roughness={0.94} transparent opacity={0.28} side={THREE.DoubleSide} />
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
      const t = index / 979
      const y = -0.72 + t * 1.44
      const angle = index * 2.3999632297 + Math.sin(index * 0.31) * 0.16
      const radialSample = ((index * 431) % 983) / 982
      const waist = 0.68 + Math.sin(t * Math.PI) * 0.26
      const radius = (0.04 + Math.pow(radialSample, 1.86) * 0.46) * waist
      const drift = Math.sin(y * 3.0) * 0.07 + Math.sin(t * Math.PI * 3.0) * 0.026
      const depthPulse = 0.88 + Math.cos(t * Math.PI * 2.0) * 0.06
      positions.push(
        Math.cos(angle) * radius * 0.78 + drift,
        y,
        Math.sin(angle) * radius * 0.64 * depthPulse,
      )
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

  const shards = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const t = index / 5
      const angle = index * 2.3999632297
      const radius = 0.14 + ((index * 7) % 5) / 34
      return {
        position: [Math.cos(angle) * radius, -0.42 + t * 0.84, Math.sin(angle) * radius * 0.66] as Vec3,
        rotation: [angle * 0.10, angle * 0.18, angle * 0.14] as Vec3,
        scale: 0.040 + ((index * 3) % 5) * 0.005,
      }
    })
  }, [])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.position.y = ORB.y + Math.sin(t * (state === 'speaking' ? 1.30 : 0.62)) * 0.032
    group.current.rotation.y = Math.sin(t * 0.14) * 0.035
  })

  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x, ORB.y, ORB.z]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{ v155Refinement: 'contained-memory-core-not-particle-fountain', v156Refinement: 'orb-kept-contained-while-sanctuary-composition-is-refined', v157Refinement: 'contained-memory-core-remains-primary-focal-presence', v158Refinement: 'orb-floats-over-continuous-terrain-without-rock-cradle-clutter' }}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.66, 0.78, 0.62]}>
      <meshPhysicalMaterial color="#477563" emissive={palette.accent} emissiveIntensity={0.12} roughness={0.62} metalness={0.005} transmission={0.06} thickness={0.22} transparent opacity={0.10} depthWrite={false} clearcoat={0.04} clearcoatRoughness={0.78} />
    </mesh>
    <primitive object={orb} visible={false} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[0.86, 0.92, 0.82]}>
      <pointsMaterial color={palette.core} size={palette.moteSize * 0.58} transparent opacity={0.48} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[1.00, 0.98, 0.94]}>
      <pointsMaterial color={palette.accent} size={palette.moteSize * 0.30} transparent opacity={0.11} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.28, 0.36, 0.26]}>
      <meshPhysicalMaterial color="#669984" emissive={palette.accent} emissiveIntensity={0.34} roughness={0.44} metalness={0.005} clearcoat={0.08} clearcoatRoughness={0.62} />
    </mesh>
    {shards.map((shard, index) => <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={palette.core} emissive={palette.accent} emissiveIntensity={0.12} roughness={0.58} transparent opacity={0.58} />
    </mesh>)}
    <mesh name="home-v126-orb-generous-hit-target">
      <sphereGeometry args={[1.50, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <pointLight color={palette.core} intensity={palette.intensity * 0.82} distance={4.8} decay={2} />
    <pointLight position={[0.58, -0.12, 0.62]} color={palette.accent} intensity={palette.intensity * 0.24} distance={2.8} decay={2} />
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }} />
  </group>
}

function AtmosphericDepth({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 180; index += 1) {
      const angle = index * 2.3999632297
      const radius = 6.4 + ((index * 37) % 180) / 10
      const y = 0.80 + ((index * 29) % 82) / 11
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius - 9.6)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])
  const points = useRef<THREE.Points>(null)
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * 0.002 })

  return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry}>
    <pointsMaterial color="#c8d8cf" size={0.022} transparent opacity={0.14} depthWrite={false} fog />
  </points>
}

export function HomeV76Sanctuary({ reducedMotion, orbState, onOrb, onGround, onLifeMap, onWalk }: Props) {
  return <group
    name="home-v126-ground-owned-open-sanctuary"
    userData={{
      activeArtRevision: 'v154-visible-canyon-fissures-memory-swarm-no-pedestal',
      visualIteration: 'v158-ground-scar-thresholds-hairline-path-sunken-geology',
      predecessorVisualIteration: 'v157-canyon-path-thin-rifts-low-geology-contained-orb',
      predecessorArtRevision: 'v153-localized-fissures-asymmetric-orb-plume-no-pedestal',
      compatibilityMarkers: LEGACY_CONTRACT_MARKERS,
      legacySourceAssets: LEGACY_SOURCE_ASSETS,
      historicalV76ContractOnly: true,
    }}
  >
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
    <ambientLight intensity={0.58} color="#d5e0da" />
    <hemisphereLight args={['#d5e2da', '#28332b', 0.84]} />
    <directionalLight position={[-4, 8, 5]} intensity={1.35} color="#e6d2af" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.42} color="#88ada1" />
    <spotLight position={[0, 7.4, -3.2]} target-position={[ORB.x, ORB.y, ORB.z]} angle={0.58} penumbra={0.86} intensity={1.16} color="#d6ece1" distance={18} />
    <pointLight position={[0, 1.8, 2.8]} intensity={0.24} color="#e0ccac" distance={8} decay={2} />
    <group name="home-authored-terrain" userData={{ treatment: 'v154-visible-sculpted-ground-and-inlaid-approach', v157Refinement: 'narrow-meandering-inlay-not-road-slab', v158Refinement: 'hairline-stone-trace-no-road-slab' }} />
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v154-buried-fissure-canyon-sanctuary', construction: 'asymmetric-faceted-geology-local-signal-fissures-no-panels-no-facade-hoops-no-pedestal', v155Refinement: 'background-scans-embedded-rifts-contained-memory-core', v156Refinement: 'no-visible-scan-cards-hairline-rifts-settled-geology', v157Refinement: 'low-eroded-shelves-recessed-rifts-narrow-path', v158Refinement: 'ground-laid-rifts-sunken-relief-clear-orb-silhouette' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v155-background-edge-scans-not-camera-walls', v156Refinement: 'scan-provenance-beyond-primary-frustum', v157Refinement: 'off-axis-provenance-only', v158Refinement: 'off-axis-provenance-remains-secondary' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v155-contained-memory-core-and-recessed-rift-light', v156Refinement: 'subtle-navigation-scar-practicals', v157Refinement: 'quiet-rift-light-primary-orb-focus', v158Refinement: 'ground-scar-light-below-orb-focus' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v126' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'v155-open-negative-space-between-low-broken-buttresses', v156Refinement: 'settled-horizon-masses-with-clear-central-air', v157Refinement: 'low-eroded-horizon-with-clear-orb-silhouette', v158Refinement: 'sunken-terrain-relief-with-open-central-air' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v126' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])