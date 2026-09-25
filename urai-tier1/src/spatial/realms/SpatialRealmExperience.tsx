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
    background: '#02030a',
    fog: '#070513',
    spawn: [0, 0, 8.4],
    bounds: { minX: -9.2, maxX: 9.2, minZ: -17.5, maxZ: 9 },
    portals: [
      { id: 'shadow-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=shadow', position: [-5.4, 0, -12.4], color: '#9eeeff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'shadow-replay', label: 'Replay', destination: 'replay', href: '/replay?from=shadow', position: [5.4, 0, -12.4], color: '#ff9f85', cameraCheckpoint: 'replay-arrival' },
      { id: 'shadow-home', label: 'Home', destination: 'home', href: '/home?returnFrom=shadow', position: [0, 0, -16.2], color: '#d8c2ff', cameraCheckpoint: 'home-threshold' },
    ],
  },
  council: {
    title: 'Council Chamber',
    subtitle: 'A spatial chamber for guidance, stewardship, and governed decisions.',
    background: '#020711',
    fog: '#061326',
    spawn: [0, 0, 9.6],
    bounds: { minX: -10.2, maxX: 10.2, minZ: -17.5, maxZ: 10.2 },
    portals: [
      { id: 'council-passport', label: 'Passport', destination: 'passport', href: '/passport?from=council', position: [-6.8, 0, -12.8], color: '#ffd88f', cameraCheckpoint: 'passport-arrival' },
      { id: 'council-mirror', label: 'Mirror', destination: 'mirror', href: '/mirror?from=council', position: [6.8, 0, -12.8], color: '#b9a6ff', cameraCheckpoint: 'mirror-arrival' },
      { id: 'council-home', label: 'Home', destination: 'home', href: '/home?returnFrom=council', position: [0, 0, -16.8], color: '#9defff', cameraCheckpoint: 'home-threshold' },
    ],
  },
}

const CAMERA_HEIGHT = 1.68
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
    pitch.current = -0.04
  }, [definition.spawn, pitch, resetVersion, yaw])

  useFrame(({ camera }, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.55 : 2.55,
      acceleration: 8.8,
      deceleration: 10.5,
      bounds: definition.bounds,
      obstacles: realm === 'council'
        ? [{ x: 0, z: -4.8, radius: 2.25 }]
        : [{ x: 0, z: -5.5, radius: 1.35 }],
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

function PortalGateway({ portal, active, onEnter, reducedMotion }: { portal: PortalDefinition; active: boolean; onEnter: (portal: PortalDefinition) => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.35 + portal.position[0]) * 0.08
    group.current.position.y = Math.sin(clock.elapsedTime * 0.7 + portal.position[2]) * 0.06
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onEnter(portal)
  }

  return (
    <group ref={group} position={portal.position} name={portal.id} userData={{ portalId: portal.id, label: portal.label }}>
      <mesh onClick={activate} castShadow>
        <torusGeometry args={[1.25, active ? 0.16 : 0.11, 20, 96]} />
        <meshPhysicalMaterial color={portal.color} emissive={portal.color} emissiveIntensity={active ? 1.2 : 0.48} metalness={0.44} roughness={0.12} transmission={0.22} />
      </mesh>
      <mesh position={[0, 0, -0.04]} onClick={activate}>
        <circleGeometry args={[1.12, 64]} />
        <meshPhysicalMaterial color={portal.color} emissive={portal.color} emissiveIntensity={active ? 0.46 : 0.18} transparent opacity={active ? 0.34 : 0.18} transmission={0.42} roughness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={portal.color} intensity={active ? 4.2 : 1.6} distance={7} decay={2} />
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.36, 64]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.38 : 0.15} />
      </mesh>
    </group>
  )
}

type ShadowReviewState = 'entry' | 'neutral' | 'uncertainty' | 'pattern' | 'safe-reduction' | 'recovery' | 'reduced-stimulation'

