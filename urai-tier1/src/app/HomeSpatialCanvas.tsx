'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { assetCssStack, homeAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type HomeSpatialCanvasProps = {
  onOrbOpen: () => void
  webglAvailable: true
}

type CameraMode = 'arrival' | 'idle' | 'look' | 'orb' | 'avatar' | 'ascending' | 'descending'
type DeviceTier = 'low' | 'medium' | 'high'
type Mood = 'calm' | 'joy' | 'focus' | 'grief' | 'tense'
type PointerRef = { current: { x: number; y: number } }

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

const PALETTES: Record<Mood, { accent: string; secondary: string }> = {
  calm: { accent: '#7cecf2', secondary: '#9f91ff' },
  joy: { accent: '#aafaff', secondary: '#94d8ff' },
  focus: { accent: '#63edf4', secondary: '#789dff' },
  grief: { accent: '#a7cadf', secondary: '#77789b' },
  tense: { accent: '#9ed7ec', secondary: '#ae8ee2' },
}

function seedFrom(value: unknown) {
  const input = value !== undefined && value !== null ? String(value) : 'private-home'
  let seed = 0
  for (let index = 0; index < input.length; index += 1) seed = ((seed << 5) - seed + input.charCodeAt(index)) | 0
  return Math.abs(seed)
}

const DEFAULT_HOME_PROFILE: HomeProfile = {
  mood: 'calm',
  groundHealth: 0.62,
  relationshipCount: 4,
  returning: false,
  reducedGraphics: false,
  seed: seedFrom('private-home'),
}

function readProfile(): HomeProfile {
  if (typeof window === 'undefined') return DEFAULT_HOME_PROFILE
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    const saved = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const mood = saved.mood === 'joy' || saved.mood === 'focus' || saved.mood === 'grief' || saved.mood === 'tense'
      ? saved.mood
      : 'calm'
    const groundHealth = typeof saved.groundHealth === 'number' && Number.isFinite(saved.groundHealth)
      ? Math.min(1, Math.max(0, saved.groundHealth))
      : DEFAULT_HOME_PROFILE.groundHealth
    const relationshipCount = typeof saved.relationshipCount === 'number' && Number.isFinite(saved.relationshipCount)
      ? Math.max(0, Math.min(8, Math.floor(saved.relationshipCount)))
      : DEFAULT_HOME_PROFILE.relationshipCount
    return {
      mood,
      groundHealth,
      relationshipCount,
      returning: saved.returning === true || window.sessionStorage.getItem('urai:home:visited') === 'true',
      reducedGraphics: window.localStorage.getItem(REDUCED_GRAPHICS_KEY) === 'true',
      seed: seedFrom(saved.seed ?? saved.userId),
    }
  } catch {
    return DEFAULT_HOME_PROFILE
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
  const [profile, setProfile] = useState<HomeProfile>(DEFAULT_HOME_PROFILE)
  useEffect(() => {
    const refresh = () => setProfile(readProfile())
    refresh()
    try {
      window.sessionStorage.setItem('urai:home:visited', 'true')
    } catch {
      // Restricted storage must not prevent Home state listeners from registering.
    }
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
    let frameId = 0
    let lastFrameTime = performance.now()
    const frameInterval = 1000 / fps
    const tick = (now: number) => {
      const elapsed = now - lastFrameTime
      if (elapsed >= frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval)
        if (document.visibilityState === 'visible') invalidate()
      }
      frameId = window.requestAnimationFrame(tick)
    }
    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [fps, invalidate])
  return null
}

const cameraBase = new THREE.Vector3()
const cameraTarget = new THREE.Vector3()
const cameraDestination = new THREE.Vector3()

