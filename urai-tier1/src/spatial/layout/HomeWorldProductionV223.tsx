'use client'

import { useRouter } from 'next/navigation'
import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { useDragLook } from '@/spatial/navigation/EmbodiedNavigation'
import { useAdaptiveSpatialQuality, type SpatialQualityTier } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { GROUND_LANDSCAPE_FOV_DEG, GROUND_PORTRAIT_FOV_DEG } from '@/spatial/ground/groundCanon'
import { HomeGroundMaterialBridge } from '@/spatial/ground/HomeGroundMaterialBridge'
import { GROUND_DESCENT_TOTAL_MS, GROUND_REDUCED_MOTION_TOTAL_MS, groundDescentPhaseAt, type GroundDescentPhase } from '@/spatial/ground/groundTransitionTimeline'
import { ORB_SPEECH_CLOCK_EVENT, type OrbSpeechClockDetail } from '@/spatial/orb/orbSpeechClock'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { height } from './HomeWorldProductionV223Geometry'
import { HomeV225PolishV3 } from './HomeWorldProductionV225PolishV3'
import { HomeCurrentArtRepair } from './HomeCurrentArtRepair'
import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'
import styles from './HomeWorldProduction.module.css'

type Transition = 'none' | 'ground' | 'life-map'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type TransitionTarget = { point: THREE.Vector3; normal?: THREE.Vector3 }

const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const HUMAN_MODEL = '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb'
const HOME_FOCUS = new THREE.Vector3(0, 3.05, -1.15)
const ORB_POSITION = new THREE.Vector3(1.02, 0, .72)
const AVATAR_POSITION = new THREE.Vector3(-.72, 0, 5.95)
const AVATAR_EYE_OFFSET_Y = 1.56
const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}
const ORB_STATE_MOTION: Record<OrbState, { hover: number; rotation: number; coreScale: number; breath: number; ring: number }> = {
  dormant: { hover: 0, rotation: .06, coreScale: .94, breath: .0004, ring: .08 },
  idle: { hover: .018, rotation: 1, coreScale: 1, breath: .003, ring: 1 },
  attention: { hover: .009, rotation: .28, coreScale: 1.03, breath: .0014, ring: .42 },
  listening: { hover: .008, rotation: .34, coreScale: 1.015, breath: .0015, ring: .58 },
  thinking: { hover: .011, rotation: .62, coreScale: .99, breath: .0018, ring: 1.22 },
  speaking: { hover: .009, rotation: .46, coreScale: 1.02, breath: .0016, ring: .78 },
  guiding: { hover: .018, rotation: 1.24, coreScale: 1.04, breath: .0022, ring: 1.3 },
  reflecting: { hover: .006, rotation: .2, coreScale: .99, breath: .001, ring: .3 },
  calming: { hover: .005, rotation: .14, coreScale: .98, breath: .0011, ring: .2 },
  privacy: { hover: .002, rotation: .04, coreScale: .96, breath: .0006, ring: .06 },
  warning: { hover: .002, rotation: .07, coreScale: .94, breath: .0008, ring: .08 },
  transition: { hover: .03, rotation: 1.9, coreScale: 1.08, breath: .0035, ring: 2.1 },
}
const ORB_FRAGMENT_LAYOUT: readonly [readonly [number, number, number], readonly [number, number, number], number][] = [
  [[.31,.12,.08],[.4,.1,.7],.075], [[-.27,.18,.12],[-.3,.7,.2],.066],
  [[.16,-.24,.2],[.8,.2,-.4],.06], [[-.18,-.2,-.22],[-.5,.3,.9],.056],
  [[.05,.29,-.18],[.2,-.6,.4],.052], [[-.04,-.31,.15],[-.7,-.2,.1],.048],
]
const ORB_EFFECT_BUDGET: Record<SpatialQualityTier, { motes: number; filaments: number; membraneSegments: number }> = {
  low: { motes: 120, filaments: 2, membraneSegments: 32 },
  medium: { motes: 180, filaments: 5, membraneSegments: 48 },
  high: { motes: 520, filaments: 8, membraneSegments: 64 },
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const root = cloneSkeleton(source)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone()
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function disposeClonedMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
}

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
const CURRENT_HOME_PRESENCE_ROOTS = new Set(['home-living-memory-orb', 'home-visible-user-avatar'])

