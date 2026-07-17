'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type HomeSpatialCanvasProps = {
  onOrbOpen: () => void
  onContextLost: () => void
  webglAvailable: true
}

type CameraMode = 'arrival' | 'idle' | 'look' | 'orb' | 'avatar' | 'ascending' | 'descending'
type DeviceTier = 'low' | 'medium' | 'high'
type Mood = 'calm' | 'joy' | 'focus' | 'grief' | 'tense'

type HomeProfile = {
  mood: Mood
  groundHealth: number
  relationshipCount: number
  returning: boolean
  reducedGraphics: boolean
  seed: number
}

type NavigatorCapabilities = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const PROFILE_KEY = 'urai:home-world-state'
const REDUCED_GRAPHICS_KEY = 'urai:reduced-graphics'
let cachedWebGLAvailable: boolean | null = null

const PALETTES: Record<Mood, { sky: string; fog: string; accent: string; secondary: string; ground: string }> = {
  calm: { sky: '#061523', fog: '#0b2331', accent: '#7cecf2', secondary: '#9f91ff', ground: '#0a1117' },
  joy: { sky: '#071c2c', fog: '#173747', accent: '#aafaff', secondary: '#94d8ff', ground: '#0b171c' },
  focus: { sky: '#061624', fog: '#102a3a', accent: '#63edf4', secondary: '#789dff', ground: '#081319' },
  grief: { sky: '#08121e', fog: '#182331', accent: '#a7cadf', secondary: '#77789b', ground: '#0b1015' },
  tense: { sky: '#101426', fog: '#2a2639', accent: '#9ed7ec', secondary: '#ae8ee2', ground: '#15151d' },
}

function seedFrom(value: unknown) {
  const input = typeof value === 'string' ? value : 'private-home'
  let seed = 0
  for (let index = 0; index < input.length; index += 1) seed = ((seed << 5) - seed + input.charCodeAt(index)) | 0
  return Math.abs(seed)
}

function readProfile(): HomeProfile {
  const fallback: HomeProfile = {
    mood: 'calm',
    groundHealth: 0.62,
    relationshipCount: 4,
    returning: false,
    reducedGraphics: false,
    seed: seedFrom('private-home'),
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    const saved = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const mood = saved.mood === 'joy' || saved.mood === 'focus' || saved.mood === 'grief' || saved.mood === 'tense'
      ? saved.mood
      : 'calm'
    const groundHealth = typeof saved.groundHealth === 'number'
      ? Math.min(1, Math.max(0, saved.groundHealth))
      : fallback.groundHealth
    const relationshipCount = typeof saved.relationshipCount === 'number'
      ? Math.max(0, Math.min(8, Math.floor(saved.relationshipCount)))
      : fallback.relationshipCount
    return {
      mood,
      groundHealth,
      relationshipCount,
      returning: saved.returning === true || window.sessionStorage.getItem('urai:home:visited') === 'true',
      reducedGraphics: window.localStorage.getItem(REDUCED_GRAPHICS_KEY) === 'true',
      seed: seedFrom(saved.seed ?? saved.userId),
    }
  } catch {
    return fallback
  }
}

function deviceTierFor(reducedGraphics: boolean): DeviceTier {
  if (typeof navigator === 'undefined') return 'medium'
  const capabilities = navigator as NavigatorCapabilities
  const memory = capabilities.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  if (reducedGraphics || capabilities.connection?.saveData || memory <= 2 || cores <= 2) return 'low'
  if (memory >= 8 && cores >= 8) return 'high'
  return 'medium'
}

function useMediaPreference(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [query])
  return matches
}

function useHomeProfile() {
  const [profile, setProfile] = useState<HomeProfile>(() => readProfile())
  useEffect(() => {
    window.sessionStorage.setItem('urai:home:visited', 'true')
    const refresh = () => setProfile(readProfile())
    window.addEventListener('storage', refresh)
    window.addEventListener('urai:home-world-state', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('urai:home-world-state', refresh as EventListener)
    }
  }, [])
  return { profile, deviceTier: deviceTierFor(profile.reducedGraphics) }
}

