'use client'

import { Html, PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { stepEmbodiedMotion, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from './GroundWorldModel'

type EmbodiedGroundSceneProps = {
  active: GroundDestination | null
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearbyId: MutableRefObject<string | null>
  resetVersion: number
  reducedMotion: boolean
  onApproach: (destination: GroundDestination) => void
  onEnter: (destination: GroundDestination) => void
  onNearbyChange: (destination: GroundDestination | null) => void
  onMovementState: (moving: boolean) => void
}

type StoredCheckpoint = {
  x: number
  z: number
  yaw: number
  pitch: number
  district?: string | null
  savedAt: number
}

const CHECKPOINT_KEY = 'urai:ground:checkpoint:v2'
const GROUND_SPAWN = new THREE.Vector3(0, 0, 8.2)
const GROUND_BOUNDS = { minX: -13, maxX: 13, minZ: -33.2, maxZ: 9 }
const NEXUS = new THREE.Vector3(0, 0, -10.5)
const GROUND_OBSTACLES = DESTINATIONS.map((destination) => ({
  x: destination.position[0],
  z: destination.position[2],
  radius: destination.id === 'council' ? 1.65 : 1.35,
}))

function validCoordinate(value: number) {
  return Number.isFinite(value) && Math.abs(value) < 1000
}

function withinBounds(x: number, z: number) {
  return x >= GROUND_BOUNDS.minX && x <= GROUND_BOUNDS.maxX && z >= GROUND_BOUNDS.minZ && z <= GROUND_BOUNDS.maxZ
}

function destinationFromLocation() {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('district')
  return DESTINATIONS.find((destination) => destination.id === id) ?? null
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ))
}

function approachPoint(destination: GroundDestination) {
  const target = new THREE.Vector3(...destination.position)
  const towardArrival = GROUND_SPAWN.clone().sub(target).setY(0)
  if (towardArrival.lengthSq() < .01) towardArrival.set(0, 0, 1)
  return target.add(towardArrival.normalize().multiplyScalar(2.15)).setY(0)
}

function readStoredCheckpoint(): StoredCheckpoint | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CHECKPOINT_KEY) || 'null') as StoredCheckpoint | null
    if (!parsed || !validCoordinate(parsed.x) || !validCoordinate(parsed.z) || !withinBounds(parsed.x, parsed.z)) return null
    return parsed
  } catch {
    return null
  }
}

function FloorRoute({ from, to, color, opacity = .22, width = .08 }: {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  opacity?: number
  width?: number
}) {
  const geometry = useMemo(() => {
    const dx = to.x - from.x
    const dz = to.z - from.z
    return {
      midpoint: [(from.x + to.x) / 2, .026, (from.z + to.z) / 2] as [number, number, number],
      length: Math.hypot(dx, dz),
      yaw: Math.atan2(dx, dz),
    }
  }, [from, to])
  return <mesh position={geometry.midpoint} rotation={[0, geometry.yaw, 0]} name="ground-architectural-route-inlay">
    <boxGeometry args={[width, .018, geometry.length]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
  </mesh>
}

function WalkableGround({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 7) return
    walkTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, GROUND_BOUNDS.minX, GROUND_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, GROUND_BOUNDS.minZ, GROUND_BOUNDS.maxZ),
    )
  }
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.08, -12]} onClick={choose} name="ground-walkable-navigation-surface" data-testid="urai-ground-walkable-surface">
    <planeGeometry args={[28, 44]} />
    <meshBasicMaterial transparent opacity={.001} depthWrite={false} colorWrite={false} />
  </mesh>
}

function GroundPaths() {
  const paths = useMemo(() => DESTINATIONS.flatMap((destination) => {
    const destinationPoint = new THREE.Vector3(...destination.position).setY(.026)
    const midpoint = destination.layer === 'deep'
      ? new THREE.Vector3(destinationPoint.x * .35, .026, -20.5)
      : destination.layer === 'continuity'
        ? new THREE.Vector3(destinationPoint.x * .3, .026, -15.4)
        : NEXUS.clone().setY(.026)
    return [
      { id: `${destination.id}-a`, from: NEXUS.clone().setY(.026), to: midpoint, destination },
      { id: `${destination.id}-b`, from: midpoint, to: destinationPoint, destination },
    ]
  }), [])

  return <group name="ground-walkable-path-network">
    <FloorRoute from={GROUND_SPAWN.clone().setY(.026)} to={NEXUS.clone().setY(.026)} color="#a5f3fc" opacity={.34} width={.11} />
    {paths.map(({ id, from, to, destination }) => <FloorRoute
      key={id}
      from={from}
      to={to}
      color={destination.color}
      opacity={destination.availability === 'offline' ? .035 : destination.workforceState === 'blocked' ? .07 : .16}
      width={destination.ownerBoundary ? .095 : .065}
    />)}
  </group>
}

