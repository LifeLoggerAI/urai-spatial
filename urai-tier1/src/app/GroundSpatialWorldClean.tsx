'use client'

import { Html, PerspectiveCamera, Stars } from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { assetCssStack, groundAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'
import type { UraiDestination } from '@/spatial/world/worldTypes'

type WorkforceState = 'idle' | 'observing-locally' | 'preparing' | 'awaiting-owner-approval' | 'blocked'
type ServiceAvailability = 'available' | 'degraded'
type QualityTier = 'mobile' | 'balanced' | 'high'

type GroundDestination = {
  id: string
  label: string
  detail: string
  color: string
  position: [number, number, number]
  camera: [number, number, number]
  lookAt: [number, number, number]
  workforceState: WorkforceState
  availability: ServiceAvailability
  worldDestination?: UraiDestination
  href?: string
  entryPortal?: string
  cameraCheckpoint?: string
}

const DESTINATIONS: readonly GroundDestination[] = [
  { id: 'reception', label: 'Reception', detail: 'Today, arrivals, and orientation', color: '#67e8f9', position: [-5.4, 0, -5], camera: [-3.4, 1.7, -0.6], lookAt: [-5.4, 1.2, -5], workforceState: 'observing-locally', availability: 'available' },
  { id: 'privacy', label: 'Privacy Sanctuary', detail: 'Consent and local control', color: '#a78bfa', position: [5.4, 0, -5], camera: [3.4, 1.7, -0.6], lookAt: [5.4, 1.2, -5], workforceState: 'awaiting-owner-approval', availability: 'available', worldDestination: 'privacy-controls', href: '/privacy-controls?from=ground', entryPortal: 'consent-aperture', cameraCheckpoint: 'privacy-arrival' },
  { id: 'council', label: 'Council', detail: 'Approvals and decisions', color: '#facc6b', position: [0, 0, -9], camera: [0, 1.75, -3.5], lookAt: [0, 1.2, -9], workforceState: 'preparing', availability: 'available' },
  { id: 'logistics', label: 'Logistics', detail: 'Tasks and movement', color: '#fb7185', position: [-8, 0, -12.5], camera: [-5, 1.75, -7], lookAt: [-8, 1.2, -12.5], workforceState: 'blocked', availability: 'degraded' },
  { id: 'wellness', label: 'Wellness', detail: 'Recovery and body signals', color: '#86efac', position: [8, 0, -12.5], camera: [5, 1.75, -7], lookAt: [8, 1.2, -12.5], workforceState: 'idle', availability: 'available' },
  { id: 'archive', label: 'Archive', detail: 'Memory and provenance', color: '#93c5fd', position: [0, 0, -17], camera: [0, 1.75, -10.5], lookAt: [0, 1.2, -17], workforceState: 'idle', availability: 'available', worldDestination: 'life-map', href: '/life-map?from=ground', entryPortal: 'constellation-threshold', cameraCheckpoint: 'life-map-overview' },
  { id: 'mirror', label: 'Reflection Realm', detail: 'Mirror and rewind', color: '#e9d5ff', position: [-6.8, 1.2, -20], camera: [-4.2, 2.05, -14.3], lookAt: [-6.8, 2, -20], workforceState: 'idle', availability: 'available', worldDestination: 'mirror', href: '/mirror?from=ground', entryPortal: 'reflection-threshold', cameraCheckpoint: 'mirror-arrival' },
  { id: 'passport', label: 'Ownership Vault', detail: 'Identity, export, and control', color: '#fde68a', position: [6.8, 1.2, -20], camera: [4.2, 2.05, -14.3], lookAt: [6.8, 2, -20], workforceState: 'awaiting-owner-approval', availability: 'available', worldDestination: 'passport', href: '/passport?from=ground', entryPortal: 'ownership-seal', cameraCheckpoint: 'passport-arrival' },
  { id: 'consent', label: 'Consent Sanctuary', detail: 'Permissions and revocation', color: '#c084fc', position: [-9.2, 2, -25], camera: [-6, 2.55, -19], lookAt: [-9.2, 2.8, -25], workforceState: 'awaiting-owner-approval', availability: 'available', worldDestination: 'privacy-controls', href: '/privacy-controls?from=ground&panel=consent', entryPortal: 'consent-aperture', cameraCheckpoint: 'privacy-arrival' },
  { id: 'atlas', label: 'Emotional Atlas', detail: 'Consent-aware place memory', color: '#5eead4', position: [-3.2, 2.5, -27], camera: [-2.1, 2.8, -20.5], lookAt: [-3.2, 3.1, -27], workforceState: 'observing-locally', availability: 'available', worldDestination: 'location-map', href: '/location-map?from=ground', entryPortal: 'location-beacon', cameraCheckpoint: 'atlas-world-view' },
  { id: 'focus', label: 'Focus Chamber', detail: 'Selected-memory attention', color: '#c4b5fd', position: [3.2, 2.5, -27], camera: [2.1, 2.8, -20.5], lookAt: [3.2, 3.1, -27], workforceState: 'preparing', availability: 'available', worldDestination: 'focus', entryPortal: 'memory-focus', cameraCheckpoint: 'focus-arrival' },
  { id: 'replay', label: 'Replay Theater', detail: 'Entered-memory cinema', color: '#f9a8d4', position: [9.2, 2, -25], camera: [6, 2.55, -19], lookAt: [9.2, 2.8, -25], workforceState: 'idle', availability: 'available', worldDestination: 'replay', entryPortal: 'memory-replay', cameraCheckpoint: 'replay-arrival' },
]

const STATE_LABEL: Record<WorkforceState, string> = {
  idle: 'Idle',
  'observing-locally': 'Observing locally',
  preparing: 'Preparing',
  'awaiting-owner-approval': 'Awaiting your approval',
  blocked: 'Blocked',
}

let cachedWebGLAvailable: boolean | null = null

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }
    query.addListener(update)
    return () => query.removeListener(update)
  }, [])
  return reducedMotion
}

