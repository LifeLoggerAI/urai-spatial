'use client'

import { Float, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import type { UraiDestination } from '@/spatial/world/worldTypes'

export type SpatialRealmKind = 'shadow' | 'council'

type PortalDefinition = {
  id: string
  label: string
  destination: UraiDestination
  href: string
  position: [number, number, number]
  color: string
  cameraCheckpoint: string
}

type RealmDefinition = {
  title: string
  subtitle: string
  background: string
  fog: string
  spawn: [number, number, number]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  portals: readonly PortalDefinition[]
}

const REALMS: Record<SpatialRealmKind, RealmDefinition> = {
  shadow: {
    title: 'Shadow Realm',
    subtitle: 'Walk the hidden pattern without becoming trapped inside it.',
    background: '#01030a',
    fog: '#050714',
    spawn: [0, 0, 10.8],
    bounds: { minX: -8.8, maxX: 8.8, minZ: -18.2, maxZ: 11.2 },
    portals: [
      { id: 'shadow-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=shadow', position: [-5.2, 0, -13.4], color: '#8de8ff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'shadow-replay', label: 'Replay', destination: 'replay', href: '/replay?from=shadow', position: [5.2, 0, -13.4], color: '#ff967e', cameraCheckpoint: 'replay-arrival' },
      { id: 'shadow-home', label: 'Home', destination: 'home', href: '/home?returnFrom=shadow', position: [0, 0, -17], color: '#c9adff', cameraCheckpoint: 'home-threshold' },
    ],
  },
  council: {
    title: 'Council Chamber',
    subtitle: 'A spatial chamber for guidance, stewardship, and governed decisions.',
    background: '#020712',
    fog: '#071326',
    spawn: [0, 0, 11.4],
    bounds: { minX: -9.6, maxX: 9.6, minZ: -18.2, maxZ: 11.8 },
    portals: [
      { id: 'council-passport', label: 'Passport', destination: 'passport', href: '/passport?from=council', position: [-6.4, 0, -13.4], color: '#f4cf82', cameraCheckpoint: 'passport-arrival' },
      { id: 'council-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=council', position: [6.4, 0, -13.4], color: '#a994ff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'council-home', label: 'Home', destination: 'home', href: '/home?returnFrom=council', position: [0, 0, -17], color: '#82dff4', cameraCheckpoint: 'home-threshold' },
    ],
  },
}

const CAMERA_HEIGHT = 1.7
const scratchDirection = new THREE.Vector3()

function RealmCamera({
  input,
  yaw,
  pitch,
  reducedMotion,
  resetVersion,
  realm,
  nearbyRef,
  onNearby,
  shellRef,
}: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  resetVersion: number
  realm: SpatialRealmKind
  nearbyRef: MutableRefObject<string | null>
  onNearby: (portal: PortalDefinition | null) => void
  shellRef: MutableRefObject<HTMLElement | null>
}) {
  const definition = REALMS[realm]
  const position = useRef(new THREE.Vector3(...definition.spawn))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const lastNearby = useRef<string | null>(null)

  useEffect(() => {
    position.current.set(...definition.spawn)
    velocity.current.set(0, 0, 0)
    target.current = null
    yaw.current = 0
    pitch.current = -0.035
  }, [definition.spawn, pitch, resetVersion, yaw])

  useFrame(({ camera }, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.5 : 2.45,
      acceleration: 8.8,
      deceleration: 10.5,
      bounds: definition.bounds,
      obstacles: realm === 'council'
        ? [{ x: 0, z: -5.8, radius: 2.05 }]
        : [{ x: 0, z: -7.6, radius: 1.45 }],
      arrivalRadius: 0.32,
    })

    camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
    scratchDirection.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(scratchDirection.add(camera.position))

    let nearest: PortalDefinition | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const portal of definition.portals) {
      const distance = Math.hypot(position.current.x - portal.position[0], position.current.z - portal.position[2])
      if (distance < 2.35 && distance < nearestDistance) {
        nearest = portal
        nearestDistance = distance
      }
    }

    const nextNearby = nearest?.id ?? null
    nearbyRef.current = nextNearby
    if (lastNearby.current !== nextNearby) {
      lastNearby.current = nextNearby
      onNearby(nearest)
    }

    if (shellRef.current) {
      shellRef.current.dataset.realmReady = 'true'
      shellRef.current.dataset.realmCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.realmCameraZ = camera.position.z.toFixed(3)
      shellRef.current.dataset.realmNearby = nextNearby ?? ''
    }
  })

  return null
}

