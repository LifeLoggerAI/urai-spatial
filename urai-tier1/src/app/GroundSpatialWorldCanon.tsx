'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'
import {
  clearVirtualMovement,
  setVirtualMovement,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
  type MovementObstacle,
} from '@/spatial/navigation/EmbodiedNavigation'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  GROUND_PLAYABLE_BOUNDS,
  GROUND_UNWIND_EVENT,
  HOME_GROUND_BOUNDS,
  HOME_GROUND_TIMING,
  groundWasEnteredFromHome,
  readGroundEntryCheckpoint,
  requestGroundUnwind,
  type GroundUnwindReason,
} from '@/spatial/world/homeGroundContract'
import { height as homeHeight } from '@/spatial/layout/HomeWorldProductionV223Geometry'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'
import { requestHapticCue } from '@/spatial/haptics/HapticRuntime'
import {
  resolveOrbSensoryOutput,
  URAI_ORB_STATE_EVENT,
  type OrbState,
  type OrbStateEventDetail,
} from '@/app/home/orbStateController'

const EYE_HEIGHT = 1.70
const TERRAIN_ALBEDO = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const TERRAIN_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const TERRAIN_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const ROCK_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf'

const WALK_SPEED = 1.85
const WALK_ACCELERATION = 6.5
const WALK_DECELERATION = 8.5
const MAX_STEP_HEIGHT = .28
const MAX_WALK_SLOPE_DEGREES = 42
const SLOPE_SAMPLE = .18
const PLAYER_RADIUS = .28

const PRIMARY_LANDMARKS = [
  { id: 'western-weathered-shelf', label: 'western weathered shelf', x: -12.4, z: -24.5, radius: 2.4, variant: '01' as const, scale: [5.4, 3.0, 6.2] as [number, number, number] },
  { id: 'eastern-fracture-mass', label: 'eastern fracture mass', x: 13.2, z: -29.0, radius: 2.8, variant: '02' as const, scale: [6.0, 4.0, 6.6] as [number, number, number] },
  { id: 'deep-saddle-stone', label: 'deep saddle stone', x: 3.4, z: -39.0, radius: 2.0, variant: '01' as const, scale: [4.2, 2.2, 4.7] as [number, number, number] },
] as const

const SECONDARY_PLACES = [
  { id: 'lichen-shelf', label: 'lichen shelf', x: -7.2, z: -10.4, radius: 1.25 },
  { id: 'quiet-runoff', label: 'quiet runoff channel', x: 6.4, z: -14.2, radius: 1.05 },
  { id: 'moss-hollow', label: 'moss hollow', x: -9.6, z: -31.0, radius: 1.2 },
  { id: 'mineral-overlook', label: 'mineral overlook', x: 9.0, z: -36.2, radius: 1.2 },
] as const

const BOUNDARY_GEOLOGY = [
  { id: 'west-near', x: -26.0, z: 8.0, radius: 3.0, variant: '01' as const, rotation: .18, scale: [5.5, 4.2, 6.0] as [number, number, number] },
  { id: 'west-mid-a', x: -26.8, z: -7.0, radius: 3.4, variant: '02' as const, rotation: .52, scale: [6.8, 5.1, 7.0] as [number, number, number] },
  { id: 'west-mid-b', x: -26.2, z: -23.0, radius: 3.2, variant: '01' as const, rotation: 1.02, scale: [6.1, 4.8, 6.6] as [number, number, number] },
  { id: 'west-deep', x: -24.8, z: -41.0, radius: 3.8, variant: '02' as const, rotation: .74, scale: [7.5, 6.0, 8.0] as [number, number, number] },
  { id: 'east-near', x: 26.3, z: 7.0, radius: 3.0, variant: '02' as const, rotation: -.28, scale: [5.4, 4.4, 5.8] as [number, number, number] },
  { id: 'east-mid-a', x: 26.7, z: -8.0, radius: 3.5, variant: '01' as const, rotation: -.64, scale: [6.7, 5.5, 7.1] as [number, number, number] },
  { id: 'east-mid-b', x: 26.0, z: -25.0, radius: 3.3, variant: '02' as const, rotation: -1.10, scale: [6.2, 5.0, 6.7] as [number, number, number] },
  { id: 'east-deep', x: 24.6, z: -42.0, radius: 3.8, variant: '01' as const, rotation: -.82, scale: [7.4, 6.2, 7.8] as [number, number, number] },
  { id: 'rear-left', x: -12.5, z: 13.2, radius: 2.6, variant: '02' as const, rotation: 2.0, scale: [4.8, 3.8, 5.0] as [number, number, number] },
  { id: 'rear-right', x: 12.8, z: 13.0, radius: 2.5, variant: '01' as const, rotation: -2.1, scale: [4.7, 3.7, 4.9] as [number, number, number] },
  { id: 'deep-left', x: -12.5, z: -46.5, radius: 3.4, variant: '01' as const, rotation: .33, scale: [6.8, 5.1, 6.9] as [number, number, number] },
  { id: 'deep-right', x: 15.0, z: -46.0, radius: 3.2, variant: '02' as const, rotation: -.41, scale: [6.2, 5.0, 6.5] as [number, number, number] },
] as const