function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    if (cachedWebGLAvailable !== null) {
      setAvailable(cachedWebGLAvailable)
      return
    }
    try {
      const probe = document.createElement('canvas')
      cachedWebGLAvailable = Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
    } catch {
      cachedWebGLAvailable = false
    }
    setAvailable(cachedWebGLAvailable)
  }, [])
  return available
}

function useQualityTier(): QualityTier {
  const [tier, setTier] = useState<QualityTier>('balanced')
  useEffect(() => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const mobile = window.matchMedia('(max-width: 700px)').matches
    setTier(mobile || memory <= 2 ? 'mobile' : memory >= 8 ? 'high' : 'balanced')
  }, [])
  return tier
}

function CameraRig({ active, reducedMotion }: { active: GroundDestination | null; reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    target.set(...(active?.camera ?? (size.width < 700 ? [0, 1.7, 5] : [0, 1.75, 6.4])))
    look.set(...(active?.lookAt ?? [0, 1.2, -9]))
    if (reducedMotion) camera.position.copy(target)
    else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 4.2, delta)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 4.2, delta)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 4.2, delta)
    }
    camera.lookAt(look)
  })
  return <PerspectiveCamera makeDefault position={[0, 1.75, 6.4]} fov={size.width < 700 ? 66 : 56} near={0.08} far={120} />
}

function ContextMonitor({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); onLost(true) }
    const restored = () => onLost(false)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, onLost])
  return null
}

function WalkingPresence({ destination, index, reducedMotion }: { destination: GroundDestination; index: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const start = useMemo(() => new THREE.Vector3(destination.position[0] * 0.5, 0, destination.position[2] * 0.5), [destination])
  const end = useMemo(() => new THREE.Vector3(destination.position[0] * 0.82, 0, destination.position[2] + 1.35), [destination])
  useFrame(({ clock }) => {
    if (!group.current) return
    const progress = reducedMotion ? 0.75 : (Math.sin(clock.elapsedTime * (0.18 + index * 0.008) + index) + 1) / 2
    group.current.position.lerpVectors(start, end, progress)
    group.current.position.y = reducedMotion ? 0 : Math.abs(Math.sin(progress * Math.PI * 8)) * 0.025
    group.current.lookAt(end)
  })
  const color = new THREE.Color(destination.color)
  const opacity = destination.workforceState === 'blocked' ? 0.42 : 0.72
  return (
    <group ref={group} data-ground-workforce-avatar="walking" userData={{ workforceState: destination.workforceState }}>
      <mesh position={[0, 1.38, 0]} castShadow><sphereGeometry args={[0.16, 16, 16]} /><meshStandardMaterial color="#e7f7fb" emissive={color} emissiveIntensity={0.28} transparent opacity={opacity} /></mesh>
      <mesh position={[0, 0.82, 0]} castShadow><capsuleGeometry args={[0.21, 0.72, 6, 12]} /><meshStandardMaterial color="#0e1a25" emissive={color} emissiveIntensity={0.18} roughness={0.52} metalness={0.28} transparent opacity={opacity} /></mesh>
    </group>
  )
}

function CouncilPopulation({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.04
  })
  return (
    <group ref={group} position={[0, 0, -8.7]} data-testid="urai-ground-council-population">
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow><cylinderGeometry args={[1.18, 1.28, 0.22, 48]} /><meshStandardMaterial color="#263640" emissive="#facc6b" emissiveIntensity={0.12} roughness={0.42} metalness={0.48} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return <group key={index} position={[Math.sin(angle) * 1.65, 0, Math.cos(angle) * 1.65]} rotation={[0, angle + Math.PI, 0]}>
          <mesh position={[0, 1.32, 0]} castShadow><sphereGeometry args={[0.15, 14, 14]} /><meshStandardMaterial color="#edfaff" emissive={index % 2 ? '#a78bfa' : '#facc6b'} emissiveIntensity={0.26} /></mesh>
          <mesh position={[0, 0.78, 0]} castShadow><capsuleGeometry args={[0.2, 0.66, 6, 12]} /><meshStandardMaterial color="#111d26" emissive={index % 2 ? '#a78bfa' : '#facc6b'} emissiveIntensity={0.16} roughness={0.54} /></mesh>
        </group>
      })}
    </group>
  )
}

