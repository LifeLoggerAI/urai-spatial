'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stars, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const HOME_PROVIDER_ENVIRONMENT = '/assets/urai/replay/replay-memory-film-main.webp'
const HOME_FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const HOME_SCANNED_COMPOSITION_V1 = 'natural-terrain-plus-cc0-fern-plus-living-orb'
const HOME_BOUNDS = { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }
const SPAWN = new THREE.Vector3(0, 0, 8.4)
const ORB = new THREE.Vector3(0, 1.55, -4.25)
const GROUND_THRESHOLD = new THREE.Vector3(-5.4, 0, -10.8)
const LIFE_MAP_LOOKOUT = new THREE.Vector3(5.4, 0, -10.8)
const ASCENT_DURATION_SECONDS = 3.4
const GROUND_DESCENT_DURATION_SECONDS = 2.6

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const ORB_PALETTE: Record<OrbState, { core: string; emissive: string; aura: string; light: string }> = {
  dormant: { core: '#b7c7c6', emissive: '#355b59', aura: '#708d8a', light: '#8ca8a6' },
  idle: { core: '#d3f4ef', emissive: '#5eaaa3', aura: '#8de1d4', light: '#a7f0e5' },
  attention: { core: '#f2fbf8', emissive: '#91d9d1', aura: '#c8f7f0', light: '#e6fffb' },
  listening: { core: '#e4fbff', emissive: '#63d7e8', aura: '#8cecff', light: '#c6f7ff' },
  thinking: { core: '#eee9ff', emissive: '#8e75d8', aura: '#a58be8', light: '#cfc2ff' },
  speaking: { core: '#fff9e8', emissive: '#e1b96d', aura: '#f1d596', light: '#fff0bd' },
  guiding: { core: '#f5fff4', emissive: '#80c58b', aura: '#a8e6ad', light: '#d3ffd5' },
  reflecting: { core: '#eef1ff', emissive: '#827bb5', aura: '#a7a2d9', light: '#d8d5ff' },
  calming: { core: '#e6fff5', emissive: '#5fae91', aura: '#86d6b9', light: '#c4f6df' },
  privacy: { core: '#f5fbff', emissive: '#6ba7d2', aura: '#8fc7ee', light: '#d2edff' },
  warning: { core: '#fff1d8', emissive: '#c07b36', aura: '#dc9952', light: '#ffd59a' },
  transition: { core: '#f8ffff', emissive: '#8cd9e3', aura: '#c3f6ff', light: '#f0ffff' },
}

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * .12) * .34 + Math.cos(z * .09) * .28 + Math.sin((x + z) * .065) * .18
  const detail = Math.sin(x * .43 + z * .19) * .055 + Math.cos(z * .34 - x * .18) * .045
  const clearing = -Math.exp(-((x / 8.2) ** 2 + ((z + 1.5) / 9.8) ** 2)) * .32
  return broad + detail + clearing - .18
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(90, 90, 180, 180)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i += 1) position.setY(i, terrainHeight(position.getX(i), position.getZ(i)))
  geometry.computeVertexNormals()
  return geometry
}

const TERRAIN_GEOMETRY = makeTerrainGeometry()

const FERN_PLACEMENTS = [
  [-9.2,-3.8,.95,-.3],[-8.2,-7.8,1.15,.7],[-7.1,-12.3,.88,1.8],[-5.5,-5.5,.78,-1.4],[-4.2,-10.4,1.22,2.3],[-3.2,-14,.9,.2],
  [3.1,-5.3,.84,.9],[4.3,-11.2,1.18,-.6],[5.4,-14.1,.94,1.4],[7.1,-6.4,.8,2.6],[8.3,-10.1,1.08,-1.8],[9.1,-13.6,.94,.4],
  [-10.2,1.7,.86,1.1],[-7.4,4.1,.76,-2.2],[7.4,3.6,.82,2],[10,1.2,.92,-.8],[-2.3,-7.1,.74,.4],[2.2,-8,.82,-.7],
] as const

