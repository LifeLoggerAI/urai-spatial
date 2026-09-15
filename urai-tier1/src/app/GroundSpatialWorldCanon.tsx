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
  { id: 'western-weathered-shelf', x: -12.4, z: -24.5, radius: 2.4, variant: '01' as const, scale: [5.4, 3.0, 6.2] as [number, number, number] },
  { id: 'eastern-fracture-mass', x: 13.2, z: -29.0, radius: 2.8, variant: '02' as const, scale: [6.0, 4.0, 6.6] as [number, number, number] },
  { id: 'deep-saddle-stone', x: 3.4, z: -39.0, radius: 2.0, variant: '01' as const, scale: [4.2, 2.2, 4.7] as [number, number, number] },
] as const

const SECONDARY_PLACES = [
  { id: 'lichen-shelf', x: -7.2, z: -10.4, radius: 1.25 },
  { id: 'quiet-runoff', x: 6.4, z: -14.2, radius: 1.05 },
  { id: 'moss-hollow', x: -9.6, z: -31.0, radius: 1.2 },
  { id: 'mineral-overlook', x: 9.0, z: -36.2, radius: 1.2 },
] as const

const COLLISION_OBSTACLES: MovementObstacle[] = [
  ...PRIMARY_LANDMARKS.map((item) => ({ x: item.x, z: item.z, radius: item.radius + PLAYER_RADIUS })),
  ...SECONDARY_PLACES.map((item) => ({ x: item.x, z: item.z, radius: item.radius * .55 + PLAYER_RADIUS })),
]

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
  return sharedHome + localErosion + runoff
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

function BoundaryRidges() {
  return <group name="ground-physical-boundary-ridges" raycast={() => null}>
    <mesh position={[-29.5, 5.5, -17]} rotation={[0, .05, -.08]} castShadow receiveShadow><boxGeometry args={[5.5, 12, 70]} /><meshStandardMaterial color="#354039" roughness={.97} /></mesh>
    <mesh position={[29.5, 6.5, -17]} rotation={[0, -.08, .09]} castShadow receiveShadow><boxGeometry args={[5.0, 14, 70]} /><meshStandardMaterial color="#354039" roughness={.97} /></mesh>
    <mesh position={[0, 7.5, -51]} rotation={[.03, 0, 0]} castShadow receiveShadow><boxGeometry args={[64, 16, 7]} /><meshStandardMaterial color="#354039" roughness={.97} /></mesh>
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
      onClick={(event) => { event.stopPropagation(); announce(item.id.replace(/-/g, ' ')) }}
      receiveShadow
      userData={{ placeHierarchy: 'secondary', authoredPlacement: true, memoryReady: true }}
    >
      <sphereGeometry args={[1, 32, 18]} />
      <meshStandardMaterial color={index % 2 ? '#596259' : '#47604d'} roughness={.94} />
    </mesh>)}
    {ferns.map((item, index) => <FernPatch key={index} {...item} />)}
  </group>
}

