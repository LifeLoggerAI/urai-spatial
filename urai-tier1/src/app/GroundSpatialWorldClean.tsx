'use client'

import { Html, PerspectiveCamera, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type WorkforceState = 'idle' | 'observing-locally' | 'preparing' | 'awaiting-owner-approval' | 'executing' | 'completed' | 'blocked' | 'revoked'

type GroundDestination = {
  id: string
  label: string
  detail: string
  href: string
  color: string
  position: [number, number, number]
  camera: [number, number, number]
  lookAt: [number, number, number]
  workforceState: WorkforceState
}

const DESTINATIONS: readonly GroundDestination[] = [
  { id: 'reception', label: 'Reception', detail: 'Today and arrivals', href: '/ground?district=reception', color: '#67e8f9', position: [-5.8, 0, -5], camera: [-3.7, 1.65, -0.4], lookAt: [-5.8, 1.1, -5], workforceState: 'observing-locally' },
  { id: 'privacy', label: 'Privacy Sanctuary', detail: 'Consent and local control', href: '/privacy-controls?from=ground', color: '#a78bfa', position: [5.8, 0, -5], camera: [3.7, 1.65, -0.4], lookAt: [5.8, 1.1, -5], workforceState: 'awaiting-owner-approval' },
  { id: 'council', label: 'Council', detail: 'Approvals and decisions', href: '/ground?district=council', color: '#facc6b', position: [0, 0, -9], camera: [0, 1.7, -3.6], lookAt: [0, 1.2, -9], workforceState: 'preparing' },
  { id: 'logistics', label: 'Logistics', detail: 'Tasks and movement', href: '/jobs?from=ground', color: '#fb7185', position: [-8.5, 0, -12.5], camera: [-5.2, 1.7, -7.1], lookAt: [-8.5, 1.2, -12.5], workforceState: 'blocked' },
  { id: 'wellness', label: 'Wellness', detail: 'Recovery and body signals', href: '/focus?from=ground', color: '#86efac', position: [8.5, 0, -12.5], camera: [5.2, 1.7, -7.1], lookAt: [8.5, 1.2, -12.5], workforceState: 'idle' },
  { id: 'archive', label: 'Archive', detail: 'Memory and provenance', href: '/life-map?from=ground', color: '#93c5fd', position: [0, 0, -17], camera: [0, 1.7, -10.7], lookAt: [0, 1.2, -17], workforceState: 'completed' },
  { id: 'mirror', label: 'Reflection Realm', detail: 'Mirror and rewind', href: '/mirror?from=ground', color: '#e9d5ff', position: [-7, 1.4, -19.5], camera: [-4.2, 2.1, -14], lookAt: [-7, 2.1, -19.5], workforceState: 'idle' },
  { id: 'passport', label: 'Ownership Vault', detail: 'Identity and export', href: '/passport?from=ground', color: '#fde68a', position: [7, 1.4, -19.5], camera: [4.2, 2.1, -14], lookAt: [7, 2.1, -19.5], workforceState: 'awaiting-owner-approval' },
  { id: 'atlas', label: 'Emotional Atlas', detail: 'Consent-aware place memory', href: '/location-map?from=ground', color: '#5eead4', position: [-5.5, 2.8, -24], camera: [-3.2, 2.8, -18.2], lookAt: [-5.5, 3.2, -24], workforceState: 'observing-locally' },
  { id: 'focus', label: 'Focus Chamber', detail: 'Selected-memory attention', href: '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&from=ground', color: '#c4b5fd', position: [0, 2.8, -25.5], camera: [0, 2.8, -19], lookAt: [0, 3.2, -25.5], workforceState: 'preparing' },
  { id: 'replay', label: 'Replay Theater', detail: 'Entered-memory cinema', href: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&from=ground', color: '#f9a8d4', position: [5.5, 2.8, -24], camera: [3.2, 2.8, -18.2], lookAt: [5.5, 3.2, -24], workforceState: 'idle' },
]

const STATE_LABEL: Record<WorkforceState, string> = {
  idle: 'Idle',
  'observing-locally': 'Observing locally',
  preparing: 'Preparing',
  'awaiting-owner-approval': 'Awaiting your approval',
  executing: 'Executing',
  completed: 'Completed',
  blocked: 'Blocked',
  revoked: 'Revoked',
}

function CameraRig({ active }: { active: GroundDestination | null }) {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    const destination = active
    target.set(...(destination?.camera ?? (size.width < 700 ? [0, 1.55, 4.2] : [0, 1.7, 5.8])))
    look.set(...(destination?.lookAt ?? [0, 1.15, -8.8]))
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 4.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 4.5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 4.5, delta)
    camera.lookAt(look)
  })
  return <PerspectiveCamera makeDefault position={[0, 1.7, 5.8]} fov={size.width < 700 ? 68 : 58} near={0.08} far={120} />
}