function isInsideCurrentHomePresence(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current) {
    if (CURRENT_HOME_PRESENCE_ROOTS.has(current.name)) return true
    current = current.parent
  }
  return false
}

/** Retire predecessor hotspot sculptures while preserving the canonical Avatar, Orb, world and broad Sky interaction. */
function RetireLegacyHomeHotspots() {
  const { scene } = useThree()
  useEffect(() => {
    const hidden = new Map<THREE.Object3D, boolean>()
    const raycasts = new Map<THREE.Object3D, THREE.Object3D['raycast']>()
    const retire = () => scene.traverse((object) => {
      if (isInsideCurrentHomePresence(object)) return
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

function avatarHiddenForGroundPhase(phase: GroundDescentPhase | null) {
  if (!phase) return false
  return phase !== 'ground-recognition' && phase !== 'home-avatar-camera-approach'
}

function VisibleHomeAvatar({ reducedMotion, groundPhase }: { reducedMotion: boolean; groundPhase: GroundDescentPhase | null }) {
  const human = useGLTF(HUMAN_MODEL)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  const { actions } = useAnimations(human.animations, model)
  const groundY = height(AVATAR_POSITION.x, AVATAR_POSITION.z)
  const hiddenForEmbodiment = avatarHiddenForGroundPhase(groundPhase)

  useEffect(() => {
    const idle = actions.idle_breath
    if (!idle || reducedMotion) return
    idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(.3).play()
    return () => { idle.fadeOut(.2); idle.stop() }
  }, [actions, reducedMotion])

  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])
  useEffect(() => () => disposeClonedMaterials(model), [model])

  return <group
    name="home-visible-user-avatar"
    visible={!hiddenForEmbodiment}
    position={[AVATAR_POSITION.x, groundY, AVATAR_POSITION.z]}
    rotation={[groundPhase === 'ground-recognition' ? .018 : 0, Math.PI, 0]}
    userData={{ semanticOwner: 'user-avatar', presentation: 'visible-home-avatar-third-person', runtimeAsset: HUMAN_MODEL, animation: reducedMotion ? 'still-reduced-motion' : 'idle_breath', cloneStrategy: 'skeleton-safe', nearCameraRule: 'hidden-before-avatar-eye-plane-crossing', groundAcknowledgement: 'subtle-posture-shift' }}
  >
    <primitive object={model} scale={.72} />
  </group>
}

function orbHiddenForGroundPhase(phase: GroundDescentPhase | null) {
  return phase === 'ground-surface-crossing' || phase === 'ground-spatial-fold' || phase === 'ground-world-reveal' || phase === 'ground-arrival-handoff' || phase === 'ground-first-person'
}

function OrbCompanion({ state, reducedMotion, groundPhase, onOrb }: { state: OrbState; reducedMotion: boolean; groundPhase: GroundDescentPhase | null; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const fieldShell = useRef<THREE.Mesh>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const heart = useRef<THREE.Mesh>(null)
  const heartMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const ringC = useRef<THREE.Mesh>(null)
  const fragments = useRef<THREE.Group>(null)
  const membrane = useRef<THREE.MeshPhysicalMaterial>(null)
  const worldLight = useRef<THREE.PointLight>(null)
  const yaw = useRef(0)
  const speechEnergy = useRef(0)
  const speechImpulse = useRef(0)
  const anticipation = useRef(0)
  const speechActive = useRef(false)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const quality = useAdaptiveSpatialQuality()
  const effectBudget = ORB_EFFECT_BUDGET[quality.tier]
  const groundY = height(ORB_POSITION.x, ORB_POSITION.z)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state, reducedMotion])
  const hiddenForMaterialCrossing = orbHiddenForGroundPhase(groundPhase)

  useEffect(() => {
    const listener = (event: CustomEvent<OrbSpeechClockDetail>) => {
      const detail = event.detail
      if (detail.phase === 'anticipation') {
        anticipation.current = 1
        return
      }
      if (detail.source === 'text') {
        if (detail.phase === 'end' || detail.phase === 'cancel') anticipation.current = 0
        return
      }
      if (detail.phase === 'start') {
        speechActive.current = true
        speechEnergy.current = Math.max(speechEnergy.current, .12)
        speechImpulse.current = Math.max(speechImpulse.current, .24)
        anticipation.current = 0
        return
      }
      if (detail.phase === 'boundary') {
        if (speechActive.current) speechImpulse.current = Math.min(1, speechImpulse.current + .28)
        return
      }
      if (detail.phase === 'frame') {
        if (!speechActive.current) return
        const actualAmplitude = typeof detail.amplitude === 'number' ? THREE.MathUtils.clamp(detail.amplitude * 7, 0, 1) : .08
        speechEnergy.current = Math.max(speechEnergy.current, actualAmplitude)
        return
      }
      if (detail.phase === 'end') {
        speechActive.current = false
        anticipation.current = 0
        return
      }
      if (detail.phase === 'cancel') {
        speechActive.current = false
        speechEnergy.current = 0
        speechImpulse.current = 0
        anticipation.current = 0
      }
    }
    window.addEventListener(ORB_SPEECH_CLOCK_EVENT, listener)
    return () => window.removeEventListener(ORB_SPEECH_CLOCK_EVENT, listener)
  }, [])

  useEffect(() => {
    const allActions = Object.values(actions).filter((action): action is THREE.AnimationAction => Boolean(action))
    if (reducedMotion) { allActions.forEach((action) => action.stop()); activeAction.current = null; return }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(.18)
    next.enabled = true
    next.paused = false
    next.reset().setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
    next.fadeIn(.18).play()
    activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])
  useEffect(() => () => disposeClonedMaterials(authoredOrb), [authoredOrb])

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const motion = ORB_STATE_MOTION[state]
    const baseY = groundY + 1.52
    speechEnergy.current = THREE.MathUtils.damp(speechEnergy.current, speechActive.current ? speechEnergy.current * .82 : 0, speechActive.current ? 5 : 8, delta)
    speechImpulse.current = THREE.MathUtils.damp(speechImpulse.current, 0, 11, delta)
    anticipation.current = THREE.MathUtils.damp(anticipation.current, 0, 3.8, delta)
    const expressiveEnergy = reducedMotion ? 0 : Math.min(1, speechEnergy.current + speechImpulse.current * .58)
    const gather = reducedMotion ? 0 : anticipation.current

    if (!reducedMotion) {
      yaw.current += delta * .015 * motion.rotation
      root.current.rotation.y = yaw.current
      root.current.position.y = baseY + Math.sin(clock.elapsedTime * .58) * motion.hover
      if (authoredCore.current) {
        const baseScale = .338 * motion.coreScale + Math.sin(clock.elapsedTime * .9) * motion.breath
        authoredCore.current.scale.setScalar(baseScale - gather * .004 + expressiveEnergy * .006)
      }
      if (heart.current) {
        const pressure = 1 - gather * .035 + expressiveEnergy * .052
        heart.current.scale.set(.13 * pressure, .225 * pressure, .105 * pressure)
      }
      if (fieldShell.current) {
        const pressure = 1 + expressiveEnergy * .004
        fieldShell.current.scale.set(pressure, 1.04 * pressure, .95 * pressure)
      }
      const articulation = 1 + expressiveEnergy * .62 + gather * .18
      if (ringA.current) ringA.current.rotation.y += delta * .028 * motion.ring * articulation
      if (ringB.current) ringB.current.rotation.x -= delta * .021 * motion.ring * articulation
      if (ringC.current) ringC.current.rotation.z += delta * .016 * motion.ring * articulation
      if (fragments.current) fragments.current.rotation.y += delta * .012 * motion.ring * (1 + expressiveEnergy * .25)
    } else {
      root.current.position.y = baseY
      if (authoredCore.current) authoredCore.current.scale.setScalar(.338 * motion.coreScale)
      if (heart.current) heart.current.scale.set(.13, .225, .105)
      if (fieldShell.current) fieldShell.current.scale.set(1, 1.04, .95)
    }
    if (membrane.current) {
      const stateOpacity = state === 'privacy' ? .022 : state === 'warning' ? .018 : state === 'dormant' ? .01 : .012
      const speechPressure = reducedMotion ? 0 : expressiveEnergy * .004 + gather * .0015
      membrane.current.opacity = THREE.MathUtils.damp(membrane.current.opacity, stateOpacity + speechPressure, 8, delta)
    }
    if (heartMaterial.current) {
      const target = sensory.light.intensity * .56 + (reducedMotion ? 0 : expressiveEnergy * .72 + gather * .16)
      heartMaterial.current.emissiveIntensity = THREE.MathUtils.damp(heartMaterial.current.emissiveIntensity, target, 10, delta)
    }
    if (worldLight.current) {
      const target = sensory.light.intensity * .46 + (reducedMotion ? 0 : expressiveEnergy * .22 + gather * .06)
      worldLight.current.intensity = THREE.MathUtils.damp(worldLight.current.intensity, target, 8, delta)
    }
  })

  const stateColor = state === 'warning' ? '#cf9b65'
    : state === 'thinking' || state === 'reflecting' ? '#8f98c8'
      : state === 'privacy' ? '#c8dcda'
        : state === 'calming' ? '#71a99d'
          : state === 'guiding' ? '#bd8b55'
            : state === 'transition' ? '#d0e5e6'
              : '#7fcbd0'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }

  return <group
    ref={root}
    visible={!hiddenForMaterialCrossing}
    name="home-living-memory-orb"
    position={[ORB_POSITION.x, groundY + 1.52, ORB_POSITION.z]}
    onClick={activate}
    userData={{
      semanticOwner: 'orb',
      runtimeAsset: ORB_MODEL,
      animation: sensory.animation,
      modelClip: ORB_CLIPS[state],
      stateMotion: 'one-shot-entry-plus-persistent-organic-runtime',
      speechEmbodiment: 'actual-playback-clock-with-rms-when-available',
      groundOwnership: hiddenForMaterialCrossing ? 'home-owned-not-rendered-after-surface-crossing' : 'home-owned-visible',
      qualityTier: quality.tier,
      moteCeiling: effectBudget.motes,
      filamentCeiling: effectBudget.filaments,
    }}
  >
    <mesh ref={fieldShell} castShadow scale={[1,1.04,.95]} onClick={activate}>
      <sphereGeometry args={[.5,effectBudget.membraneSegments,effectBudget.membraneSegments]} />
      <meshPhysicalMaterial ref={membrane} color="#9cc6c5" transparent opacity={.012} transmission={.92} thickness={.052} roughness={.25} metalness={0} clearcoat={.54} clearcoatRoughness={.28} ior={1.16} envMapIntensity={.9} depthWrite={false} />
    </mesh>
    <group ref={authoredCore} scale={.338} name="home-orb-authored-core"><primitive object={authoredOrb} /></group>
    <mesh ref={heart} name="home-orb-non-spherical-core" scale={[.13,.225,.105]} rotation={[.16,.38,-.08]} castShadow>
      <octahedronGeometry args={[1,2]} />
      <meshPhysicalMaterial ref={heartMaterial} color="#c8dcda" emissive={stateColor} emissiveIntensity={sensory.light.intensity * .56} roughness={.4} metalness={.16} clearcoat={.28} clearcoatRoughness={.38} envMapIntensity={.95} />
    </mesh>
    <mesh ref={ringA} name="home-orb-stabilizer-ring-1" rotation={[.28,.5,.14]} castShadow><torusGeometry args={[.49,.014,16,128]} /><meshStandardMaterial color="#66716f" emissive="#456c6e" emissiveIntensity={.028} metalness={.84} roughness={.32} envMapIntensity={1.08} /></mesh>
    <mesh ref={ringB} name="home-orb-stabilizer-ring-2" rotation={[1.38,-.22,.64]} castShadow><torusGeometry args={[.44,.013,16,128]} /><meshStandardMaterial color="#766d5e" emissive="#66553d" emissiveIntensity={.024} metalness={.8} roughness={.36} envMapIntensity={1.02} /></mesh>
    <mesh ref={ringC} name="home-orb-stabilizer-ring-3" rotation={[.78,1.1,-.44]} castShadow><torusGeometry args={[.395,.011,16,128]} /><meshStandardMaterial color="#59686a" emissive="#42686b" emissiveIntensity={.024} metalness={.78} roughness={.37} envMapIntensity={1.02} /></mesh>
    <group ref={fragments} name="home-orb-crystalline-fragments">
      {ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale} castShadow>
        <tetrahedronGeometry args={[1,0]} />
        <meshPhysicalMaterial color={index % 2 === 0 ? '#8fa7a3' : '#858f92'} emissive={stateColor} emissiveIntensity={.038} roughness={.42} metalness={.36} clearcoat={.34} clearcoatRoughness={.36} envMapIntensity={1.06} />
      </mesh>)}
    </group>
    <mesh name="home-orb-state-light" position={[0,-.025,.285]}><sphereGeometry args={[.026,20,20]} /><meshStandardMaterial color="#e3dfd2" emissive={stateColor} emissiveIntensity={sensory.light.intensity * .9} roughness={.36} metalness={.05} /></mesh>
    <pointLight ref={worldLight} color={stateColor} intensity={sensory.light.intensity * .46} distance={4.1} decay={2} />
  </group>
}

