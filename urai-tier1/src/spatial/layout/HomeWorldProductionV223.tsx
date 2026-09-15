'use client'

import { useRouter } from 'next/navigation'
import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { useDragLook } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { height } from './HomeWorldProductionV223Geometry'
import { HomeV225PolishV3 } from './HomeWorldProductionV225PolishV3'
import { HomeCurrentArtRepair } from './HomeCurrentArtRepair'
import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'
import styles from './HomeWorldProduction.module.css'

type Transition = 'none' | 'ground' | 'life-map'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type TransitionTarget = { point: THREE.Vector3; normal?: THREE.Vector3 }

const HOME_FOCUS = new THREE.Vector3(0, 1.05, -1.15)
const AVATAR_POSITION = new THREE.Vector3(-.28, 0, 1.0)
const COMPANION_POSITION = new THREE.Vector3(1.02, 0, .72)

function isSoftwareWebGLRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext()
  const debugInfo = context.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL?: number } | null
  const renderer = debugInfo?.UNMASKED_RENDERER_WEBGL ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER)
  return /swiftshader|llvmpipe|lavapipe|software|microsoft basic render/i.test(String(renderer || ''))
}

function Cadence({ reducedMotion }: { reducedMotion: boolean }) {
  const { gl, invalidate, setFrameloop } = useThree()
  useEffect(() => {
    const constrained = reducedMotion || isSoftwareWebGLRenderer(gl)
    if (!constrained) { setFrameloop('always'); return }
    setFrameloop('demand')
    let disposed = false
    const bootstrap = [0, 40, 80, 120, 180, 260].map((delay) => window.setTimeout(() => { if (!disposed) invalidate() }, delay))
    const intervalMs = reducedMotion ? 280 : 100
    let timer = 0
    const renderNext = () => { if (disposed) return; invalidate(); timer = window.setTimeout(renderNext, intervalMs) }
    timer = window.setTimeout(renderNext, intervalMs)
    return () => { disposed = true; bootstrap.forEach((id) => window.clearTimeout(id)); window.clearTimeout(timer) }
  }, [gl, invalidate, reducedMotion, setFrameloop])
  return null
}

const legacyHotspotPatterns = [
  /home-v226-ground-inhabited-hearth/,
  /home-v231-ground-weathered-threshold/,
  /home-current-ground-geological-descent/,
  /home-aaa-v281-ground-recessed-geological-descent/,
  /home-v282-ground-geology/,
  /ground-ravine/,
  /ground-cleft/,
  /home-v226-root-cradle/,
  /home-v226-rooted-single-living-memory-presence/,
  /home-current-orb/,
  /home-orb-/,
  /memory-reliquary/,
  /home-v249-organic-living-memory-presence/,
]

/**
 * The canonical Home no longer exposes localized Ground/Orb destination sculptures.
 * Retire only obsolete hotspot owners; the physical terrain, vegetation and skyline stay live.
 */
function RetireLegacyHomeHotspots() {
  const { scene } = useThree()
  useEffect(() => {
    const hidden = new Map<THREE.Object3D, boolean>()
    const raycasts = new Map<THREE.Object3D, THREE.Object3D['raycast']>()
    const retire = () => scene.traverse((object) => {
      if (object.name === 'home-gold-companion' || object.name === 'home-visible-user-avatar') return
      if (!legacyHotspotPatterns.some((pattern) => pattern.test(object.name))) return
      if (!hidden.has(object)) hidden.set(object, object.visible)
      object.visible = false
      if (!raycasts.has(object)) raycasts.set(object, object.raycast)
      object.raycast = () => undefined
      object.traverse((child) => {
        if (!raycasts.has(child)) raycasts.set(child, child.raycast)
        child.raycast = () => undefined
      })
    })
    retire()
    const timers = [window.setTimeout(retire, 100), window.setTimeout(retire, 360)]
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      hidden.forEach((visible, object) => { object.visible = visible })
      raycasts.forEach((raycast, object) => { object.raycast = raycast })
    }
  }, [scene])
  return null
}