function PortalGateway({
  portal,
  active,
  onEnter,
  reducedMotion,
}: {
  portal: PortalDefinition
  active: boolean
  onEnter: (portal: PortalDefinition) => void
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.28 + portal.position[0]) * 0.045
    group.current.position.y = Math.sin(clock.elapsedTime * 0.55 + portal.position[2]) * 0.035
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onEnter(portal)
  }

  return (
    <group ref={group} position={portal.position} name={portal.id} userData={{ portalId: portal.id, label: portal.label }}>
      <mesh onClick={activate} castShadow>
        <torusGeometry args={[1.02, active ? 0.105 : 0.07, 16, 72]} />
        <meshStandardMaterial color={portal.color} emissive={portal.color} emissiveIntensity={active ? 2.1 : 0.74} metalness={0.72} roughness={0.16} />
      </mesh>
      <mesh position={[0, 0, -0.025]} onClick={activate}>
        <circleGeometry args={[0.92, 64]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.17 : 0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <torusGeometry args={[0.78, 0.012, 8, 64]} />
        <meshBasicMaterial color="#f7fdff" transparent opacity={active ? 0.5 : 0.18} />
      </mesh>
      <pointLight color={portal.color} intensity={active ? 3.2 : 1.15} distance={5.8} decay={2} />
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 1.1, 64]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.28 : 0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ShadowMonolith({
  side,
  index,
  reducedMotion,
}: {
  side: -1 | 1
  index: number
  reducedMotion: boolean
}) {
  const z = 7.1 - index * 1.5
  const distance = 3.45 + (index % 3) * 0.52
  const height = 2.5 + (index % 5) * 0.62
  const width = 0.72 + (index % 4) * 0.18
  const lean = side * (0.09 + (index % 3) * 0.035)
  const violet = index % 4 !== 1
  const glow = violet ? '#6554d8' : '#b65a57'

  return (
    <group position={[side * distance, height * 0.48 - 0.1, z]} rotation={[0.02 * (index % 3), side * (0.18 + index * 0.035), lean]}>
      <mesh castShadow receiveShadow scale={[width, height, 0.82 + (index % 2) * 0.22]}>
        <cylinderGeometry args={[0.38, 0.72, 1, 5, 1]} />
        <meshStandardMaterial color={violet ? '#0b0d23' : '#17101a'} emissive={glow} emissiveIntensity={0.075} metalness={0.58} roughness={0.34} />
      </mesh>
      <mesh position={[-side * 0.06, 0.08, 0.56]} rotation={[0, 0, -lean]} scale={[0.018, height * 0.72, 0.018]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={glow} transparent opacity={reducedMotion ? 0.34 : 0.5} />
      </mesh>
      {index % 3 === 0 && (
        <mesh position={[side * 0.18, height * 0.28, 0.18]} rotation={[0.4, index * 0.28, 0.2]}>
          <tetrahedronGeometry args={[0.3 + (index % 2) * 0.08, 0]} />
          <meshStandardMaterial color="#11142e" emissive={glow} emissiveIntensity={0.18} metalness={0.66} roughness={0.2} />
        </mesh>
      )}
    </group>
  )
}

function ShadowRib({ z, index }: { z: number; index: number }) {
  const radius = 3.05 + (index % 2) * 0.22
  const color = index % 3 === 1 ? '#8f4f5a' : '#4b4c9e'
  return (
    <group position={[0, 0, z]}>
      <mesh position={[-radius, 1.25, 0]} rotation={[0, 0, 0.035]}>
        <cylinderGeometry args={[0.055, 0.085, 2.5, 8]} />
        <meshStandardMaterial color="#16182a" emissive={color} emissiveIntensity={0.18} metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[radius, 1.25, 0]} rotation={[0, 0, -0.035]}>
        <cylinderGeometry args={[0.055, 0.085, 2.5, 8]} />
        <meshStandardMaterial color="#16182a" emissive={color} emissiveIntensity={0.18} metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[radius, 0.065, 8, 64, Math.PI]} />
        <meshStandardMaterial color="#17192c" emissive={color} emissiveIntensity={0.16} metalness={0.76} roughness={0.2} />
      </mesh>
    </group>
  )
}

function ShadowRealmEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const monoliths = useMemo(() => Array.from({ length: 13 }, (_, index) => index), [])
  const ribs = useMemo(() => [-0.4, -3.6, -6.8, -10, -13.2], [])

  return (
    <group name="shadow-realm-environment">
      <ambientLight intensity={0.14} />
      <hemisphereLight intensity={0.3} color="#536d9b" groundColor="#03030a" />
      <directionalLight position={[-5, 10, 8]} intensity={0.82} color="#8aa7ca" castShadow />
      <spotLight position={[0, 8, 4]} target-position={[0, 0, -8]} intensity={2.2} angle={0.42} penumbra={0.8} distance={34} color="#6372d8" />
      <pointLight position={[0, 1.8, -8]} intensity={3.2} distance={14} color="#7a5ce2" />
      <pointLight position={[0, 0.5, -14]} intensity={1.8} distance={11} color="#b65b59" />
      <Stars radius={72} depth={42} count={reducedMotion ? 180 : 520} factor={1.8} fade speed={reducedMotion ? 0 : 0.01} />
      <Sparkles count={reducedMotion ? 32 : 92} scale={[20, 10, 34]} position={[0, 3, -7]} size={0.75} speed={reducedMotion ? 0 : 0.035} color="#746fbc" opacity={0.22} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -4.8]} receiveShadow>
        <planeGeometry args={[22, 42, 1, 1]} />
        <meshStandardMaterial color="#03050c" emissive="#0e1430" emissiveIntensity={0.045} metalness={0.42} roughness={0.68} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.185, -5.2]}>
        <planeGeometry args={[3.7, 39]} />
        <meshStandardMaterial color="#080a18" emissive="#312a78" emissiveIntensity={0.055} metalness={0.48} roughness={0.5} />
      </mesh>

      {Array.from({ length: 15 }, (_, index) => {
        const z = 8.1 - index * 1.32
        const offset = Math.sin(index * 0.8) * 0.25
        const width = 2.35 + (index % 3) * 0.3
        return (
          <mesh key={`shadow-path-${index}`} position={[offset, -0.12, z]} rotation={[0, Math.sin(index * 0.48) * 0.075, 0]} receiveShadow>
            <boxGeometry args={[width, 0.08, 0.84]} />
            <meshStandardMaterial color="#0a0d1f" emissive={index % 5 === 2 ? '#6b4bc4' : '#20285c'} emissiveIntensity={0.07} metalness={0.52} roughness={0.42} />
          </mesh>
        )
      })}

      {monoliths.map((index) => (
        <group key={`shadow-bank-${index}`}>
          <ShadowMonolith side={-1} index={index} reducedMotion={reducedMotion} />
          <ShadowMonolith side={1} index={index} reducedMotion={reducedMotion} />
        </group>
      ))}

      {ribs.map((z, index) => <ShadowRib key={z} z={z} index={index} />)}

      <group position={[0, 1.65, -7.8]} name="shadow-integration-rift">
        <mesh position={[-0.7, 0, 0]} rotation={[0.04, 0.16, -0.17]} castShadow scale={[0.62, 3.5, 0.72]}>
          <cylinderGeometry args={[0.22, 0.55, 1, 5]} />
          <meshStandardMaterial color="#090b1d" emissive="#5044ad" emissiveIntensity={0.13} metalness={0.7} roughness={0.24} />
        </mesh>
        <mesh position={[0.7, 0, 0]} rotation={[-0.03, -0.14, 0.17]} castShadow scale={[0.62, 3.5, 0.72]}>
          <cylinderGeometry args={[0.22, 0.55, 1, 5]} />
          <meshStandardMaterial color="#110b17" emissive="#a34f57" emissiveIntensity={0.13} metalness={0.7} roughness={0.24} />
        </mesh>
        <mesh scale={[0.07, 2.65, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#d4d2ff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <ringGeometry args={[1.22, 1.27, 72]} />
          <meshBasicMaterial color="#7665d6" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, 0.62]}>
          <ringGeometry args={[1.58, 1.615, 72]} />
          <meshBasicMaterial color="#ad5d65" transparent opacity={0.16} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

