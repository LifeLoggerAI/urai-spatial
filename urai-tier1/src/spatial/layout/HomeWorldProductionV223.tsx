'use client'

import { useRouter } from 'next/navigation'
import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { AvatarSelfView, type AvatarSelfViewSection } from '@/spatial/home/AvatarSelfView'
import { HomeEmbodiedAvatar, HOME_AVATAR_MODEL, type HomeAvatarPresentationState } from '@/spatial/home/HomeEmbodiedAvatar'
import { useHomeExperienceController } from '@/spatial/home/useHomeExperienceController'
import { useDragLook, useMovementInput, stepEmbodiedMotion, MobileMovementPad, MovementHelp, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useAdaptiveSpatialQuality, type SpatialQualityTier } from '@/spatial/performance/useAdaptiveSpatialQuality'
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
type StableHomeMode = 'HOME_PRESENTATION' | 'AVATAR_HOME_FIRST_PERSON'

const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const HUMAN_MODEL = HOME_AVATAR_MODEL
const HOME_FOCUS = new THREE.Vector3(0, 3.05, -1.15)
const ORB_POSITION = new THREE.Vector3(1.02, 0, .72)
const AVATAR_POSITION = new THREE.Vector3(-.72, 0, 5.95)
const HOME_FIRST_PERSON_EYE_HEIGHT = 1.69
const HOME_FIRST_PERSON_BOUNDS = { minX: -11.8, maxX: 11.8, minZ: -17.5, maxZ: 5.3 }
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
const SELF_VIEW_SECTIONS: readonly AvatarSelfViewSection[] = [
  {
    id: 'embodiment',
    title: 'Embodiment',
    fields: [
      { id: 'view', label: 'Current view', value: 'First-person Home', provenance: 'local runtime state', visibility: 'system-state' },
      { id: 'hands', label: 'Non-XR body', value: 'Camera-only — no synthetic hands or body rig', provenance: 'locked Home canon', visibility: 'system-state' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    fields: [
      { id: 'motion', label: 'Motion', value: 'System preference respected', provenance: 'prefers-reduced-motion', visibility: 'system-state' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    fields: [
      { id: 'scope', label: 'Self view', value: 'Only explicit safe local runtime fields are shown', provenance: 'privacy-bounded self view', visibility: 'private' },
    ],
  },
]

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

function OrbCompanion({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
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

  useEffect(() => {
    const listener = (event: CustomEvent<OrbSpeechClockDetail>) => {
      const detail = event.detail
      if (detail.phase === 'anticipation') { anticipation.current = 1; return }
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
      if (detail.phase === 'end') { speechActive.current = false; anticipation.current = 0; return }
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
  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
    disposeClonedMaterials(authoredOrb)
  }, [actions, authoredOrb])

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
      const nextIntensity = sensory.light.intensity * .56 + (reducedMotion ? 0 : expressiveEnergy * .72 + gather * .16)
      heartMaterial.current.emissiveIntensity = THREE.MathUtils.damp(heartMaterial.current.emissiveIntensity, nextIntensity, 10, delta)
    }
    if (worldLight.current) {
      const nextIntensity = sensory.light.intensity * .46 + (reducedMotion ? 0 : expressiveEnergy * .22 + gather * .06)
      worldLight.current.intensity = THREE.MathUtils.damp(worldLight.current.intensity, nextIntensity, 8, delta)
    }
  })

  const stateColor = state === 'warning' ? '#cf9b65' : state === 'thinking' || state === 'reflecting' ? '#8f98c8' : state === 'privacy' ? '#c8dcda' : state === 'calming' ? '#71a99d' : state === 'guiding' ? '#bd8b55' : state === 'transition' ? '#d0e5e6' : '#7fcbd0'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} name="home-living-memory-orb" position={[ORB_POSITION.x, groundY + 1.52, ORB_POSITION.z]} onClick={activate} userData={{ semanticOwner: 'orb', runtimeAsset: ORB_MODEL, animation: sensory.animation, modelClip: ORB_CLIPS[state], stateMotion: 'one-shot-entry-plus-persistent-organic-runtime', speechEmbodiment: 'actual-playback-clock-with-rms-when-available', qualityTier: quality.tier, moteCeiling: effectBudget.motes, filamentCeiling: effectBudget.filaments }}>
    <mesh ref={fieldShell} castShadow scale={[1,1.04,.95]} onClick={activate}><sphereGeometry args={[.5,effectBudget.membraneSegments,effectBudget.membraneSegments]} /><meshPhysicalMaterial ref={membrane} color="#9cc6c5" transparent opacity={.012} transmission={.92} thickness={.052} roughness={.25} metalness={0} clearcoat={.54} clearcoatRoughness={.28} ior={1.16} envMapIntensity={.9} depthWrite={false} /></mesh>
    <group ref={authoredCore} scale={.338} name="home-orb-authored-core"><primitive object={authoredOrb} /></group>
    <mesh ref={heart} name="home-orb-non-spherical-core" scale={[.13,.225,.105]} rotation={[.16,.38,-.08]} castShadow><octahedronGeometry args={[1,2]} /><meshPhysicalMaterial ref={heartMaterial} color="#c8dcda" emissive={stateColor} emissiveIntensity={sensory.light.intensity * .56} roughness={.4} metalness={.16} clearcoat={.28} clearcoatRoughness={.38} envMapIntensity={.95} /></mesh>
    <mesh ref={ringA} name="home-orb-stabilizer-ring-1" rotation={[.28,.5,.14]} castShadow><torusGeometry args={[.49,.014,16,128]} /><meshStandardMaterial color="#66716f" emissive="#456c6e" emissiveIntensity={.028} metalness={.84} roughness={.32} envMapIntensity={1.08} /></mesh>
    <mesh ref={ringB} name="home-orb-stabilizer-ring-2" rotation={[1.38,-.22,.64]} castShadow><torusGeometry args={[.44,.013,16,128]} /><meshStandardMaterial color="#766d5e" emissive="#66553d" emissiveIntensity={.024} metalness={.8} roughness={.36} envMapIntensity={1.02} /></mesh>
    <mesh ref={ringC} name="home-orb-stabilizer-ring-3" rotation={[.78,1.1,-.44]} castShadow><torusGeometry args={[.395,.011,16,128]} /><meshStandardMaterial color="#59686a" emissive="#42686b" emissiveIntensity={.024} metalness={.78} roughness={.37} envMapIntensity={1.02} /></mesh>
    <group ref={fragments} name="home-orb-crystalline-fragments">{ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale} castShadow><tetrahedronGeometry args={[1,0]} /><meshPhysicalMaterial color={index % 2 === 0 ? '#8fa7a3' : '#858f92'} emissive={stateColor} emissiveIntensity={.038} roughness={.42} metalness={.36} clearcoat={.34} clearcoatRoughness={.36} envMapIntensity={1.06} /></mesh>)}</group>
    <mesh name="home-orb-state-light" position={[0,-.025,.285]}><sphereGeometry args={[.026,20,20]} /><meshStandardMaterial color="#e3dfd2" emissive={stateColor} emissiveIntensity={sensory.light.intensity * .9} roughness={.36} metalness={.05} /></mesh>
    <pointLight ref={worldLight} color={stateColor} intensity={sensory.light.intensity * .46} distance={4.1} decay={2} />
  </group>
}

