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
].join(' ')

const LEGACY_SOURCE_ASSETS = [
  'modular_industrial_pipes_01/asset.gltf',
  'industrial_caged_sconce/asset.gltf',
  'rock_face_01_diff_1k.jpg',
].join(' ')

const ORB = new THREE.Vector3(-0.34, 1.62, -7.08)

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
        && !['horizon-mountain-3', 'horizon-mountain-10'].includes(object.name)
      if (object.name === 'orb-sanctuary-pedestal' || object.name.startsWith('mirror-basin') || rejectedFamily || rejectedHorizonRepeat) object.visible = false
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
  return <group name="home-v128-governed-landscape-sanctuary" position={[0.18, -0.34, -5.44]} scale={[1.12, 1.12, 1.12]}>
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
          next.roughness = Math.max(next.roughness, object.name.includes('veil') ? 0.42 : 0.84)
          next.metalness = Math.min(next.metalness, 0.07)
          next.envMapIntensity = 0.58
          if (!object.name.includes('veil')) next.color.multiplyScalar(0.52)
          next.emissiveIntensity = Math.min(next.emissiveIntensity, 0.34)
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
      texture.repeat.set(2.8, 3.4)
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.anisotropy = 4
      texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource, true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource, colorSource, normalSource])
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
    { name: 'home-v126-near-port-outcrop', url: ROCK_FACE_A, position: [-6.18, -0.34, 2.0], rotation: [0.04, 0.88, -0.08], span: 1.72, tint: '#35423a' },
    { name: 'home-v126-mid-port-outcrop', url: ROCK_FACE_B, position: [-6.08, -0.28, -3.1], rotation: [-0.02, 1.22, 0.05], span: 2.08, tint: '#404b41' },
    { name: 'home-v126-deep-port-outcrop', url: ROCK_FACE_A, position: [-5.98, -0.18, -8.8], rotation: [0.03, 0.42, -0.06], span: 2.24, tint: '#303d36' },
    { name: 'home-v126-near-starboard-outcrop', url: ROCK_FACE_B, position: [6.20, -0.36, 1.2], rotation: [-0.03, -0.80, 0.06], span: 1.66, tint: '#3b4a41' },
    { name: 'home-v126-mid-starboard-outcrop', url: ROCK_FACE_A, position: [6.06, -0.26, -4.0], rotation: [0.03, -1.16, -0.05], span: 2.10, tint: '#3b473e' },
    { name: 'home-v126-deep-starboard-outcrop', url: ROCK_FACE_B, position: [5.96, -0.18, -9.2], rotation: [-0.02, -0.38, 0.07], span: 2.34, tint: '#2f3c37' },
  ]
  return <group name="home-v126-bounded-geological-edge-masses" userData={{ retainedPlacements: placements.map((placement) => placement.name), visualRepair: 'v143-scans-bounded-off-camera-no-pasted-cutouts' }} />
}

function fissureGeometry(inner = false, mirrored = false) {
  const shape = new THREE.Shape()
  if (inner) {
    const x = mirrored ? -1 : 1
    shape.moveTo(-0.96 * x, 0)
    shape.bezierCurveTo(-1.00 * x, 0.62, -0.90 * x, 1.12, -0.82 * x, 1.48)
    shape.bezierCurveTo(-0.74 * x, 1.94, -0.58 * x, 2.48, -0.22 * x, 2.88)
    shape.bezierCurveTo(0.02 * x, 3.16, 0.30 * x, 3.08, 0.54 * x, 2.72)
    shape.bezierCurveTo(0.84 * x, 2.28, 0.94 * x, 1.72, 0.98 * x, 1.18)
    shape.bezierCurveTo(1.02 * x, 0.70, 0.98 * x, 0.30, 0.94 * x, 0)
    shape.closePath()
    return shape
  }

  const x = mirrored ? -1 : 1
  shape.moveTo(-1.22 * x, 0)
  shape.bezierCurveTo(-1.28 * x, 0.72, -1.14 * x, 1.46, -1.02 * x, 1.94)
  shape.bezierCurveTo(-0.90 * x, 2.54, -0.62 * x, 3.10, -0.26 * x, 3.48)
  shape.bezierCurveTo(0.04 * x, 3.78, 0.42 * x, 3.62, 0.72 * x, 3.14)
  shape.bezierCurveTo(1.02 * x, 2.66, 1.18 * x, 1.94, 1.22 * x, 1.28)
  shape.bezierCurveTo(1.26 * x, 0.70, 1.20 * x, 0.30, 1.16 * x, 0)
  shape.closePath()
  return shape
}