function Corridor({ destination }: { destination: GroundDestination }) {
  const x = destination.position[0] * 0.5
  const z = destination.position[2] * 0.5
  const length = Math.hypot(destination.position[0], destination.position[2])
  const angle = Math.atan2(destination.position[0], destination.position[2])
  return <group position={[x, -0.02, z]} rotation={[0, angle, 0]}><mesh receiveShadow><boxGeometry args={[1.35, 0.08, length]} /><meshStandardMaterial color="#121f29" roughness={0.76} metalness={0.14} /></mesh><mesh position={[0, 0.055, 0]}><boxGeometry args={[0.06, 0.018, length * 0.92]} /><meshBasicMaterial color={destination.color} transparent opacity={destination.availability === 'degraded' ? 0.2 : 0.4} toneMapped={false} /></mesh></group>
}

function DestinationArchitecture({ destination, active, onSelect }: { destination: GroundDestination; active: boolean; onSelect: () => void }) {
  const color = new THREE.Color(destination.color)
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect() }
  return (
    <group position={destination.position} data-ground-destination={destination.id} userData={{ serviceAvailability: destination.availability }}>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow onClick={activate} onPointerEnter={() => { document.body.style.cursor = 'pointer' }} onPointerLeave={() => { document.body.style.cursor = 'default' }}><boxGeometry args={[3.7, 3.2, 1.25]} /><meshPhysicalMaterial color="#10212d" emissive={color} emissiveIntensity={active ? 0.26 : 0.08} roughness={0.42} metalness={0.44} clearcoat={0.34} /></mesh>
      <mesh position={[0, 1.22, 0.66]} castShadow onClick={activate}><boxGeometry args={[1.5, 2.35, 0.18]} /><meshStandardMaterial color="#020712" emissive={color} emissiveIntensity={active ? 0.7 : 0.24} roughness={0.24} metalness={0.62} /></mesh>
      <mesh position={[0, 3.35, 0]}><torusGeometry args={[0.68, 0.06, 10, 48]} /><meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.42} toneMapped={false} /></mesh>
      {active && <Html position={[0, 3.95, 0]} center distanceFactor={11}><div className="ground-active-label"><strong>{destination.label}</strong><span>{destination.detail}</span><em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em></div></Html>}
    </group>
  )
}

function EnvironmentMotion({ reducedMotion, quality }: { reducedMotion: boolean; quality: QualityTier }) {
  const mist = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!mist.current || reducedMotion) return
    mist.current.position.x = Math.sin(clock.elapsedTime * 0.05) * 2.2
    mist.current.rotation.z = Math.sin(clock.elapsedTime * 0.025) * 0.04
  })
  if (quality === 'mobile') return null
  return <mesh ref={mist} position={[0, 6.5, -30]} scale={[22, 1.1, 7]}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial color="#78d8e8" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
}