function ShadowRealmEnvironment({ reducedMotion, reviewState }: { reducedMotion: boolean; reviewState: ShadowReviewState }) {
  const reducedStimulation = reviewState === 'reduced-stimulation' || reviewState === 'safe-reduction'
  const recovery = reviewState === 'recovery'
  const patternFocus = reviewState === 'pattern'
  const uncertaintyFocus = reviewState === 'uncertainty'
  const detailCount = reducedStimulation ? 6 : reducedMotion ? 10 : 16
  const orientationIntensity = recovery ? 2.8 : reducedStimulation ? 0.7 : 1.45
  const localFocusIntensity = patternFocus ? 1.45 : uncertaintyFocus ? 0.9 : 0.55
  return (
    <group name="shadow-realm-environment" userData={{ reviewState, grounded: true, horror: false, fantasyPortal: false }}>
      <ambientLight intensity={reducedStimulation ? 0.22 : 0.34} color="#d7dde3" />
      <hemisphereLight intensity={reducedStimulation ? 0.28 : 0.44} color="#89919c" groundColor="#171519" />
      <directionalLight position={[5, 9, 4]} intensity={recovery ? 1.45 : 0.92} color={recovery ? '#ddd5c8' : '#a7b1bb'} castShadow />
      <pointLight position={[0, 2.6, -14.2]} intensity={orientationIntensity} distance={18} color={recovery ? '#d7c8b0' : '#b0a6c8'} />
      <pointLight position={[0, 1.3, -6.2]} intensity={localFocusIntensity} distance={10} color={patternFocus ? '#b6a6c8' : '#8994a0'} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -4.4]} receiveShadow>
        <planeGeometry args={[24, 38, 26, 30]} />
        <meshStandardMaterial color={recovery ? '#2a2826' : '#15151a'} roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.03, -4.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 29]} />
        <meshStandardMaterial color={recovery ? '#39342f' : '#26242a'} roughness={0.88} metalness={0.01} />
      </mesh>

      {Array.from({ length: detailCount }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        const lane = Math.floor(index / 2)
        const x = side * (3.2 + (lane % 3) * 1.2)
        const z = 4.6 - lane * 2.1
        const height = 0.55 + (lane % 4) * 0.28
        return (
          <mesh key={index} position={[x, height / 2 - 0.05, z]} rotation={[0, 0.18 * (index % 5), 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62 + (index % 3) * 0.16, height, 0.7 + (lane % 2) * 0.18]} />
            <meshStandardMaterial color={index % 4 === 0 ? '#343238' : '#28272c'} roughness={0.96} metalness={0.015} />
          </mesh>
        )
      })}

      <group position={[0, 0.02, -6.3]} name="shadow-pattern-focus-grounded">
        {Array.from({ length: reducedStimulation ? 4 : 9 }, (_, index) => {
          const angle = (index / (reducedStimulation ? 4 : 9)) * Math.PI * 2
          const radius = 0.65 + (index % 3) * 0.34
          return (
            <mesh key={index} position={[Math.cos(angle) * radius, 0.08 + (index % 2) * 0.025, Math.sin(angle) * radius]} rotation={[-0.08, -angle, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.35 + (index % 2) * 0.12, 0.18, 0.72 + (index % 3) * 0.14]} />
              <meshStandardMaterial color={patternFocus ? '#454149' : '#302e34'} roughness={0.94} metalness={0.01} />
            </mesh>
          )
        })}
      </group>

      <group position={[0, 0, -14.3]} name="shadow-stable-return-landmark">
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 2.7, 0.55]} />
          <meshStandardMaterial color="#3b393c" roughness={0.9} metalness={0.02} />
        </mesh>
        <mesh position={[0, 1.55, 0.31]}>
          <boxGeometry args={[0.12, 1.15, 0.03]} />
          <meshBasicMaterial color={recovery ? '#e6d8c2' : '#b6adbe'} toneMapped={false} transparent opacity={reducedStimulation ? 0.38 : 0.62} />
        </mesh>
      </group>

      {uncertaintyFocus ? (
        <mesh position={[0, 0.045, -4.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.1, 64]} />
          <meshBasicMaterial color="#d2d6dc" transparent opacity={0.025} depthWrite={false} />
        </mesh>
      ) : null}

    </group>
  )
}

function ShadowThresholdMarker({ portal, active, onEnter, reducedMotion }: { portal: PortalDefinition; active: boolean; onEnter: (portal: PortalDefinition) => void; reducedMotion: boolean }) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onEnter(portal)
  }
  return (
    <group position={portal.position} name={portal.id} userData={{ portalId: portal.id, label: portal.label, visualForm: 'grounded-threshold-marker' }}>
      <mesh position={[0, 0.44, 0]} onClick={activate} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.88, 0.58]} />
        <meshStandardMaterial color="#34343a" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.65, 0.3]} onClick={activate}>
        <boxGeometry args={[0.11, 0.4, 0.025]} />
        <meshBasicMaterial color={portal.color} toneMapped={false} transparent opacity={active ? 0.82 : reducedMotion ? 0.34 : 0.46} />
      </mesh>
    </group>
  )
}