const COLLISION_OBSTACLES: MovementObstacle[] = [
  ...PRIMARY_LANDMARKS.map((item) => ({ x: item.x, z: item.z, radius: item.radius + PLAYER_RADIUS })),
  ...SECONDARY_PLACES.map((item) => ({ x: item.x, z: item.z, radius: item.radius * .55 + PLAYER_RADIUS })),
  ...BOUNDARY_GEOLOGY.map((item) => ({ x: item.x, z: item.z, radius: item.radius + PLAYER_RADIUS })),
]

const ORB_PALETTES: Record<OrbState, { body: string; warm: string; cool: string; field: string }> = {
  dormant: { body: '#484943', warm: '#9a7656', cool: '#687e7b', field: '#8d826e' },
  idle: { body: '#535047', warm: '#d39a61', cool: '#789391', field: '#c2a070' },
  attention: { body: '#5b564b', warm: '#e0a461', cool: '#8ba7a0', field: '#d5aa70' },
  listening: { body: '#4a5652', warm: '#8db9ad', cool: '#6f8f9d', field: '#82a9a3' },
  thinking: { body: '#514b55', warm: '#a28aac', cool: '#7696a4', field: '#9289a3' },
  speaking: { body: '#5e5145', warm: '#e3aa68', cool: '#c98559', field: '#d9a066' },
  guiding: { body: '#595548', warm: '#c6ad72', cool: '#7ea08c', field: '#a6ab76' },
  reflecting: { body: '#504d54', warm: '#9d8fa9', cool: '#748d9c', field: '#8e879e' },
  calming: { body: '#4d554c', warm: '#9fb49d', cool: '#789a93', field: '#91a793' },
  privacy: { body: '#48545a', warm: '#7ca1ae', cool: '#6e8199', field: '#7d98a5' },
  warning: { body: '#5b473f', warm: '#d77e59', cool: '#aa6853', field: '#bb7659' },
  transition: { body: '#504c55', warm: '#aa94b1', cool: '#7898a1', field: '#918ba7' },
}

function mapRange(value: number, sourceMin: number, sourceMax: number, targetMin: number, targetMax: number) {
  const t = THREE.MathUtils.clamp((value - sourceMin) / Math.max(.0001, sourceMax - sourceMin), 0, 1)
  return THREE.MathUtils.lerp(targetMin, targetMax, t)
}

function groundToHome(x: number, z: number) {
  return {
    x: mapRange(x, GROUND_PLAYABLE_BOUNDS.minX + 2.2, GROUND_PLAYABLE_BOUNDS.maxX - 2.2, HOME_GROUND_BOUNDS.minX, HOME_GROUND_BOUNDS.maxX),
    z: mapRange(z, GROUND_PLAYABLE_BOUNDS.minZ + 4.2, GROUND_PLAYABLE_BOUNDS.maxZ - 4.2, HOME_GROUND_BOUNDS.minZ, HOME_GROUND_BOUNDS.maxZ),
  }
}

function groundHeight(x: number, z: number) {
  const mapped = groundToHome(x, z)
  const sharedHome = homeHeight(mapped.x, mapped.z)
  const localErosion = Math.sin(x * .43 + z * .21) * .028 + Math.cos(x * .77 - z * .37) * .018
  const runoff = Math.exp(-Math.pow(x - Math.sin(z * .075) * 1.5, 2) / 6.4) * -.055
  const sideRise = THREE.MathUtils.smoothstep(Math.abs(x), 20.5, 28) * 6.4
  const deepRise = THREE.MathUtils.smoothstep(-z, 39.0, 48.0) * 6.8
  const rearRise = THREE.MathUtils.smoothstep(z, 9.5, 16.0) * 4.6
  return sharedHome + localErosion + runoff + sideRise + deepRise + rearRise
}

function slopeDegrees(x: number, z: number) {
  const hL = groundHeight(x - SLOPE_SAMPLE, z)
  const hR = groundHeight(x + SLOPE_SAMPLE, z)
  const hD = groundHeight(x, z - SLOPE_SAMPLE)
  const hU = groundHeight(x, z + SLOPE_SAMPLE)
  const dx = (hR - hL) / (SLOPE_SAMPLE * 2)
  const dz = (hU - hD) / (SLOPE_SAMPLE * 2)
  return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(dx, dz)))
}

function buildTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(64, 72, 160, 180)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, -16)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const loam = new THREE.Color('#2b332a')
  const compacted = new THREE.Color('#675945')
  const mineral = new THREE.Color('#596259')
  const moss = new THREE.Color('#47604d')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const y = groundHeight(x, z)
    position.setY(index, y)
    const route = Math.exp(-Math.pow(x - Math.sin(z * .075) * 1.5, 2) / 5.2)
    const moisture = .5 + .5 * Math.sin(x * .19 + z * .13) * Math.cos(x * .08 - z * .21)
    const exposed = THREE.MathUtils.clamp(Math.abs(Math.sin(x * .11 - z * .07)) * .55 + Math.max(0, y) * .18, 0, 1)
    const color = loam.clone().lerp(compacted, route * .36).lerp(mineral, exposed * .42).lerp(moss, moisture * (1 - route) * .22)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv.array as ArrayLike<number>), 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function GroundMaterial() {
  const [albedo, normal, arm] = useTexture([TERRAIN_ALBEDO, TERRAIN_NORMAL, TERRAIN_ARM])
  useMemo(() => {
    albedo.colorSpace = THREE.SRGBColorSpace
    for (const texture of [albedo, normal, arm]) {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(13, 15)
      texture.anisotropy = 8
      texture.needsUpdate = true
    }
    return null
  }, [albedo, arm, normal])
  return <meshStandardMaterial
    map={albedo}
    normalMap={normal}
    normalScale={new THREE.Vector2(.55, .55)}
    aoMap={arm}
    aoMapIntensity={.76}
    roughnessMap={arm}
    roughness={.91}
    metalnessMap={arm}
    metalness={.005}
    vertexColors
    envMapIntensity={.34}
  />
}

function normalizedClone(source: THREE.Object3D) {
  const clone = source.clone(true)
  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const normalization = 1 / Math.max(size.x, size.y, size.z, .001)
  clone.scale.setScalar(normalization)
  clone.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const materials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = Math.max(material.roughness, .82)
        material.metalness = Math.min(material.metalness, .03)
        material.envMapIntensity = .34
      }
      return material
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return clone
}