function GroundNexus({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = clock.elapsedTime * .018
    group.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * .42) * .012)
  })
  return <group ref={group} position={NEXUS} name="ground-central-nexus" data-testid="urai-ground-central-nexus">
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.3, 2.42, 96]} /><meshBasicMaterial color="#8beef6" transparent opacity={.32} depthWrite={false} toneMapped={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]}><ringGeometry args={[3.45, 3.52, 96]} /><meshBasicMaterial color="#c4b5fd" transparent opacity={.13} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[0, .14, 0]}><cylinderGeometry args={[1.25, 1.45, .28, 64]} /><meshStandardMaterial color="#102837" emissive="#67e8f9" emissiveIntensity={.11} roughness={.32} metalness={.48} /></mesh>
    <pointLight position={[0, 1.1, 0]} color="#67e8f9" intensity={2.8} distance={10} decay={2} />
  </group>
}

function GroundOrb({ reducedMotion }: { reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (!core.current || !ring.current) return
    const scale = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * .95) * .035
    core.current.scale.setScalar(THREE.MathUtils.damp(core.current.scale.x, scale, 5, delta))
    if (!reducedMotion) ring.current.rotation.y += delta * .18
  })
  const open = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    requestUraiWorldOrbOpen()
  }
  return <group position={[0, 1.18, -7.55]} name="ground-physical-orb" data-testid="urai-ground-physical-orb">
    <mesh ref={core} onClick={open} castShadow><sphereGeometry args={[.4, 40, 40]} /><meshPhysicalMaterial color="#c8fbff" emissive="#5bdde8" emissiveIntensity={1.25} roughness={.12} transmission={.18} clearcoat={1} /></mesh>
    <mesh ref={ring} onClick={open} rotation={[.45, 0, .12]}><torusGeometry args={[.63, .018, 10, 96]} /><meshBasicMaterial color="#b7a7ff" transparent opacity={.5} depthWrite={false} toneMapped={false} /></mesh>
    <pointLight color="#67e8f9" intensity={2.7} distance={7} decay={2} />
    <mesh onClick={open}><sphereGeometry args={[.82, 20, 20]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function DestinationThreshold({ destination, active, nearby, walkTarget, onApproach, onEnter, reducedMotion }: {
  destination: GroundDestination
  active: boolean
  nearby: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  onApproach: () => void
  onEnter: () => void
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color])
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * .5 + destination.position[0]) * .012
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, (active || nearby) ? pulse * 1.025 : pulse, 5, delta))
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby) onEnter()
    else {
      onApproach()
      walkTarget.current = approachPoint(destination)
    }
  }
  const opacity = destination.workforceState === 'blocked' ? .15 : destination.availability === 'offline' ? .08 : .3
  return <group ref={group} position={destination.position} name={`ground-enterable-threshold-${destination.id}`} data-testid={`urai-ground-chamber-${destination.id}`} userData={{ groundDestination: destination.id, workforceState: destination.workforceState, availability: destination.availability }}>
    <mesh onClick={activate} position={[0, 1.45, 0]}><sphereGeometry args={[2.05, 16, 16]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.72, nearby ? .9 : .8, 72]} /><meshBasicMaterial color={color} transparent opacity={nearby ? .88 : active ? .58 : opacity} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[0, 1.45, .04]}><torusGeometry args={[.92, .055, 14, 80, Math.PI]} /><meshStandardMaterial color="#173246" emissive={color} emissiveIntensity={active || nearby ? .35 : .09} roughness={.38} metalness={.4} /></mesh>
    <pointLight position={[0, 2.1, .5]} color={color} intensity={nearby ? 5 : active ? 3.2 : .9} distance={nearby ? 9 : 5} decay={2} />
    {(active || nearby) ? <Html position={[0, 3.55, 0]} center distanceFactor={10} zIndexRange={[80, 20]}>
      <div className="ground-active-label" data-nearby={nearby ? 'true' : 'false'}>
        <strong>{destination.label}</strong>
        <span>{destination.signature} · {destination.detail}</span>
        <em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em>
        <small>{nearby ? 'Press Enter or tap again to cross the threshold.' : destination.emotionalSentence}</small>
      </div>
    </Html> : null}
  </group>
}