export function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    if (cachedWebGLAvailable !== null) {
      setAvailable(cachedWebGLAvailable)
      return
    }
    try {
      const canvas = document.createElement('canvas')
      cachedWebGLAvailable = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      cachedWebGLAvailable = false
    }
    setAvailable(cachedWebGLAvailable)
  }, [])
  return available
}

function FirstHomeFrame() {
  const marked = useRef(false)
  useFrame(() => {
    if (marked.current) return
    marked.current = true
    if (performance.getEntriesByName('urai:first-home-spatial-frame').length === 0) {
      performance.mark('urai:first-home-spatial-frame')
    }
  })
  return null
}

function FrameScheduler({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      if (stopped) return
      if (document.visibilityState === 'visible') invalidate()
      timer = setTimeout(tick, Math.round(1000 / fps))
    }
    tick()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [fps, invalidate])
  return null
}

function CameraRig({ mode, pointer, reducedMotion }: { mode: CameraMode; pointer: { x: number; y: number }; reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const mobile = size.width < 720
  const compact = size.height < 650
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime()
    const base = mobile
      ? new THREE.Vector3(0, compact ? 5.9 : 6.7, compact ? 15.6 : 17.6)
      : new THREE.Vector3(0, 5.15, 13.4)
    const target = new THREE.Vector3(0, 1.9, -2.35)
    if (mode === 'arrival') base.z += reducedMotion ? 0 : Math.max(0, 4.8 - elapsed * 2.8)
    if (mode === 'look') {
      base.x += pointer.x * (mobile ? 1.2 : 2.15)
      base.y += pointer.y * -0.65
    }
    if (mode === 'orb') base.lerp(new THREE.Vector3(0, 3.05, 8.4), 0.72)
    if (mode === 'avatar') base.lerp(new THREE.Vector3(-1.9, 3.25, 8.7), 0.58)
    if (mode === 'ascending') {
      base.y += reducedMotion ? 1 : Math.min(14, elapsed * 5.5)
      base.z -= reducedMotion ? 0 : Math.min(7, elapsed * 2.4)
      target.y += 7
    }
    if (mode === 'descending') {
      base.y -= reducedMotion ? 0.8 : Math.min(4.8, elapsed * 2.7)
      base.z -= reducedMotion ? 0 : Math.min(5.5, elapsed * 2.2)
      target.y = -2.5
    }
    const easing = reducedMotion ? 1 : 1 - Math.exp(-delta * 4.8)
    camera.position.lerp(base, easing)
    camera.lookAt(target)
    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = mobile ? (compact ? 58 : 54) : 48
      camera.fov = THREE.MathUtils.lerp(camera.fov, nextFov, easing)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function SanctuaryFloor({ palette, groundHealth, onGround }: { palette: typeof PALETTES.calm; groundHealth: number; onGround: () => void }) {
  const energy = 0.32 + groundHealth * 0.5
  const stop = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onGround()
  }
  return (
    <group data-testid="urai-home-authored-sanctuary">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -2.2]} receiveShadow onClick={stop}>
        <circleGeometry args={[13.5, 128]} />
        <meshPhysicalMaterial color={palette.ground} roughness={0.2} metalness={0.78} clearcoat={1} clearcoatRoughness={0.09} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.205, -2.2]} receiveShadow>
        <ringGeometry args={[5.7, 6.25, 128]} />
        <meshStandardMaterial color="#67737e" metalness={0.94} roughness={0.18} />
      </mesh>
      {[2.25, 3.8, 5.85, 8.1].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18 + index * 0.004, -2.2]}>
          <ringGeometry args={[radius, radius + (index === 0 ? 0.11 : 0.055), 160]} />
          <meshBasicMaterial color={index % 2 ? palette.secondary : palette.accent} transparent opacity={energy - index * 0.055} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * Math.PI / 6
        return (
          <mesh key={index} rotation={[-Math.PI / 2, 0, angle]} position={[Math.sin(angle) * 3.4, -0.17, -2.2 + Math.cos(angle) * 3.4]}>
            <planeGeometry args={[0.045, 8.5]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.18 + groundHealth * 0.18} toneMapped={false} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.22, -2.2]} receiveShadow>
        <cylinderGeometry args={[1.18, 1.48, 0.7, 96]} />
        <meshPhysicalMaterial color="#111b22" metalness={0.82} roughness={0.24} clearcoat={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.59, -2.2]}>
        <ringGeometry args={[0.72, 1.02, 96]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.58} toneMapped={false} />
      </mesh>
    </group>
  )
}