function CameraRig({ mode, pointerRef, reducedMotion }: { mode: CameraMode; pointerRef: PointerRef; reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const mobile = size.width < 720
  const compact = size.height < 650
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime()
    if (mobile) cameraBase.set(0, compact ? 4.9 : 5.6, compact ? 14.2 : 15.8)
    else cameraBase.set(0, 4.45, 12.6)
    cameraTarget.set(0, 1.8, -2.8)
    if (mode === 'arrival') cameraBase.z += reducedMotion ? 0 : Math.max(0, 3.8 - elapsed * 2.5)
    if (mode === 'look') {
      cameraBase.x += pointerRef.current.x * (mobile ? 0.65 : 1.15)
      cameraBase.y += pointerRef.current.y * -0.32
    }
    if (mode === 'orb') cameraBase.lerp(cameraDestination.set(1.25, 3.1, 9.4), 0.58)
    if (mode === 'avatar') cameraBase.lerp(cameraDestination.set(-1.5, 3.1, 9.2), 0.5)
    if (mode === 'ascending') {
      cameraBase.y += reducedMotion ? 1 : Math.min(12, elapsed * 5)
      cameraBase.z -= reducedMotion ? 0 : Math.min(6, elapsed * 2.2)
      cameraTarget.y += 7
    }
    if (mode === 'descending') {
      cameraBase.y -= reducedMotion ? 0.8 : Math.min(4.4, elapsed * 2.5)
      cameraBase.z -= reducedMotion ? 0 : Math.min(5, elapsed * 2)
      cameraTarget.y = -2.2
    }
    const easing = reducedMotion ? 1 : 1 - Math.exp(-delta * 4.8)
    camera.position.lerp(cameraBase, easing)
    camera.lookAt(cameraTarget)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, mobile ? 52 : 45, easing)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function SanctuaryFloor({ palette, groundHealth, onGround }: { palette: typeof PALETTES.calm; groundHealth: number; onGround: () => void }) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onGround()
  }
  const energy = 0.08 + groundHealth * 0.1
  return (
    <group data-testid="urai-home-authored-sanctuary" name="home-transparent-threshold-floor">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -2.4]} onClick={activate}>
        <planeGeometry args={[34, 30]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {[3.2, 5.4, 7.8].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13 + index * 0.006, -2.4]}>
          <ringGeometry args={[radius, radius + 0.035, 128]} />
          <meshBasicMaterial color={index % 2 ? palette.secondary : palette.accent} transparent opacity={Math.max(0.035, energy - index * 0.025)} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SanctuaryGardens({ palette }: { palette: typeof PALETTES.calm }) {
  return (
    <group data-testid="urai-home-sculpted-gardens" name="home-authored-garden-lighting">
      {[-5.8, -3.1, 3.1, 5.8].map((x, index) => (
        <pointLight key={x} position={[x, 0.8, -7.6 - Math.abs(x) * 0.22]} color={index % 2 ? palette.secondary : palette.accent} intensity={0.32} distance={4.2} />
      ))}
    </group>
  )
}

function EmbodiedAvatar({ palette, reducedMotion, onAvatar }: { palette: typeof PALETTES.calm; reducedMotion: boolean; onAvatar: () => void }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current || reducedMotion) return
    const breath = 1 + Math.sin(state.clock.getElapsedTime() * 1.15) * 0.012
    group.current.scale.y = breath
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onAvatar()
  }
  return (
    <group ref={group} position={[-2.2, 0.08, -0.25]} rotation={[0, -0.18, 0]} scale={0.82} data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 2.9, 0]} onClick={activate}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshPhysicalMaterial color="#c9eef2" emissive={palette.secondary} emissiveIntensity={0.38} transparent opacity={0.36} roughness={0.14} metalness={0.1} transmission={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.62, 0]} onClick={activate}>
        <capsuleGeometry args={[0.32, 1.55, 10, 24]} />
        <meshPhysicalMaterial color="#81cbd1" emissive={palette.accent} emissiveIntensity={0.2} transparent opacity={0.23} roughness={0.12} transmission={0.62} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 1.7, 0.2]} color={palette.secondary} intensity={0.8} distance={4.2} />
    </group>
  )
}