function WorkforcePresence({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * .04) * .014
  })
  return <group ref={group} name="ground-workforce-and-council-presences">
    {DESTINATIONS.slice(0, 9).map((destination, index) => <group key={destination.id} position={[destination.position[0] * .82 + (index % 2 ? .55 : -.55), destination.position[1], destination.position[2] + 1.3]}>
      <mesh position={[0, .72, 0]} castShadow><capsuleGeometry args={[.13, .68, 8, 16]} /><meshStandardMaterial color={destination.color} emissive={destination.color} emissiveIntensity={.08} transparent opacity={destination.workforceState === 'blocked' ? .11 : .42} roughness={.5} /></mesh>
      <mesh position={[0, 1.48, 0]} castShadow><sphereGeometry args={[.13, 16, 16]} /><meshStandardMaterial color={destination.color} transparent opacity={destination.workforceState === 'blocked' ? .12 : .5} roughness={.42} /></mesh>
      <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.34, 24]} /><meshBasicMaterial color="#000" transparent opacity={.28} depthWrite={false} /></mesh>
    </group>)}
  </group>
}

function GroundPlayerCamera({ input, yaw, pitch, walkTarget, nearbyId, resetVersion, reducedMotion, onNearbyChange, onMovementState }: Pick<EmbodiedGroundSceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearbyId' | 'resetVersion' | 'reducedMotion' | 'onNearbyChange' | 'onMovementState'>) {
  const { size } = useThree()
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const position = useRef(GROUND_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const lastNearby = useRef<string | null>(null)
  const lastMoving = useRef(false)
  const rootRef = useRef<HTMLElement | null>(null)
  const lastSaveAt = useRef(0)
  const arrivalHeight = useRef(1.72)
  const arrivalZ = useRef(GROUND_SPAWN.z)

  const restoreFromLocation = useCallback((preferStored: boolean) => {
    const destination = destinationFromLocation()
    const checkpoint = preferStored ? readStoredCheckpoint() : null
    const query = new URLSearchParams(window.location.search)
    const descending = query.get('cameraCheckpoint') === 'home-ground-descent' || query.get('entryPortal') === 'home-ground'

    if (destination) {
      position.current.set(destination.camera[0], 0, destination.camera[2])
      yaw.current = yawToward(destination.camera[0], destination.camera[2], destination.lookAt[0], destination.lookAt[2])
      pitch.current = -.04
      walkTarget.current = null
    } else if (checkpoint) {
      position.current.set(checkpoint.x, 0, checkpoint.z)
      yaw.current = validCoordinate(checkpoint.yaw) ? checkpoint.yaw : 0
      pitch.current = validCoordinate(checkpoint.pitch) ? THREE.MathUtils.clamp(checkpoint.pitch, -.58, .5) : -.05
      walkTarget.current = null
    } else {
      position.current.copy(GROUND_SPAWN)
      yaw.current = 0
      pitch.current = -.05
      walkTarget.current = null
    }

    arrivalHeight.current = descending && !reducedMotion ? 4.8 : (size.width < 700 ? 1.58 : 1.72)
    arrivalZ.current = descending && !reducedMotion ? GROUND_SPAWN.z + 2.6 : position.current.z
    velocity.current.set(0, 0, 0)
    nearbyId.current = null
  }, [nearbyId, pitch, reducedMotion, size.width, walkTarget, yaw])

  useEffect(() => {
    rootRef.current = document.querySelector('[data-testid="urai-ground-private-workforce-world"]')
    restoreFromLocation(true)
    const onPopState = () => restoreFromLocation(true)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [restoreFromLocation])

  useEffect(() => {
    restoreFromLocation(false)
  }, [resetVersion, restoreFromLocation])

  useEffect(() => {
    const save = () => {
      if (!validCoordinate(position.current.x) || !validCoordinate(position.current.z) || !withinBounds(position.current.x, position.current.z)) return
      const checkpoint: StoredCheckpoint = {
        x: Number(position.current.x.toFixed(3)),
        z: Number(position.current.z.toFixed(3)),
        yaw: Number(yaw.current.toFixed(4)),
        pitch: Number(pitch.current.toFixed(4)),
        district: nearbyId.current,
        savedAt: Date.now(),
      }
      try { window.sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)) } catch { /* storage is best effort */ }
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') save() }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [nearbyId, pitch, yaw])

  useFrame(({ clock }, delta) => {
    if (!validCoordinate(position.current.x) || !validCoordinate(position.current.z) || !withinBounds(position.current.x, position.current.z)) {
      position.current.copy(GROUND_SPAWN)
      velocity.current.set(0, 0, 0)
      walkTarget.current = null
      yaw.current = 0
      pitch.current = -.05
      const root = rootRef.current
      if (root) root.dataset.groundRecovery = 'invalid-position-reset'
    }

    const result = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target: walkTarget,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.9 : 2.75,
      acceleration: reducedMotion ? 14 : 7,
      deceleration: reducedMotion ? 18 : 9,
      bounds: GROUND_BOUNDS,
      obstacles: GROUND_OBSTACLES,
      arrivalRadius: .34,
    })

    let nearest: GroundDestination | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const destination of DESTINATIONS) {
      const distance = Math.hypot(position.current.x - destination.position[0], position.current.z - destination.position[2])
      if (distance < nearestDistance) {
        nearest = destination
        nearestDistance = distance
      }
    }
    const nextNearby = nearest && nearestDistance < 2.65 ? nearest : null
    nearbyId.current = nextNearby?.id ?? null
    if ((nextNearby?.id ?? null) !== lastNearby.current) {
      lastNearby.current = nextNearby?.id ?? null
      onNearbyChange(nextNearby)
    }
    if (result.moving !== lastMoving.current) {
      lastMoving.current = result.moving
      onMovementState(result.moving)
    }

    const camera = cameraRef.current
    if (!camera) return
    const targetHeight = size.width < 700 ? 1.58 : 1.72
    arrivalHeight.current = THREE.MathUtils.damp(arrivalHeight.current, targetHeight, reducedMotion ? 100 : 2.2, delta)
    arrivalZ.current = THREE.MathUtils.damp(arrivalZ.current, position.current.z, reducedMotion ? 100 : 2.5, delta)
    camera.position.set(position.current.x, arrivalHeight.current, arrivalZ.current)
    direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
    lookAt.current.copy(camera.position).add(direction.current)
    camera.lookAt(lookAt.current)
    camera.fov = THREE.MathUtils.damp(camera.fov, size.width < 700 ? 62 : 55, reducedMotion ? 100 : 6, delta)
    camera.updateProjectionMatrix()

    const root = rootRef.current
    if (root) {
      root.dataset.groundReady = clock.elapsedTime > .15 ? 'true' : 'warming'
      root.dataset.groundPlayerX = position.current.x.toFixed(3)
      root.dataset.groundPlayerZ = position.current.z.toFixed(3)
      root.dataset.groundNearby = nextNearby?.id ?? 'none'
      root.dataset.groundArrival = Math.abs(arrivalHeight.current - targetHeight) < .08 ? 'settled' : 'descending'
    }

    if (clock.elapsedTime - lastSaveAt.current > .75) {
      lastSaveAt.current = clock.elapsedTime
      try {
        window.sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ x: position.current.x, z: position.current.z, yaw: yaw.current, pitch: pitch.current, district: nextNearby?.id ?? null, savedAt: Date.now() }))
      } catch { /* storage is best effort */ }
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 4.8, 10.8]} fov={55} near={.08} far={160} />
}

export function EmbodiedGroundScene(props: EmbodiedGroundSceneProps) {
  const profile = useAdaptiveSpatialQuality()
  return <>
    <GroundPlayerCamera {...props} />
    <ambientLight intensity={.24} color="#dbeafe" />
    <Stars radius={92} depth={58} count={profile.particleCount} factor={1.7} saturation={.18} fade speed={props.reducedMotion ? 0 : .018} />
    <WalkableGround walkTarget={props.walkTarget} />
    <GroundPaths />
    <GroundNexus reducedMotion={props.reducedMotion} />
    <GroundOrb reducedMotion={props.reducedMotion} />
    {DESTINATIONS.map((destination) => <DestinationThreshold
      key={destination.id}
      destination={destination}
      active={props.active?.id === destination.id}
      nearby={props.nearbyId.current === destination.id}
      walkTarget={props.walkTarget}
      onApproach={() => props.onApproach(destination)}
      onEnter={() => props.onEnter(destination)}
      reducedMotion={props.reducedMotion}
    />)}
    <WorkforcePresence reducedMotion={props.reducedMotion} />
  </>
}

export default EmbodiedGroundScene