function EmbodiedAvatar({ palette, reducedMotion, onAvatar }: { palette: typeof PALETTES.calm; reducedMotion: boolean; onAvatar: () => void }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current || reducedMotion) return
    const breath = Math.sin(state.clock.getElapsedTime() * 1.25) * 0.018
    group.current.scale.y = 1 + breath
    group.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.42) * 0.008
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onAvatar()
  }
  return (
    <group ref={group} position={[-1.75, 0.02, 0.35]} rotation={[0, -0.32, 0]} data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 2.98, 0]} castShadow onClick={activate}>
        <sphereGeometry args={[0.32, 40, 40]} />
        <meshPhysicalMaterial color="#111923" roughness={0.28} metalness={0.22} clearcoat={0.55} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow onClick={activate}>
        <capsuleGeometry args={[0.43, 1.55, 10, 28]} />
        <meshPhysicalMaterial color="#0c151d" roughness={0.34} metalness={0.3} clearcoat={0.68} />
      </mesh>
      {[-0.38, 0.38].map((x) => (
        <mesh key={`arm-${x}`} position={[x, 1.75, 0]} rotation={[0, 0, x > 0 ? -0.13 : 0.13]} castShadow onClick={activate}>
          <capsuleGeometry args={[0.12, 1.35, 8, 20]} />
          <meshStandardMaterial color="#111d25" metalness={0.22} roughness={0.4} />
        </mesh>
      ))}
      {[-0.2, 0.2].map((x) => (
        <mesh key={`leg-${x}`} position={[x, 0.45, 0]} castShadow onClick={activate}>
          <capsuleGeometry args={[0.15, 1.35, 8, 20]} />
          <meshStandardMaterial color="#0c141b" metalness={0.25} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0]} scale={[1.15, 1.6, 0.75]}>
        <sphereGeometry args={[0.72, 48, 30]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={0.055} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.85, 0.2]} color={palette.secondary} intensity={1.6} distance={5} />
    </group>
  )
}