function VisibleUserAvatar({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const groundY = height(AVATAR_POSITION.x, AVATAR_POSITION.z)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    root.current.position.y = groundY + Math.sin(t * .72) * .004
    root.current.rotation.z = Math.sin(t * .43) * .004
  })
  return <group
    ref={root}
    name="home-visible-user-avatar"
    position={[AVATAR_POSITION.x, groundY, AVATAR_POSITION.z]}
    rotation={[0, .08, 0]}
    userData={{ semanticOwner: 'visible-user-avatar', privacyPreserving: true, productionFallback: 'procedural-until-governed-avatar-glb' }}
  >
    <mesh position={[-.14, .46, 0]} castShadow receiveShadow><cylinderGeometry args={[.105, .12, .9, 12]} /><meshStandardMaterial color="#252a29" roughness={.88} /></mesh>
    <mesh position={ [.14, .46, 0]} castShadow receiveShadow><cylinderGeometry args={[.105, .12, .9, 12]} /><meshStandardMaterial color="#252a29" roughness={.88} /></mesh>
    <mesh position={[0, 1.14, 0]} scale={[.48, .72, .28]} castShadow receiveShadow><sphereGeometry args={[.62, 24, 18]} /><meshStandardMaterial color="#343b38" roughness={.82} /></mesh>
    <mesh position={[-.42, 1.13, .01]} rotation={[0, 0, -.09]} castShadow><cylinderGeometry args={[.075, .09, .86, 10]} /><meshStandardMaterial color="#343b38" roughness={.84} /></mesh>
    <mesh position={[ .42, 1.13, .01]} rotation={[0, 0,  .09]} castShadow><cylinderGeometry args={[.075, .09, .86, 10]} /><meshStandardMaterial color="#343b38" roughness={.84} /></mesh>
    <mesh position={[0, 1.78, 0]} castShadow receiveShadow><sphereGeometry args={[.22, 24, 18]} /><meshStandardMaterial color="#8a7567" roughness={.72} /></mesh>
  </group>
}

function OrbCompanion({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const groundY = height(COMPANION_POSITION.x, COMPANION_POSITION.z)
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  const palette = useMemo(() => {
    if (state === 'warning') return { body: '#7b5747', core: '#efb173', light: '#f2a46b' }
    if (state === 'privacy') return { body: '#4f5268', core: '#bbb3dc', light: '#a99bd0' }
    if (state === 'attention' || state === 'listening') return { body: '#5c665e', core: '#d6c89b', light: '#d9c28c' }
    return { body: '#48534d', core: '#a9c7b6', light: '#9fc5b1' }
  }, [state])
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = reducedMotion ? 0 : clock.elapsedTime
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .008
    root.current.scale.setScalar(breath)
    root.current.rotation.y = .18 + (reducedMotion ? 0 : Math.sin(t * .24) * .025)
  })
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group
    ref={root}
    name="home-gold-companion"
    position={[COMPANION_POSITION.x, groundY + .38, COMPANION_POSITION.z]}
    onClick={activate}
    userData={{ semanticOwner: 'orb', groundedCompanion: true, animation: sensory.animation }}
  >
    <mesh position={[-.13, .08, 0]} scale={[.42, .58, .36]} rotation={[.02, -.18, .16]} castShadow receiveShadow onClick={activate}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={palette.body} emissive={palette.core} emissiveIntensity={state === 'dormant' ? .035 : .12} roughness={.66} metalness={.02} />
    </mesh>
    <mesh position={[.13, .12, -.035]} scale={[.38, .54, .34]} rotation={[-.03, .20, -.18]} castShadow receiveShadow onClick={activate}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={palette.body} emissive={palette.core} emissiveIntensity={state === 'dormant' ? .03 : .10} roughness={.68} metalness={.02} />
    </mesh>
    <mesh position={[0, -.25, .01]} scale={[.25, .30, .24]} castShadow receiveShadow onClick={activate}>
      <sphereGeometry args={[1, 24, 18]} />
      <meshStandardMaterial color={palette.body} emissive={palette.core} emissiveIntensity={.07} roughness={.72} />
    </mesh>
    <pointLight position={[0, .12, .14]} color={palette.light} intensity={state === 'warning' ? .78 : .30} distance={2.4} />
  </group>
}