function ScannedRock({ variant, position, rotationY, scale }: { variant: '01' | '02'; position: [number, number, number]; rotationY: number; scale: [number, number, number] }) {
  const asset = useGLTF(variant === '01' ? ROCK_01 : ROCK_02)
  const model = useMemo(() => normalizedClone(asset.scene), [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <group position={position} rotation={[0, rotationY, 0]} scale={scale} raycast={() => null}><primitive object={model} /></group>
}

function FernPatch({ x, z, scale, rotation }: { x: number; z: number; scale: number; rotation: number }) {
  const asset = useGLTF(FERN_MODEL)
  const model = useMemo(() => normalizedClone(asset.scene), [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <group position={[x, groundHeight(x, z), z]} rotation={[0, rotation, 0]} scale={scale} raycast={() => null}><primitive object={model} /></group>
}

function BoundaryGeology() {
  return <group name="ground-physical-boundary-geology" userData={{ boundaryTreatment: 'terrain-rise-plus-scanned-geology-no-invisible-wall-first' }} raycast={() => null}>
    {BOUNDARY_GEOLOGY.map((item) => <ScannedRock
      key={item.id}
      variant={item.variant}
      position={[item.x, groundHeight(item.x, item.z) - .65, item.z]}
      rotationY={item.rotation}
      scale={item.scale}
    />)}
  </group>
}

function GroundPlaces({ announce }: { announce: (value: string) => void }) {
  const ferns = useMemo(() => Array.from({ length: 34 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const x = side * (4.2 + (index % 7) * 1.65) + Math.sin(index * 1.73) * 1.1
    const z = 4 - index * 1.35 + Math.cos(index * .89) * 1.4
    return { x, z, scale: .68 + (index % 5) * .13, rotation: index * 2.39996323 }
  }), [])
  return <group name="ground-authored-place-hierarchy">
    {PRIMARY_LANDMARKS.map((item, index) => <ScannedRock key={item.id} variant={item.variant} position={[item.x, groundHeight(item.x, item.z) - .12, item.z]} rotationY={index * .71 - .3} scale={item.scale} />)}
    {SECONDARY_PLACES.map((item, index) => <mesh
      key={item.id}
      name={`ground-place-${item.id}`}
      position={[item.x, groundHeight(item.x, item.z) + .08, item.z]}
      scale={[item.radius, .12 + (index % 2) * .04, item.radius * .82]}
      onClick={(event) => {
        event.stopPropagation()
        requestHapticCue('select-object', 'ground-place')
        announce(item.label)
      }}
      receiveShadow
      userData={{ placeHierarchy: 'secondary', authoredPlacement: true, memoryReady: true }}
    >
      <sphereGeometry args={[1, 32, 18]} />
      <meshStandardMaterial color={index % 2 ? '#596259' : '#47604d'} roughness={.94} />
    </mesh>)}
    {ferns.map((item, index) => <FernPatch key={index} {...item} />)}
  </group>
}

function GroundWorld({ target, announce, onReady }: {
  target: MutableRefObject<THREE.Vector3 | null>
  announce: (value: string) => void
  onReady: () => void
}) {
  const geometry = useMemo(buildTerrainGeometry, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => onReady(), [onReady])
  const onTerrainClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 8) return
    const x = THREE.MathUtils.clamp(event.point.x, GROUND_PLAYABLE_BOUNDS.minX + 1, GROUND_PLAYABLE_BOUNDS.maxX - 1)
    const z = THREE.MathUtils.clamp(event.point.z, GROUND_PLAYABLE_BOUNDS.minZ + 1, GROUND_PLAYABLE_BOUNDS.maxZ - 1)
    if (slopeDegrees(x, z) > MAX_WALK_SLOPE_DEGREES) {
      requestHapticCue('gate-shown', 'ground-slope')
      announce('That slope is too steep to walk safely.')
      return
    }
    requestHapticCue('select-object', 'ground-target-walk')
    target.current = new THREE.Vector3(x, 0, z)
  }
  return <group name="ground-lived-world" userData={{ semanticOwner: 'ground-physical-lived-world', continuity: 'home-ground-shared-geology-v1' }}>
    <mesh name="ground-visible-traversable-terrain" geometry={geometry} onClick={onTerrainClick} receiveShadow>
      <GroundMaterial />
    </mesh>
    <Suspense fallback={null}>
      <BoundaryGeology />
      <GroundPlaces announce={announce} />
    </Suspense>
  </group>
}

function makeOrbTrace(index: number) {
  const angle = -.8 + index * .78
  const reach = .38 + (index % 3) * .14
  const bend = index % 2 ? .09 : -.07
  const points = [
    new THREE.Vector3(0, .010, 0),
    new THREE.Vector3(Math.cos(angle) * reach * .45, .007, Math.sin(angle) * reach * .36),
    new THREE.Vector3(Math.cos(angle + bend) * reach, .004, Math.sin(angle + bend) * reach * .72),
  ]
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), 22, .005 + (index % 2) * .0015, 5, false)
}

function GroundOrbPresence({ visible, playerPosition, yaw, reducedMotion, onActivate }: {
  visible: boolean
  playerPosition: MutableRefObject<THREE.Vector3>
  yaw: MutableRefObject<number>
  reducedMotion: boolean
  onActivate: () => void
}) {
  const [state, setState] = useState<OrbState>('idle')
  const [anchor, setAnchor] = useState(() => new THREE.Vector3(0, -100, 0))
  const root = useRef<THREE.Group>(null)
  const traces = useMemo(() => Array.from({ length: 6 }, (_, index) => makeOrbTrace(index)), [])
  const palette = ORB_PALETTES[state]
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)

  useEffect(() => () => traces.forEach((geometry) => geometry.dispose()), [traces])
  useEffect(() => {
    const listener = (event: CustomEvent<OrbStateEventDetail>) => setState(event.detail.state)
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [])
  useEffect(() => {
    if (!visible) return
    const player = playerPosition.current
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current))
    const next = player.clone().addScaledVector(forward, 1.65).addScaledVector(right, .58)
    next.x = THREE.MathUtils.clamp(next.x, GROUND_PLAYABLE_BOUNDS.minX + 2, GROUND_PLAYABLE_BOUNDS.maxX - 2)
    next.z = THREE.MathUtils.clamp(next.z, GROUND_PLAYABLE_BOUNDS.minZ + 2, GROUND_PLAYABLE_BOUNDS.maxZ - 2)
    next.y = groundHeight(next.x, next.z)
    setAnchor(next)
  }, [playerPosition, visible, yaw])
  useFrame(({ clock }) => {
    if (!visible || !root.current || reducedMotion) return
    const t = clock.elapsedTime
    root.current.rotation.y = .12 + Math.sin(t * .21) * .017
    root.current.scale.setScalar(1 + Math.sin(t * .71) * .004)
  })

  if (!visible) return null
  return <group
    ref={root}
    position={[anchor.x, anchor.y, anchor.z]}
    name="ground-summoned-physical-orb"
    userData={{ semanticOwner: 'orb', physicalGroundPresence: true, derivedVisualLanguage: 'v288-grounded-biomorphic-reliquary', animation: sensory.animation }}
  >
    <group position={[0, .62, 0]} onClick={(event) => { event.stopPropagation(); onActivate() }}>
      <mesh position={[-.19, .04, .01]} scale={[.52, .82, .43]} rotation={[.06, -.22, .19]} castShadow receiveShadow>
        <icosahedronGeometry args={[.68, 3]} />
        <meshStandardMaterial color={palette.body} emissive={palette.warm} emissiveIntensity={state === 'dormant' ? .02 : .09} roughness={.79} metalness={.015} />
      </mesh>
      <mesh position={[.21, .08, -.04]} scale={[.46, .72, .39]} rotation={[-.05, .26, -.21]} castShadow receiveShadow>
        <icosahedronGeometry args={[.68, 3]} />
        <meshStandardMaterial color={palette.body} emissive={palette.cool} emissiveIntensity={state === 'dormant' ? .018 : .07} roughness={.81} metalness={.01} />
      </mesh>
      <mesh position={[0, -.35, .025]} scale={[.30, .38, .28]} castShadow receiveShadow>
        <icosahedronGeometry args={[.64, 2]} />
        <meshStandardMaterial color={palette.body} emissive={palette.warm} emissiveIntensity={.045} roughness={.87} />
      </mesh>
      <pointLight position={[0, .16, .16]} color={palette.warm} intensity={state === 'warning' ? .62 : .20} distance={2.2} decay={2} />
    </group>
    <group name="ground-orb-contact-field" raycast={() => null}>
      {traces.map((geometry, index) => <mesh key={index} geometry={geometry}>
        <meshStandardMaterial color={index % 2 ? '#343d38' : '#5e4b3b'} emissive={palette.field} emissiveIntensity={state === 'idle' ? .008 : .026} roughness={.94} />
      </mesh>)}
    </group>
  </group>
}