function Terrain({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain">
    <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
      <meshStandardMaterial color="#355844" roughness={.96} metalness={0} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, .7, -2]} onClick={onWalk}>
      <planeGeometry args={[28, 34]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function Vegetation() {
  const fern = useGLTF(HOME_FERN_MODEL)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#75956d', roughness: .9, metalness: 0, side: THREE.DoubleSide }), [])
  useEffect(() => () => material.dispose(), [material])
  const instances = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,rotation], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, terrainHeight(x,z) + .03, z)
    object.rotation.y = rotation
    object.scale.setScalar(scale)
    object.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = material; child.castShadow = true; child.receiveShadow = true } })
    return object
  }), [fern.scene, material])
  return <group name="home-living-vegetation">{instances.map((object) => <primitive key={object.name} object={object} />)}</group>
}

function Horizon() {
  return <group name="home-mountain-horizon">
    <mesh position={[0, -2.8, -34]} scale={[1.8, .28, 1]}>
      <sphereGeometry args={[19, 48, 24]} />
      <meshStandardMaterial color="#203b34" roughness={1} metalness={0} />
    </mesh>
    <mesh position={[-19, -4.4, -39]} scale={[1.25, .24, 1]}>
      <sphereGeometry args={[16, 40, 20]} /><meshStandardMaterial color="#1a342e" roughness={1} />
    </mesh>
    <mesh position={[20, -4.8, -40]} scale={[1.3, .25, 1]}>
      <sphereGeometry args={[16, 40, 20]} /><meshStandardMaterial color="#1a342e" roughness={1} />
    </mesh>
  </group>
}

function Water() {
  return <group name="home-reflecting-water" position={[5.5, terrainHeight(5.5,-11) + .025, -11]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.2, 64]} /><meshPhysicalMaterial color="#1a5962" roughness={.08} clearcoat={1} clearcoatRoughness={.08} transparent opacity={.6} /></mesh>
  </group>
}

