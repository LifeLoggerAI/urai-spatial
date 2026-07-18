'use client'

import { Html, Line, PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { stepEmbodiedMotion, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
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

const GROUND_SPAWN = new THREE.Vector3(0, 0, 8.2)
const GROUND_BOUNDS = { minX: -13, maxX: 13, minZ: -33.2, maxZ: 9 }
const NEXUS = new THREE.Vector3(0, 0, -10.5)

function approachPoint(destination: GroundDestination) {
  const target = new THREE.Vector3(...destination.position)
  const towardArrival = GROUND_SPAWN.clone().sub(target).setY(0)
  if (towardArrival.lengthSq() < 0.01) towardArrival.set(0, 0, 1)
  return target.add(towardArrival.normalize().multiplyScalar(2.15)).setY(0)
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -12]} onClick={choose} name="ground-walkable-navigation-surface" data-testid="urai-ground-walkable-surface">
      <planeGeometry args={[28, 44]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} colorWrite={false} />
    </mesh>
  )
}

function GroundPaths() {
  const paths = useMemo(() => DESTINATIONS.map((destination) => {
    const destinationPoint = new THREE.Vector3(...destination.position)
    const midpoint = destination.layer === 'deep'
      ? new THREE.Vector3(destinationPoint.x * 0.35, 0.02, -20.5)
      : destination.layer === 'continuity'
        ? new THREE.Vector3(destinationPoint.x * 0.3, 0.02, -15.4)
        : NEXUS.clone().setY(0.02)
    return { destination, points: [GROUND_SPAWN.clone().setY(0.02), NEXUS.clone().setY(0.02), midpoint, destinationPoint.clone().setY(0.02)] }
  }), [])

  return (
    <group name="ground-walkable-path-network">
      <Line points={[GROUND_SPAWN.clone().setY(0.025), NEXUS.clone().setY(0.025)]} color="#a5f3fc" transparent opacity={0.34} lineWidth={1.2} />
      {paths.map(({ destination, points }) => (
        <Line key={destination.id} points={points} color={destination.color} transparent opacity={destination.availability === 'offline' ? 0.05 : destination.workforceState === 'blocked' ? 0.12 : 0.22} lineWidth={destination.ownerBoundary ? 1.5 : 1} dashed={destination.workforceState === 'blocked'} dashSize={0.25} gapSize={0.22} />
      ))}
    </group>
  )
}

function GroundNexus({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = clock.elapsedTime * 0.025
    group.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.42) * 0.018)
  })
  return (
    <group ref={group} position={NEXUS} name="ground-central-nexus" data-testid="urai-ground-central-nexus">
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.3, 2.4, 96]} /><meshBasicMaterial color="#8beef6" transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[3.45, 3.5, 96]} /><meshBasicMaterial color="#c4b5fd" transparent opacity={0.12} depthWrite={false} toneMapped={false} /></mesh>
      <pointLight position={[0, 1.1, 0]} color="#67e8f9" intensity={2.8} distance={10} decay={2} />
    </group>
  )
}