function WorldEnvelope() {
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -14]} receiveShadow><planeGeometry args={[42, 64]} /><meshStandardMaterial color="#08121b" emissive="#061321" emissiveIntensity={0.16} roughness={0.92} metalness={0.1} /></mesh>{[-13, 13].map((x) => <mesh key={x} position={[x, 5.8, -15]} receiveShadow castShadow><boxGeometry args={[1.1, 12, 58]} /><meshStandardMaterial color="#07101a" emissive="#0f2b3c" emissiveIntensity={0.07} roughness={0.74} metalness={0.26} /></mesh>)}{[[-8, -8], [8, -8], [-10, -18], [10, -18], [-7, -28], [7, -28]].map(([x, z], index) => <mesh key={`${x}-${z}`} position={[x, 4 + (index % 2), z]} castShadow receiveShadow><boxGeometry args={[2.4, 8 + (index % 2) * 2, 2.4]} /><meshStandardMaterial color="#0a1722" emissive={index % 2 ? '#1b3650' : '#132a3a'} emissiveIntensity={0.09} roughness={0.58} metalness={0.34} /></mesh>)}</>
}

function GroundScene({ active, onSelect, reducedMotion, quality, onContextLost }: { active: GroundDestination | null; onSelect: (destination: GroundDestination) => void; reducedMotion: boolean; quality: QualityTier; onContextLost: (lost: boolean) => void }) {
  const workerCount = quality === 'mobile' ? 4 : quality === 'high' ? 8 : 6
  return <><color attach="background" args={['#010611']} /><fog attach="fog" args={['#03111d', 10, 50]} /><CameraRig active={active} reducedMotion={reducedMotion} /><ContextMonitor onLost={onContextLost} /><ambientLight intensity={0.42} color="#dbeafe" /><hemisphereLight args={['#cfe8ff', '#010409', 1.05]} /><directionalLight position={[-7, 11, 6]} intensity={1.9} color="#e8f5ff" castShadow={quality !== 'mobile'} shadow-mapSize-width={quality === 'high' ? 1536 : 1024} shadow-mapSize-height={quality === 'high' ? 1536 : 1024} /><Stars radius={70} depth={45} count={reducedMotion ? 600 : quality === 'mobile' ? 700 : 1100} factor={2.2} saturation={0.22} fade speed={reducedMotion ? 0 : 0.04} /><WorldEnvelope /><EnvironmentMotion reducedMotion={reducedMotion} quality={quality} />{DESTINATIONS.map((destination) => <Corridor key={`path-${destination.id}`} destination={destination} />)}{DESTINATIONS.map((destination) => <DestinationArchitecture key={destination.id} destination={destination} active={active?.id === destination.id} onSelect={() => onSelect(destination)} />)}{DESTINATIONS.slice(0, workerCount).map((destination, index) => <WalkingPresence key={`worker-${destination.id}`} destination={destination} index={index} reducedMotion={reducedMotion} />)}<CouncilPopulation reducedMotion={reducedMotion} />{quality !== 'mobile' && <EffectComposer multisampling={quality === 'high' ? 4 : 0}><Bloom intensity={0.42} luminanceThreshold={0.24} luminanceSmoothing={0.45} /><Vignette eskil={false} offset={0.22} darkness={0.28} /></EffectComposer>}</>
}

function GroundFallback({ onTravel }: { onTravel: (destination: GroundDestination) => void }) {
  return <section className="ground-fallback" data-testid="urai-ground-webgl-fallback"><div><p>URAI Ground</p><h1>Your private workforce.</h1><span>The spatial renderer is unavailable, but every destination remains accessible.</span></div><nav aria-label="Ground destinations fallback">{DESTINATIONS.map((destination) => <button key={destination.id} type="button" onClick={() => onTravel(destination)}><strong>{destination.label}</strong><span>{destination.detail}</span></button>)}</nav></section>
}