function WorkforcePresence({ destination, index }: { destination: GroundDestination; index: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    group.current.position.y = Math.sin(clock.elapsedTime * 0.65 + index) * 0.02
  })
  const color = new THREE.Color(destination.color)
  const opacity = destination.workforceState === 'revoked' ? 0.18 : destination.workforceState === 'blocked' ? 0.38 : 0.68
  return (
    <group ref={group} position={[destination.position[0] * 0.82, 0, destination.position[2] + 1.2]} data-workforce-state={destination.workforceState}>
      <mesh position={[0, 1.38, 0]} castShadow><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial color="#e7f7fb" emissive={color} emissiveIntensity={0.32} transparent opacity={opacity} /></mesh>
      <mesh position={[0, 0.82, 0]} castShadow><capsuleGeometry args={[0.21, 0.72, 8, 16]} /><meshStandardMaterial color="#0e1a25" emissive={color} emissiveIntensity={0.2} roughness={0.5} metalness={0.32} transparent opacity={opacity} /></mesh>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.28, 0.34, 36]} /><meshBasicMaterial color={color} transparent opacity={opacity * 0.7} toneMapped={false} /></mesh>
    </group>
  )
}

function Corridor({ destination }: { destination: GroundDestination }) {
  const x = destination.position[0] * 0.5
  const z = destination.position[2] * 0.5
  const length = Math.hypot(destination.position[0], destination.position[2])
  const angle = Math.atan2(destination.position[0], destination.position[2])
  return <group position={[x, -0.02, z]} rotation={[0, angle, 0]}><mesh receiveShadow><boxGeometry args={[1.35, 0.08, length]} /><meshStandardMaterial color="#121f29" roughness={0.72} metalness={0.18} /></mesh><mesh position={[0, 0.055, 0]}><boxGeometry args={[0.06, 0.018, length * 0.92]} /><meshBasicMaterial color={destination.color} transparent opacity={0.42} toneMapped={false} /></mesh></group>
}

function DestinationArchitecture({ destination, active, onSelect }: { destination: GroundDestination; active: boolean; onSelect: () => void }) {
  const color = new THREE.Color(destination.color)
  const activate = (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect() }
  return (
    <group position={destination.position} data-ground-destination={destination.id}>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow onClick={activate} onPointerEnter={() => { document.body.style.cursor = 'pointer' }} onPointerLeave={() => { document.body.style.cursor = '' }}><boxGeometry args={[3.7, 3.2, 1.25]} /><meshPhysicalMaterial color="#10212d" emissive={color} emissiveIntensity={active ? 0.28 : 0.1} roughness={0.36} metalness={0.54} clearcoat={0.48} /></mesh>
      <mesh position={[0, 1.22, 0.66]} castShadow onClick={activate}><boxGeometry args={[1.5, 2.35, 0.18]} /><meshStandardMaterial color="#020712" emissive={color} emissiveIntensity={active ? 0.72 : 0.28} roughness={0.2} metalness={0.68} /></mesh>
      <mesh position={[0, 3.35, 0]}><torusGeometry args={[0.68, 0.06, 12, 64]} /><meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.46} toneMapped={false} /></mesh>
      <pointLight position={[0, 2.1, 1.8]} color={color} intensity={active ? 7 : 3.2} distance={8} decay={2} />
      {active && <Html position={[0, 3.95, 0]} center distanceFactor={11}><div className="ground-active-label"><strong>{destination.label}</strong><span>{destination.detail}</span><em>{STATE_LABEL[destination.workforceState]}</em></div></Html>}
    </group>
  )
}