function DestinationThreshold({
  destination,
  active,
  nearby,
  walkTarget,
  onApproach,
  onEnter,
  reducedMotion,
}: {
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
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.5 + destination.position[0]) * 0.018
    group.current.scale.setScalar((active || nearby) ? pulse * 1.04 : pulse)
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby) onEnter()
    else {
      onApproach()
      walkTarget.current = approachPoint(destination)
    }
  }
  const opacity = destination.workforceState === 'blocked' ? 0.18 : destination.availability === 'offline' ? 0.1 : 0.34
  return (
    <group ref={group} position={destination.position} name={`ground-enterable-threshold-${destination.id}`} data-testid={`urai-ground-chamber-${destination.id}`} userData={{ groundDestination: destination.id, workforceState: destination.workforceState, availability: destination.availability }}>
      <mesh onClick={activate} position={[0, 1.45, 0]}>
        <sphereGeometry args={[2.05, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.72, nearby ? 0.9 : 0.8, 72]} /><meshBasicMaterial color={color} transparent opacity={nearby ? 0.9 : active ? 0.64 : opacity} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[-0.78, 1.4, 0]}><cylinderGeometry args={[0.035, 0.055, 2.8, 12]} /><meshBasicMaterial color={color} transparent opacity={active || nearby ? 0.62 : opacity * 0.7} /></mesh>
      <mesh position={[0.78, 1.4, 0]}><cylinderGeometry args={[0.035, 0.055, 2.8, 12]} /><meshBasicMaterial color={color} transparent opacity={active || nearby ? 0.62 : opacity * 0.7} /></mesh>
      <mesh position={[0, 2.78, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.055, 1.56, 12]} /><meshBasicMaterial color={color} transparent opacity={active || nearby ? 0.62 : opacity * 0.7} /></mesh>
      <pointLight position={[0, 2.1, 0.5]} color={color} intensity={nearby ? 6 : active ? 3.8 : 1.1} distance={nearby ? 9 : 5} decay={2} />
      {(active || nearby) ? (
        <Html position={[0, 3.55, 0]} center distanceFactor={10} zIndexRange={[80, 20]}>
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
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.02
  })
  return (
    <group ref={group} name="ground-workforce-and-council-presences">
      {DESTINATIONS.slice(0, 9).map((destination, index) => (
        <group key={destination.id} position={[destination.position[0] * 0.82 + (index % 2 ? 0.55 : -0.55), destination.position[1], destination.position[2] + 1.3]}>
          <mesh position={[0, 0.68, 0]}><capsuleGeometry args={[0.12, 0.62, 6, 12]} /><meshBasicMaterial color={destination.color} transparent opacity={destination.workforceState === 'blocked' ? 0.08 : 0.19} depthWrite={false} /></mesh>
          <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.12, 12, 12]} /><meshBasicMaterial color={destination.color} transparent opacity={destination.workforceState === 'blocked' ? 0.1 : 0.28} depthWrite={false} /></mesh>
        </group>
      ))}
    </group>
  )
}

function GroundPlayerCamera({
  input,
  yaw,
  pitch,
  walkTarget,
  nearbyId,
  resetVersion,
  reducedMotion,
  onNearbyChange,
  onMovementState,
}: Pick<EmbodiedGroundSceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearbyId' | 'resetVersion' | 'reducedMotion' | 'onNearbyChange' | 'onMovementState'>) {
  const { size } = useThree()
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const position = useRef(GROUND_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const lastNearby = useRef<string | null>(null)
  const lastMoving = useRef(false)

  useEffect(() => {
    position.current.copy(GROUND_SPAWN)
    velocity.current.set(0, 0, 0)
    walkTarget.current = null
    nearbyId.current = null
  }, [nearbyId, resetVersion, walkTarget])

  useFrame((_, delta) => {
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
      obstacles: DESTINATIONS.map((destination) => ({ x: destination.position[0], z: destination.position[2], radius: destination.id === 'council' ? 1.65 : 1.35 })),
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
    camera.position.set(position.current.x, size.width < 700 ? 1.58 : 1.72, position.current.z)
    direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
    lookAt.current.copy(camera.position).add(direction.current)
    camera.lookAt(lookAt.current)
    camera.fov = THREE.MathUtils.damp(camera.fov, size.width < 700 ? 62 : 55, reducedMotion ? 100 : 6, delta)
    camera.updateProjectionMatrix()
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1.72, 8.2]} fov={55} near={0.08} far={160} />
}

export function EmbodiedGroundScene(props: EmbodiedGroundSceneProps) {
  return (
    <>
      <GroundPlayerCamera {...props} />
      <ambientLight intensity={0.26} color="#dbeafe" />
      <Stars radius={92} depth={58} count={props.reducedMotion ? 180 : 420} factor={1.7} saturation={0.18} fade speed={props.reducedMotion ? 0 : 0.018} />
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