export default function GroundSpatialWorldClean() {
  const { world } = useUraiWorldState()
  const reducedMotion = useReducedMotion()
  const webglAvailable = useWebGLAvailable()
  const quality = useQualityTier()
  const [activeId, setActiveId] = useState<string>('reception')
  const [contextLost, setContextLost] = useState(false)
  const [announcement, setAnnouncement] = useState('Reception selected')
  const active = DESTINATIONS.find((destination) => destination.id === activeId) ?? DESTINATIONS[0]

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('district')
    if (requested && DESTINATIONS.some((destination) => destination.id === requested)) setActiveId(requested)
    return () => { document.body.style.cursor = 'default' }
  }, [])

  const hrefFor = useCallback((destination: GroundDestination) => {
    if (destination.href) return destination.href
    if (destination.worldDestination === 'focus' || destination.worldDestination === 'replay') {
      const memoryId = world.memoryId ?? 'demo:ground-memory'
      const manifestId = world.replayManifestId ?? 'demo-manifest'
      return `/${destination.worldDestination}?demo=${world.memoryId ? '0' : '1'}&memoryId=${encodeURIComponent(memoryId)}&manifestId=${encodeURIComponent(manifestId)}&from=ground`
    }
    return `/ground?district=${destination.id}`
  }, [world.memoryId, world.replayManifestId])

  const activate = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id)
    setAnnouncement(`${destination.label}. ${destination.detail}. ${STATE_LABEL[destination.workforceState]}.`)
    if (!destination.worldDestination) {
      window.history.replaceState(null, '', `/ground?district=${destination.id}`)
      return
    }
    requestUraiWorldTravel({
      destination: destination.worldDestination,
      href: hrefFor(destination),
      entryPortal: destination.entryPortal,
      cameraCheckpoint: destination.cameraCheckpoint,
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
      },
    })
  }, [hrefFor, world])

  const preview = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id)
    setAnnouncement(`${destination.label} selected. ${destination.detail}.`)
  }, [])

  const moveSelection = useCallback((direction: number) => {
    const index = DESTINATIONS.findIndex((destination) => destination.id === activeId)
    preview(DESTINATIONS[(index + direction + DESTINATIONS.length) % DESTINATIONS.length])
  }, [activeId, preview])

  const artStyle = {
    '--ground-provider-desktop': assetCssStack(groundAssets.primary),
    '--ground-provider-mobile': assetCssStack(groundAssets.mobile),
  } as CSSProperties

  const showFallback = webglAvailable === false || contextLost

  return (
    <main className="ground-spatial-root" style={artStyle} aria-label="URAI Ground embodied private infrastructure" data-testid="urai-ground-private-workforce-world" data-quality-tier={quality} data-service-state="Six chambers active · private by default" tabIndex={-1} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); requestUraiWorldReturn() }
      if (event.key === 'Enter' && document.activeElement === event.currentTarget) activate(active)
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1) }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1) }
    }}>
      <h1 className="ground-sr-only">Your private workforce.</h1>
      <p className="ground-sr-only">Six chambers active · private by default</p>
      <div className="ground-authored-art" aria-hidden="true" />
      {webglAvailable === null && <div className="ground-loader" role="status">Opening URAI Ground</div>}
      {showFallback ? <GroundFallback onTravel={activate} /> : webglAvailable && <Suspense fallback={<div className="ground-loader" role="status">Opening URAI Ground</div>}><Canvas shadows={quality !== 'mobile'} dpr={quality === 'mobile' ? [1, 1.2] : quality === 'high' ? [1, 1.75] : [1, 1.5]} gl={{ antialias: quality !== 'mobile', alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }} onPointerMissed={() => preview(DESTINATIONS[0])}><GroundScene active={active} onSelect={activate} reducedMotion={reducedMotion} quality={quality} onContextLost={setContextLost} /></Canvas></Suspense>}
      <nav className="ground-destination-compass ground-rail" aria-label="Ground destinations" onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); document.querySelector<HTMLElement>(`[data-ground-control="${DESTINATIONS[(DESTINATIONS.findIndex((item) => item.id === activeId) + 1) % DESTINATIONS.length].id}"]`)?.focus() }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); document.querySelector<HTMLElement>(`[data-ground-control="${DESTINATIONS[(DESTINATIONS.findIndex((item) => item.id === activeId) - 1 + DESTINATIONS.length) % DESTINATIONS.length].id}"]`)?.focus() }
      }}>{DESTINATIONS.map((destination) => <button key={destination.id} type="button" data-ground-control={destination.id} data-ground-destination={destination.id} data-workforce-state={destination.workforceState} data-service-availability={destination.availability} aria-current={activeId === destination.id ? 'location' : undefined} aria-label={`${destination.label}. ${destination.detail}. Workforce state: ${STATE_LABEL[destination.workforceState]}. Service: ${destination.availability}.`} onFocus={() => preview(destination)} onMouseEnter={() => preview(destination)} onClick={() => activate(destination)}><span aria-hidden="true" style={{ background: destination.color }} /><strong>{destination.label}</strong></button>)}</nav>
      <button className="ground-return" type="button" onClick={() => requestUraiWorldReturn()} aria-label="Return from Ground">Return</button>
      <p className="ground-sr-only" aria-live="polite">{announcement}</p>
      <p className="ground-sr-only">Use arrow keys to preview destinations, Enter to travel, and Escape to return. The persistent Orb remains the global navigation authority.</p>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#010611;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui}
        .ground-authored-art{position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(1,6,17,.78),rgba(1,6,17,.9)),var(--ground-provider-desktop);background-size:cover;background-position:center;opacity:.42;filter:saturate(.78) contrast(1.08)}
        .ground-spatial-root canvas{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;cursor:crosshair}
        .ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:#010611;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:7px;overflow-x:auto;padding:7px;scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 2%,#000 98%,transparent)}
        .ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass button,.ground-return{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;gap:7px;min-width:48px;min-height:48px;padding:9px 12px;border:1px solid rgba(174,225,255,.18);border-radius:999px;background:rgba(1,7,18,.68);box-shadow:0 12px 36px rgba(0,0,0,.32);backdrop-filter:blur(14px);color:rgba(239,249,255,.8);font:700 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.05em;cursor:pointer;white-space:nowrap}
        .ground-destination-compass button:hover,.ground-destination-compass button:focus-visible,.ground-destination-compass button[aria-current],.ground-return:focus-visible{border-color:rgba(207,250,254,.75);background:rgba(8,27,43,.88);color:#fff;outline:3px solid rgba(255,255,255,.92);outline-offset:2px}
        .ground-destination-compass button span{width:9px;height:9px;border-radius:50%;box-shadow:0 0 14px currentColor}
        .ground-return{position:absolute;z-index:7;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left))}
        .ground-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        .ground-fallback{position:absolute;inset:0;z-index:4;display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:24px;align-items:center;padding:clamp(72px,10vw,140px) clamp(20px,6vw,90px);background:linear-gradient(135deg,rgba(1,6,17,.94),rgba(8,25,37,.88)),var(--ground-provider-desktop);background-size:cover}
        .ground-fallback p{margin:0 0 8px;text-transform:uppercase;letter-spacing:.18em;font-size:11px;color:#a5f3fc}.ground-fallback h1{margin:0;font-size:clamp(38px,6vw,76px);line-height:.92}.ground-fallback div>span{display:block;margin-top:14px;max-width:34ch;color:rgba(239,249,255,.72);line-height:1.5}.ground-fallback nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;max-height:70vh;overflow:auto}.ground-fallback nav button{min-height:64px;padding:12px;border:1px solid rgba(165,243,252,.2);border-radius:16px;background:rgba(2,10,20,.72);color:#fff;text-align:left}.ground-fallback nav button:focus-visible{outline:3px solid #fff;outline-offset:2px}.ground-fallback nav span{display:block;margin-top:5px;color:rgba(239,249,255,.62);font-size:11px}
        :global(.ground-active-label){display:grid;gap:4px;min-width:150px;padding:10px 12px;border:1px solid rgba(207,250,254,.24);border-radius:16px;background:rgba(1,7,18,.8);box-shadow:0 16px 48px rgba(0,0,0,.42);backdrop-filter:blur(14px);text-align:center;pointer-events:none}
        :global(.ground-active-label strong){font-size:11px;letter-spacing:.1em;text-transform:uppercase}:global(.ground-active-label span){font-size:9px;color:rgba(235,244,255,.72)}:global(.ground-active-label em){font-size:8px;font-style:normal;color:#a5f3fc;text-transform:uppercase;letter-spacing:.08em}
        @media(max-width:700px){.ground-authored-art{background-image:linear-gradient(rgba(1,6,17,.8),rgba(1,6,17,.92)),var(--ground-provider-mobile)}.ground-destination-compass{bottom:max(10px,env(safe-area-inset-bottom));gap:5px}.ground-destination-compass button{min-width:48px;min-height:48px;padding:8px 10px;font-size:9px}.ground-fallback{grid-template-columns:1fr;align-content:start;overflow:auto;padding:80px 16px 90px;background-image:linear-gradient(135deg,rgba(1,6,17,.94),rgba(8,25,37,.9)),var(--ground-provider-mobile)}.ground-fallback nav{grid-template-columns:1fr 1fr;max-height:none}:global(.ground-active-label){min-width:124px;padding:8px 9px}}
        @media(prefers-reduced-motion:reduce){.ground-spatial-root *{scroll-behavior:auto!important;transition:none!important;animation:none!important}.ground-destination-compass button{transform:none!important}}
      `}</style>
    </main>
  )
}