function FirstPersonRig({ input, yaw, pitch, target, spawn, active, unwinding, reducedMotion, onReady, onPosition }: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  target: MutableRefObject<THREE.Vector3 | null>
  spawn: THREE.Vector3
  active: boolean
  unwinding: boolean
  reducedMotion: boolean
  onReady: () => void
  onPosition: (position: THREE.Vector3) => void
}) {
  const { camera, size } = useThree()
  const position = useRef(spawn.clone())
  const velocity = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const ready = useRef(false)
  const previous = useRef(spawn.clone())

  useEffect(() => { position.current.copy(spawn); previous.current.copy(spawn) }, [spawn])

  useFrame((_, delta) => {
    if (active && !unwinding) {
      previous.current.copy(position.current)
      stepEmbodiedMotion({
        position: position.current,
        velocity: velocity.current,
        input,
        target,
        yaw: yaw.current,
        delta,
        speed: WALK_SPEED,
        acceleration: WALK_ACCELERATION,
        deceleration: WALK_DECELERATION,
        bounds: GROUND_PLAYABLE_BOUNDS,
        obstacles: COLLISION_OBSTACLES,
        arrivalRadius: .30,
      })
      const previousY = groundHeight(previous.current.x, previous.current.z)
      const nextY = groundHeight(position.current.x, position.current.z)
      const step = Math.abs(nextY - previousY)
      const slope = slopeDegrees(position.current.x, position.current.z)
      if (step > MAX_STEP_HEIGHT || slope > MAX_WALK_SLOPE_DEGREES) {
        position.current.copy(previous.current)
        velocity.current.set(0, 0, 0)
        target.current = null
      }
    } else {
      velocity.current.set(0, 0, 0)
      target.current = null
    }

    const surfaceY = groundHeight(position.current.x, position.current.z)
    desired.current.set(position.current.x, surfaceY + EYE_HEIGHT, position.current.z)
    if (!unwinding) camera.position.lerp(desired.current, reducedMotion ? 1 : 1 - Math.pow(.001, delta))

    if (!unwinding) {
      forward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      lookAt.current.copy(camera.position).addScaledVector(forward.current, 12)
      lookAt.current.y += Math.tan(pitch.current) * 7.5
      camera.lookAt(lookAt.current)
    }

    if (camera instanceof THREE.PerspectiveCamera && !unwinding) {
      const desiredFov = size.height > size.width ? 64 : 58
      camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, 8, delta)
      camera.updateProjectionMatrix()
    }

    onPosition(position.current)
    if (!ready.current) { ready.current = true; onReady() }
  })
  return null
}