function RelationshipPresences({ count, palette }: { count: number; palette: typeof PALETTES.calm }) {
  return (
    <group data-testid="urai-home-relationship-presences" name="home-relationship-depth-lights">
      {Array.from({ length: count }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        const rank = Math.floor(index / 2)
        return (
          <mesh key={index} position={[side * (4.7 + rank * 1.2), 2.1 + rank * 0.2, -8.4 - rank * 1.4]}>
            <sphereGeometry args={[0.08 + rank * 0.012, 16, 16]} />
            <meshBasicMaterial color={index % 2 ? palette.secondary : palette.accent} transparent opacity={0.28 - rank * 0.04} depthWrite={false} toneMapped={false} />
          </mesh>
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
    if (!reducedMotion) group.current.position.y = 1.55 + Math.sin(state.clock.getElapsedTime() * 0.9) * 0.055
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onOpen()
  }
  return (
    <group ref={group} position={[2.45, 1.55, -1.15]} data-testid="urai-home-webgl-orb" name="home-only-companion">
      <mesh onClick={activate} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshPhysicalMaterial color="#ecffff" emissive={palette.accent} emissiveIntensity={hovered ? 3.4 : 2.5} roughness={0.04} metalness={0.16} clearcoat={1} transmission={0.18} />
      </mesh>
      <mesh scale={1.38}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight color={palette.accent} intensity={hovered ? 7.5 : 5.5} distance={7.5} decay={2} />
    </group>
  )
}

function Atmosphere({ palette, reducedMotion, tier, onSky }: { palette: typeof PALETTES.calm; reducedMotion: boolean; tier: DeviceTier; onSky: () => void }) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSky()
  }
  return (
    <group data-testid="urai-home-layered-atmosphere" name="home-transparent-sky-interaction">
      <mesh position={[0, 9, -18]} onClick={activate}>
        <planeGeometry args={[38, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {tier !== 'low' ? <Stars radius={62} depth={36} count={tier === 'high' ? 760 : 420} factor={2.2} saturation={0.18} fade speed={reducedMotion ? 0 : 0.045} /> : null}
      <pointLight position={[0, 7.5, -12]} color={palette.secondary} intensity={0.65} distance={18} />
    </group>
  )
}

function Scene({ profile, tier, mode, pointerRef, reducedMotion, onOrbOpen, onAvatar, onSky, onGround }: {
  profile: HomeProfile
  tier: DeviceTier
  mode: CameraMode
  pointerRef: PointerRef
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
      <CameraRig mode={mode} pointerRef={pointerRef} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.42} color="#d7edf5" />
      <Atmosphere palette={palette} reducedMotion={reducedMotion} tier={tier} onSky={onSky} />
      <SanctuaryFloor palette={palette} groundHealth={profile.groundHealth} onGround={onGround} />
      <SanctuaryGardens palette={palette} />
      <RelationshipPresences count={profile.relationshipCount} palette={palette} />
      <EmbodiedAvatar palette={palette} reducedMotion={reducedMotion} onAvatar={onAvatar} />
      <Orb palette={palette} reducedMotion={reducedMotion} onOpen={onOrbOpen} />
    </>
  )
}

export default function HomeSpatialCanvas({ onOrbOpen, webglAvailable }: HomeSpatialCanvasProps) {
  const { profile, deviceTier } = useHomeProfile()
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const [mode, setMode] = useState<CameraMode>('arrival')
  const pointerRef = useRef({ x: 0, y: 0 })
  const artStyle = {
    '--home-authored-desktop': assetCssStack(homeAssets.primary),
    '--home-authored-mobile': assetCssStack(homeAssets.mobile),
  } as CSSProperties

  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => {
    const ascending = destination === 'life-map'
    setMode(ascending ? 'ascending' : 'descending')
    if (ascending) {
      requestUraiWorldTravel({
        destination: 'life-map',
        href: '/life-map?from=home-sky',
        entryPortal: 'home-sky',
        cameraCheckpoint: 'home-sky-ascent',
      })
      return
    }
    requestUraiWorldTravel({
      destination: 'infrastructure-hub',
      href: '/ground/',
      entryPortal: 'home-ground',
      cameraCheckpoint: 'home-ground-descent',
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
      style={artStyle}
      data-home-spatial-renderer="webgl"
      data-webgl-ready="true"
      data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"
      data-home-visual-owner="authored-provider-art"
      data-home-no-finite-horizon-band="true"
      data-tier0-ground-gateway="true"
      data-home-device-tier={deviceTier}
      data-home-camera-mode={mode}
      data-home-personalized="true"
      aria-label="Interactive URAI personal sanctuary"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
        pointerRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }
        if (mode === 'idle') setMode('look')
      }}
      onPointerLeave={() => {
        pointerRef.current = { x: 0, y: 0 }
        if (mode === 'look') setMode('idle')
      }}
    >
      <div className="urai-home-authored-environment" aria-hidden="true" />
      <Canvas
        className="urai-home-spatial-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        frameloop="demand"
        dpr={deviceTier === 'low' ? [0.85, 1] : deviceTier === 'medium' ? [1, 1.35] : [1, 1.7]}
        camera={{ position: [0, 4.45, 12.6], fov: 45, near: 0.1, far: 140 }}
        gl={{ antialias: deviceTier !== 'low', alpha: true, premultipliedAlpha: false, powerPreference: deviceTier === 'low' ? 'low-power' : 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.02
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Scene
          profile={profile}
          tier={deviceTier}
          mode={mode}
          pointerRef={pointerRef}
          reducedMotion={reducedMotion}
          onOrbOpen={openOrb}
          onAvatar={openAvatar}
          onSky={() => travel('life-map')}
          onGround={() => travel('infrastructure-hub')}
        />
      </Canvas>
      <div className="urai-home-spatial-thresholds" data-testid="urai-home-threshold-controls" aria-label="Home sky threshold">
        <button
          type="button"
          className="urai-home-spatial-threshold urai-home-spatial-threshold--sky"
          aria-label="Open the Life Map and ascend into Memory Sky"
          onClick={() => travel('life-map')}
        >
          <strong>Life Map</strong>
          <span>Ascend into your memory sky</span>
        </button>
      </div>
      <div className="sr-only" aria-label="URAI Home sanctuary actions">
        <button type="button" onClick={openOrb}>Open Orb companion</button>
        <button type="button" onClick={openAvatar}>Open embodied self</button>
      </div>
      <style jsx>{`
        .urai-home-authored-environment {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image:
            linear-gradient(180deg, rgba(1, 6, 14, .05) 0%, rgba(1, 7, 14, .1) 52%, rgba(1, 5, 11, .62) 100%),
            radial-gradient(circle at 52% 42%, rgba(126, 239, 245, .08), transparent 34%),
            var(--home-authored-desktop);
          background-size: cover;
          background-position: center 48%;
          background-repeat: no-repeat;
          filter: saturate(1.08) contrast(1.04) brightness(.92);
          transform: scale(1.012);
          pointer-events: none;
        }
        .urai-home-authored-environment::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, .28), transparent 24%, transparent 76%, rgba(0, 0, 0, .28)),
            radial-gradient(ellipse at 50% 48%, transparent 42%, rgba(0, 0, 0, .36) 100%);
        }
        :global(.urai-home-spatial-canvas) { z-index: 1; }
        @media (max-width: 700px) {
          .urai-home-authored-environment {
            background-image:
              linear-gradient(180deg, rgba(1, 6, 14, .04) 0%, rgba(1, 7, 14, .14) 50%, rgba(1, 5, 11, .7) 100%),
              radial-gradient(circle at 50% 38%, rgba(126, 239, 245, .08), transparent 32%),
              var(--home-authored-mobile);
            background-position: center 44%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .urai-home-authored-environment { transform: none; }
        }
      `}</style>
    </div>
  )
}