type CouncilSeatDefinition = {
  x: number
  z: number
  yaw: number
  color: string
  scale: number
}

function CouncilPresence({
  seat,
  reducedMotion,
  index,
}: {
  seat: CouncilSeatDefinition
  reducedMotion: boolean
  index: number
}) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.position.y = Math.sin(clock.elapsedTime * 0.35 + index * 0.8) * 0.035
  })

  return (
    <group ref={root} position={[seat.x, 0, seat.z]} rotation={[0, seat.yaw, 0]} scale={seat.scale}>
      <mesh position={[0, 0.13, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.86, 1.02, 0.28, 8]} />
        <meshStandardMaterial color="#0a1425" emissive={seat.color} emissiveIntensity={0.055} metalness={0.62} roughness={0.27} />
      </mesh>
      <mesh position={[-0.66, 1.68, -0.18]}>
        <cylinderGeometry args={[0.055, 0.075, 3.05, 8]} />
        <meshStandardMaterial color="#17243a" emissive={seat.color} emissiveIntensity={0.14} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0.66, 1.68, -0.18]}>
        <cylinderGeometry args={[0.055, 0.075, 3.05, 8]} />
        <meshStandardMaterial color="#17243a" emissive={seat.color} emissiveIntensity={0.14} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.2, -0.18]}>
        <torusGeometry args={[0.66, 0.065, 10, 54, Math.PI]} />
        <meshStandardMaterial color="#17243a" emissive={seat.color} emissiveIntensity={0.18} metalness={0.72} roughness={0.18} />
      </mesh>

      <mesh position={[0, 1.48, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.48, 1.85, 6, 1]} />
        <meshStandardMaterial color="#111b2c" emissive={seat.color} emissiveIntensity={0.2} metalness={0.48} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.58, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#eefcff" emissive={seat.color} emissiveIntensity={0.92} metalness={0.2} roughness={0.12} />
      </mesh>
      <mesh position={[0, 2.62, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.54, 0.025, 8, 52]} />
        <meshBasicMaterial color={seat.color} transparent opacity={0.48} />
      </mesh>
      <mesh position={[0, 1.57, 0.33]}>
        <circleGeometry args={[0.105, 32]} />
        <meshBasicMaterial color={seat.color} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 2.05, 0.55]} color={seat.color} intensity={1.25} distance={4.5} />
    </group>
  )
}

function CouncilColumn({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[0.46, 0.58, 0.32, 10]} />
        <meshStandardMaterial color="#0b1729" metalness={0.62} roughness={0.26} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.31, 5.1, 10]} />
        <meshStandardMaterial color="#0d1a2d" emissive="#31506d" emissiveIntensity={0.08} metalness={0.68} roughness={0.24} />
      </mesh>
      <mesh position={[0, 5.25, 0]}>
        <cylinderGeometry args={[0.52, 0.35, 0.26, 10]} />
        <meshStandardMaterial color="#13253a" emissive="#6a8daa" emissiveIntensity={0.09} metalness={0.72} roughness={0.2} />
      </mesh>
    </group>
  )
}

function CouncilRealmEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const seats = useMemo<readonly CouncilSeatDefinition[]>(() => [
    { x: -5.6, z: -8.2, yaw: 0.38, color: '#7fdced', scale: 0.88 },
    { x: -3.45, z: -9.2, yaw: 0.22, color: '#9b8ce8', scale: 0.94 },
    { x: -1.18, z: -9.72, yaw: 0.07, color: '#d3b36e', scale: 1 },
    { x: 1.18, z: -9.72, yaw: -0.07, color: '#cc86b5', scale: 1 },
    { x: 3.45, z: -9.2, yaw: -0.22, color: '#78badc', scale: 0.94 },
    { x: 5.6, z: -8.2, yaw: -0.38, color: '#d6c58d', scale: 0.88 },
  ], [])
  const columns = useMemo(() => [-8.4, -6.3, -4.2, -2.1, 0, 2.1, 4.2, 6.3, 8.4], [])

  return (
    <group name="council-chamber-environment">
      <ambientLight intensity={0.2} />
      <hemisphereLight intensity={0.48} color="#b9dcec" groundColor="#030914" />
      <directionalLight position={[5, 11, 8]} intensity={1.1} color="#e8f5ff" castShadow />
      <spotLight position={[0, 10, 1]} target-position={[0, 0, -6]} intensity={3.25} angle={0.42} penumbra={0.88} distance={36} color="#b8eaf4" />
      <pointLight position={[0, 4.2, -6]} intensity={3.4} distance={17} color="#7ddbe7" />
      <Stars radius={78} depth={42} count={reducedMotion ? 180 : 520} factor={1.65} fade speed={reducedMotion ? 0 : 0.009} />
      <Sparkles count={reducedMotion ? 28 : 86} scale={[24, 12, 34]} position={[0, 3.5, -7]} size={0.7} speed={reducedMotion ? 0 : 0.03} color="#9bcbd7" opacity={0.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, -6]} receiveShadow>
        <cylinderGeometry args={[10.8, 11.4, 0.42, 96]} />
        <meshStandardMaterial color="#050d1a" emissive="#162d49" emissiveIntensity={0.05} metalness={0.62} roughness={0.3} />
      </mesh>
      {[2.2, 4.25, 6.45, 8.75].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015 + index * 0.003, -6]}>
          <ringGeometry args={[radius - 0.035, radius, 96]} />
          <meshBasicMaterial color={index % 2 ? '#7685a8' : '#6eaab7'} transparent opacity={0.12 + index * 0.012} />
        </mesh>
      ))}

      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        const length = index % 3 === 0 ? 8.7 : 7.6
        return (
          <mesh key={`council-inlay-${index}`} position={[0, -0.005, -6]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.025, length]} />
            <meshBasicMaterial color={index % 3 === 0 ? '#d2bd80' : '#6c9eaa'} transparent opacity={0.14} side={THREE.DoubleSide} />
          </mesh>
        )
      })}

      <mesh position={[0, 0.02, -6]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.45, 0.28, 64]} />
        <meshStandardMaterial color="#091424" emissive="#405b72" emissiveIntensity={0.06} metalness={0.68} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.23, -6]} receiveShadow>
        <cylinderGeometry args={[1.58, 1.82, 0.18, 64]} />
        <meshStandardMaterial color="#0d1a2c" emissive="#6b725e" emissiveIntensity={0.06} metalness={0.72} roughness={0.18} />
      </mesh>

      {columns.map((x, index) => <CouncilColumn key={x} x={x} z={-12.3 + Math.abs(x) * 0.08} scale={index === 0 || index === columns.length - 1 ? 0.92 : 1} />)}
      <mesh position={[0, 5.43, -12.25]}>
        <boxGeometry args={[18.2, 0.18, 0.28]} />
        <meshStandardMaterial color="#122339" emissive="#63839a" emissiveIntensity={0.08} metalness={0.72} roughness={0.2} />
      </mesh>
      <mesh position={[0, 6.15, -7.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.3, 0.065, 10, 96]} />
        <meshStandardMaterial color="#1a2d42" emissive="#6ba4ad" emissiveIntensity={0.14} metalness={0.76} roughness={0.18} />
      </mesh>

      {seats.map((seat, index) => <CouncilPresence key={`${seat.x}-${seat.z}`} seat={seat} reducedMotion={reducedMotion} index={index} />)}

      <group position={[0, 1.48, -6]} name="council-stewardship-instrument">
        <Float speed={reducedMotion ? 0 : 0.35} rotationIntensity={reducedMotion ? 0 : 0.06} floatIntensity={reducedMotion ? 0 : 0.08}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.72, 3]} />
            <meshStandardMaterial color="#d7f7f8" emissive="#6ed6df" emissiveIntensity={0.72} metalness={0.22} roughness={0.1} />
          </mesh>
          {[1.12, 1.48, 1.86].map((radius, index) => (
            <mesh key={radius} rotation={[Math.PI / 2, index * 0.56, index * 0.42]}>
              <torusGeometry args={[radius, 0.025, 8, 72]} />
              <meshBasicMaterial color={index === 1 ? '#d8c484' : '#80d3df'} transparent opacity={0.34 - index * 0.055} />
            </mesh>
          ))}
        </Float>
        <mesh position={[0, -0.2, 0]} scale={[0.055, 4.5, 0.055]}>
          <cylinderGeometry args={[1, 1, 1, 12]} />
          <meshBasicMaterial color="#a9eff4" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