function GroundWorld({ target, announce }: { target: MutableRefObject<THREE.Vector3 | null>; announce: (value: string) => void }) {
  const geometry = useMemo(buildTerrainGeometry, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const onTerrainClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 8) return
    const x = THREE.MathUtils.clamp(event.point.x, GROUND_PLAYABLE_BOUNDS.minX + 1, GROUND_PLAYABLE_BOUNDS.maxX - 1)
    const z = THREE.MathUtils.clamp(event.point.z, GROUND_PLAYABLE_BOUNDS.minZ + 1, GROUND_PLAYABLE_BOUNDS.maxZ - 1)
    if (slopeDegrees(x, z) > MAX_WALK_SLOPE_DEGREES) { announce('That slope is too steep to walk safely.'); return }
    target.current = new THREE.Vector3(x, 0, z)
  }
  return <group name="ground-lived-world" userData={{ semanticOwner: 'ground-physical-lived-world', continuity: 'home-ground-shared-geology-v1' }}>
    <mesh name="ground-visible-traversable-terrain" geometry={geometry} onClick={onTerrainClick} receiveShadow>
      <GroundMaterial />
    </mesh>
    <BoundaryRidges />
    <Suspense fallback={null}><GroundPlaces announce={announce} /></Suspense>
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
  const [ready, setReady] = useState(false)
  const [inputReady, setInputReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [unwinding, setUnwinding] = useState(false)
  const [unwindReason, setUnwindReason] = useState<GroundUnwindReason>('return-control')
  const [announcement, setAnnouncement] = useState('Ground is forming.')
  const [cameraHandoff, setCameraHandoff] = useState(false)
  const yaw = useRef(checkpoint?.groundHeading ?? 0)
  const pitch = useRef(-.04)
  const target = useRef<THREE.Vector3 | null>(null)
  const lastPosition = useRef(spawn.clone())
  const unwindStarted = useRef(false)

  const beginUnwind = useCallback((reason: GroundUnwindReason) => {
    if (unwindStarted.current) return
    unwindStarted.current = true
    setUnwindReason(reason)
    setInputReady(false)
    setDragging(false)
    target.current = null
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
    const delay = reducedMotion ? 40 : 180
    const timer = window.setTimeout(() => setInputReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  useEffect(() => {
    const handler = (event: WindowEventMap[typeof GROUND_UNWIND_EVENT]) => beginUnwind(event.detail.reason)
    window.addEventListener(GROUND_UNWIND_EVENT, handler)
    return () => window.removeEventListener(GROUND_UNWIND_EVENT, handler)
  }, [beginUnwind])

  useEffect(() => {
    const onPopState = () => {
      if (unwindStarted.current) return
      window.history.forward()
      window.setTimeout(() => beginUnwind('browser-back'), 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [beginUnwind])

  const completeUnwind = useCallback(() => {
    if (enteredFromHome && window.history.length > 1) router.back()
    else router.replace('/home?returnFrom=ground')
  }, [enteredFromHome, router])

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
    data-ground-pointer-lock="false"
    data-ground-ready={ready ? 'true' : 'false'}
    data-ground-input-ready={inputReady && !unwinding ? 'true' : 'false'}
    data-ground-camera-mode={unwinding ? 'unwind' : dragging ? 'look' : 'first-person'}
    data-ground-unwind={unwinding ? unwindReason : 'idle'}
    data-ground-camera-handoff={cameraHandoff ? 'home-pending' : 'ground-owned'}
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
      <Suspense fallback={null}><GroundWorld target={target} announce={setAnnouncement} /></Suspense>
      <FirstPersonRig input={input} yaw={yaw} pitch={pitch} target={target} spawn={spawn} active={inputReady} unwinding={unwinding} reducedMotion={reducedMotion} onReady={() => { setReady(true); setAnnouncement('Ground is ready for first-person exploration.') }} onPosition={(position) => lastPosition.current.copy(position)} />
      <UnwindCamera active={unwinding} reducedMotion={reducedMotion} startPosition={lastPosition} yaw={yaw} onHandoff={() => setCameraHandoff(true)} onComplete={completeUnwind} />
    </Canvas>

    <button className="ground-home-return" type="button" onClick={() => requestGroundUnwind('return-control')} aria-label="Return Home">Home</button>
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
      .ground-home-return{position:absolute;z-index:20;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));min-width:48px;min-height:48px;padding:0 13px;border:1px solid rgba(226,248,247,.2);border-radius:999px;background:rgba(5,20,24,.32);color:rgba(241,251,249,.88);backdrop-filter:blur(12px);font:750 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      .ground-home-return:focus-visible,.ground-place-access a:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .ground-place-access{position:absolute;z-index:19;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));display:flex;gap:8px;opacity:.02;transition:opacity .2s ease}
      .ground-place-access:focus-within{opacity:1}
      .ground-place-access a{display:grid;place-items:center;min-width:48px;min-height:48px;padding:0 12px;border:1px solid rgba(226,248,247,.18);border-radius:999px;background:rgba(5,20,24,.72);color:#f4fbfa;text-decoration:none;font:700 10px/1 system-ui}
      .ground-analog-pad{position:absolute;z-index:22;left:max(14px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));width:132px;height:132px;border-radius:50%;border:1px solid rgba(225,245,240,.12);background:radial-gradient(circle,rgba(215,238,228,.09),rgba(5,20,24,.22) 66%,rgba(5,20,24,.06));touch-action:none;display:none}
      .ground-analog-pad>span{position:absolute;left:50%;top:50%;width:48px;height:48px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(230,247,242,.18);background:rgba(5,20,24,.22);pointer-events:none}
      @media(max-width:900px),(pointer:coarse){.ground-analog-pad{display:block}.ground-home-return{right:12px;top:12px}.ground-place-access{left:12px;top:12px}}
      @media(prefers-reduced-motion:reduce){.ground-place-access{transition:none}}
    `}</style>
  </main>
}

useGLTF.preload(ROCK_01)
useGLTF.preload(ROCK_02)
useGLTF.preload(FERN_MODEL)