function CameraRig({ yaw, pitch, transition, target, reducedMotion, owner, stableMode, homeTransition, movement, firstPersonPosition, firstPersonVelocity, firstPersonTarget, runtimeCameraPosition, onEmbodimentComplete, onRestoreComplete, onComplete }: {
  yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; transition: Transition; target: MutableRefObject<TransitionTarget | null>; reducedMotion: boolean; owner: MutableRefObject<HTMLElement | null>; stableMode: StableHomeMode; homeTransition: string | null; movement: MovementInput; firstPersonPosition: MutableRefObject<THREE.Vector3>; firstPersonVelocity: MutableRefObject<THREE.Vector3>; firstPersonTarget: MutableRefObject<THREE.Vector3 | null>; runtimeCameraPosition: MutableRefObject<THREE.Vector3>; onEmbodimentComplete: () => void; onRestoreComplete: () => void; onComplete: (transition: Exclude<Transition, 'none'>) => void
}) {
  const { camera, size } = useThree()
  const elapsed = useRef(0)
  const start = useRef(new THREE.Vector3())
  const completed = useRef(false)
  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const transitionKey = `${transition}:${homeTransition ?? 'none'}:${stableMode}`
  useEffect(() => { elapsed.current = 0; completed.current = false; start.current.copy(camera.position) }, [camera, transitionKey])
  useFrame((_, delta) => {
    const portrait = size.height > size.width
    const shell = owner.current
    const firstPerson = stableMode === 'AVATAR_HOME_FIRST_PERSON'
    const semanticEmbodiment = homeTransition === 'AVATAR_EMBODIMENT_TRANSITION'
    const semanticUnwind = homeTransition === 'EMBODIMENT_UNWIND'
    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = transition === 'life-map' ? (portrait ? 64 : 50) : firstPerson || semanticEmbodiment ? (portrait ? 66 : 58) : transition === 'ground' ? (portrait ? 60 : 48) : (portrait ? 58 : 52)
      camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, 7, delta)
      camera.updateProjectionMatrix()
    }
    if (transition !== 'none') {
      elapsed.current += Math.min(delta, .08)
      if (transition === 'ground') {
        const duration = reducedMotion ? .24 : 1.58
        const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
        const hit = target.current?.point ?? new THREE.Vector3(0, height(0, -1), -1)
        const end = desired.current.set(hit.x, hit.y - (reducedMotion ? .02 : .34), hit.z + (reducedMotion ? .55 : .16))
        camera.position.lerpVectors(start.current, end, t)
        look.current.set(hit.x, hit.y - .24, hit.z - .42)
        camera.lookAt(look.current)
        runtimeCameraPosition.current.copy(camera.position)
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
      runtimeCameraPosition.current.copy(camera.position)
      if (shell) shell.dataset.homeTransitionProgress = t.toFixed(3)
      if (t >= .995 && !completed.current) { completed.current = true; onComplete('life-map') }
      return
    }
    if (semanticEmbodiment) {
      elapsed.current += Math.min(delta, .08)
      const duration = reducedMotion ? .18 : .82
      const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
      const groundY = height(AVATAR_POSITION.x, AVATAR_POSITION.z)
      const end = desired.current.set(AVATAR_POSITION.x, groundY + HOME_FIRST_PERSON_EYE_HEIGHT, AVATAR_POSITION.z - .18)
      camera.position.lerpVectors(start.current, end, t)
      look.current.set(end.x, end.y + Math.sin(pitch.current), end.z - 2.8)
      camera.lookAt(look.current)
      runtimeCameraPosition.current.copy(camera.position)
      if (shell) shell.dataset.homeTransitionProgress = t.toFixed(3)
      if (t >= .995 && !completed.current) {
        completed.current = true
        firstPersonPosition.current.copy(end)
        firstPersonVelocity.current.set(0, 0, 0)
        firstPersonTarget.current = null
        yaw.current = 0
        pitch.current = THREE.MathUtils.clamp(pitch.current, -.55, .55)
        onEmbodimentComplete()
      }
      return
    }
    if (semanticUnwind) {
      elapsed.current += Math.min(delta, .08)
      const duration = reducedMotion ? .18 : .72
      const t = THREE.MathUtils.smoothstep(Math.min(1, elapsed.current / duration), 0, 1)
      const radius = portrait ? 9.70 : 9.00
      const focus = look.current.set(HOME_FOCUS.x, height(HOME_FOCUS.x, HOME_FOCUS.z) + HOME_FOCUS.y, HOME_FOCUS.z)
      const end = desired.current.set(focus.x, portrait ? 2.15 : 1.92, focus.z + radius)
      camera.position.lerpVectors(start.current, end, t)
      camera.lookAt(focus)
      runtimeCameraPosition.current.copy(camera.position)
      if (shell) shell.dataset.homeTransitionProgress = t.toFixed(3)
      if (t >= .995 && !completed.current) { completed.current = true; onRestoreComplete() }
      return
    }
    if (firstPerson) {
      stepEmbodiedMotion({ position: firstPersonPosition.current, velocity: firstPersonVelocity.current, input: movement, target: firstPersonTarget, yaw: yaw.current, delta, speed: 1.8, acceleration: 6.5, deceleration: 8, bounds: HOME_FIRST_PERSON_BOUNDS, arrivalRadius: .32 })
      firstPersonPosition.current.y = height(firstPersonPosition.current.x, firstPersonPosition.current.z) + HOME_FIRST_PERSON_EYE_HEIGHT
      camera.position.copy(firstPersonPosition.current)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw.current
      camera.rotation.x = pitch.current
      camera.rotation.z = 0
      runtimeCameraPosition.current.copy(camera.position)
      if (shell) shell.dataset.homeTransitionProgress = '0.000'
      return
    }
    const radius = portrait ? 9.70 : 9.00
    const focus = look.current.set(HOME_FOCUS.x, height(HOME_FOCUS.x, HOME_FOCUS.z) + HOME_FOCUS.y, HOME_FOCUS.z)
    const orbitYaw = THREE.MathUtils.clamp(yaw.current, -.34, .34)
    const cameraY = (portrait ? 2.15 : 1.92) + THREE.MathUtils.clamp(pitch.current, -.28, .25) * 2.1
    desired.current.set(focus.x + Math.sin(orbitYaw) * radius, cameraY, focus.z + Math.cos(orbitYaw) * radius)
    camera.position.lerp(desired.current, 1 - Math.pow(.0009, delta))
    camera.lookAt(focus)
    runtimeCameraPosition.current.copy(camera.position)
    if (shell) shell.dataset.homeTransitionProgress = '0.000'
  })
  return null
}