function UnwindCamera({ active, reducedMotion, startPosition, yaw, onHandoff, onComplete }: {
  active: boolean
  reducedMotion: boolean
  startPosition: MutableRefObject<THREE.Vector3>
  yaw: MutableRefObject<number>
  onHandoff: () => void
  onComplete: () => void
}) {
  const { camera } = useThree()
  const elapsed = useRef(0)
  const start = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const handoff = useRef(false)
  const complete = useRef(false)

  useEffect(() => {
    if (!active) return
    elapsed.current = 0
    handoff.current = false
    complete.current = false
    start.current.copy(camera.position)
  }, [active, camera])

  useFrame((_, delta) => {
    if (!active) return
    elapsed.current += Math.min(delta, .08)
    const duration = (reducedMotion ? HOME_GROUND_TIMING.unwindReducedMs : HOME_GROUND_TIMING.unwindMs) / 1000
    const handoffTime = (reducedMotion ? HOME_GROUND_TIMING.groundCameraReleaseReducedMs : HOME_GROUND_TIMING.groundCameraReleaseMs) / 1000
    const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const end = new THREE.Vector3(startPosition.current.x - forward.x * 5.2, groundHeight(startPosition.current.x, startPosition.current.z) + 4.2, startPosition.current.z - forward.z * 5.2)
    camera.position.lerpVectors(start.current, end, t)
    look.current.set(startPosition.current.x, groundHeight(startPosition.current.x, startPosition.current.z) + 1.0, startPosition.current.z)
    camera.lookAt(look.current)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(58, 52, t)
      camera.updateProjectionMatrix()
    }
    if (elapsed.current >= handoffTime && !handoff.current) { handoff.current = true; onHandoff() }
    if (elapsed.current >= duration && !complete.current) { complete.current = true; onComplete() }
  })
  return null
}

function AnalogPad({ input, disabled }: { input: MovementInput; disabled: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !root.current) return
    const rect = root.current.getBoundingClientRect()
    const x = THREE.MathUtils.clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * .34), -1, 1)
    const y = THREE.MathUtils.clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * .34), -1, 1)
    setVirtualMovement(input, x, y)
  }
  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    pointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    update(event)
  }
  const move = (event: ReactPointerEvent<HTMLDivElement>) => { if (pointer.current === event.pointerId) update(event) }
  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return
    pointer.current = null
    clearVirtualMovement(input)
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* best effort */ }
  }
  return <div ref={root} className="ground-analog-pad" data-movement-ui="true" role="group" aria-label="Ground analog movement control" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
    <span aria-hidden="true" />
    <button type="button" className="sr-only" aria-label="Move forward" onPointerDown={() => setVirtualMovement(input, 0, -1)} onPointerUp={() => clearVirtualMovement(input)}>Move forward</button>
    <button type="button" className="sr-only" aria-label="Move left" onPointerDown={() => setVirtualMovement(input, -1, 0)} onPointerUp={() => clearVirtualMovement(input)}>Move left</button>
    <button type="button" className="sr-only" aria-label="Move backward" onPointerDown={() => setVirtualMovement(input, 0, 1)} onPointerUp={() => clearVirtualMovement(input)}>Move backward</button>
    <button type="button" className="sr-only" aria-label="Move right" onPointerDown={() => setVirtualMovement(input, 1, 0)} onPointerUp={() => clearVirtualMovement(input)}>Move right</button>
  </div>
}

function directionPhrase(relativeRadians: number) {
  const normalized = Math.atan2(Math.sin(relativeRadians), Math.cos(relativeRadians))
  const degrees = THREE.MathUtils.radToDeg(normalized)
  if (Math.abs(degrees) <= 25) return 'ahead'
  if (degrees > 25 && degrees < 155) return 'to your left'
  if (degrees < -25 && degrees > -155) return 'to your right'
  return 'behind you'
}