function CouncilPresence({ angle, color, reducedMotion, index }: { angle: number; color: string; reducedMotion: boolean; index: number }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.position.y = Math.sin(clock.elapsedTime * 0.42 + index) * 0.08
    root.current.rotation.y = -angle + Math.sin(clock.elapsedTime * 0.19 + index) * 0.035
  })

  const radius = 6.7
  const x = Math.sin(angle) * radius
  const z = -5.4 + Math.cos(angle) * radius
  return (
    <group ref={root} position={[x, 0, z]} rotation={[0, -angle, 0]}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[0.42, 24, 18]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.65} transparent opacity={0.68} transmission={0.28} roughness={0.14} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <capsuleGeometry args={[0.58, 2.15, 10, 24]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.28} transparent opacity={0.48} transmission={0.34} roughness={0.18} />
      </mesh>
      <mesh position={[0, 3.05, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.035, 10, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.46} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.15, 1.35, 0.24, 48]} />
        <meshStandardMaterial color="#101b31" emissive={color} emissiveIntensity={0.12} metalness={0.55} roughness={0.24} />
      </mesh>
      <pointLight position={[0, 2, 0.6]} color={color} intensity={2.2} distance={6.5} />
    </group>
  )
}

function CouncilRealmEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const colors = ['#9feeff', '#b59dff', '#ffd88f', '#f2a8dc', '#8fd8ff', '#ffe3a5']
  return (
    <group name="council-chamber-environment">
      <ambientLight intensity={0.42} />
      <hemisphereLight intensity={0.62} color="#dffaff" groundColor="#071126" />
      <directionalLight position={[5, 11, 6]} intensity={1.45} color="#f6fbff" castShadow />
      <pointLight position={[0, 5, -5]} intensity={5.4} distance={20} color="#a58cff" />
      <Stars radius={72} depth={38} count={reducedMotion ? 220 : 880} factor={2.4} fade speed={reducedMotion ? 0 : 0.016} />
      <Sparkles count={reducedMotion ? 48 : 180} scale={[30, 16, 38]} position={[0, 4, -6]} size={1.25} speed={reducedMotion ? 0 : 0.07} color="#c7e9ff" opacity={0.28} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, -5.2]} receiveShadow>
        <cylinderGeometry args={[11.6, 12.2, 0.36, 96]} />
        <meshPhysicalMaterial color="#07101f" emissive="#4b3b88" emissiveIntensity={0.08} metalness={0.62} roughness={0.18} clearcoat={0.7} />
      </mesh>
      {[2.2, 4.1, 6.4, 9.2].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02 + index * 0.004, -5.2]}>
          <ringGeometry args={[radius - 0.04, radius, 96]} />
          <meshBasicMaterial color={index % 2 ? '#d3c3ff' : '#9cefff'} transparent opacity={0.12 + index * 0.02} />
        </mesh>
      ))}

      {colors.map((color, index) => {
        const angle = -1.05 + index * (2.1 / (colors.length - 1))
        return <CouncilPresence key={color} angle={angle} color={color} reducedMotion={reducedMotion} index={index} />
      })}

      <group position={[0, 1.45, -5.2]}>
        <Float speed={reducedMotion ? 0 : 0.55} rotationIntensity={reducedMotion ? 0 : 0.12} floatIntensity={reducedMotion ? 0 : 0.18}>
          <mesh castShadow>
            <icosahedronGeometry args={[1.05, 4]} />
            <meshPhysicalMaterial color="#d8fbff" emissive="#7cecf2" emissiveIntensity={0.62} transmission={0.56} thickness={1.1} roughness={0.06} clearcoat={1} />
          </mesh>
          {[1.6, 2.05, 2.55].map((radius, index) => (
            <mesh key={radius} rotation={[Math.PI / 2, index * 0.62, index * 0.38]}>
              <torusGeometry args={[radius, 0.026, 10, 90]} />
              <meshBasicMaterial color={index === 1 ? '#ffd99a' : '#a5efff'} transparent opacity={0.3 - index * 0.045} />
            </mesh>
          ))}
        </Float>
      </group>
    </group>
  )
}

