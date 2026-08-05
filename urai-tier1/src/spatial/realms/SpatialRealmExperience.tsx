'use client'

import {
  Environment,
  Float,
  Lightformer,
  Line,
  RoundedBox,
  Sparkles,
  Stars,
} from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
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
    background: '#02030a',
    fog: '#08071a',
    spawn: [0, 0, 10.6],
    bounds: { minX: -8.7, maxX: 8.7, minZ: -19.2, maxZ: 11.1 },
    portals: [
      { id: 'shadow-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=shadow', position: [-5.2, 0.4, -15], color: '#8ee8ff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'shadow-replay', label: 'Replay', destination: 'replay', href: '/replay?from=shadow', position: [5.2, 0.4, -15], color: '#ff9d7d', cameraCheckpoint: 'replay-arrival' },
      { id: 'shadow-home', label: 'Home', destination: 'home', href: '/home?returnFrom=shadow', position: [0, 0.4, -18], color: '#c7a8ff', cameraCheckpoint: 'home-threshold' },
    ],
  },
  council: {
    title: 'Council Chamber',
    subtitle: 'A spatial chamber for guidance, stewardship, and governed decisions.',
    background: '#030915',
    fog: '#0a1729',
    spawn: [0, 0, 11.2],
    bounds: { minX: -9.2, maxX: 9.2, minZ: -18.5, maxZ: 11.7 },
    portals: [
      { id: 'council-passport', label: 'Passport', destination: 'passport', href: '/passport?from=council', position: [-6.3, 0.5, -14.2], color: '#f3ca7c', cameraCheckpoint: 'passport-arrival' },
      { id: 'council-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=council', position: [6.3, 0.5, -14.2], color: '#a99cff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'council-home', label: 'Home', destination: 'home', href: '/home?returnFrom=council', position: [0, 0.5, -17.4], color: '#83def0', cameraCheckpoint: 'home-threshold' },
    ],
  },
}

const CAMERA_HEIGHT = 1.72
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
    pitch.current = realm === 'council' ? -0.045 : -0.02
  }, [definition.spawn, pitch, realm, resetVersion, yaw])

  useFrame(({ camera }, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.5 : 2.4,
      acceleration: 8.6,
      deceleration: 10.6,
      bounds: definition.bounds,
      obstacles: realm === 'council'
        ? [{ x: 0, z: -6.1, radius: 2.45 }]
        : [{ x: 0, z: -10.2, radius: 1.4 }],
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
      if (distance < 2.4 && distance < nearestDistance) {
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
  const root = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.24 + portal.position[0]) * 0.035
    root.current.position.y = portal.position[1] + Math.sin(clock.elapsedTime * 0.55 + portal.position[2]) * 0.045
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onEnter(portal)
  }

  return (
    <group ref={root} position={portal.position} name={portal.id} userData={{ portalId: portal.id, label: portal.label }}>
      <mesh onClick={activate} castShadow>
        <torusGeometry args={[1.05, active ? 0.095 : 0.065, 16, 96]} />
        <meshPhysicalMaterial color={portal.color} emissive={portal.color} emissiveIntensity={active ? 3 : 1.2} metalness={0.76} roughness={0.12} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0, -0.03]} onClick={activate}>
        <circleGeometry args={[0.96, 72]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.16 : 0.065} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.72, 0.016, 8, 72]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={active ? 0.7 : 0.25} />
      </mesh>
      <pointLight color={portal.color} intensity={active ? 4 : 1.45} distance={6} decay={2} />
      <mesh position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 1.14, 72]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.3 : 0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ChamberColumn({ position, scale = 1, accent = '#77c9da' }: { position: [number, number, number]; scale?: number; accent?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.58, 0.74, 0.32, 12]} />
        <meshPhysicalMaterial color="#0a1526" metalness={0.78} roughness={0.25} clearcoat={0.65} />
      </mesh>
      <mesh position={[0, 2.85, 0]} castShadow>
        <cylinderGeometry args={[0.29, 0.36, 5.4, 12]} />
        <meshPhysicalMaterial color="#101e31" emissive={accent} emissiveIntensity={0.05} metalness={0.78} roughness={0.2} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, 5.6, 0]} castShadow>
        <cylinderGeometry args={[0.68, 0.38, 0.28, 12]} />
        <meshPhysicalMaterial color="#14263a" emissive={accent} emissiveIntensity={0.08} metalness={0.76} roughness={0.18} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 2.85, 0.31]} scale={[0.025, 4.4, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={accent} transparent opacity={0.36} />
      </mesh>
    </group>
  )
}