function FramedFissure({ side, onActivate }: { side: 'ground' | 'life-map'; onActivate: () => void }) {
  const stone = useSanctuaryStone()
  const isGround = side === 'ground'
  const x = isGround ? -3.48 : 2.76
  const color = isGround ? '#8dd9ad' : '#b7a3e3'
  const outer = useMemo(() => {
    const frame = fissureGeometry(false, !isGround)
    frame.holes.push(new THREE.Path(fissureGeometry(true, !isGround).getPoints(32).reverse()))
    return new THREE.ExtrudeGeometry(frame, { depth: 0.60, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.07, bevelSegments: 3, curveSegments: 12 })
  }, [isGround])
  const field = useMemo(() => new THREE.ShapeGeometry(fissureGeometry(true, !isGround), 18), [isGround])
  const seamMotes = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 120; index += 1) {
      const t = index / 119
      const y = 0.12 + t * 2.82
      const bend = Math.sin(t * Math.PI * 2.2 + (isGround ? 0.4 : 1.2)) * 0.20
      const width = 0.10 + Math.sin(t * Math.PI) * 0.42
      const sideOffset = ((index * 17) % 29) / 28 - 0.5
      positions.push(bend + sideOffset * width, y, (((index * 29) % 23) / 22 - 0.5) * 0.42)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{ visualRepair: 'v151-asymmetric-buried-signal-fissures-no-facade-hoops', retainedOuter: outer.uuid, retainedField: field.uuid, retainedMotes: seamMotes.uuid }} position={[x, isGround ? 0.04 : 0.28, isGround ? -8.18 : -8.58]} rotation={[0, isGround ? 0.21 : -0.26, isGround ? -0.10 : 0.14]} scale={isGround ? [0.60, 0.66, 0.42] : [0.48, 0.70, 0.38]}>
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow visible={false}>
      <meshStandardMaterial color={isGround ? '#263a31' : '#2d3433'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.24, 0.24)} roughnessMap={stone.arm} roughness={0.98} metalness={0.002} />
    </mesh>
    <group name={`home-v149-${side}-weathered-rift-shell`} userData={{ structuralOwner: 'open-buttress-sanctuary-wing', retiredFreestandingFrame: true }} />
    <mesh name={`home-v149-${side}-recessed-threshold-field`} geometry={field} position={[0, 0, 0.18]}>
      <meshStandardMaterial color={isGround ? '#0b1612' : '#15131f'} emissive={color} emissiveIntensity={0.12} roughness={0.98} transparent opacity={0.31} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} position={[0, 0, 0.36]}>
      <pointsMaterial color={color} size={0.026} transparent opacity={0.34} depthWrite={false} sizeAttenuation />
    </points>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0, 1.48, 0.12]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[2.75, 3.3, 1.1]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <group name={`home-v126-${side}-port-shoulder`} />
    <group name={`home-v126-${side}-starboard-shoulder`} />
    <pointLight position={[0, 1.64, 0.85]} color={color} intensity={0.30} distance={3.8} decay={2} />
  </group>
}

function weatheredSanctuaryMassGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 36, 24)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const weathering = 1
      + Math.sin(x * (3.7 + seed * 0.11) + y * 2.9 + seed) * 0.075
      + Math.cos(z * 4.3 - y * (2.1 + seed * 0.07)) * 0.055
      + Math.sin((x - z) * 6.1 + seed * 1.7) * 0.028
    const settled = 1 - Math.max(0, -y) * 0.055
    positions.setXYZ(
      index,
      x * weathering * (1 + Math.sin(y * 3.2 + seed) * 0.045),
      y * weathering * settled,
      z * weathering * (0.94 + Math.cos(x * 3.6 + seed) * 0.035),
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
      { name: 'ground-rift-bearing-mass', seed: 1.3, position: [-3.46, 0.78, -8.82], rotation: [0.08, 0.34, -0.22], scale: [1.10, 1.28, 0.62], color: '#23352d' },
      { name: 'ground-rift-settled-shoulder', seed: 2.7, position: [-4.42, 0.24, -8.66], rotation: [-0.14, 0.62, 0.10], scale: [0.76, 0.42, 0.68], color: '#2b3b32' },
      { name: 'life-map-rift-bearing-mass', seed: 4.1, position: [3.14, 0.74, -8.90], rotation: [-0.08, -0.28, 0.17], scale: [1.02, 1.18, 0.58], color: '#283630' },
      { name: 'life-map-rift-settled-shoulder', seed: 5.6, position: [4.02, 0.20, -8.70], rotation: [0.12, -0.52, -0.10], scale: [0.72, 0.38, 0.64], color: '#2e3d35' },
    ]
    return placements.map((placement) => ({
      ...placement,
      geometry: weatheredSanctuaryMassGeometry(placement.seed),
    }))
  }, [])

  return <group
    name="home-v149-weathered-rift-threshold-sanctuary"
    userData={{
      visualRepair: 'v149-weathered-grounded-rift-masses-no-flat-facades',
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
        normalScale={new THREE.Vector2(0.34, 0.34)}
        roughnessMap={stone.arm}
        roughness={0.98}
        metalness={0.002}
        envMapIntensity={0.22}
      />
    </mesh>)}
    <group name="home-v149-open-apse-crown" userData={{ treatment: 'weathered-rift-masses-preserve-negative-space' }} />
    <group name="home-v149-recessed-service-light-coves" userData={{ treatment: 'signal-light-is-contained-inside-geological-scars' }} />
  </group>
}