function CameraRig({ yaw, pitch, transition, target, reducedMotion, owner, onComplete }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  transition: Transition
  target: MutableRefObject<TransitionTarget | null>
  reducedMotion: boolean
  owner: MutableRefObject<HTMLElement | null>
  onComplete: (transition: Exclude<Transition, 'none'>) => void
}) {
  const { camera, size } = useThree()
  const elapsed = useRef(0)
  const start = useRef(new THREE.Vector3())
  const completed = useRef(false)
  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())

  useEffect(() => {
    elapsed.current = 0
    completed.current = false
    start.current.copy(camera.position)
  }, [camera, transition])

  useFrame((_, delta) => {
    const portrait = size.height > size.width
    const shell = owner.current
    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = transition === 'none' ? (portrait ? 58 : 52) : transition === 'life-map' ? (portrait ? 64 : 50) : (portrait ? 60 : 48)
      camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, 7, delta)
      camera.updateProjectionMatrix()
    }

    if (transition === 'none') {
      const radius = portrait ? 8.35 : 7.65
      const focus = look.current.set(HOME_FOCUS.x, height(HOME_FOCUS.x, HOME_FOCUS.z) + HOME_FOCUS.y, HOME_FOCUS.z)
      const orbitYaw = THREE.MathUtils.clamp(yaw.current, -.34, .34)
      const cameraY = (portrait ? 2.85 : 2.58) + THREE.MathUtils.clamp(pitch.current, -.28, .25) * 2.1
      desired.current.set(focus.x + Math.sin(orbitYaw) * radius, cameraY, focus.z + Math.cos(orbitYaw) * radius)
      camera.position.lerp(desired.current, 1 - Math.pow(.0009, delta))
      camera.lookAt(focus)
      if (shell) shell.dataset.homeTransitionProgress = '0.000'
      return
    }

    elapsed.current += Math.min(delta, .08)
    if (transition === 'ground') {
      const duration = reducedMotion ? .24 : 1.58
      const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
      const hit = target.current?.point ?? new THREE.Vector3(0, height(0, -1), -1)
      const end = desired.current.set(hit.x, hit.y - (reducedMotion ? .02 : .34), hit.z + (reducedMotion ? .55 : .16))
      camera.position.lerpVectors(start.current, end, t)
      look.current.set(hit.x, hit.y - .24, hit.z - .42)
      camera.lookAt(look.current)
      if (shell) shell.dataset.homeTransitionProgress = t.toFixed(3)
      if (t >= .995 && !completed.current) { completed.current = true; onComplete('ground') }
      return
    }

    const duration = reducedMotion ? .32 : 1.65
    const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
    desired.current.set(start.current.x * (1 - t), start.current.y + t * (reducedMotion ? 1.25 : 7.2), start.current.z - t * (reducedMotion ? .8 : 3.7))
    camera.position.copy(desired.current)
    look.current.set(0, 2.35 + t * (reducedMotion ? 2.1 : 9.4), -7.8 - t * 3.1)
    camera.lookAt(look.current)
    if (shell) shell.dataset.homeTransitionProgress = t.toFixed(3)
    if (t >= .995 && !completed.current) { completed.current = true; onComplete('life-map') }
  })
  return null
}

function Scene({ yaw, pitch, transition, transitionTarget, reducedMotion, orbState, onOrb, onGround, onLifeMap, onReady, owner, onComplete }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  transition: Transition
  transitionTarget: MutableRefObject<TransitionTarget | null>
  reducedMotion: boolean
  orbState: OrbState
  onOrb: () => void
  onGround: (point: THREE.Vector3) => void
  onLifeMap: () => void
  onReady: () => void
  owner: MutableRefObject<HTMLElement | null>
  onComplete: (transition: Exclude<Transition, 'none'>) => void
}) {
  const retiredLocalDestination = useCallback(() => {}, [])
  const physicalWorldClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 8 || transition !== 'none') return
    onGround(event.point.clone())
  }, [onGround, transition])
  useEffect(() => onReady(), [onReady])
  return <>
    <Cadence reducedMotion={reducedMotion} />
    <color attach="background" args={['#10272a']} />
    <fogExp2 attach="fog" args={['#294946', .0145]} />
    <HomeAtmosphericSky reducedMotion={reducedMotion} active={transition === 'life-map'} onLifeMap={onLifeMap} />
    <ambientLight intensity={.30} color="#c2cec7" />
    <hemisphereLight args={['#c3d7cf', '#1c302b', .52]} />
    <directionalLight position={[-8, 11, 6]} intensity={2.45} color="#f1d6b1" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-.00018} />
    <directionalLight position={[9, 6, -11]} intensity={.62} color="#79a99f" />
    <HomeV225PolishV3 orbState={orbState} reducedMotion={reducedMotion} onOrb={retiredLocalDestination} onGround={retiredLocalDestination} onLifeMap={retiredLocalDestination} onWalk={physicalWorldClick} />
    <HomeCurrentArtRepair orbState={orbState} reducedMotion={reducedMotion} onOrb={retiredLocalDestination} onGround={retiredLocalDestination} onLifeMap={retiredLocalDestination} />
    <HomeAAAVisualRepair />
    <RetireLegacyHomeHotspots />
    <VisibleUserAvatar reducedMotion={reducedMotion} />
    <OrbCompanion state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <CameraRig yaw={yaw} pitch={pitch} transition={transition} target={transitionTarget} reducedMotion={reducedMotion} owner={owner} onComplete={onComplete} />
  </>
}