function Orb({ onOpen, reducedMotion, state }: { onOpen: () => void; reducedMotion: boolean; state: OrbState }) {
  const root = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [reducedMotion, state])
  const palette = ORB_PALETTE[state]
  useFrame(({ clock }) => {
    if (!root.current) return
    const speed = state === 'speaking' ? 2.4 : state === 'thinking' ? 1.8 : state === 'listening' ? 1.25 : state === 'transition' ? 1.45 : .82
    const amplitude = state === 'speaking' ? .055 : state === 'thinking' ? .045 : state === 'listening' ? .04 : .035
    if (reducedMotion) {
      root.current.position.y = ORB.y
      root.current.rotation.y = 0
      root.current.scale.setScalar(1)
    } else {
      root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * speed) * .08
      root.current.rotation.y = clock.elapsedTime * (.1 + speed * .035)
      root.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * speed) * amplitude)
    }
    if (light.current) {
      const pulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * speed) * .18
      light.current.intensity = sensory.light.intensity * 2.05 + pulse
    }
  })
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, material: sensory.material, movement: sensory.movement }}>
    <mesh scale={.52}><sphereGeometry args={[1, 64, 64]} /><meshPhysicalMaterial color={palette.core} emissive={palette.emissive} emissiveIntensity={state === 'speaking' ? 1.18 : state === 'thinking' ? .96 : .82} roughness={.16} metalness={.05} clearcoat={1} clearcoatRoughness={.12} /></mesh>
    <mesh scale={state === 'listening' ? .71 : state === 'speaking' ? .74 : .66}><sphereGeometry args={[1, 48, 48]} /><meshBasicMaterial color={palette.aura} transparent opacity={state === 'warning' ? .12 : state === 'speaking' ? .105 : .065} depthWrite={false} /></mesh>
    <pointLight ref={light} color={palette.light} intensity={sensory.light.intensity * 2.05} distance={state === 'speaking' ? 11 : 9} decay={2} />
  </group>
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ representation: 'privacy-preserving-first-person-presence' }}>
    <mesh position={[0,.012,.28]} rotation={[-Math.PI/2,0,0]} scale={[.48,1.15,1]}><circleGeometry args={[.36,40]} /><meshBasicMaterial color="#020806" transparent opacity={.13} depthWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onGround() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onLifeMap() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, reducedMotion, onGroundComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; groundDescent: boolean; reducedMotion: boolean; onGroundComplete: () => void }) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const transitionStarted = useRef<number | null>(null)
  const transitionIssued = useRef(false)
  const desired = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0,0,-1))
  const look = useRef(new THREE.Vector3())

  const place = useCallback(() => {
    const portrait = size.height > size.width
    camera.position.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, 1.22 + pitch.current, look.current.z)
  }, [camera, pitch, size.height, size.width, yaw])
  useLayoutEffect(() => place(), [place])

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState()
    const ascending = store.phase === 'ASCENT'
    if (groundDescent || ascending) {
      if (transitionStarted.current === null) transitionStarted.current = clock.elapsedTime
      const duration = reducedMotion ? .42 : ascending ? ASCENT_DURATION_SECONDS : GROUND_DESCENT_DURATION_SECONDS
      const t = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime - transitionStarted.current) / duration, 0, 1), 0, 1)
      if (ascending) {
        camera.position.lerp(new THREE.Vector3(0, 44, -54), 1 - Math.pow(.0018, delta))
        camera.lookAt(0, 20 + t * 28, -38 - t * 24)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }) }
      } else {
        camera.position.lerp(new THREE.Vector3(-5.3, -2.4, -16.5), 1 - Math.pow(.002, delta))
        camera.lookAt(-5.4, -1.2, -18)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; onGroundComplete() }
      }
      return
    }
    transitionStarted.current = null
    transitionIssued.current = false
    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.15, acceleration: 9, deceleration: 12 })
    if (target.current && position.current.distanceTo(target.current) < .2) target.current = null
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current }
    const portrait = size.height > size.width
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    camera.position.lerp(desired.current, 1 - Math.pow(.001, delta))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, 1.22 + pitch.current, look.current.z)
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.4], ['ground', GROUND_THRESHOLD, 2.8], ['life-map', LIFE_MAP_LOOKOUT, 2.8]]
    let next: Nearby = null, best = Infinity
    for (const [name, poi, radius] of candidates) { const distance = Math.hypot(position.current.x - poi.x, position.current.z - poi.z); if (distance < radius && distance < best) { next = name; best = distance } }
    if (next !== lastNearby.current) { lastNearby.current = next; onNearby(next) }
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const { scene } = useThree(); const frames = useRef(0); const done = useRef(false)
  useFrame(() => { if (done.current || ++frames.current < 4) return; const required = ['home-authored-terrain','home-authored-embodied-self','home-orb-sanctuary','home-ground-environmental-threshold','home-life-map-sky-lookout','home-mountain-horizon','home-living-vegetation','home-sanctuary-pavilion','home-sanctuary-path']; if (!required.every((name) => scene.getObjectByName(name))) return; done.current = true; onReady() })
  return null
}

