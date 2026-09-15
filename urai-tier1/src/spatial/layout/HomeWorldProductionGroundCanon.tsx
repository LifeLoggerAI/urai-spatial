'use client'

import { useRouter } from 'next/navigation'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { useDragLook } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import {
  HOME_GROUND_TIMING,
  createGroundEntryCheckpoint,
  writeGroundEntryCheckpoint,
  writeHomeReturnCheckpoint,
  requestHomeAvatarInteraction,
} from '@/spatial/world/homeGroundContract'
import { height } from './HomeWorldProductionV223Geometry'
import { HomeV225PolishV3 } from './HomeWorldProductionV225PolishV3'
import { HomeCurrentArtRepair } from './HomeCurrentArtRepair'
import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'
import { HomeVisualAuthority } from './HomeVisualAuthority'
import styles from './HomeWorldProduction.module.css'

type Transition = 'none' | 'ground' | 'life-map'
type HomePhase = 'HOME_IDLE' | 'HOME_LOOK' | 'HOME_AVATAR_INTERACTION' | 'HOME_ORB_INTERACTION' | 'GROUND_PREPARE' | 'GROUND_DESCENT' | 'LIFE_MAP_ASCENT'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type TransitionTarget = { point: THREE.Vector3; normal?: THREE.Vector3 }

const HOME_FOCUS = new THREE.Vector3(0, 3.85, -1.15)
const AVATAR_POSITION = new THREE.Vector3(-.28, 0, 1.0)
const COMPANION_POSITION = new THREE.Vector3(1.02, 0, .72)
const GROUND_EYE_HEIGHT = 1.70

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
    return () => { disposed = true; bootstrap.forEach(window.clearTimeout); window.clearTimeout(timer) }
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

function RetireLegacyHomeHotspots() {
  const { scene } = useThree()
  useEffect(() => {
    const hidden = new Map<THREE.Object3D, boolean>()
    const raycasts = new Map<THREE.Object3D, THREE.Object3D['raycast']>()
    const retire = () => scene.traverse((object) => {
      if (object.name === 'home-gold-companion' || object.name === 'home-visible-user-avatar' || object.name === 'home-v288-grounded-biomorphic-memory-reliquary') return
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
    const timers = [100, 360].map((delay) => window.setTimeout(retire, delay))
    return () => {
      timers.forEach(window.clearTimeout)
      hidden.forEach((visible, object) => { object.visible = visible })
      raycasts.forEach((raycast, object) => { object.raycast = raycast })
    }
  }, [scene])
  return null
}

function VisibleUserAvatar({ reducedMotion, onAvatar }: { reducedMotion: boolean; onAvatar: () => void }) {
  const root = useRef<THREE.Group>(null)
  const groundY = height(AVATAR_POSITION.x, AVATAR_POSITION.z)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    root.current.position.y = groundY + Math.sin(t * .72) * .004
    root.current.rotation.z = Math.sin(t * .43) * .004
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 6) return
    onAvatar()
  }
  return <group
    ref={root}
    name="home-visible-user-avatar"
    position={[AVATAR_POSITION.x, groundY, AVATAR_POSITION.z]}
    rotation={[0, .08, 0]}
    onClick={activate}
    userData={{ semanticOwner: 'avatar', privacyPreserving: true, interactionOwner: true, productionFallback: 'procedural-until-governed-avatar-glb' }}
  >
    <mesh position={[-.14, .46, 0]} castShadow receiveShadow><cylinderGeometry args={[.105, .12, .9, 12]} /><meshStandardMaterial color="#252a29" roughness={.88} /></mesh>
    <mesh position={[.14, .46, 0]} castShadow receiveShadow><cylinderGeometry args={[.105, .12, .9, 12]} /><meshStandardMaterial color="#252a29" roughness={.88} /></mesh>
    <mesh position={[0, 1.14, 0]} scale={[.48, .72, .28]} castShadow receiveShadow><sphereGeometry args={[.62, 24, 18]} /><meshStandardMaterial color="#343b38" roughness={.82} /></mesh>
    <mesh position={[-.42, 1.13, .01]} rotation={[0, 0, -.09]} castShadow><cylinderGeometry args={[.075, .09, .86, 10]} /><meshStandardMaterial color="#343b38" roughness={.84} /></mesh>
    <mesh position={[.42, 1.13, .01]} rotation={[0, 0, .09]} castShadow><cylinderGeometry args={[.075, .09, .86, 10]} /><meshStandardMaterial color="#343b38" roughness={.84} /></mesh>
    <mesh position={[0, 1.78, 0]} castShadow receiveShadow><sphereGeometry args={[.22, 24, 18]} /><meshStandardMaterial color="#8a7567" roughness={.72} /></mesh>
  </group>
}