function WorldEnvelope() {
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -12]} receiveShadow><planeGeometry args={[42, 60]} /><meshStandardMaterial color="#08121b" emissive="#061321" emissiveIntensity={0.18} roughness={0.9} metalness={0.12} /></mesh>{[-13, 13].map((x) => <mesh key={x} position={[x, 5.8, -13]} receiveShadow castShadow><boxGeometry args={[1.1, 12, 52]} /><meshStandardMaterial color="#07101a" emissive="#0f2b3c" emissiveIntensity={0.08} roughness={0.7} metalness={0.3} /></mesh>)}{[[-8, -8], [8, -8], [-10, -18], [10, -18], [-7, -28], [7, -28]].map(([x, z], index) => <mesh key={`${x}-${z}`} position={[x, 4 + (index % 2), z]} castShadow receiveShadow><boxGeometry args={[2.4, 8 + (index % 2) * 2, 2.4]} /><meshStandardMaterial color="#0a1722" emissive={index % 2 ? '#1b3650' : '#132a3a'} emissiveIntensity={0.1} roughness={0.55} metalness={0.4} /></mesh>)}<mesh position={[0, 6.8, -31]} castShadow receiveShadow><boxGeometry args={[18, 13, 2.2]} /><meshStandardMaterial color="#06101a" emissive="#132d48" emissiveIntensity={0.14} roughness={0.52} metalness={0.46} /></mesh></>
}

function GroundScene({ active, onSelect }: { active: GroundDestination | null; onSelect: (destination: GroundDestination) => void }) {
  return <><color attach="background" args={['#010611']} /><fog attach="fog" args={['#03111d', 10, 48]} /><CameraRig active={active} /><ambientLight intensity={0.36} color="#dbeafe" /><hemisphereLight args={['#cfe8ff', '#010409', 0.95]} /><directionalLight position={[-7, 11, 6]} intensity={1.8} color="#e8f5ff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} /><pointLight position={[0, 5, -10]} intensity={7} color="#67e8f9" distance={25} /><Stars radius={70} depth={45} count={1000} factor={2.2} saturation={0.22} fade speed={0.05} /><WorldEnvelope />{DESTINATIONS.map((destination) => <Corridor key={`path-${destination.id}`} destination={destination} />)}{DESTINATIONS.map((destination) => <DestinationArchitecture key={destination.id} destination={destination} active={active?.id === destination.id} onSelect={() => onSelect(destination)} />)}{DESTINATIONS.slice(0, 8).map((destination, index) => <WorkforcePresence key={`worker-${destination.id}`} destination={destination} index={index} />)}<EffectComposer><Bloom intensity={0.58} luminanceThreshold={0.18} luminanceSmoothing={0.4} /><Vignette eskil={false} offset={0.2} darkness={0.34} /></EffectComposer></>
}

