'use client'

import { Html, Line, PerspectiveCamera, RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { stepEmbodiedMotion, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from './GroundWorldModel'

export type GroundCheckpoint = {
  x: number
  z: number
  yaw: number
  pitch: number
  district?: string
}

type EmbodiedGroundSceneProps = {
  active: GroundDestination | null
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearbyId: MutableRefObject<string | null>
  resetVersion: number
  reducedMotion: boolean
  requestedCheckpoint?: GroundCheckpoint | null
  guideDestination?: GroundDestination | null
  onApproach: (destination: GroundDestination) => void
  onEnter: (destination: GroundDestination) => void
  onNearbyChange: (destination: GroundDestination | null) => void
  onMovementState: (moving: boolean) => void
  onCheckpointChange?: (checkpoint: GroundCheckpoint) => void
}

const GROUND_SPAWN = new THREE.Vector3(0, 0, 8.2)
const GROUND_BOUNDS = { minX: -13, maxX: 13, minZ: -33.2, maxZ: 9 }
const NEXUS = new THREE.Vector3(0, 0, -10.5)
const ARCHITECTURE_OBSTACLES = [
  { x: -11.8, z: -9, radius: 0.9 }, { x: 11.8, z: -9, radius: 0.9 },
  { x: -11.8, z: -20, radius: 0.9 }, { x: 11.8, z: -20, radius: 0.9 },
  { x: 0, z: -10.5, radius: 2.25 },
]
const GROUND_OBSTACLES = [
  ...ARCHITECTURE_OBSTACLES,
  ...DESTINATIONS.map((destination) => ({
    x: destination.position[0],
    z: destination.position[2],
    radius: destination.id === 'council' ? 1.8 : 1.45,
  })),
]

function approachPoint(destination: GroundDestination) {
  const target = new THREE.Vector3(destination.position[0], 0, destination.position[2])
  const towardArrival = GROUND_SPAWN.clone().sub(target).setY(0)
  if (towardArrival.lengthSq() < 0.01) towardArrival.set(0, 0, 1)
  return target.add(towardArrival.normalize().multiplyScalar(2.45)).setY(0)
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
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, -12]} onClick={choose} name="ground-walkable-navigation-surface" data-testid="urai-ground-walkable-surface" receiveShadow>
      <planeGeometry args={[28, 44]} />
      <meshStandardMaterial color="#111b20" roughness={0.7} metalness={0.18} />
    </mesh>
  )
}