type CouncilSeatDefinition = {
  position: [number, number, number]
  rotation: number
  color: string
  scale: number
}

function CouncilPresence({ seat, reducedMotion, index }: { seat: CouncilSeatDefinition; reducedMotion: boolean; index: number }) {
  const root = useRef<THREE.Group>(null)
  const profile = useMemo(() => [
    new THREE.Vector2(0.08, -1.25),
    new THREE.Vector2(0.44, -1.08),
    new THREE.Vector2(0.55, -0.58),
    new THREE.Vector2(0.38, 0.18),
    new THREE.Vector2(0.26, 0.7),
    new THREE.Vector2(0.16, 1.12),
    new THREE.Vector2(0.1, 1.3),
  ], [])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.position.y = Math.sin(clock.elapsedTime * 0.32 + index * 0.8) * 0.035
    root.current.rotation.y = seat.rotation + Math.sin(clock.elapsedTime * 0.18 + index) * 0.012
  })

  return (
    <group ref={root} position={seat.position} rotation={[0, seat.rotation, 0]} scale={seat.scale}>
      <RoundedBox args={[1.7, 0.3, 1.55]} radius={0.12} smoothness={4} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#091322" emissive={seat.color} emissiveIntensity={0.045} metalness={0.72} roughness={0.24} clearcoat={0.68} />
      </RoundedBox>
      <RoundedBox args={[1.38, 3.8, 0.3]} radius={0.12} smoothness={4} position={[0, 2.05, -0.52]} castShadow>
        <meshPhysicalMaterial color="#0d1b2d" emissive={seat.color} emissiveIntensity={0.055} metalness={0.75} roughness={0.18} clearcoat={0.8} />
      </RoundedBox>
      <mesh position={[0, 1.55, 0.05]} castShadow>
        <latheGeometry args={[profile, 48]} />
        <meshPhysicalMaterial color="#152337" emissive={seat.color} emissiveIntensity={0.32} metalness={0.56} roughness={0.16} clearcoat={1} transparent opacity={0.94} />
      </mesh>
      <mesh position={[0, 2.92, 0.02]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <octahedronGeometry args={[0.25, 1]} />
        <meshPhysicalMaterial color="#f2fdff" emissive={seat.color} emissiveIntensity={1.25} metalness={0.18} roughness={0.08} clearcoat={1} />
      </mesh>
      <mesh position={[0, 3.12, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.58, 0.032, 10, 72]} />
        <meshBasicMaterial color={seat.color} transparent opacity={0.62} />
      </mesh>
      <mesh position={[0, 1.55, 0.46]}>
        <circleGeometry args={[0.095, 32]} />
        <meshBasicMaterial color={seat.color} transparent opacity={0.95} />
      </mesh>
      <pointLight position={[0, 2.2, 0.8]} color={seat.color} intensity={1.9} distance={5.2} />
    </group>
  )
}

function CouncilCeiling() {
  const spokes = useMemo(() => Array.from({ length: 12 }, (_, index) => index), [])
  return (
    <group position={[0, 6.4, -6.4]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.8, 0.28, 16, 128]} />
        <meshPhysicalMaterial color="#182b40" emissive="#7cc8d5" emissiveIntensity={0.08} metalness={0.82} roughness={0.14} clearcoat={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.7, 0.08, 12, 112]} />
        <meshBasicMaterial color="#94e9f1" transparent opacity={0.22} />
      </mesh>
      {spokes.map((index) => {
        const angle = (index / spokes.length) * Math.PI * 2
        return (
          <mesh key={index} rotation={[0, angle, 0]} position={[Math.sin(angle) * 3.35, 0, Math.cos(angle) * 3.35]}>
            <boxGeometry args={[0.08, 0.08, 6.7]} />
            <meshStandardMaterial color="#173049" emissive="#6da9bd" emissiveIntensity={0.05} metalness={0.8} roughness={0.22} />
          </mesh>
        )
      })}
      <pointLight color="#b7f4ff" intensity={4.5} distance={18} decay={2} />
    </group>
  )
}