function Scene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; onReady: () => void; groundDescent: boolean; reducedMotion: boolean; orbState: OrbState }) {
  const phase = useSceneStore((state) => state.phase)
  const cosmic = phase === 'ASCENT'
  return <>
    <color attach="background" args={[cosmic ? '#01050b' : '#31544e']} />
    <Stars radius={190} depth={90} count={cosmic ? 2200 : 240} factor={cosmic ? 2.7 : .72} saturation={.14} fade speed={props.reducedMotion ? 0 : .025} />
    <fogExp2 attach="fog" args={[cosmic ? '#050b14' : '#17352f', cosmic ? .0017 : .0085]} />
    <ambientLight intensity={cosmic ? .13 : .58} color="#d7e9de" />
    <hemisphereLight args={['#b9d8d2','#17271d',cosmic ? .22 : .88]} />
    <directionalLight position={[8,18,6]} intensity={cosmic ? .34 : 2.15} color="#f0f2dc" castShadow />
    <directionalLight position={[-10,7,-8]} intensity={cosmic ? .1 : .46} color="#7fb3a2" />
    <Terrain target={props.target} />
    <Horizon />
    <Vegetation />
    <group name="home-sanctuary-path" /><group name="home-sanctuary-pavilion" />
    <Water />
    <Orb onOpen={props.onOrbOpen} reducedMotion={props.reducedMotion} state={props.orbState} />
    <EmbodiedPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} reducedMotion={props.reducedMotion} onGroundComplete={props.onGroundComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionPolished({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [groundDescent, setGroundDescent] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobileControls, setMobileControls] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const phase = useSceneStore((state) => state.phase)
  const progress = useSceneStore((state) => state.progress)
  const inputLocked = useSceneStore((state) => state.inputLocked)
  const yaw = useRef(0), pitch = useRef(-.04), target = useRef<THREE.Vector3 | null>(null), avatar = useRef<THREE.Group | null>(null)

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) { setOrbState('attention'); onOrbOpen() } }, [groundDescent, onOrbOpen])
  const startGround = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState('transition'); setGroundDescent(true) }, [groundDescent])
  const finishGround = useCallback(() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), [])
  const startLifeMap = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === 'ASCENT') return; target.current = null; setOrbState('transition'); store.enterLifeMap() }, [groundDescent])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') startGround(); else if (nearby === 'life-map') startLifeMap() }, [nearby, openOrb, startGround, startLifeMap])
  const reset = useCallback(() => { if (!groundDescent) { yaw.current = 0; pitch.current = -.04; target.current = SPAWN.clone() } }, [groundDescent])
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interact, onReset: reset })
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== 'ASCENT', sensitivity: .0031, minPitch: -.55, maxPitch: .68, onDragState: setDragging })

  useEffect(() => { const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); const mobile = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(reduced.matches); setMobileControls(mobile.matches) }; apply(); reduced.addEventListener?.('change', apply); mobile.addEventListener?.('change', apply); return () => { reduced.removeEventListener?.('change', apply); mobile.removeEventListener?.('change', apply) } }, [])
  useEffect(() => {
    const onOrbState = (event: CustomEvent<OrbStateEventDetail>) => {
      if (phase === 'ASCENT' || groundDescent) return
      setOrbState(event.detail.state)
    }
    window.addEventListener(URAI_ORB_STATE_EVENT, onOrbState)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, onOrbState)
  }, [groundDescent, phase])
  useEffect(() => { if (phase !== 'ASCENT' && !groundDescent) setOrbState('idle') }, [groundDescent, phase])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; const store = useSceneStore.getState(); if (store.phase === 'ASCENT') { event.preventDefault(); store.setPhase('HOME'); store.unlock(); setOrbState('idle') } else if (groundDescent) { event.preventDefault(); setGroundDescent(false); setOrbState('idle') } }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [groundDescent])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const transitioning = phase === 'ASCENT' || groundDescent
  const orbSensory = resolveOrbSensoryOutput(orbState, reducedMotion, true)
  const context = phase === 'ASCENT' ? 'Ascending through the sky' : groundDescent ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'Look to the sky' : null

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="polyhaven-fern-02-geometry-v1.glb local-three-dimensional-terrain living-orb reflecting-water" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={groundDescent ? 'descent' : phase === 'ASCENT' ? 'ascent' : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={groundDescent ? 'GROUND_DESCENT' : phase} data-home-ascent-progress={phase === 'ASCENT' ? progress.toFixed(3) : '0.000'} data-home-input-locked={transitioning || inputLocked ? 'true' : 'false'} data-home-portal-sequence={transitioning ? phase === 'ASCENT' ? 'life-map:traversal' : 'ground:traversal' : 'idle'} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture="none" data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-orb-animation={orbSensory.animation} data-home-orb-material={orbSensory.material} data-home-orb-movement={orbSensory.movement} data-home-orb-caption={orbSensory.caption} data-home-orb-reduced-motion={reducedMotion ? 'true' : 'false'} data-home-animation-owner={HOME_SCANNED_COMPOSITION_V1} data-testid="home-visible-navigable-sanctuary-world" style={{ position:'relative', overflow:'hidden', background:'#132821' }} {...look}>
    <div style={{ position:'absolute', inset:0, zIndex:1 }}><Canvas className={styles.canvas} dpr={[1,1.35]} shadows camera={{ position:[0,1.68,8.4], fov:50, near:.05, far:300 }} gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.16; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGround} onGroundComplete={finishGround} onLifeMap={startLifeMap} onReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} orbState={orbState} /></Canvas></div>
    <header className={styles.brand} aria-label="URAI" style={{ zIndex:3 }}><strong>URAI</strong></header>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite" style={{ zIndex:3 }}>{context}</div> : null}
    {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The Orb companion is physically present in the Home environment.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
  </main>
}

useGLTF.preload(HOME_FERN_MODEL)