function OrbInteractionOwner({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const y = height(COMPANION_POSITION.x, COMPANION_POSITION.z)
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 6) return
    onOrb()
  }
  return <group
    name="home-gold-companion"
    position={[COMPANION_POSITION.x, y + .38, COMPANION_POSITION.z]}
    onClick={activate}
    userData={{ semanticOwner: 'orb', groundedCompanion: true, animation: sensory.animation, interactionOwner: true, fallbackVisualOwner: false }}
  >
    <mesh scale={[.72, 1.14, .76]} onClick={activate}>
      <sphereGeometry args={[1, 20, 16]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
    </mesh>
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
      const desiredFov = transition === 'none' ? (portrait ? 58 : 52) : transition === 'life-map' ? (portrait ? 64 : 50) : (portrait ? 62 : 56)
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
      const duration = (reducedMotion ? HOME_GROUND_TIMING.descentReducedMs : HOME_GROUND_TIMING.descentMs) / 1000
      const linear = Math.min(1, elapsed.current / duration)
      const t = THREE.MathUtils.smoothstep(linear, 0, 1)
      const hit = target.current?.point ?? new THREE.Vector3(0, height(0, -1), -1)
      const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      const end = desired.current.set(hit.x - forward.x * .65, hit.y + GROUND_EYE_HEIGHT, hit.z - forward.z * .65)
      camera.position.lerpVectors(start.current, end, t)
      look.current.set(hit.x + forward.x * 4.5, hit.y + GROUND_EYE_HEIGHT - .08, hit.z + forward.z * 4.5)
      camera.lookAt(look.current)
      if (shell) {
        shell.dataset.homeTransitionProgress = t.toFixed(3)
        shell.dataset.homeGroundHandoff = linear >= .90 ? 'armed' : 'approach'
      }
      if (linear >= 1 && !completed.current) { completed.current = true; onComplete('ground') }
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

function Scene({ yaw, pitch, transition, transitionTarget, reducedMotion, orbState, onAvatar, onOrb, onGround, onLifeMap, onReady, owner, onComplete }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  transition: Transition
  transitionTarget: MutableRefObject<TransitionTarget | null>
  reducedMotion: boolean
  orbState: OrbState
  onAvatar: () => void
  onOrb: () => void
  onGround: (point: THREE.Vector3, normal?: THREE.Vector3) => void
  onLifeMap: () => void
  onReady: () => void
  owner: MutableRefObject<HTMLElement | null>
  onComplete: (transition: Exclude<Transition, 'none'>) => void
}) {
  const retired = useCallback(() => {}, [])
  const physicalWorldClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 6 || transition !== 'none') return
    const normal = event.face?.normal?.clone()
    onGround(event.point.clone(), normal)
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
    <HomeV225PolishV3 orbState={orbState} reducedMotion={reducedMotion} onOrb={retired} onGround={retired} onLifeMap={retired} onWalk={physicalWorldClick} />
    <HomeCurrentArtRepair orbState={orbState} reducedMotion={reducedMotion} onOrb={retired} onGround={retired} onLifeMap={retired} />
    <HomeAAAVisualRepair />
    <RetireLegacyHomeHotspots />
    <VisibleUserAvatar reducedMotion={reducedMotion} onAvatar={onAvatar} />
    <OrbInteractionOwner state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <HomeVisualAuthority />
    <CameraRig yaw={yaw} pitch={pitch} transition={transition} target={transitionTarget} reducedMotion={reducedMotion} owner={owner} onComplete={onComplete} />
  </>
}