function ApseAndOrbCradle() {
  return <group
    name="home-v126-layered-apse-orb-cradle"
    userData={{
      visualRepair: 'v149-retired-detached-cradle-blades',
      loadPath: 'orb-memory-volume-rises-from-continuous-central-geology',
      retiredFreestandingSupports: true,
    }}
    position={[ORB.x, 0, ORB.z - 0.34]}
  />
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
    <meshStandardMaterial color="#43594f" emissive="#5e806f" emissiveIntensity={0.10} roughness={0.88} transparent opacity={0.34} side={THREE.DoubleSide} />
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
    for (let index = 0; index < 760; index += 1) {
      const t = index / 759
      const y = -0.72 + t * 1.44
      const envelope = Math.sqrt(Math.max(0, 1 - Math.pow(y / 0.78, 2)))
      const angle = index * 2.3999632297 + Math.sin(index * 0.37) * 0.16
      const radialSample = ((index * 173) % 761) / 760
      const fill = index % 4 === 0
        ? Math.pow(radialSample, 2.35) * 0.38
        : Math.pow(radialSample, 1.48)
      const radius = envelope * fill * 0.86
      const drift = y * 0.08 + Math.sin(y * 3.4) * 0.05
      positions.push(Math.cos(angle) * radius + drift, y, Math.sin(angle) * radius * 0.70)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  const memoryVolume = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(0.82, 4)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const z = positions.getZ(index)
      const latitude = y / 0.82
      const shoulder = 0.90 + Math.sin(latitude * Math.PI * 1.35) * 0.10 + Math.cos((x + z) * 4.2) * 0.045
      const taper = 0.94 - latitude * 0.10
      positions.setXYZ(index, x * shoulder * taper * 1.02, y * 0.92 + 0.075 * Math.sin(x * 4.2) - 0.04, z * shoulder * (0.84 + 0.055 * latitude))
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
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow visible={false}>
      <meshPhysicalMaterial color="#28483d" emissive={palette.accent} emissiveIntensity={0.08} roughness={0.78} metalness={0.01} transmission={0.18} thickness={0.42} transparent opacity={0.07} depthWrite={false} clearcoat={0.01} clearcoatRoughness={0.82} />
    </mesh>
    <primitive object={orb} visible={false} />
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[1.04, 0.86, 0.90]}>
      <pointsMaterial color={palette.core} size={palette.moteSize * 0.78} transparent opacity={0.62} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.22, 0.26, 0.22]}>
      <meshStandardMaterial color="#284b3e" emissive={palette.accent} emissiveIntensity={0.22} roughness={0.82} flatShading />
    </mesh>
    <mesh name="home-v126-orb-generous-hit-target">
      <sphereGeometry args={[1.38, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
    <pointLight color={palette.core} intensity={palette.intensity * 1.52} distance={5.4} decay={2} />
    <pointLight position={[0.72, -0.18, 0.74]} color={palette.accent} intensity={palette.intensity * 0.58} distance={3.2} decay={2} />
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
      activeArtRevision: 'v151-asymmetric-buried-fissures-low-orb-memory-cloud',
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
    <ambientLight intensity={0.46} color="#d5e2db" />
    <hemisphereLight args={['#c6ddd0', '#202a24', 0.76]} />
    <directionalLight position={[-4, 8, 5]} intensity={1.34} color="#e5cea5" castShadow />
    <directionalLight position={[5, 5, -7]} intensity={0.36} color="#7da398" />
    <spotLight position={[0, 7.2, -3.4]} target-position={[ORB.x, ORB.y, ORB.z]} angle={0.62} penumbra={0.72} intensity={1.36} color="#c8e6d7" distance={18} />
    <group name="home-authored-terrain" userData={{ treatment: 'v126-continuous-sculpted-ground-and-terraces' }} />
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v151-asymmetric-buried-fissure-sanctuary', construction: 'overlapping-weathered-geology-buried-signal-fissures-no-facade-hoops-no-detached-cradle' }} />
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v126-bounded-lower-edge-geology-only' }} />
    <group name="home-v49-authored-practicals" userData={{ treatment: 'v149-grounded-apse-orb-and-recessed-rift-light' }} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v126' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'v149-open-negative-space-between-weathered-threshold-masses' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'reserved-beyond-clear-navigation-channel-v126' }} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