function Scene({ yaw, pitch, transition, transitionTarget, reducedMotion, orbState, avatarState, onAvatar, onAvatarTargetChange, onOrb, onGround, onLifeMap, onReady, owner, stableMode, homeTransition, movement, firstPersonPosition, firstPersonVelocity, firstPersonTarget, runtimeCameraPosition, onEmbodimentComplete, onRestoreComplete, onComplete }: {
  yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; transition: Transition; transitionTarget: MutableRefObject<TransitionTarget | null>; reducedMotion: boolean; orbState: OrbState; avatarState: HomeAvatarPresentationState; onAvatar: () => void; onAvatarTargetChange: (targeted: boolean) => void; onOrb: () => void; onGround: (point: THREE.Vector3) => void; onLifeMap: () => void; onReady: () => void; owner: MutableRefObject<HTMLElement | null>; stableMode: StableHomeMode; homeTransition: string | null; movement: MovementInput; firstPersonPosition: MutableRefObject<THREE.Vector3>; firstPersonVelocity: MutableRefObject<THREE.Vector3>; firstPersonTarget: MutableRefObject<THREE.Vector3 | null>; runtimeCameraPosition: MutableRefObject<THREE.Vector3>; onEmbodimentComplete: () => void; onRestoreComplete: () => void; onComplete: (transition: Exclude<Transition, 'none'>) => void
}) {
  const retiredLocalDestination = useCallback(() => {}, [])
  const physicalWorldClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 8 || transition !== 'none' || homeTransition) return
    onGround(event.point.clone())
  }, [homeTransition, onGround, transition])
  const avatarGroundY = height(AVATAR_POSITION.x, AVATAR_POSITION.z)
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
    <group name="home-visible-user-avatar"><HomeEmbodiedAvatar position={[AVATAR_POSITION.x, avatarGroundY, AVATAR_POSITION.z]} rotationY={Math.PI} scale={.72} state={avatarState} reducedMotion={reducedMotion} onActivate={onAvatar} onTargetChange={onAvatarTargetChange} /></group>
    <OrbCompanion state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <CameraRig yaw={yaw} pitch={pitch} transition={transition} target={transitionTarget} reducedMotion={reducedMotion} owner={owner} stableMode={stableMode} homeTransition={homeTransition} movement={movement} firstPersonPosition={firstPersonPosition} firstPersonVelocity={firstPersonVelocity} firstPersonTarget={firstPersonTarget} runtimeCameraPosition={runtimeCameraPosition} onEmbodimentComplete={onEmbodimentComplete} onRestoreComplete={onRestoreComplete} onComplete={onComplete} />
  </>
}