export function HomeWorldProductionGroundCanon({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const router = useRouter()
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const [phase, setPhase] = useState<HomePhase>('HOME_IDLE')
  const yaw = useRef(0)
  const pitch = useRef(.02)
  const transitionTarget = useRef<TransitionTarget | null>(null)
  const worldRef = useRef<HTMLElement>(null)
  const markReady = useCallback(() => setSceneReady(true), [])

  const openAvatar = useCallback(() => {
    if (transition !== 'none') return
    setPhase('HOME_AVATAR_INTERACTION')
    requestHomeAvatarInteraction()
    window.setTimeout(() => setPhase((current) => current === 'HOME_AVATAR_INTERACTION' ? 'HOME_IDLE' : current), 500)
  }, [transition])

  const openOrb = useCallback(() => {
    if (transition !== 'none') return
    setPhase('HOME_ORB_INTERACTION')
    setOrbState('attention')
    onOrbOpen()
  }, [onOrbOpen, transition])

  const openGround = useCallback((point: THREE.Vector3, normal?: THREE.Vector3) => {
    if (transition !== 'none') return
    const checkpoint = createGroundEntryCheckpoint({ point, normal, yaw: yaw.current, pitch: pitch.current })
    writeGroundEntryCheckpoint(checkpoint)
    writeHomeReturnCheckpoint({ yaw: yaw.current, pitch: pitch.current, selectedGroundPoint: checkpoint.homePoint, orbState })
    transitionTarget.current = { point, normal }
    setPhase('GROUND_PREPARE')
    setOrbState('transition')
    window.requestAnimationFrame(() => {
      setPhase('GROUND_DESCENT')
      setTransition('ground')
    })
  }, [orbState, transition])

  const openLifeMap = useCallback(() => {
    if (transition !== 'none') return
    transitionTarget.current = null
    setPhase('LIFE_MAP_ASCENT')
    setOrbState('transition')
    setTransition('life-map')
    requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })
  }, [transition])

  const completeTransition = useCallback((next: Exclude<Transition, 'none'>) => {
    if (next === 'ground') {
      // Ground owns the next camera directly. Do not invoke the generic world
      // aperture/tunnel controller: the physical Home camera descent is the sole
      // visible transition owner for this route.
      router.push('/ground/?from=home-ground&cameraCheckpoint=ground-first-person-arrival')
      return
    }
    requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
  }, [router])

  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: .0022, minPitch: -.28, maxPitch: .25, onDragState: (value) => { setDragging(value); setPhase(value ? 'HOME_LOOK' : 'HOME_IDLE') } })

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
      setPhase('HOME_IDLE')
      transitionTarget.current = null
      setOrbState('idle')
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [transition])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
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
    data-home-input-ready={ready && transition === 'none' ? 'true' : 'false'}
    data-home-interaction-ready={ready && transition === 'none' ? 'true' : 'false'}
    data-home-ground-entry="physical-world-surface"
    data-home-life-map-entry="visible-sky-broad-interaction"
    data-home-avatar-entry="visible-user-avatar"
    data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'cinematic-look' : 'cinematic-third-person'}
    data-home-scene-phase={phase}
    data-home-transition-sequence={transition === 'none' ? 'idle' : `${transition}:physical-camera-traversal`}
    data-home-ground-transition-owner="home-camera-rig-only"
    data-home-input-locked={transition !== 'none' ? 'true' : 'false'}
    data-home-orb-state={orbState}
    data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
    data-home-visual-grade="current-literal-pixel-candidate-not-certified"
    data-home-art-certification="fresh-exact-head-pixels-required"
    data-testid="home-visible-navigable-sanctuary-world"
    style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#10272a' }}
    {...look}
  >
    <Canvas
      className={styles.canvas}
      dpr={[1, 1.6]}
      shadows
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 2.58, 7.65], fov: 52, near: .08, far: 180 }}
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
      <Scene yaw={yaw} pitch={pitch} transition={transition} transitionTarget={transitionTarget} reducedMotion={reducedMotion} orbState={orbState} onAvatar={openAvatar} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} onComplete={completeTransition} />
    </Canvas>
    <button className="sr-only" type="button" aria-label="Interact with your Home embodiment" onClick={openAvatar}>Avatar</button>
    <span className="sr-only" role="status" aria-live="polite">{transition === 'ground' ? 'Descending into your physical Ground world.' : transition === 'life-map' ? 'Ascending into your Life Map.' : ''}</span>
    <span className="sr-only" data-testid="urai-home-webgl-orb">The Orb companion is physically grounded beside your visible Home presence.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving visible Home embodiment is present in the physical world.</span>
  </main>
}

export const HomeWorldProduction = HomeWorldProductionGroundCanon