function CouncilCore({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.11
  })

  return (
    <group position={[0, 1.5, -6.2]} name="council-stewardship-core">
      <mesh position={[0, -1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.35, 2.62, 0.46, 96]} />
        <meshPhysicalMaterial color="#091525" emissive="#55728f" emissiveIntensity={0.045} metalness={0.82} roughness={0.17} clearcoat={1} />
      </mesh>
      <mesh position={[0, -0.96, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.62, 1.9, 0.25, 96]} />
        <meshPhysicalMaterial color="#0e1d31" emissive="#a7905a" emissiveIntensity={0.05} metalness={0.82} roughness={0.14} clearcoat={1} />
      </mesh>
      <Float speed={reducedMotion ? 0 : 0.45} rotationIntensity={reducedMotion ? 0 : 0.08} floatIntensity={reducedMotion ? 0 : 0.13}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.82, 5]} />
          <meshPhysicalMaterial color="#d9fbff" emissive="#69d9e4" emissiveIntensity={1.2} metalness={0.18} roughness={0.06} clearcoat={1} />
        </mesh>
        <group ref={root}>
          {[1.3, 1.72, 2.12].map((radius, index) => (
            <mesh key={radius} rotation={[Math.PI / 2, index * 0.62, index * 0.4]}>
              <torusGeometry args={[radius, index === 1 ? 0.035 : 0.024, 10, 96]} />
              <meshBasicMaterial color={index === 1 ? '#e1c779' : '#8de7ef'} transparent opacity={0.42 - index * 0.055} />
            </mesh>
          ))}
        </group>
      </Float>
      <mesh position={[0, 2.55, 0]} scale={[0.06, 7.5, 0.06]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshBasicMaterial color="#a8f5ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <pointLight color="#8cecf3" intensity={5.5} distance={15} decay={2} />
    </group>
  )
}

function CouncilRealmEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const seats = useMemo<readonly CouncilSeatDefinition[]>(() => [
    { position: [-6.1, 0, -8.1], rotation: 0.34, color: '#79d7e6', scale: 0.88 },
    { position: [-3.9, 0, -9.6], rotation: 0.2, color: '#9b8be8', scale: 0.96 },
    { position: [-1.35, 0, -10.35], rotation: 0.06, color: '#d1b068', scale: 1.03 },
    { position: [1.35, 0, -10.35], rotation: -0.06, color: '#c982b1', scale: 1.03 },
    { position: [3.9, 0, -9.6], rotation: -0.2, color: '#75bbd9', scale: 0.96 },
    { position: [6.1, 0, -8.1], rotation: -0.34, color: '#d6c38a', scale: 0.88 },
  ], [])

  const floorRings = useMemo(() => [2.8, 4.4, 6.3, 8.5, 10.4], [])
  const columns = useMemo(() => [
    [-8.4, -10.5], [-6.2, -12.1], [-3.7, -13.1], [0, -13.55], [3.7, -13.1], [6.2, -12.1], [8.4, -10.5],
  ] as const, [])

  return (
    <group name="council-chamber-environment">
      <ambientLight intensity={0.38} />
      <hemisphereLight intensity={0.55} color="#c4e7f2" groundColor="#07101d" />
      <directionalLight position={[6, 10, 8]} intensity={1.6} color="#d8eff7" castShadow />
      <pointLight position={[-7, 3.5, -7]} intensity={3.2} distance={16} color="#7ed7e8" />
      <pointLight position={[7, 3.5, -7]} intensity={3} distance={16} color="#baa0ff" />
      <pointLight position={[0, 5.5, -11]} intensity={2.8} distance={14} color="#f0c778" />

      <Environment resolution={128}>
        <Lightformer intensity={2.4} color="#bde9f2" position={[0, 5, 4]} scale={[10, 2, 1]} />
        <Lightformer intensity={1.6} color="#7fa8c8" position={[-7, 3, -4]} rotation={[0, Math.PI / 2, 0]} scale={[8, 2, 1]} />
        <Lightformer intensity={1.5} color="#d0aa73" position={[7, 3, -4]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 2, 1]} />
      </Environment>

      <Stars radius={86} depth={46} count={reducedMotion ? 170 : 500} factor={1.45} fade speed={reducedMotion ? 0 : 0.008} />
      <Sparkles count={reducedMotion ? 28 : 100} scale={[28, 13, 38]} position={[0, 4, -7]} size={0.72} speed={reducedMotion ? 0 : 0.025} color="#a8e6ef" opacity={0.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.27, -6.2]} receiveShadow>
        <cylinderGeometry args={[11.7, 12.15, 0.48, 128]} />
        <meshPhysicalMaterial color="#050d18" emissive="#1a3148" emissiveIntensity={0.045} metalness={0.78} roughness={0.24} clearcoat={0.78} />
      </mesh>

      {floorRings.map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015 + index * 0.002, -6.2]}>
          <ringGeometry args={[radius - 0.035, radius, 128]} />
          <meshBasicMaterial color={index % 2 ? '#b69a5e' : '#63aebd'} transparent opacity={0.13 + index * 0.012} />
        </mesh>
      ))}

      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2
        return (
          <mesh key={`floor-spoke-${index}`} position={[0, -0.006, -6.2]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.018, index % 4 === 0 ? 10.6 : 8.8]} />
            <meshBasicMaterial color={index % 4 === 0 ? '#d0b36b' : '#619aa7'} transparent opacity={index % 4 === 0 ? 0.16 : 0.08} side={THREE.DoubleSide} />
          </mesh>
        )
      })}

      {columns.map(([x, z], index) => (
        <ChamberColumn key={`${x}-${z}`} position={[x, 0, z]} scale={index === 0 || index === columns.length - 1 ? 0.92 : 1} accent={index % 2 ? '#bc9de5' : '#78c8d7'} />
      ))}

      <mesh position={[0, 5.9, -13.25]} castShadow>
        <boxGeometry args={[18.3, 0.24, 0.46]} />
        <meshPhysicalMaterial color="#14283d" emissive="#6da7b5" emissiveIntensity={0.07} metalness={0.8} roughness={0.18} clearcoat={0.8} />
      </mesh>

      <mesh position={[0, 3.25, -14.15]}>
        <planeGeometry args={[18.8, 6.2]} />
        <meshPhysicalMaterial color="#081321" emissive="#183652" emissiveIntensity={0.055} metalness={0.52} roughness={0.48} side={THREE.DoubleSide} />
      </mesh>

      <CouncilCeiling />
      {seats.map((seat, index) => <CouncilPresence key={`${seat.position[0]}-${seat.position[2]}`} seat={seat} reducedMotion={reducedMotion} index={index} />)}
      <CouncilCore reducedMotion={reducedMotion} />
    </group>
  )
}

function ShadowBridgeSlab({ index }: { index: number }) {
  const z = 9 - index * 1.35
  const x = Math.sin(index * 0.82) * 0.34
  const width = 2.8 + (index % 4) * 0.42
  const depth = 1.1 + (index % 3) * 0.18
  const rotation = Math.sin(index * 0.62) * 0.1
  const lift = (index % 5) * 0.022
  return (
    <group position={[x, -0.04 + lift, z]} rotation={[0.01 * (index % 3), rotation, Math.sin(index * 0.5) * 0.025]}>
      <RoundedBox args={[width, 0.34, depth]} radius={0.07} smoothness={3} castShadow receiveShadow>
        <meshPhysicalMaterial color="#090a16" emissive={index % 5 === 2 ? '#3c277e' : '#151d4a'} emissiveIntensity={0.09} metalness={0.42} roughness={0.66} clearcoat={0.12} />
      </RoundedBox>
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.max(0.7, width - 0.5), 0.025]} />
        <meshBasicMaterial color={index % 4 === 1 ? '#b6616c' : '#7a5de0'} transparent opacity={0.38} />
      </mesh>
    </group>
  )
}