export default function SpatialRealmExperience({ realm }: { realm: SpatialRealmKind }) {
  const definition = REALMS[realm]
  const reducedMotion = useReducedMotion()
  const shellRef = useRef<HTMLElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.035)
  const nearbyRef = useRef<string | null>(null)
  const [nearby, setNearby] = useState<PortalDefinition | null>(null)
  const [resetVersion, setResetVersion] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false)

  const enterPortal = useCallback((portal: PortalDefinition) => {
    requestUraiWorldTravel({
      destination: portal.destination,
      href: portal.href,
      entryPortal: portal.id,
      cameraCheckpoint: portal.cameraCheckpoint,
    })
  }, [])

  const input = useMovementInput({
    onEscape: () => requestUraiWorldReturn(),
    onInteract: () => {
      const portal = definition.portals.find((candidate) => candidate.id === nearbyRef.current)
      if (portal) enterPortal(portal)
    },
    onReset: () => setResetVersion((value) => value + 1),
  })

  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.002 : 0.0032, onDragState: setDragging })

  useEffect(() => {
    let second: number | null = null
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setReady(true))
    })
    return () => {
      window.cancelAnimationFrame(first)
      if (second !== null) window.cancelAnimationFrame(second)
    }
  }, [])

  return (
    <main
      ref={shellRef}
      className="urai-spatial-realm-experience"
      data-testid={`urai-${realm}-spatial-realm`}
      data-spatial-realm={realm}
      data-spatial-owner="canonical-route-owned-r3f"
      data-spatial-exploration="walkable"
      data-realm-ready={ready ? 'true' : 'false'}
      data-camera-mode={dragging ? 'look' : 'embodied'}
      aria-label={`URAI ${definition.title}`}
      {...look}
    >
      <Canvas
        shadows
        dpr={[1, 1.55]}
        camera={{ position: [definition.spawn[0], CAMERA_HEIGHT, definition.spawn[2]], fov: 52, near: 0.05, far: 260 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(definition.background), 1)
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = realm === 'council' ? 1.02 : 0.96
        }}
      >
        <color attach="background" args={[definition.background]} />
        <fog attach="fog" args={[definition.fog, realm === 'council' ? 9 : 7, 42]} />
        <RealmCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} resetVersion={resetVersion} realm={realm} nearbyRef={nearbyRef} onNearby={setNearby} shellRef={shellRef} />
        {realm === 'shadow' ? <ShadowRealmEnvironment reducedMotion={reducedMotion} /> : <CouncilRealmEnvironment reducedMotion={reducedMotion} />}
        {definition.portals.map((portal) => <PortalGateway key={portal.id} portal={portal} active={nearby?.id === portal.id} onEnter={enterPortal} reducedMotion={reducedMotion} />)}
      </Canvas>

      <div className="urai-spatial-realm-vignette" aria-hidden="true" />
      <div className="urai-spatial-realm-reticle" aria-hidden="true" />

      <header className="urai-spatial-realm-header">
        <p>URAI · {realm === 'shadow' ? 'INTEGRATION' : 'STEWARDSHIP'}</p>
        <h1>{definition.title}</h1>
        <span>{definition.subtitle}</span>
      </header>

      <section className="urai-spatial-realm-prompt" data-active={nearby ? 'true' : 'false'} role="status" aria-live="polite">
        <strong>{nearby ? `${nearby.label} threshold within reach` : `Walking through ${definition.title}`}</strong>
        <span>{nearby ? 'Press Enter or select the portal' : 'WASD / arrows move · drag to look · R resets · Escape returns'}</span>
      </section>

      <nav className="urai-spatial-realm-portals" aria-label={`${definition.title} destinations`}>
        {definition.portals.map((portal) => (
          <button key={portal.id} type="button" onClick={() => enterPortal(portal)} aria-label={`Travel to ${portal.label}`}>
            <span style={{ background: portal.color }} aria-hidden="true" />
            {portal.label}
          </button>
        ))}
      </nav>

      <MovementHelp realm={definition.title} summary={definition.subtitle} controls="WASD or arrows move. Drag to look. Enter activates a nearby portal. R resets. Escape returns." />
      <MobileMovementPad input={input} label={`${definition.title} movement controls`} />

      <style jsx>{`
        .urai-spatial-realm-experience{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:${definition.background};color:#f4f8fb;isolation:isolate;outline:none;touch-action:none;cursor:grab;font-family:Inter,ui-sans-serif,system-ui}.urai-spatial-realm-experience[data-camera-mode='look']{cursor:grabbing}.urai-spatial-realm-experience canvas{position:absolute!important;inset:0;width:100%!important;height:100%!important;display:block;touch-action:none}.urai-spatial-realm-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 42%,transparent 34%,rgba(0,3,10,.18) 68%,rgba(0,2,8,.72) 116%),linear-gradient(180deg,rgba(0,3,10,.18),transparent 32%,transparent 66%,rgba(0,2,9,.72))}.urai-spatial-realm-reticle{position:absolute;z-index:3;left:50%;top:50%;width:4px;height:4px;border:1px solid rgba(224,247,255,.56);border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(160,228,255,.28);pointer-events:none}.urai-spatial-realm-header{position:absolute;z-index:6;left:max(20px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(390px,calc(100vw - 40px));pointer-events:none;text-shadow:0 10px 36px rgba(0,0,0,.78)}.urai-spatial-realm-header p{margin:0;color:#8ed9e8;font-size:10px;font-weight:850;letter-spacing:.24em;text-transform:uppercase}.urai-spatial-realm-header h1{margin:8px 0 0;font-size:clamp(34px,4.4vw,58px);font-weight:520;line-height:.92;letter-spacing:-.055em}.urai-spatial-realm-header span{display:block;margin-top:11px;max-width:370px;color:rgba(220,235,241,.68);font-size:12px;line-height:1.48}.urai-spatial-realm-prompt{position:absolute;z-index:7;left:50%;bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px));transform:translateX(-50%);display:grid;gap:3px;width:min(440px,calc(100vw - 40px));padding:9px 14px;border:1px solid rgba(185,225,237,.14);border-radius:13px;background:rgba(3,9,18,.62);box-shadow:0 15px 45px rgba(0,0,0,.25);backdrop-filter:blur(14px);text-align:center;pointer-events:none}.urai-spatial-realm-prompt strong{font-size:10px;letter-spacing:.105em;text-transform:uppercase}.urai-spatial-realm-prompt span{font-size:9px;color:rgba(195,218,228,.58)}.urai-spatial-realm-portals{position:absolute;z-index:8;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:7px;max-width:calc(100vw - 32px);padding:3px}.urai-spatial-realm-portals button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(188,226,238,.16);border-radius:999px;background:rgba(3,10,20,.68);box-shadow:0 12px 32px rgba(0,0,0,.22);backdrop-filter:blur(12px);color:rgba(238,246,249,.9);font-size:12px;font-weight:720;cursor:pointer;white-space:nowrap}.urai-spatial-realm-portals button:hover{background:rgba(10,25,39,.84);border-color:rgba(195,234,244,.3)}.urai-spatial-realm-portals button span{width:6px;height:6px;border-radius:50%;box-shadow:0 0 14px currentColor}.urai-spatial-realm-portals button:focus-visible{outline:2px solid #fff;outline-offset:3px}:global(.urai-mobile-movement){display:none!important}:global(.urai-movement-help){top:max(16px,env(safe-area-inset-top))!important;right:max(16px,env(safe-area-inset-right))!important;max-width:220px!important;border-color:rgba(190,228,239,.14)!important;border-radius:13px!important;background:rgba(3,10,20,.58)!important;box-shadow:0 12px 40px rgba(0,0,0,.22)!important}:global(.urai-movement-help summary){min-height:40px!important;padding:0 13px!important;font-size:10px!important;color:rgba(227,240,245,.72)!important}@media(max-width:700px){.urai-spatial-realm-vignette{background:linear-gradient(180deg,rgba(0,3,10,.5),transparent 25%,transparent 64%,rgba(0,2,9,.76)),radial-gradient(circle at 50% 48%,transparent 20%,rgba(0,2,8,.22) 78%,rgba(0,2,8,.64))}.urai-spatial-realm-reticle{opacity:.62}.urai-spatial-realm-header{left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));max-width:calc(100vw - 32px)}.urai-spatial-realm-header h1{margin-top:7px;font-size:34px;line-height:.96;white-space:nowrap}.urai-spatial-realm-header span{margin-top:9px;max-width:280px;font-size:11px;line-height:1.42}.urai-spatial-realm-prompt{bottom:max(176px,calc(env(safe-area-inset-bottom) + 164px));width:calc(100vw - 24px);padding:8px 12px}.urai-spatial-realm-prompt[data-active='false']{display:none}.urai-spatial-realm-portals{left:auto;right:max(10px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));transform:none;flex-direction:column;align-items:stretch;gap:6px;width:112px;max-width:112px;padding:0}.urai-spatial-realm-portals button{min-height:38px;width:100%;padding:0 11px;justify-content:flex-start;font-size:11px}.urai-spatial-realm-portals button span{width:5px;height:5px}:global(.urai-movement-help){display:none!important}:global(.urai-mobile-movement){display:grid!important;left:max(10px,env(safe-area-inset-left))!important;bottom:max(12px,env(safe-area-inset-bottom))!important;transform:scale(.82)!important;transform-origin:left bottom!important}}@media(prefers-reduced-motion:reduce){.urai-spatial-realm-prompt,.urai-spatial-realm-portals button{backdrop-filter:none}}
      `}</style>
    </main>
  )
}