function RelationshipPresences({ count, palette }: { count: number; palette: typeof PALETTES.calm }) {
  return (
    <group data-testid="urai-home-relationship-presences">
      {Array.from({ length: count }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        const rank = Math.floor(index / 2)
        return (
          <group key={index} position={[side * (5.2 + rank * 1.35), 0.15, -6.8 - rank * 1.5]} scale={0.78 - rank * 0.08}>
            <mesh position={[0, 1.9, 0]}>
              <capsuleGeometry args={[0.18, 1.65, 8, 16]} />
              <meshBasicMaterial color={palette.secondary} transparent opacity={0.12} depthWrite={false} />
            </mesh>
            <mesh position={[0, 2.95, 0]}>
              <sphereGeometry args={[0.24, 20, 20]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={0.16} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Orb({ palette, reducedMotion, onOpen }: { palette: typeof PALETTES.calm; reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame((state, delta) => {
    if (!group.current) return
    const targetScale = hovered ? 1.08 : 1
    const easing = reducedMotion ? 1 : 1 - Math.exp(-delta * 8)
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, targetScale, easing))
    if (!reducedMotion) {
      group.current.position.y = 1.53 + Math.sin(state.clock.getElapsedTime() * 1.05) * 0.08
      group.current.rotation.y = state.clock.getElapsedTime() * 0.12
    }
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onOpen()
  }
  return (
    <group ref={group} position={[0, 1.53, -2.2]} data-testid="urai-home-webgl-orb">
      <mesh castShadow onClick={activate} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.62, 64, 64]} />
        <meshPhysicalMaterial color="#efffff" emissive={palette.accent} emissiveIntensity={hovered ? 4.2 : 3.2} roughness={0.035} metalness={0.3} clearcoat={1} clearcoatRoughness={0.02} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.035, 16, 128]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.48, 0.18, 0]}>
        <torusGeometry args={[0.82, 0.022, 12, 96]} />
        <meshBasicMaterial color="#f4d59a" transparent opacity={0.66} toneMapped={false} />
      </mesh>
      <pointLight color={palette.accent} intensity={hovered ? 19 : 15} distance={13} decay={2} />
    </group>
  )
}

function HorizonArchitecture({ palette }: { palette: typeof PALETTES.calm }) {
  return (
    <group position={[0, 0, -13.8]} data-testid="urai-home-horizon-architecture">
      {[-8.4, -5.6, -2.8, 2.8, 5.6, 8.4].map((x, index) => (
        <group key={x} position={[x, 0, index % 2 ? 0.7 : 0]}>
          <mesh position={[0, 2.7 + (index % 3) * 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.68, 5.4 + (index % 3) * 1.15, 6]} />
            <meshPhysicalMaterial color="#101b25" emissive={index % 2 ? palette.accent : palette.secondary} emissiveIntensity={0.14} metalness={0.72} roughness={0.28} clearcoat={0.65} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 1.05, 48]} />
            <meshBasicMaterial color={index % 2 ? palette.accent : palette.secondary} transparent opacity={0.24} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.4, -1.6]} scale={[12, 0.18, 1.8]}>
        <sphereGeometry args={[1, 64, 24]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.055} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Atmosphere({ palette, reducedMotion, tier, onSky }: { palette: typeof PALETTES.calm; reducedMotion: boolean; tier: DeviceTier; onSky: () => void }) {
  const veil = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!veil.current || reducedMotion) return
    veil.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.04) * 0.035
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSky()
  }
  return (
    <group data-testid="urai-home-layered-atmosphere">
      <mesh position={[0, 8.8, -24]} scale={[24, 1.5, 8]} ref={veil}>
        <sphereGeometry args={[1, 64, 28]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.045} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 13.4, -34]} scale={[29, 2.3, 10]} rotation={[0, 0, -0.08]}>
        <sphereGeometry args={[1, 64, 28]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={0.035} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 10, -18]} onClick={activate}>
        <planeGeometry args={[38, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {tier !== 'low' ? <Stars radius={68} depth={44} count={tier === 'high' ? 1900 : 1100} factor={3.6} saturation={0.2} fade speed={reducedMotion ? 0 : 0.12} /> : null}
    </group>
  )
}

function Scene({ profile, tier, mode, pointer, reducedMotion, onOrbOpen, onAvatar, onSky, onGround }: {
  profile: HomeProfile
  tier: DeviceTier
  mode: CameraMode
  pointer: { x: number; y: number }
  reducedMotion: boolean
  onOrbOpen: () => void
  onAvatar: () => void
  onSky: () => void
  onGround: () => void
}) {
  const palette = PALETTES[profile.mood]
  return (
    <>
      <FirstHomeFrame />
      <FrameScheduler fps={tier === 'low' ? 24 : tier === 'medium' ? 40 : 60} />
      <CameraRig mode={mode} pointer={pointer} reducedMotion={reducedMotion} />
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.fog, 18, 64]} />
      <ambientLight intensity={0.58} color="#d7edf5" />
      <hemisphereLight args={['#d9f4ff', '#090e12', 1.45]} />
      <directionalLight position={[-7, 13, 8]} intensity={3.1} color="#f7e7cd" castShadow shadow-mapSize-width={tier === 'high' ? 1536 : 1024} shadow-mapSize-height={tier === 'high' ? 1536 : 1024} />
      <directionalLight position={[8, 7, -9]} intensity={1.7} color="#7ccfff" />
      <pointLight position={[0, 8, -10]} intensity={5.2} color={palette.secondary} distance={30} />
      <Atmosphere palette={palette} reducedMotion={reducedMotion} tier={tier} onSky={onSky} />
      <SanctuaryFloor palette={palette} groundHealth={profile.groundHealth} onGround={onGround} />
      <HorizonArchitecture palette={palette} />
      <RelationshipPresences count={profile.relationshipCount} palette={palette} />
      <EmbodiedAvatar palette={palette} reducedMotion={reducedMotion} onAvatar={onAvatar} />
      <Orb palette={palette} reducedMotion={reducedMotion} onOpen={onOrbOpen} />
    </>
  )
}