function ShadowTower({ position, scale = 1, accent = '#6f54ce', lean = 0 }: { position: [number, number, number]; scale?: number; accent?: string; lean?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, lean, lean * 0.16]}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.72, 3.6, 6]} />
        <meshPhysicalMaterial color="#080a18" emissive={accent} emissiveIntensity={0.08} metalness={0.58} roughness={0.4} clearcoat={0.18} />
      </mesh>
      <mesh position={[0, 3.9, 0]} castShadow>
        <coneGeometry args={[0.62, 1.6, 6]} />
        <meshPhysicalMaterial color="#0b0d20" emissive={accent} emissiveIntensity={0.11} metalness={0.58} roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.8, 0.38]} scale={[0.018, 2.6, 0.018]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={accent} transparent opacity={0.42} />
      </mesh>
      <pointLight position={[0, 1.4, 0.8]} color={accent} intensity={0.9} distance={4.5} />
    </group>
  )
}

function ShadowArch({ position, scale = 1, accent = '#7359d4' }: { position: [number, number, number]; scale?: number; accent?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-1.5, 1.75, 0]} castShadow>
        <boxGeometry args={[0.42, 3.5, 0.75]} />
        <meshPhysicalMaterial color="#090b18" emissive={accent} emissiveIntensity={0.07} metalness={0.54} roughness={0.46} />
      </mesh>
      <mesh position={[1.5, 1.75, 0]} castShadow>
        <boxGeometry args={[0.42, 3.5, 0.75]} />
        <meshPhysicalMaterial color="#090b18" emissive={accent} emissiveIntensity={0.07} metalness={0.54} roughness={0.46} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <torusGeometry args={[1.5, 0.21, 12, 72, Math.PI]} />
        <meshPhysicalMaterial color="#0b0d1c" emissive={accent} emissiveIntensity={0.1} metalness={0.62} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.9, 0.4]}>
        <planeGeometry args={[2.2, 3]} />
        <meshBasicMaterial color={accent} transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function FloatingShadowIsland({ position, scale, rotation, accent }: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number]; accent: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh scale={scale} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial color="#070813" emissive={accent} emissiveIntensity={0.08} metalness={0.45} roughness={0.6} />
      </mesh>
      <pointLight position={[0, -0.7, 0]} color={accent} intensity={1.2} distance={5.5} />
    </group>
  )
}

function ShadowRift({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.z = clock.elapsedTime * 0.08
  })

  return (
    <group position={[0, 3.1, -17.1]} name="shadow-integration-rift">
      <mesh>
        <sphereGeometry args={[1.05, 64, 48]} />
        <meshPhysicalMaterial color="#c9b8ff" emissive="#8159f0" emissiveIntensity={2.1} metalness={0.08} roughness={0.05} clearcoat={1} transparent opacity={0.92} />
      </mesh>
      <group ref={root}>
        {[1.55, 2.08, 2.72].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, index * 0.6, index * 0.37]}>
            <torusGeometry args={[radius, index === 1 ? 0.055 : 0.034, 12, 112]} />
            <meshBasicMaterial color={index === 1 ? '#d2727d' : '#8467e4'} transparent opacity={0.46 - index * 0.07} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 4, 0]} scale={[0.065, 8.2, 0.065]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshBasicMaterial color="#bdaaff" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <pointLight color="#8e65ec" intensity={8} distance={22} decay={2} />
      <pointLight position={[0, -1.2, 0]} color="#d0616c" intensity={3} distance={12} decay={2} />
    </group>
  )
}

function ShadowRealmEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const bridge = useMemo(() => Array.from({ length: 20 }, (_, index) => index), [])
  const riftLine = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const z = 9.4 - index * 0.98
    const x = Math.sin(index * 0.72) * 0.42
    return new THREE.Vector3(x, 0.18, z)
  }), [])
  const islands = useMemo(() => [
    { position: [-7.1, 2.8, -2] as [number, number, number], scale: [2.4, 0.9, 2] as [number, number, number], rotation: [0.1, 0.2, -0.18] as [number, number, number], accent: '#6b4dd0' },
    { position: [7.4, 3.5, -4.3] as [number, number, number], scale: [2, 0.75, 1.8] as [number, number, number], rotation: [-0.08, 0.4, 0.16] as [number, number, number], accent: '#9f4c64' },
    { position: [-8, 5.8, -10.2] as [number, number, number], scale: [1.4, 0.62, 1.2] as [number, number, number], rotation: [0.2, -0.3, -0.12] as [number, number, number], accent: '#5f4ab8' },
    { position: [7.2, 6.4, -12] as [number, number, number], scale: [1.55, 0.68, 1.3] as [number, number, number], rotation: [-0.16, 0.22, 0.18] as [number, number, number], accent: '#744bc1' },
    { position: [-4.6, 7.6, -15.6] as [number, number, number], scale: [1.05, 0.5, 0.92] as [number, number, number], rotation: [0.15, 0.5, -0.2] as [number, number, number], accent: '#8d4a68' },
  ], [])

  return (
    <group name="shadow-realm-environment">
      <ambientLight intensity={0.24} />
      <hemisphereLight intensity={0.36} color="#6d72a8" groundColor="#020207" />
      <directionalLight position={[-6, 10, 7]} intensity={1.05} color="#8aa4d6" castShadow />
      <pointLight position={[-5, 2.2, -3]} intensity={2.8} distance={14} color="#6553cc" />
      <pointLight position={[5, 1.7, -7]} intensity={2.4} distance={14} color="#a65062" />
      <pointLight position={[0, 4, -13]} intensity={3.2} distance={16} color="#7357d4" />

      <Environment resolution={128}>
        <Lightformer intensity={1.6} color="#7c74b8" position={[0, 6, 3]} scale={[10, 2, 1]} />
        <Lightformer intensity={1.1} color="#5b4d9a" position={[-7, 2, -7]} rotation={[0, Math.PI / 2, 0]} scale={[8, 3, 1]} />
        <Lightformer intensity={0.9} color="#9a4b5b" position={[7, 2, -8]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
      </Environment>

      <Stars radius={92} depth={50} count={reducedMotion ? 220 : 760} factor={1.6} fade speed={reducedMotion ? 0 : 0.012} />
      <Sparkles count={reducedMotion ? 40 : 140} scale={[28, 17, 42]} position={[0, 4, -7]} size={0.8} speed={reducedMotion ? 0 : 0.035} color="#8d72db" opacity={0.25} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, -5]}>
        <planeGeometry args={[34, 48]} />
        <meshStandardMaterial color="#02030a" emissive="#08091b" emissiveIntensity={0.03} roughness={0.9} />
      </mesh>

      {bridge.map((index) => <ShadowBridgeSlab key={index} index={index} />)}
      <Line points={riftLine} color="#9d72ff" lineWidth={2.2} transparent opacity={0.78} />
      <Line points={riftLine.map((point) => point.clone().setY(0.2).setX(point.x + 0.06))} color="#d58a94" lineWidth={0.8} transparent opacity={0.36} />

      <ShadowArch position={[-5.2, 0, 2.2]} scale={1.05} accent="#6052b8" />
      <ShadowArch position={[5.4, 0, -1.4]} scale={0.92} accent="#9a5364" />
      <ShadowArch position={[-5.7, 0, -6]} scale={0.82} accent="#6a58c5" />
      <ShadowArch position={[5.6, 0, -10.2]} scale={0.72} accent="#8b4b68" />

      <ShadowTower position={[-7.1, 0, 5.5]} scale={1.15} accent="#6e56ca" lean={0.12} />
      <ShadowTower position={[7.2, 0, 4.4]} scale={1.05} accent="#9b4f61" lean={-0.14} />
      <ShadowTower position={[-7.7, 0, -2.8]} scale={0.92} accent="#5f4dbe" lean={0.18} />
      <ShadowTower position={[7.9, 0, -6.7]} scale={0.86} accent="#875070" lean={-0.2} />
      <ShadowTower position={[-6.8, 0, -12.7]} scale={0.72} accent="#6a57c8" lean={0.2} />
      <ShadowTower position={[6.6, 0, -14.1]} scale={0.68} accent="#8c4f69" lean={-0.2} />

      {islands.map((island, index) => <FloatingShadowIsland key={index} {...island} />)}
      <ShadowRift reducedMotion={reducedMotion} />
    </group>
  )
}