export default function SpatialRealmExperience({ realm }: { realm: SpatialRealmKind }) {
  const definition = REALMS[realm]
  const reducedMotion = useReducedMotion()
  const shellRef = useRef<HTMLElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const nearbyRef = useRef<string | null>(null)
  const [nearby, setNearby] = useState<PortalDefinition | null>(null)
  const [resetVersion, setResetVersion] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false)
  const [shadowReviewState, setShadowReviewState] = useState<ShadowReviewState>('neutral')

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

  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging })

  useEffect(() => {
    if (realm !== 'shadow') return
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('shadowReview') as ShadowReviewState | null
    const supported: ShadowReviewState[] = ['entry','neutral','uncertainty','pattern','safe-reduction','recovery','reduced-stimulation']
    setShadowReviewState(requested && supported.includes(requested) ? requested : 'neutral')
  }, [realm])

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
      data-shadow-review-state={realm === 'shadow' ? shadowReviewState : undefined}
      aria-label={`URAI ${definition.title}`}
      {...look}
    >
      <Canvas
        shadows
        dpr={[1, 1.65]}
        camera={{ position: [definition.spawn[0], CAMERA_HEIGHT, definition.spawn[2]], fov: 48, near: 0.05, far: 260 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(definition.background), 1)
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
      >
        <color attach="background" args={[definition.background]} />
        <fog attach="fog" args={[definition.fog, 7, 42]} />
        <RealmCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} resetVersion={resetVersion} realm={realm} nearbyRef={nearbyRef} onNearby={setNearby} shellRef={shellRef} />
        {realm === 'shadow' ? <ShadowRealmEnvironment reducedMotion={reducedMotion} reviewState={shadowReviewState} /> : <CouncilRealmEnvironment reducedMotion={reducedMotion} />}
        {definition.portals.map((portal) => realm === 'shadow'
          ? <ShadowThresholdMarker key={portal.id} portal={portal} active={nearby?.id === portal.id} onEnter={enterPortal} reducedMotion={reducedMotion} />
          : <PortalGateway key={portal.id} portal={portal} active={nearby?.id === portal.id} onEnter={enterPortal} reducedMotion={reducedMotion} />)}
      </Canvas>

      <header className="urai-spatial-realm-header">
        <p>URAI · {realm === 'shadow' ? 'INTEGRATION' : 'STEWARDSHIP'}</p>
        <h1>{definition.title}</h1>
        <span>{definition.subtitle}</span>
      </header>

      <section className="urai-spatial-realm-prompt" role="status" aria-live="polite">
        <strong>{nearby ? `${nearby.label} threshold within reach` : `Walking through ${definition.title}`}</strong>
        <span>{nearby ? (realm === 'shadow' ? 'Press Enter or select the threshold' : 'Press Enter or select the portal') : 'WASD / arrows move · drag to look · R resets · Escape returns'}</span>
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
        .urai-spatial-realm-experience{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:${definition.background};color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:grab;font-family:Inter,ui-sans-serif,system-ui}.urai-spatial-realm-experience[data-camera-mode='look']{cursor:grabbing}.urai-spatial-realm-experience canvas{position:absolute!important;inset:0;width:100%!important;height:100%!important;display:block;touch-action:none}.urai-spatial-realm-header{position:absolute;z-index:4;left:max(20px,env(safe-area-inset-left));top:max(20px,env(safe-area-inset-top));max-width:min(460px,calc(100vw - 40px));pointer-events:none;text-shadow:0 8px 38px rgba(0,0,0,.8)}.urai-spatial-realm-header p{margin:0;color:#a9efff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.urai-spatial-realm-header h1{margin:8px 0 0;font-size:clamp(32px,6vw,72px);line-height:.9;letter-spacing:-.06em}.urai-spatial-realm-header span{display:block;margin-top:12px;max-width:440px;color:rgba(235,246,255,.72);font-size:13px;line-height:1.5}.urai-spatial-realm-prompt{position:absolute;z-index:5;left:50%;bottom:max(100px,calc(env(safe-area-inset-bottom) + 88px));transform:translateX(-50%);display:grid;gap:3px;width:min(520px,calc(100vw - 32px));padding:11px 16px;border:1px solid rgba(210,244,255,.2);border-radius:18px;background:rgba(2,8,18,.72);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.urai-spatial-realm-prompt strong{font-size:11px;letter-spacing:.09em;text-transform:uppercase}.urai-spatial-realm-prompt span{font-size:10px;color:rgba(218,240,255,.7)}.urai-spatial-realm-portals{position:absolute;z-index:6;left:50%;bottom:max(20px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;max-width:calc(100vw - 32px);overflow-x:auto;padding:5px}.urai-spatial-realm-portals button{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 16px;border:1px solid rgba(216,246,255,.2);border-radius:999px;background:rgba(3,10,22,.82);color:#fff;font-weight:800;cursor:pointer;white-space:nowrap}.urai-spatial-realm-portals button span{width:8px;height:8px;border-radius:50%;box-shadow:0 0 16px currentColor}.urai-spatial-realm-portals button:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.urai-spatial-realm-header{max-width:300px}.urai-spatial-realm-header h1{font-size:42px}.urai-spatial-realm-header span{font-size:12px}.urai-spatial-realm-prompt{bottom:max(152px,calc(env(safe-area-inset-bottom) + 140px));width:calc(100vw - 24px)}.urai-spatial-realm-portals{bottom:max(88px,calc(env(safe-area-inset-bottom) + 78px));width:calc(100vw - 24px);justify-content:flex-start}}@media(prefers-reduced-motion:reduce){.urai-spatial-realm-prompt{backdrop-filter:none}}
      `}</style>
    </main>
  )
}