function FloorInlays() {
  const strips = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    z: 7 - index * 2.15,
    width: index < 8 ? 4.4 : 7.5,
  })), [])
  return (
    <group name="ground-floor-infrastructure-inlays">
      {strips.map((strip) => (
        <mesh key={strip.z} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, strip.z]}>
          <planeGeometry args={[strip.width, 0.045]} />
          <meshBasicMaterial color="#77e5eb" transparent opacity={0.28} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -12]}>
        <ringGeometry args={[11.4, 11.48, 128]} />
        <meshBasicMaterial color="#816fb3" transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ArrivalOverlook() {
  return (
    <group name="ground-arrival-overlook" data-testid="urai-ground-arrival-overlook">
      <RoundedBox args={[12, 0.55, 4.5]} radius={0.22} position={[0, -0.28, 7.5]} receiveShadow>
        <meshStandardMaterial color="#263238" roughness={0.55} metalness={0.28} />
      </RoundedBox>
      {[-5.4, 5.4].map((x) => (
        <group key={x} position={[x, 0, 6.4]}>
          <RoundedBox args={[0.4, 4.5, 0.4]} radius={0.12} position={[0, 2.15, 0]} castShadow>
            <meshStandardMaterial color="#3b4749" roughness={0.45} metalness={0.35} />
          </RoundedBox>
          <mesh position={[0, 3.8, 0]}>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshBasicMaterial color="#8debf0" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[4.4, 0.18, 0.8]} radius={0.08} position={[0, 0.14, 4.7]}>
        <meshStandardMaterial color="#426068" emissive="#143a43" emissiveIntensity={0.8} />
      </RoundedBox>
    </group>
  )
}

function GroundEnvelope() {
  const columns = [-11.8, -7.9, -4, 4, 7.9, 11.8]
  return (
    <group name="ground-visible-architecture" data-testid="urai-ground-visible-architecture">
      <ArrivalOverlook />
      <FloorInlays />
      {columns.map((x) => (
        <RoundedBox key={`column-${x}`} args={[0.55, 5.2, 0.55]} radius={0.13} position={[x, 2.5, -11.5]} castShadow receiveShadow>
          <meshStandardMaterial color="#283536" roughness={0.48} metalness={0.34} />
        </RoundedBox>
      ))}
      {[-11.8, 11.8].map((x) => (
        <group key={`wall-${x}`}>
          <RoundedBox args={[0.5, 5.3, 38]} radius={0.16} position={[x, 2.45, -12]} receiveShadow>
            <meshStandardMaterial color="#1d292b" roughness={0.65} metalness={0.18} />
          </RoundedBox>
          <mesh position={[x * 0.985, 2.6, -12]}>
            <planeGeometry args={[37, 4.4]} />
            <meshStandardMaterial color="#244048" transparent opacity={0.18} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[24, 0.45, 38]} radius={0.18} position={[0, 5.15, -12]} receiveShadow>
        <meshStandardMaterial color="#182123" roughness={0.7} metalness={0.22} />
      </RoundedBox>
      {[-4.2, 0, 4.2].map((x) => (
        <mesh key={`ceiling-light-${x}`} position={[x, 4.88, -10]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.08]} />
          <meshBasicMaterial color="#d8ffff" transparent opacity={0.72} toneMapped={false} />
        </mesh>
      ))}
      <fog attach="fog" args={['#071015', 12, 54]} />
    </group>
  )
}

function GroundPaths() {
  const { paths, mainPoints } = useMemo(() => {
    const main = [GROUND_SPAWN.clone().setY(0.025), NEXUS.clone().setY(0.025)]
    const mapped = DESTINATIONS.map((destination) => {
      const destinationPoint = new THREE.Vector3(destination.position[0], 0.025, destination.position[2])
      const midpoint = destination.layer === 'deep'
        ? new THREE.Vector3(destinationPoint.x * 0.35, 0.025, -20.5)
        : destination.layer === 'continuity'
          ? new THREE.Vector3(destinationPoint.x * 0.3, 0.025, -15.4)
          : NEXUS.clone().setY(0.025)
      return { destination, points: [GROUND_SPAWN.clone().setY(0.025), NEXUS.clone().setY(0.025), midpoint, destinationPoint] }
    })
    return { paths: mapped, mainPoints: main }
  }, [])
  return (
    <group name="ground-walkable-path-network">
      <Line points={mainPoints} color="#a5f3fc" transparent opacity={0.55} lineWidth={1.6} />
      {paths.map(({ destination, points }) => (
        <Line key={destination.id} points={points} color={destination.color} transparent opacity={destination.workforceState === 'blocked' ? 0.14 : 0.34} lineWidth={destination.ownerBoundary ? 1.8 : 1.25} dashed={destination.workforceState === 'blocked'} dashSize={0.25} gapSize={0.22} />
      ))}
    </group>
  )
}

function GroundNexus({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = clock.elapsedTime * 0.08
  })
  return (
    <group ref={group} position={NEXUS} name="ground-central-nexus" data-testid="urai-ground-central-nexus">
      <RoundedBox args={[4.8, 0.42, 4.8]} radius={0.65} position={[0, 0.1, 0]} receiveShadow>
        <meshStandardMaterial color="#21343a" roughness={0.38} metalness={0.48} />
      </RoundedBox>
      {[0, Math.PI / 2].map((rotation) => (
        <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]} position={[0, 1.45, 0]}>
          <torusGeometry args={[1.35, 0.055, 16, 96]} />
          <meshStandardMaterial color="#8beef6" emissive="#3dcad4" emissiveIntensity={2.1} />
        </mesh>
      ))}
      <mesh position={[0, 1.45, 0]}>
        <icosahedronGeometry args={[0.58, 2]} />
        <meshStandardMaterial color="#d8ffff" emissive="#67e8f9" emissiveIntensity={2.4} roughness={0.18} metalness={0.35} />
      </mesh>
      <pointLight position={[0, 2.2, 0]} color="#67e8f9" intensity={5.5} distance={16} decay={2} castShadow />
    </group>
  )
}