function RealmPostProcessing({ realm, reducedMotion }: { realm: SpatialRealmKind; reducedMotion: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={realm === 'council' ? 0.72 : 0.95} luminanceThreshold={0.42} luminanceSmoothing={0.62} mipmapBlur />
      <Vignette eskil={false} offset={realm === 'council' ? 0.16 : 0.22} darkness={realm === 'council' ? 0.55 : 0.72} />
    </EffectComposer>
  )
}

export default function SpatialRealmExperience({ realm }: { realm: SpatialRealmKind }) {
  const definition = REALMS[realm]
  const reducedMotion = useReducedMotion()
  const shellRef = useRef<HTMLElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(realm === 'council' ? -0.045 : -0.02)
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

  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0019 : 0.0031, onDragState: setDragging })

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
      data-final-vision-runtime="authored-geometry-postprocessing"
      data-realm-ready={ready ? 'true' : 'false'}
      data-camera-mode={dragging ? 'look' : 'embodied'}
      aria-label={`URAI ${definition.title}`}
      {...look}
    >
      <Canvas
        shadows
        dpr={[1, 1.65]}
        camera={{ position: [definition.spawn[0], CAMERA_HEIGHT, definition.spawn[2]], fov: realm === 'council' ? 56 : 58, near: 0.05, far: 280 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(definition.background), 1)
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = realm === 'council' ? 1.16 : 1.08
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <color attach="background" args={[definition.background]} />
        <fog attach="fog" args={[definition.fog, realm === 'council' ? 12 : 10, realm === 'council' ? 48 : 54]} />
        <RealmCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} resetVersion={resetVersion} realm={realm} nearbyRef={nearbyRef} onNearby={setNearby} shellRef={shellRef} />
        {realm === 'shadow' ? <ShadowRealmEnvironment reducedMotion={reducedMotion} /> : <CouncilRealmEnvironment reducedMotion={reducedMotion} />}
        {definition.portals.map((portal) => <PortalGateway key={portal.id} portal={portal} active={nearby?.id === portal.id} onEnter={enterPortal} reducedMotion={reducedMotion} />)}
        <RealmPostProcessing realm={realm} reducedMotion={reducedMotion} />
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
      <div className="urai-realm-mobile-controls">
        <MobileMovementPad input={input} label={`${definition.title} movement controls`} />
      </div>

      <style jsx>{`
        .urai-spatial-realm-experience{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:${definition.background};color:#f5f8fa;isolation:isolate;outline:none;touch-action:none;cursor:grab;font-family:Inter,ui-sans-serif,system-ui}.urai-spatial-realm-experience[data-camera-mode='look']{cursor:grabbing}.urai-spatial-realm-experience canvas{position:absolute!important;inset:0;width:100%!important;height:100%!important;display:block;touch-action:none}.urai-spatial-realm-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 34%,rgba(0,3,10,.12) 68%,rgba(0,2,8,.6) 120%),linear-gradient(180deg,rgba(0,4,12,.18),transparent 28%,transparent 68%,rgba(0,2,8,.68))}.urai-spatial-realm-reticle{position:absolute;z-index:3;left:50%;top:50%;width:4px;height:4px;border:1px solid rgba(224,247,255,.48);border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(160,228,255,.24);pointer-events:none}.urai-spatial-realm-header{position:absolute;z-index:6;left:max(24px,env(safe-area-inset-left));top:max(20px,env(safe-area-inset-top));max-width:min(400px,calc(100vw - 48px));pointer-events:none;text-shadow:0 10px 36px rgba(0,0,0,.74)}.urai-spatial-realm-header p{margin:0;color:#91dce8;font-size:10px;font-weight:850;letter-spacing:.24em;text-transform:uppercase}.urai-spatial-realm-header h1{margin:8px 0 0;font-size:clamp(36px,4.5vw,62px);font-weight:520;line-height:.91;letter-spacing:-.055em}.urai-spatial-realm-header span{display:block;margin-top:12px;max-width:380px;color:rgba(226,238,243,.7);font-size:12px;line-height:1.5}.urai-spatial-realm-prompt{position:absolute;z-index:7;left:50%;bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px));transform:translateX(-50%);display:grid;gap:3px;width:min(450px,calc(100vw - 40px));padding:9px 15px;border:1px solid rgba(185,225,237,.15);border-radius:14px;background:rgba(3,9,18,.58);box-shadow:0 16px 48px rgba(0,0,0,.24);backdrop-filter:blur(15px);text-align:center;pointer-events:none}.urai-spatial-realm-prompt strong{font-size:10px;letter-spacing:.11em;text-transform:uppercase}.urai-spatial-realm-prompt span{font-size:9px;color:rgba(195,218,228,.6)}.urai-spatial-realm-portals{position:absolute;z-index:8;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:7px;max-width:calc(100vw - 32px);padding:3px}.urai-spatial-realm-portals button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 15px;border:1px solid rgba(188,226,238,.17);border-radius:999px;background:rgba(3,10,20,.65);box-shadow:0 12px 34px rgba(0,0,0,.2);backdrop-filter:blur(12px);color:rgba(239,246,249,.92);font-size:12px;font-weight:720;cursor:pointer;white-space:nowrap}.urai-spatial-realm-portals button:hover{background:rgba(10,25,39,.86);border-color:rgba(195,234,244,.32)}.urai-spatial-realm-portals button span{width:6px;height:6px;border-radius:50%;box-shadow:0 0 14px currentColor}.urai-spatial-realm-portals button:focus-visible{outline:2px solid #fff;outline-offset:3px}.urai-realm-mobile-controls{display:none}:global(.urai-mobile-movement){display:none!important}:global(.urai-movement-help){top:max(16px,env(safe-area-inset-top))!important;right:max(16px,env(safe-area-inset-right))!important;max-width:220px!important;border-color:rgba(190,228,239,.14)!important;border-radius:13px!important;background:rgba(3,10,20,.55)!important;box-shadow:0 12px 40px rgba(0,0,0,.22)!important}:global(.urai-movement-help summary){min-height:40px!important;padding:0 13px!important;font-size:10px!important;color:rgba(227,240,245,.74)!important}@media(max-width:700px){.urai-spatial-realm-vignette{background:linear-gradient(180deg,rgba(0,3,10,.46),transparent 23%,transparent 65%,rgba(0,2,9,.78)),radial-gradient(circle at 50% 48%,transparent 22%,rgba(0,2,8,.18) 80%,rgba(0,2,8,.58))}.urai-spatial-realm-reticle{opacity:.5}.urai-spatial-realm-header{left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));max-width:calc(100vw - 32px)}.urai-spatial-realm-header h1{margin-top:7px;font-size:34px;line-height:.95;white-space:nowrap}.urai-spatial-realm-header span{margin-top:9px;max-width:272px;font-size:11px;line-height:1.42}.urai-spatial-realm-prompt{bottom:max(150px,calc(env(safe-area-inset-bottom) + 138px));width:calc(100vw - 28px);padding:8px 12px}.urai-spatial-realm-prompt[data-active='false']{display:none}.urai-spatial-realm-portals{left:auto;right:max(10px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));transform:none;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:214px;max-width:214px;padding:0}.urai-spatial-realm-portals button{min-height:42px;padding:0 9px;justify-content:center;font-size:10px}.urai-spatial-realm-portals button span{width:5px;height:5px}.urai-realm-mobile-controls{display:block}:global(.urai-movement-help){display:none!important}:global(.urai-mobile-movement){display:grid!important;left:max(8px,env(safe-area-inset-left))!important;bottom:max(8px,env(safe-area-inset-bottom))!important;transform:scale(.72)!important;transform-origin:left bottom!important}}@media(prefers-reduced-motion:reduce){.urai-spatial-realm-prompt,.urai-spatial-realm-portals button{backdrop-filter:none}}
      `}</style>
    </main>
  )
}