export function HomeWorldProductionV223({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const router = useRouter()
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [avatarTargeted, setAvatarTargeted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const yaw = useRef(0)
  const pitch = useRef(.02)
  const transitionTarget = useRef<TransitionTarget | null>(null)
  const worldRef = useRef<HTMLElement>(null)
  const runtimeCameraPosition = useRef(new THREE.Vector3(0, 1.92, 7.85))
  const firstPersonPosition = useRef(new THREE.Vector3(AVATAR_POSITION.x, height(AVATAR_POSITION.x, AVATAR_POSITION.z) + HOME_FIRST_PERSON_EYE_HEIGHT, AVATAR_POSITION.z - .18))
  const firstPersonVelocity = useRef(new THREE.Vector3())
  const firstPersonTarget = useRef<THREE.Vector3 | null>(null)
  const stableModeRef = useRef<StableHomeMode>('HOME_PRESENTATION')
  const markReady = useCallback(() => setSceneReady(true), [])
  const readRuntimeSnapshot = useCallback(() => ({ stableMode: stableModeRef.current, cameraPosition: runtimeCameraPosition.current.clone(), yaw: yaw.current, pitch: pitch.current, orbState }), [orbState])
  const commitDestination = useCallback((destination: 'GROUND' | 'LIFE_MAP') => {
    if (destination === 'GROUND') { requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/?from=home-ground', entryPortal: 'home-ground', cameraCheckpoint: 'ground-first-person-arrival' }); return }
    requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
  }, [])
  const restoreStableOrigin = useCallback((origin: { stableState: StableHomeMode; camera: { position: readonly [number, number, number]; yaw: number; pitch: number } }) => {
    stableModeRef.current = origin.stableState
    yaw.current = origin.camera.yaw
    pitch.current = origin.camera.pitch
    runtimeCameraPosition.current.set(...origin.camera.position)
    if (origin.stableState === 'AVATAR_HOME_FIRST_PERSON') {
      firstPersonPosition.current.set(...origin.camera.position)
      firstPersonVelocity.current.set(0, 0, 0)
      firstPersonTarget.current = null
    }
  }, [])
  const { state: homeExperience, api: homeApi } = useHomeExperienceController({ reducedMotion, readRuntimeSnapshot, onDestinationCommit: (destination) => commitDestination(destination), onStableRestore: restoreStableOrigin })
  const stableMode: StableHomeMode = homeExperience.stableState === 'HOME_PRESENTATION' ? 'HOME_PRESENTATION' : homeExperience.stableState === 'AVATAR_HOME_FIRST_PERSON' || homeExperience.stableState === 'AVATAR_SELF_VIEW' ? 'AVATAR_HOME_FIRST_PERSON' : homeExperience.origin.stableState
  stableModeRef.current = stableMode
  const firstPerson = stableMode === 'AVATAR_HOME_FIRST_PERSON'
  const movement = useMovementInput({ enabled: firstPerson && homeExperience.stableState === 'AVATAR_HOME_FIRST_PERSON' && !homeExperience.inputLocked && transition === 'none' })
  const avatarState: HomeAvatarPresentationState = firstPerson ? 'hidden-first-person' : homeExperience.transition === 'AVATAR_EMBODIMENT_TRANSITION' ? 'embodying' : homeExperience.transition === 'EMBODIMENT_UNWIND' ? 'returning' : avatarTargeted ? 'targeted' : 'rest'

  const openAvatar = useCallback(() => { if (transition !== 'none' || homeExperience.inputLocked || homeExperience.stableState !== 'HOME_PRESENTATION') return; homeApi.activateAvatar() }, [homeApi, homeExperience.inputLocked, homeExperience.stableState, transition])
  const openOrb = useCallback(() => { if (transition !== 'none' || homeExperience.inputLocked) return; setOrbState('attention'); onOrbOpen() }, [homeExperience.inputLocked, onOrbOpen, transition])
  const openGround = useCallback((point: THREE.Vector3) => { if (transition !== 'none' || homeExperience.inputLocked) return; homeApi.activateGround(); transitionTarget.current = { point }; setOrbState('transition'); setTransition('ground') }, [homeApi, homeExperience.inputLocked, transition])
  const openLifeMap = useCallback(() => { if (transition !== 'none' || homeExperience.inputLocked) return; homeApi.activateSky(); transitionTarget.current = null; setOrbState('transition'); setTransition('life-map') }, [homeApi, homeExperience.inputLocked, transition])
  const completeTransition = useCallback((next: Exclude<Transition, 'none'>) => homeApi.commitDestination(next === 'ground' ? 'GROUND' : 'LIFE_MAP'), [homeApi])
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none' && !homeExperience.inputLocked && homeExperience.stableState !== 'AVATAR_SELF_VIEW', sensitivity: firstPerson ? .0032 : .0022, minPitch: firstPerson ? -.62 : -.28, maxPitch: firstPerson ? .58 : .25, onDragState: setDragging })

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
    if (homeExperience.transition !== 'HOME_RESTORE') return
    setTransition('none')
    transitionTarget.current = null
    setOrbState('idle')
    const timer = window.setTimeout(() => homeApi.completeRestore(), reducedMotion ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [homeApi, homeExperience.transition, reducedMotion])
  useEffect(() => {
    if (homeExperience.transition !== 'GROUND_UNWIND' && homeExperience.transition !== 'LIFE_MAP_UNWIND' && homeExperience.transition !== 'ORB_COLLAPSE') return
    const timer = window.setTimeout(() => homeApi.completeRestore(), reducedMotion ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [homeApi, homeExperience.transition, reducedMotion])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const phase = transition === 'ground' ? 'GROUND_DESCENT' : transition === 'life-map' ? 'SKY_ASCENT' : homeExperience.transition === 'AVATAR_EMBODIMENT_TRANSITION' ? 'AVATAR_EMBODIMENT_TRANSITION' : homeExperience.transition === 'EMBODIMENT_UNWIND' ? 'EMBODIMENT_UNWIND' : firstPerson ? 'AVATAR_HOME_FIRST_PERSON' : 'HOME_PRESENTATION'
  const cameraMode = transition !== 'none' ? transition : firstPerson ? dragging ? 'avatar-home-first-person-look' : 'avatar-home-first-person' : dragging ? 'cinematic-third-person-look' : 'cinematic-third-person'

  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="cinematic-lived-world-threshold" data-home-world-character="production-cinematic-real-place-sacred-tech" data-home-physical-base="continuous-lived-physical-world" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self={firstPerson ? 'camera-only-avatar-embodied-first-person' : 'visible-cinematic-avatar'} data-home-presence-presentation={firstPerson ? 'avatar-hidden-camera-first-person' : 'visible-avatar-third-person'} data-home-movement={firstPerson ? 'persistent-first-person-keyboard-mobile-camera-look' : 'camera-look-world-surface-selection'} data-home-pointer-lock="false" data-home-first-person-body="none-non-xr" data-home-stable-state={homeExperience.stableState} data-home-semantic-transition={homeExperience.transition ?? 'none'} data-home-assets-ready={ready ? 'true' : 'false'} data-home-ready={ready ? 'true' : 'warming'} data-home-input-ready={ready && !homeExperience.inputLocked ? 'true' : 'false'} data-home-interaction-ready={ready && !homeExperience.inputLocked ? 'true' : 'false'} data-home-distance-ground="world-surface" data-home-distance-life-map="sky-threshold" data-home-ground-entry="physical-world-surface" data-home-life-map-entry="visible-sky-broad-interaction" data-home-camera-mode={cameraMode} data-home-scene-phase={phase} data-home-transition-sequence={transition === 'none' ? homeExperience.transition ?? 'idle' : `${transition}:traversal`} data-home-portal-sequence="idle" data-home-input-locked={transition !== 'none' || homeExperience.inputLocked ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-home-orb-runtime-asset={ORB_MODEL} data-home-avatar-runtime-asset={HUMAN_MODEL} data-home-visual-grade="current-literal-pixel-candidate-not-certified" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="visible-avatar-authored-living-memory-orb-physical-world-and-broad-sky-threshold" data-home-authored-regions="home-physical-world home-visible-user-avatar home-living-memory-orb home-life-map-sky-threshold" data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#10272a' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion ? 'demand' : 'always'} camera={{ position: [0, 1.92, 7.85], fov: 52, near: .1, far: 125 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.55; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.setClearColor(0x10272a, 1); setCanvasReady(true) }}>
      <Scene yaw={yaw} pitch={pitch} transition={transition} transitionTarget={transitionTarget} reducedMotion={reducedMotion} orbState={orbState} avatarState={avatarState} onAvatar={openAvatar} onAvatarTargetChange={setAvatarTargeted} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} stableMode={stableMode} homeTransition={homeExperience.transition} movement={movement} firstPersonPosition={firstPersonPosition} firstPersonVelocity={firstPersonVelocity} firstPersonTarget={firstPersonTarget} runtimeCameraPosition={runtimeCameraPosition} onEmbodimentComplete={homeApi.completeEmbodiment} onRestoreComplete={homeApi.completeRestore} onComplete={completeTransition} />
    </Canvas>
    {homeExperience.stableState === 'AVATAR_HOME_FIRST_PERSON' ? <><MovementHelp realm="Home" summary="Move through your Home in first person without a synthetic body overlay." controls="WASD or arrow keys move · drag to look · Escape returns to Home presentation." /><MobileMovementPad input={movement} label="Move through Home" /><button type="button" data-movement-ui="true" onClick={homeApi.openSelfView} style={{ position: 'absolute', right: 'max(16px, env(safe-area-inset-right))', bottom: 'max(18px, calc(env(safe-area-inset-bottom) + 8px))', zIndex: 35, minWidth: 48, minHeight: 48, borderRadius: 999, border: '1px solid rgba(225,242,235,.24)', background: 'rgba(4,14,17,.68)', color: '#f4faf7', padding: '0 16px', font: '600 12px/1 system-ui', backdropFilter: 'blur(14px)' }}>Self view</button></> : null}
    <AvatarSelfView open={homeExperience.stableState === 'AVATAR_SELF_VIEW'} sections={SELF_VIEW_SECTIONS} onClose={homeApi.closeSelfView} />
    <span className="sr-only" role="status" aria-live="polite">{transition === 'ground' ? 'Entering your physical Ground world.' : transition === 'life-map' ? 'Ascending into your Life Map.' : homeExperience.transition === 'AVATAR_EMBODIMENT_TRANSITION' ? 'Entering first-person Home.' : homeExperience.stableState === 'AVATAR_HOME_FIRST_PERSON' ? 'First-person Home active. Your Avatar body and synthetic hands are not shown.' : ''}</span>
    <span className="sr-only" data-testid="urai-home-webgl-orb">The authored living-memory Orb is physically present in Home and preserves semantic state behavior.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your Avatar is visible in Home presentation. Activating it enters persistent camera-only first-person Home; non-XR first person does not render synthetic hands or a body rig.</span>
  </main>
}

export const HomeWorldProduction = HomeWorldProductionV223

useGLTF.preload(ORB_MODEL)
useGLTF.preload(HUMAN_MODEL)