function phaseProgress(elapsedMs: number, startMs: number, endMs: number) {
  if (elapsedMs <= startMs) return 0
  if (elapsedMs >= endMs) return 1
  return THREE.MathUtils.smoothstep((elapsedMs - startMs) / (endMs - startMs), 0, 1)
}

function CameraRig({ yaw, pitch, transition, target, reducedMotion, owner, onComplete, onGroundPhase }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  transition: Transition
  target: MutableRefObject<TransitionTarget | null>
  reducedMotion: boolean
  owner: MutableRefObject<HTMLElement | null>
  onComplete: (transition: Exclude<Transition, 'none'>) => void
  onGroundPhase: (phase: GroundDescentPhase | null) => void
}) {
  const { camera, size } = useThree()
  const elapsed = useRef(0)
  const start = useRef(new THREE.Vector3())
  const completed = useRef(false)
  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const lastGroundPhase = useRef<GroundDescentPhase | null>(null)

  useEffect(() => {
    elapsed.current = 0
    completed.current = false
    start.current.copy(camera.position)
    lastGroundPhase.current = transition === 'ground' ? 'ground-recognition' : null
    onGroundPhase(lastGroundPhase.current)
  }, [camera, onGroundPhase, transition])

  useFrame((_, delta) => {
    const portrait = size.height > size.width
    const shell = owner.current
    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = transition === 'none'
        ? (portrait ? 58 : 52)
        : transition === 'life-map'
          ? (portrait ? 64 : 50)
          : (portrait ? GROUND_PORTRAIT_FOV_DEG : GROUND_LANDSCAPE_FOV_DEG)
      camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, transition === 'ground' ? 5 : 7, delta)
      camera.updateProjectionMatrix()
    }

    if (transition === 'none') {
      const radius = portrait ? 9.70 : 9.00
      const focus = look.current.set(HOME_FOCUS.x, height(HOME_FOCUS.x, HOME_FOCUS.z) + HOME_FOCUS.y, HOME_FOCUS.z)
      const orbitYaw = THREE.MathUtils.clamp(yaw.current, -.34, .34)
      const cameraY = (portrait ? 2.15 : 1.92) + THREE.MathUtils.clamp(pitch.current, -.28, .25) * 2.1
      desired.current.set(focus.x + Math.sin(orbitYaw) * radius, cameraY, focus.z + Math.cos(orbitYaw) * radius)
      camera.position.lerp(desired.current, 1 - Math.pow(.0009, delta))
      camera.lookAt(focus)
      if (shell) shell.dataset.homeTransitionProgress = '0.000'
      return
    }

    elapsed.current += Math.min(delta, .08)
    if (transition === 'ground') {
      const totalMs = reducedMotion ? GROUND_REDUCED_MOTION_TOTAL_MS : GROUND_DESCENT_TOTAL_MS
      const elapsedMs = Math.min(totalMs, elapsed.current * 1000)
      const phase = groundDescentPhaseAt(elapsedMs, reducedMotion)
      if (phase !== lastGroundPhase.current) {
        lastGroundPhase.current = phase
        onGroundPhase(phase)
      }
      const hit = target.current?.point ?? new THREE.Vector3(0, height(0, -1), -1)
      const avatarEye = new THREE.Vector3(AVATAR_POSITION.x, height(AVATAR_POSITION.x, AVATAR_POSITION.z) + AVATAR_EYE_OFFSET_Y, AVATAR_POSITION.z + .04)
      const surfaceApproach = new THREE.Vector3(hit.x, hit.y + .56, hit.z + .72)
      const surfaceCommit = new THREE.Vector3(hit.x, hit.y + .16, hit.z + .22)

      if (reducedMotion) {
        const totalT = Math.min(1, elapsedMs / totalMs)
        const eyeT = phaseProgress(elapsedMs, 70, 195)
        const surfaceT = phaseProgress(elapsedMs, 195, 350)
        if (elapsedMs < 195) camera.position.lerpVectors(start.current, avatarEye, eyeT)
        else camera.position.lerpVectors(avatarEye, surfaceCommit, surfaceT)
        look.current.lerpVectors(
          new THREE.Vector3(avatarEye.x, avatarEye.y, avatarEye.z - 2),
          new THREE.Vector3(hit.x, hit.y, hit.z),
          totalT,
        )
        camera.lookAt(look.current)
      } else if (elapsedMs < 180) {
        const t = phaseProgress(elapsedMs, 0, 180)
        desired.current.copy(start.current).lerp(avatarEye, t * .06)
        camera.position.copy(desired.current)
        look.current.lerpVectors(HOME_FOCUS, avatarEye, t * .16)
        camera.lookAt(look.current)
      } else if (elapsedMs < 550) {
        const t = phaseProgress(elapsedMs, 180, 550)
        camera.position.lerpVectors(start.current, avatarEye, t)
        look.current.lerpVectors(HOME_FOCUS, new THREE.Vector3(avatarEye.x, avatarEye.y, avatarEye.z - 2), t)
        camera.lookAt(look.current)
      } else if (elapsedMs < 720) {
        camera.position.copy(avatarEye)
        const t = phaseProgress(elapsedMs, 550, 720)
        look.current.lerpVectors(new THREE.Vector3(avatarEye.x, avatarEye.y, avatarEye.z - 2), hit, t)
        camera.lookAt(look.current)
      } else if (elapsedMs < 1100) {
        const t = phaseProgress(elapsedMs, 720, 1100)
        camera.position.lerpVectors(avatarEye, surfaceApproach, t)
        look.current.set(hit.x, hit.y - .05, hit.z - .25)
        camera.lookAt(look.current)
      } else {
        const t = phaseProgress(elapsedMs, 1100, 1560)
        camera.position.lerpVectors(surfaceApproach, surfaceCommit, t)
        look.current.set(hit.x, hit.y - .18, hit.z - .52)
        camera.lookAt(look.current)
      }

      if (shell) {
        shell.dataset.homeTransitionProgress = Math.min(1, elapsedMs / totalMs).toFixed(3)
        shell.dataset.homeGroundCinematicPhase = phase
        shell.dataset.homeGroundAvatarGeometry = avatarHiddenForGroundPhase(phase) ? 'culled-before-eye-plane' : 'visible'
      }
      if (elapsedMs >= totalMs && !completed.current) { completed.current = true; onComplete('ground') }
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

function Scene({ yaw, pitch, transition, transitionTarget, reducedMotion, orbState, groundPhase, onGroundPhase, onOrb, onGround, onLifeMap, onReady, owner, onComplete }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  transition: Transition
  transitionTarget: MutableRefObject<TransitionTarget | null>
  reducedMotion: boolean
  orbState: OrbState
  groundPhase: GroundDescentPhase | null
  onGroundPhase: (phase: GroundDescentPhase | null) => void
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
    if (event.delta > 4 || transition !== 'none') return
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
    <HomeGroundMaterialBridge phase={groundPhase} target={transitionTarget} reducedMotion={reducedMotion} />
    <VisibleHomeAvatar reducedMotion={reducedMotion} groundPhase={groundPhase} />
    <OrbCompanion state={orbState} reducedMotion={reducedMotion} groundPhase={groundPhase} onOrb={onOrb} />
    <CameraRig yaw={yaw} pitch={pitch} transition={transition} target={transitionTarget} reducedMotion={reducedMotion} owner={owner} onComplete={onComplete} onGroundPhase={onGroundPhase} />
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
  const [groundPhase, setGroundPhase] = useState<GroundDescentPhase | null>(null)
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
    setGroundPhase('ground-recognition')
    setOrbState('transition')
    setTransition('ground')
  }, [transition])
  const openLifeMap = useCallback(() => {
    if (transition !== 'none') return
    transitionTarget.current = null
    setGroundPhase(null)
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
      setGroundPhase(null)
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
    data-home-presence-presentation="visible-avatar-third-person"
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
    data-home-camera-mode={transition === 'ground' && groundPhase ? groundPhase : transition !== 'none' ? transition : dragging ? 'cinematic-third-person-look' : 'cinematic-third-person'}
    data-home-scene-phase={phase}
    data-home-ground-cinematic-phase={groundPhase ?? 'none'}
    data-home-ground-cinematic-duration-ms={reducedMotion ? GROUND_REDUCED_MOTION_TOTAL_MS : GROUND_DESCENT_TOTAL_MS}
    data-home-transition-sequence={transition === 'none' ? 'idle' : `${transition}:traversal`}
    data-home-portal-sequence="idle"
    data-home-input-locked={transition !== 'none' ? 'true' : 'false'}
    data-home-orb-state={orbState}
    data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
    data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]}
    data-home-orb-runtime-asset={ORB_MODEL}
    data-home-avatar-runtime-asset={HUMAN_MODEL}
    data-home-visual-grade="current-literal-pixel-candidate-not-certified"
    data-home-art-certification="fresh-exact-head-pixels-required"
    data-home-scanned-composition="visible-avatar-authored-living-memory-orb-physical-world-and-broad-sky-threshold"
    data-home-authored-regions="home-physical-world home-visible-user-avatar home-living-memory-orb home-life-map-sky-threshold"
    data-testid="home-visible-navigable-sanctuary-world"
    style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#10272a' }}
    {...look}
  >
    <Canvas
      className={styles.canvas}
      dpr={1}
      shadows
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 1.92, 7.85], fov: 52, near: .1, far: 125 }}
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
      <Scene yaw={yaw} pitch={pitch} transition={transition} transitionTarget={transitionTarget} reducedMotion={reducedMotion} orbState={orbState} groundPhase={groundPhase} onGroundPhase={setGroundPhase} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} onComplete={completeTransition} />
    </Canvas>
    <span className="sr-only" role="status" aria-live="polite">{transition === 'ground' ? `Entering your physical Ground world. ${groundPhase ?? 'ground-recognition'}.` : transition === 'life-map' ? 'Ascending into your Life Map.' : ''}</span>
    <span className="sr-only" data-testid="urai-home-webgl-orb">The authored living-memory Orb is physically present in Home and preserves semantic state behavior.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your visible Home Avatar is present in the world. Ground entry moves through the Avatar eye position before first-person lived-world exploration; ordinary first-person Ground renders no hands or follower Avatar.</span>
  </main>
}

export const HomeWorldProduction = HomeWorldProductionV223

useGLTF.preload(ORB_MODEL)
useGLTF.preload(HUMAN_MODEL)