export default function HomeSpatialCanvas({ onOrbOpen, onContextLost, webglAvailable }: HomeSpatialCanvasProps) {
  const { profile, deviceTier } = useHomeProfile()
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const [mode, setMode] = useState<CameraMode>('arrival')
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => {
    const ascending = destination === 'life-map'
    setMode(ascending ? 'ascending' : 'descending')
    requestUraiWorldTravel({
      destination,
      href: ascending ? '/life-map?from=home-sky' : '/ground?from=home',
      entryPortal: ascending ? 'home-sky' : 'home-ground',
      cameraCheckpoint: ascending ? 'home-sky-ascent' : 'home-ground-descent',
    })
  }, [])

  const openOrb = useCallback(() => {
    setMode('orb')
    onOrbOpen()
  }, [onOrbOpen])

  const openAvatar = useCallback(() => {
    setMode('avatar')
    window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary' } }))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setMode('idle'), reducedMotion ? 180 : profile.returning ? 500 : 1200)
    return () => window.clearTimeout(timer)
  }, [profile.returning, reducedMotion])

  useEffect(() => () => { document.body.style.cursor = 'default' }, [])

  if (!webglAvailable) return null

  return (
    <div
      className="urai-home-spatial-canvas-shell"
      data-home-spatial-renderer="webgl"
      data-webgl-ready="true"
      data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"
      data-home-device-tier={deviceTier}
      data-home-camera-mode={mode}
      data-home-personalized="true"
      aria-label="Interactive URAI personal sanctuary"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
        setPointer({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) })
        if (mode === 'idle') setMode('look')
      }}
      onPointerLeave={() => {
        setPointer({ x: 0, y: 0 })
        if (mode === 'look') setMode('idle')
      }}
    >
      <Canvas
        className="urai-home-spatial-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        shadows
        frameloop="demand"
        dpr={deviceTier === 'low' ? [0.85, 1] : deviceTier === 'medium' ? [1, 1.35] : [1, 1.7]}
        camera={{ position: [0, 5.15, 13.4], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: deviceTier !== 'low', alpha: false, powerPreference: deviceTier === 'low' ? 'low-power' : 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onContextLost()
          }, { once: true })
        }}
      >
        <Scene
          profile={profile}
          tier={deviceTier}
          mode={mode}
          pointer={pointer}
          reducedMotion={reducedMotion}
          onOrbOpen={openOrb}
          onAvatar={openAvatar}
          onSky={() => travel('life-map')}
          onGround={() => travel('infrastructure-hub')}
        />
      </Canvas>
      <div className="sr-only" aria-label="URAI Home sanctuary actions">
        <button type="button" onClick={openOrb}>Open Orb companion</button>
        <button type="button" onClick={openAvatar}>Open embodied self</button>
        <button type="button" onClick={() => travel('life-map')}>Ascend to Life Map</button>
        <button type="button" onClick={() => travel('infrastructure-hub')}>Descend to Ground</button>
      </div>
    </div>
  )
}