function ChamberArchitecture({ destination, active, nearby }: { destination: GroundDestination; active: boolean; nearby: boolean }) {
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color])
  const height = destination.layer === 'deep' ? 4.8 : destination.layer === 'continuity' ? 4.1 : 3.4
  const width = destination.chamberForm === 'council' ? 4.4 : destination.chamberForm === 'theater' ? 4.8 : 3.4
  const blocked = destination.workforceState === 'blocked'
  return (
    <group name={`ground-chamber-architecture-${destination.id}`}>
      <RoundedBox args={[width, height, 2.1]} radius={destination.chamberForm === 'vault' ? 0.16 : 0.52} position={[0, height / 2, -0.8]} castShadow receiveShadow>
        <meshStandardMaterial color={blocked ? '#1c2022' : '#233033'} roughness={0.48} metalness={destination.ownerBoundary ? 0.58 : 0.28} />
      </RoundedBox>
      <RoundedBox args={[width * 0.62, height * 0.62, 0.18]} radius={0.18} position={[0, height * 0.52, 0.28]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={blocked ? 0.06 : active || nearby ? 1.8 : 0.42} transparent opacity={blocked ? 0.16 : 0.72} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0.45]}>
        <ringGeometry args={[1.08, 1.2, 64]} />
        <meshBasicMaterial color={color} transparent opacity={blocked ? 0.2 : nearby ? 0.94 : active ? 0.72 : 0.4} toneMapped={false} />
      </mesh>
      {destination.ownerBoundary ? (
        <group position={[0, 1.5, 0.5]}>
          {[-0.58, 0, 0.58].map((x) => (
            <RoundedBox key={x} args={[0.08, 2.4, 0.08]} radius={0.03} position={[x, 0, 0]}>
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
            </RoundedBox>
          ))}
        </group>
      ) : null}
      <pointLight position={[0, height * 0.62, 1.2]} color={color} intensity={blocked ? 0.2 : nearby ? 7 : active ? 4.5 : 1.5} distance={nearby ? 11 : 7} decay={2} />
    </group>
  )
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
  useFrame(({ clock }) => {
    if (!group.current) return
    const staticScale = active || nearby ? 1.04 : 1
    if (reducedMotion) group.current.scale.setScalar(staticScale)
    else group.current.scale.setScalar(staticScale * (1 + Math.sin(clock.elapsedTime * 0.55 + destination.position[0]) * 0.012))
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby) onEnter()
    else {
      onApproach()
      walkTarget.current = approachPoint(destination)
    }
  }
  return (
    <group ref={group} position={[destination.position[0], 0, destination.position[2]]} name={`ground-enterable-threshold-${destination.id}`} data-testid={`urai-ground-chamber-${destination.id}`} userData={{ groundDestination: destination.id, workforceState: destination.workforceState, availability: destination.availability }}>
      <mesh onClick={activate} position={[0, 1.8, 0.4]}>
        <boxGeometry args={[4.8, 4.8, 3.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <ChamberArchitecture destination={destination} active={active} nearby={nearby} />
      {(active || nearby) ? (
        <Html position={[0, 4.45, 0.25]} center distanceFactor={10} zIndexRange={[80, 20]}>
          <div className="ground-active-label" data-nearby={nearby ? 'true' : 'false'}>
            <strong>{destination.label}</strong>
            <span>{destination.signature} · {destination.detail}</span>
            <em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em>
            <small>{nearby ? 'Press Enter or tap again to cross the threshold.' : destination.emotionalSentence}</small>
          </div>
        </Html>
      ) : null}
    </group>
  )
}

function WorkforcePresence({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 0.025
  })
  return (
    <group ref={group} name="ground-workforce-and-council-presences">
      {DESTINATIONS.slice(0, 9).map((destination, index) => (
        <group key={destination.id} position={[destination.position[0] * 0.78 + (index % 2 ? 0.75 : -0.75), 0, destination.position[2] + 1.75]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.72, 8, 16]} />
            <meshStandardMaterial color="#526468" emissive={destination.color} emissiveIntensity={destination.workforceState === 'blocked' ? 0.03 : 0.18} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.52, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#819398" roughness={0.46} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function GroundPlayerCamera(props: Pick<EmbodiedGroundSceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearbyId' | 'resetVersion' | 'reducedMotion' | 'requestedCheckpoint' | 'guideDestination' | 'onNearbyChange' | 'onMovementState' | 'onCheckpointChange'>) {
  const { size } = useThree()
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const position = useRef(GROUND_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const lastNearby = useRef<string | null>(null)
  const lastMoving = useRef(false)
  const lastCheckpointAt = useRef(0)

  useEffect(() => {
    const checkpoint = props.requestedCheckpoint
    position.current.set(checkpoint?.x ?? GROUND_SPAWN.x, 0, checkpoint?.z ?? GROUND_SPAWN.z)
    props.yaw.current = checkpoint?.yaw ?? 0
    props.pitch.current = checkpoint?.pitch ?? -0.05
    velocity.current.set(0, 0, 0)
    props.walkTarget.current = null
    props.nearbyId.current = null
  }, [props.nearbyId, props.pitch, props.requestedCheckpoint, props.resetVersion, props.walkTarget, props.yaw])

  useEffect(() => {
    if (props.guideDestination) props.walkTarget.current = approachPoint(props.guideDestination)
  }, [props.guideDestination, props.walkTarget])

  useFrame(({ clock }, delta) => {
    const result = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input: props.input,
      target: props.walkTarget,
      yaw: props.yaw.current,
      delta,
      speed: props.reducedMotion ? 1.9 : 2.75,
      acceleration: props.reducedMotion ? 14 : 7,
      deceleration: props.reducedMotion ? 18 : 9,
      bounds: GROUND_BOUNDS,
      obstacles: GROUND_OBSTACLES,
      arrivalRadius: 0.34,
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
    const nextNearby = nearest && nearestDistance < 2.85 ? nearest : null
    props.nearbyId.current = nextNearby?.id ?? null
    if ((nextNearby?.id ?? null) !== lastNearby.current) {
      lastNearby.current = nextNearby?.id ?? null
      props.onNearbyChange(nextNearby)
    }
    if (result.moving !== lastMoving.current) {
      lastMoving.current = result.moving
      props.onMovementState(result.moving)
    }
    if (props.onCheckpointChange && clock.elapsedTime - lastCheckpointAt.current > 0.5) {
      lastCheckpointAt.current = clock.elapsedTime
      props.onCheckpointChange({ x: position.current.x, z: position.current.z, yaw: props.yaw.current, pitch: props.pitch.current, district: nextNearby?.id })
    }

    const camera = cameraRef.current
    if (!camera) return
    camera.position.set(position.current.x, size.width < 700 ? 1.58 : 1.72, position.current.z)
    direction.current.set(-Math.sin(props.yaw.current) * Math.cos(props.pitch.current), Math.sin(props.pitch.current), -Math.cos(props.yaw.current) * Math.cos(props.pitch.current))
    lookAt.current.copy(camera.position).add(direction.current)
    camera.lookAt(lookAt.current)
    const nextFov = THREE.MathUtils.damp(camera.fov, size.width < 700 ? 62 : 55, props.reducedMotion ? 100 : 6, delta)
    if (Math.abs(nextFov - camera.fov) > 0.01) {
      camera.fov = nextFov
      camera.updateProjectionMatrix()
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1.72, 8.2]} fov={55} near={0.08} far={160} />
}

export function EmbodiedGroundScene(props: EmbodiedGroundSceneProps) {
  return (
    <>
      <GroundPlayerCamera {...props} />
      <ambientLight intensity={0.58} color="#cde8e8" />
      <hemisphereLight args={['#bfe9ee', '#172122', 0.9]} />
      <directionalLight position={[5, 9, 6]} intensity={1.25} color="#f3ead8" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <GroundEnvelope />
      <WalkableGround walkTarget={props.walkTarget} />
      <GroundPaths />
      <GroundNexus reducedMotion={props.reducedMotion} />
      {DESTINATIONS.map((destination) => (
        <DestinationThreshold
          key={destination.id}
          destination={destination}
          active={props.active?.id === destination.id}
          nearby={props.nearbyId.current === destination.id}
          walkTarget={props.walkTarget}
          onApproach={() => props.onApproach(destination)}
          onEnter={() => props.onEnter(destination)}
          reducedMotion={props.reducedMotion}
        />
      ))}
      <WorkforcePresence reducedMotion={props.reducedMotion} />
    </>
  )
}

export default EmbodiedGroundScene