export function HomeWorldProductionV223({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const router = useRouter()
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const yaw = useRef(0)
  const pitch = useRef(.02)
  const transitionTarget = useRef<TransitionTarget | null>(null)
  const worldRef = useRef<HTMLElement>(null)
  const markReady = useCallback(() => setSceneReady(true), [])
  const openOrb = useCallback(() => {
    if (transition !== 'none') return
    setOrbState('attention')
    onOrbOpen()
  }, [onOrbOpen, transition])
  const openGround = useCallback((point: THREE.Vector3) => {
    if (transition !== 'none') return
    transitionTarget.current = { point }
    setOrbState('transition')
    setTransition('ground')
  }, [transition])
  const openLifeMap = useCallback(() => {
    if (transition !== 'none') return
    transitionTarget.current = null
    setOrbState('transition')
    setTransition('life-map')
    requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })
  }, [transition])
  const completeTransition = useCallback((next: Exclude<Transition, 'none'>) => {
    if (next === 'ground') {
      requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/?from=home-ground', entryPortal: 'home-ground', cameraCheckpoint: 'ground-first-person-arrival' })
      return
    }
    requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
  }, [])
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: .0022, minPitch: -.28, maxPitch: .25, onDragState: setDragging })

  useEffect(() => { router.prefetch('/ground/'); router.prefetch('/life-map/') }, [router])
  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(rm.matches)
    apply(); rm.addEventListener?.('change', apply)
    return () => rm.removeEventListener?.('change', apply)
  }, [])
  useEffect(() => {
    const listener = (event: CustomEvent<OrbStateEventDetail>) => transition === 'none' && setOrbState(event.detail.state)
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [transition])
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || transition === 'none') return
      event.preventDefault()
      setTransition('none')
      transitionTarget.current = null
      setOrbState('idle')
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [transition])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const phase = transition === 'ground' ? 'GROUND_DESCENT' : transition === 'life-map' ? 'SKY_ASCENT' : 'HOME_IDLE'
  return <main
    ref={worldRef}
    className={`${styles.world} urai-asset-home-world`}
    data-urai-home-production
    data-urai-true-3d="true"
    data-home-primary-owner="asset-driven"
    data-home-visible-world="cinematic-lived-world-threshold"
    data-home-world-character="production-cinematic-real-place-sacred-tech"
    data-home-physical-base="continuous-lived-physical-world"
    data-home-visual-ownership="single-canvas-three-dimensional-geometry"
    data-home-desktop-mobile-world="same-scene"
    data-home-embodied-self="visible-cinematic-avatar"
    data-home-movement="camera-look-world-surface-selection"
    data-home-pointer-lock="false"
    data-home-assets-ready={ready ? 'true' : 'false'}
    data-home-ready={ready ? 'true' : 'warming'}
    data-home-input-ready={ready ? 'true' : 'false'}
    data-home-interaction-ready={ready ? 'true' : 'false'}
    data-home-distance-ground="world-surface"
    data-home-distance-life-map="sky-threshold"
    data-home-ground-entry="physical-world-surface"
    data-home-life-map-entry="visible-sky-broad-interaction"
    data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'cinematic-look' : 'cinematic-third-person'}
    data-home-scene-phase={phase}
    data-home-transition-sequence={transition === 'none' ? 'idle' : `${transition}:traversal`}
    data-home-portal-sequence="idle"
    data-home-input-locked={transition !== 'none' ? 'true' : 'false'}
    data-home-orb-state={orbState}
    data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
    data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
    data-home-visual-grade="current-literal-pixel-candidate-not-certified"
    data-home-art-certification="fresh-exact-head-pixels-required"
    data-home-scanned-composition="visible-user-grounded-companion-physical-world-and-broad-sky-threshold"
    data-home-authored-regions="home-physical-world home-visible-user-avatar home-grounded-companion home-life-map-sky-threshold"
    data-testid="home-visible-navigable-sanctuary-world"
    style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#10272a' }}
    {...look}
  >
    <Canvas
      className={styles.canvas}
      dpr={1}
      shadows
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 2.58, 7.65], fov: 52, near: .1, far: 125 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.55
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        gl.setClearColor(0x10272a, 1)
        setCanvasReady(true)
      }}
    >
      <Scene yaw={yaw} pitch={pitch} transition={transition} transitionTarget={transitionTarget} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} onComplete={completeTransition} />
    </Canvas>
    <span className="sr-only" role="status" aria-live="polite">{transition === 'ground' ? 'Entering your physical Ground world.' : transition === 'life-map' ? 'Ascending into your Life Map.' : ''}</span>
    <span className="sr-only" data-testid="urai-home-webgl-orb">The Orb companion is physically grounded beside your visible Home presence.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving visible Home embodiment is present in the physical world.</span>
  </main>
}

export const HomeWorldProduction = HomeWorldProductionV223