export default function GroundSpatialWorldCanon() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const checkpoint = useMemo(() => readGroundEntryCheckpoint(), [])
  const enteredFromHome = useMemo(() => groundWasEnteredFromHome(), [])
  const spawn = useMemo(() => {
    const x = checkpoint?.groundSpawn[0] ?? 0
    const z = checkpoint?.groundSpawn[1] ?? 6
    return new THREE.Vector3(x, 0, z)
  }, [checkpoint])
  const [worldReady, setWorldReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [inputReady, setInputReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [unwinding, setUnwinding] = useState(false)
  const [unwindReason, setUnwindReason] = useState<GroundUnwindReason>('return-control')
  const [announcement, setAnnouncement] = useState('Ground is forming.')
  const [cameraHandoff, setCameraHandoff] = useState(false)
  const [orbVisible, setOrbVisible] = useState(false)
  const yaw = useRef(checkpoint?.groundHeading ?? 0)
  const pitch = useRef(-.04)
  const target = useRef<THREE.Vector3 | null>(null)
  const lastPosition = useRef(spawn.clone())
  const unwindStarted = useRef(false)
  const ready = worldReady && cameraReady

  const beginUnwind = useCallback((reason: GroundUnwindReason) => {
    if (unwindStarted.current) return
    unwindStarted.current = true
    setUnwindReason(reason)
    setInputReady(false)
    setDragging(false)
    setOrbVisible(false)
    target.current = null
    requestHapticCue('return-home', 'ground-unwind')
    setUnwinding(true)
    setAnnouncement('Returning Home.')
  }, [])

  const input = useMovementInput({
    enabled: inputReady && !unwinding,
    onEscape: () => beginUnwind('escape'),
    onReset: () => {
      yaw.current = checkpoint?.groundHeading ?? 0
      pitch.current = -.04
      target.current = spawn.clone()
    },
  })
  const look = useDragLook({ yaw, pitch, enabled: inputReady && !unwinding, sensitivity: .0024, minPitch: -.96, maxPitch: .96, onDragState: setDragging })

  useEffect(() => {
    if (!ready || unwinding) {
      setInputReady(false)
      return
    }
    const delay = reducedMotion ? 40 : 180
    const timer = window.setTimeout(() => setInputReady(true), delay)
    requestHapticCue('enter-place', 'ground-ready')
    setAnnouncement('Ground is ready for first-person exploration.')
    return () => window.clearTimeout(timer)
  }, [ready, reducedMotion, unwinding])

  useEffect(() => {
    const handler = (event: WindowEventMap[typeof GROUND_UNWIND_EVENT]) => beginUnwind(event.detail.reason)
    window.addEventListener(GROUND_UNWIND_EVENT, handler)
    return () => window.removeEventListener(GROUND_UNWIND_EVENT, handler)
  }, [beginUnwind])

  const completeUnwind = useCallback(() => {
    if (enteredFromHome && window.history.length > 1) router.back()
    else router.replace('/home?returnFrom=ground')
  }, [enteredFromHome, router])

  const describeSurroundings = useCallback(() => {
    const position = lastPosition.current
    const candidates = [...PRIMARY_LANDMARKS, ...SECONDARY_PLACES]
      .map((place) => ({ ...place, distance: Math.hypot(place.x - position.x, place.z - position.z) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
    if (!candidates.length) {
      setAnnouncement('No nearby place is currently resolved.')
      return
    }
    const phrases = candidates.map((place) => {
      const bearing = Math.atan2(-(place.x - position.x), -(place.z - position.z))
      const relative = bearing - yaw.current
      return `${place.label}, ${Math.max(1, Math.round(place.distance))} meters ${directionPhrase(relative)}`
    })
    requestHapticCue('select-object', 'ground-surroundings')
    setAnnouncement(`Nearby: ${phrases.join('; ')}.`)
  }, [])

  return <main
    className="ground-spatial-root"
    aria-label="URAI Ground first-person lived world"
    data-testid="urai-ground-lived-world"
    data-ground-runtime-owner="first-person-lived-world-canon"
    data-ground-continuity="home-ground-shared-geology-v1"
    data-ground-exploration="first-person"
    data-ground-camera="eye-level-terrain-following"
    data-ground-eye-height={EYE_HEIGHT}
    data-ground-movement="hybrid-continuous-target-walk"
    data-ground-walk-speed={WALK_SPEED}
    data-ground-collision="terrain-slope-step-and-authored-obstacles"
    data-ground-slope-limit={MAX_WALK_SLOPE_DEGREES}
    data-ground-step-height={MAX_STEP_HEIGHT}
    data-ground-boundary="terrain-rise-scanned-geology-before-safety-clamp"
    data-ground-pointer-lock="false"
    data-ground-ready={ready ? 'true' : 'false'}
    data-ground-world-ready={worldReady ? 'true' : 'false'}
    data-ground-camera-ready={cameraReady ? 'true' : 'false'}
    data-ground-input-ready={inputReady && !unwinding ? 'true' : 'false'}
    data-ground-camera-mode={unwinding ? 'unwind' : dragging ? 'look' : 'first-person'}
    data-ground-unwind={unwinding ? unwindReason : 'idle'}
    data-ground-camera-handoff={cameraHandoff ? 'home-pending' : 'ground-owned'}
    data-ground-orb={orbVisible ? 'summoned-physical' : 'available'}
    {...look}
  >
    <Canvas
      shadows
      dpr={[1, 1.35]}
      camera={{ position: [spawn.x, groundHeight(spawn.x, spawn.z) + EYE_HEIGHT, spawn.z], fov: 58, near: .08, far: 180 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={['#294946']} />
      <fogExp2 attach="fog" args={['#294946', .0135]} />
      <Environment files="/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr" background={false} environmentIntensity={.20} />
      <ambientLight intensity={.30} color="#c2cec7" />
      <hemisphereLight args={['#c3d7cf', '#1c302b', .52]} />
      <directionalLight position={[-8, 11, 6]} intensity={2.45} color="#f1d6b1" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-.00018} />
      <directionalLight position={[9, 6, -11]} intensity={.62} color="#79a99f" />
      <Suspense fallback={null}><GroundWorld target={target} announce={setAnnouncement} onReady={() => setWorldReady(true)} /></Suspense>
      <FirstPersonRig input={input} yaw={yaw} pitch={pitch} target={target} spawn={spawn} active={inputReady} unwinding={unwinding} reducedMotion={reducedMotion} onReady={() => setCameraReady(true)} onPosition={(position) => lastPosition.current.copy(position)} />
      <GroundOrbPresence visible={orbVisible && !unwinding} playerPosition={lastPosition} yaw={yaw} reducedMotion={reducedMotion} onActivate={() => requestUraiWorldOrbOpen()} />
      <UnwindCamera active={unwinding} reducedMotion={reducedMotion} startPosition={lastPosition} yaw={yaw} onHandoff={() => setCameraHandoff(true)} onComplete={completeUnwind} />
    </Canvas>

    <div className="ground-primary-controls" aria-label="Ground spatial controls">
      <button type="button" onClick={() => setOrbVisible((value) => !value)} aria-label={orbVisible ? 'Dismiss Ground Orb' : 'Summon Ground Orb'}>{orbVisible ? 'Orb off' : 'Orb'}</button>
      <button type="button" onClick={describeSurroundings} aria-label="Describe nearby Ground places">Nearby</button>
      <button type="button" onClick={() => requestGroundUnwind('return-control')} aria-label="Return Home">Home</button>
    </div>
    <nav className="ground-place-access" aria-label="Ground place and privacy tools">
      <a href="/location-map/geographic/">Places</a>
      <a href="/privacy-controls">Privacy</a>
    </nav>
    <AnalogPad input={input} disabled={!inputReady || unwinding} />
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    <span className="sr-only" data-testid="urai-ground-walkable-surface">The physical Ground terrain is the traversal and target-walk surface.</span>

    <style jsx>{`
      .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#294946;color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? 'grabbing' : 'grab'}}
      .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;background:transparent!important}
      .ground-primary-controls{position:absolute;z-index:20;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));display:flex;gap:6px;opacity:.035;transition:opacity .18s ease}
      .ground-primary-controls:hover,.ground-primary-controls:focus-within{opacity:1}
      .ground-primary-controls button{min-width:48px;min-height:48px;padding:0 12px;border:1px solid rgba(226,248,247,.2);border-radius:999px;background:rgba(5,20,24,.38);color:rgba(241,251,249,.9);backdrop-filter:blur(12px);font:750 9px/1 system-ui;letter-spacing:.08em;cursor:pointer}
      .ground-primary-controls button:focus-visible,.ground-place-access a:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .ground-place-access{position:absolute;z-index:19;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));display:flex;gap:8px;opacity:.02;transition:opacity .2s ease}
      .ground-place-access:focus-within{opacity:1}
      .ground-place-access a{display:grid;place-items:center;min-width:48px;min-height:48px;padding:0 12px;border:1px solid rgba(226,248,247,.18);border-radius:999px;background:rgba(5,20,24,.72);color:#f4fbfa;text-decoration:none;font:700 10px/1 system-ui}
      .ground-analog-pad{position:absolute;z-index:22;left:max(14px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));width:132px;height:132px;border-radius:50%;border:1px solid rgba(225,245,240,.12);background:radial-gradient(circle,rgba(215,238,228,.09),rgba(5,20,24,.22) 66%,rgba(5,20,24,.06));touch-action:none;display:none}
      .ground-analog-pad>span{position:absolute;left:50%;top:50%;width:48px;height:48px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(230,247,242,.18);background:rgba(5,20,24,.22);pointer-events:none}
      @media(max-width:900px),(pointer:coarse){.ground-analog-pad{display:block}.ground-primary-controls{right:12px;top:12px}.ground-place-access{left:12px;top:12px}.ground-primary-controls button{padding:0 9px}}
      @media(prefers-reduced-motion:reduce){.ground-place-access,.ground-primary-controls{transition:none}}
    `}</style>
  </main>
}

useGLTF.preload(ROCK_01)
useGLTF.preload(ROCK_02)
useGLTF.preload(FERN_MODEL)