export default function GroundSpatialWorldClean() {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = DESTINATIONS.find((destination) => destination.id === activeId) ?? null
  const navigate = useCallback((destination: GroundDestination) => { setActiveId(destination.id); window.setTimeout(() => router.push(destination.href), 520) }, [router])
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get('district'); if (requested && DESTINATIONS.some((destination) => destination.id === requested)) setActiveId(requested) }, [])
  return (
    <main className="ground-spatial-root" aria-label="URAI Ground embodied private infrastructure" data-testid="urai-ground-private-workforce-world" tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'Escape') { setActiveId(null); router.push('/home?returnFrom=ground') }
      if (event.key === 'Enter' && active) navigate(active)
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); const index = Math.max(0, DESTINATIONS.findIndex((destination) => destination.id === activeId)); setActiveId(DESTINATIONS[(index + 1) % DESTINATIONS.length].id) }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); const index = Math.max(0, DESTINATIONS.findIndex((destination) => destination.id === activeId)); setActiveId(DESTINATIONS[(index - 1 + DESTINATIONS.length) % DESTINATIONS.length].id) }
    }}>
      <Suspense fallback={<div className="ground-loader" role="status">Opening URAI Ground</div>}><Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onPointerMissed={() => setActiveId(null)}><GroundScene active={active} onSelect={navigate} /></Canvas></Suspense>
      <nav className="ground-destination-compass" aria-label="Ground destinations">{DESTINATIONS.map((destination) => <button key={destination.id} type="button" aria-current={activeId === destination.id ? 'location' : undefined} aria-label={`${destination.label}. ${destination.detail}. Workforce state: ${STATE_LABEL[destination.workforceState]}.`} onFocus={() => setActiveId(destination.id)} onMouseEnter={() => setActiveId(destination.id)} onClick={() => navigate(destination)}><span aria-hidden="true" style={{ background: destination.color }} /><strong>{destination.label}</strong></button>)}</nav>
      <p className="ground-accessible-instruction">Use arrow keys to preview destinations, Enter to travel, and Escape to return Home. The persistent Orb remains the global navigation authority.</p>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#010611;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui}
        .ground-spatial-root canvas{position:absolute;inset:0;display:block;width:100%;height:100%;cursor:crosshair}
        .ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:#010611;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:6;display:flex;gap:7px;overflow-x:auto;padding:6px;scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 2%,#000 98%,transparent)}
        .ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass button{display:inline-flex;flex:0 0 auto;align-items:center;gap:7px;min-height:42px;padding:8px 11px;border:1px solid rgba(174,225,255,.18);border-radius:999px;background:rgba(1,7,18,.62);box-shadow:0 12px 36px rgba(0,0,0,.32);backdrop-filter:blur(14px);color:rgba(239,249,255,.78);font:700 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.05em;cursor:pointer}
        .ground-destination-compass button:hover,.ground-destination-compass button:focus-visible,.ground-destination-compass button[aria-current]{border-color:rgba(207,250,254,.7);background:rgba(8,27,43,.84);color:#fff;outline:none;transform:translateY(-2px)}
        .ground-destination-compass button span{width:8px;height:8px;border-radius:50%;box-shadow:0 0 14px currentColor}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        :global(.ground-active-label){display:grid;gap:4px;min-width:150px;padding:10px 12px;border:1px solid rgba(207,250,254,.24);border-radius:16px;background:rgba(1,7,18,.76);box-shadow:0 16px 48px rgba(0,0,0,.42);backdrop-filter:blur(14px);text-align:center;pointer-events:none}
        :global(.ground-active-label strong){font-size:11px;letter-spacing:.1em;text-transform:uppercase}:global(.ground-active-label span){font-size:9px;color:rgba(235,244,255,.72)}:global(.ground-active-label em){font-size:8px;font-style:normal;color:#a5f3fc;text-transform:uppercase;letter-spacing:.08em}
        @media(max-width:700px){.ground-destination-compass{bottom:max(10px,env(safe-area-inset-bottom));gap:5px}.ground-destination-compass button{min-height:40px;padding:7px 9px;font-size:9px}:global(.ground-active-label){min-width:124px;padding:8px 9px}}
        @media(prefers-reduced-motion:reduce){.ground-destination-compass button{transition:none!important;transform:none!important}}
      `}</style>
    </main>
  )
}
