'use client'

import { useRouter } from 'next/navigation'
import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useAdaptiveSpatialQuality, type SpatialQualityTier } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { ORB_SPEECH_CLOCK_EVENT, type OrbSpeechClockDetail } from '@/spatial/orb/orbSpeechClock'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { AvatarSelfView, type AvatarSelfViewSection } from '@/spatial/home/AvatarSelfView'
import { HomeEmbodiedAvatar, HOME_AVATAR_MODEL, type HomeAvatarPresentationState } from '@/spatial/home/HomeEmbodiedAvatar'
import { useHomeExperienceController } from '@/spatial/home/useHomeExperienceController'
import type { HomeOriginSnapshot, HomeStableState, HomeTransitionState } from '@/spatial/home/homeExperienceState'
import { height } from './HomeWorldProductionV223Geometry'
import { HomeV225PolishV3 } from './HomeWorldProductionV225PolishV3'
import { HomeCurrentArtRepair } from './HomeCurrentArtRepair'
import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'
import styles from './HomeWorldProduction.module.css'

type Transition = 'none' | 'ground' | 'life-map'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type TransitionTarget = { point: THREE.Vector3; normal?: THREE.Vector3 }

const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const HOME_FOCUS = new THREE.Vector3(0, 3.05, -1.15)
const ORB_POSITION = new THREE.Vector3(1.02, 0, .72)
const ORB_FIELD_RADIUS = .5
const ORB_FIELD_Y_SCALE = 1.04
const ORB_GROUND_CLEARANCE = .015
const ORB_REST_OFFSET = ORB_FIELD_RADIUS * ORB_FIELD_Y_SCALE + ORB_GROUND_CLEARANCE
const AVATAR_POSITION = new THREE.Vector3(-.72, 0, 5.95)
const HOME_EYE_HEIGHT = 1.64
const HOME_WALK_SPEED = 2.6
const HOME_WALK_ACCELERATION = 8
const HOME_WALK_DECELERATION = 10.5
const HOME_WALK_RADIUS = 14
const HOME_WALK_BOUNDS = { minX: -HOME_WALK_RADIUS, maxX: HOME_WALK_RADIUS, minZ: -HOME_WALK_RADIUS, maxZ: HOME_WALK_RADIUS }
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
  const root = source.clone(true)
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
const CURRENT_HOME_PRESENCE_ROOTS = new Set(['home-living-memory-orb', 'home-visible-user-avatar', 'urai-home-user-avatar'])

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
      object.traverse((child) => { if (!raycasts.has(child)) raycasts.set(child, child.raycast); child.raycast = () => undefined })
    })
    retire()
    const timers = [window.setTimeout(retire, 100), window.setTimeout(retire, 360)]
    return () => { timers.forEach((timer) => window.clearTimeout(timer)); hidden.forEach((visible, object) => { object.visible = visible }); raycasts.forEach((raycast, object) => { object.raycast = raycast }) }
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
      if (detail.source === 'text') { if (detail.phase === 'end' || detail.phase === 'cancel') anticipation.current = 0; return }
      if (detail.phase === 'start') { speechActive.current = true; speechEnergy.current = Math.max(speechEnergy.current, .12); speechImpulse.current = Math.max(speechImpulse.current, .24); anticipation.current = 0; return }
      if (detail.phase === 'boundary') { if (speechActive.current) speechImpulse.current = Math.min(1, speechImpulse.current + .28); return }
      if (detail.phase === 'frame') { if (!speechActive.current) return; const actualAmplitude = typeof detail.amplitude === 'number' ? THREE.MathUtils.clamp(detail.amplitude * 7, 0, 1) : .08; speechEnergy.current = Math.max(speechEnergy.current, actualAmplitude); return }
      if (detail.phase === 'end') { speechActive.current = false; anticipation.current = 0; return }
      if (detail.phase === 'cancel') { speechActive.current = false; speechEnergy.current = 0; speechImpulse.current = 0; anticipation.current = 0 }
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
    next.enabled = true; next.paused = false; next.reset().setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; next.fadeIn(.18).play(); activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const motion = ORB_STATE_MOTION[state]
    const baseY = groundY + ORB_REST_OFFSET
    speechEnergy.current = THREE.MathUtils.damp(speechEnergy.current, speechActive.current ? speechEnergy.current * .82 : 0, speechActive.current ? 5 : 8, delta)
    speechImpulse.current = THREE.MathUtils.damp(speechImpulse.current, 0, 11, delta)
    anticipation.current = THREE.MathUtils.damp(anticipation.current, 0, 3.8, delta)
    const expressiveEnergy = reducedMotion ? 0 : Math.min(1, speechEnergy.current + speechImpulse.current * .58)
    const gather = reducedMotion ? 0 : anticipation.current
    if (!reducedMotion) {
      yaw.current += delta * .08 * motion.rotation
      root.current.rotation.y = yaw.current + Math.sin(clock.elapsedTime * .29) * .014
      root.current.rotation.x = Math.sin(clock.elapsedTime * .21) * .009
    }
    root.current.position.y = baseY + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * .62) * motion.hover + expressiveEnergy * .008)
    const targetScale = motion.coreScale * (1 + expressiveEnergy * .018 + gather * .012)
    root.current.scale.setScalar(THREE.MathUtils.damp(root.current.scale.x, targetScale, 5.8, delta))
    if (fieldShell.current) fieldShell.current.rotation.y += reducedMotion ? 0 : delta * .055 * motion.ring
    if (authoredCore.current) { authoredCore.current.rotation.y += reducedMotion ? 0 : delta * .012 * motion.rotation; authoredCore.current.rotation.x = reducedMotion ? 0 : Math.sin(clock.elapsedTime * .17) * .012 }
    if (heart.current) { const heartbeat = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 2.05) * .015 + expressiveEnergy * .035; heart.current.scale.setScalar(heartbeat) }
    if (heartMaterial.current) heartMaterial.current.emissiveIntensity = THREE.MathUtils.damp(heartMaterial.current.emissiveIntensity, .38 + expressiveEnergy * 1.15 + gather * .42, 7, delta)
    const ringEnergy = .16 + motion.ring * .08 + expressiveEnergy * .24 + gather * .08
    for (const ring of [ringA.current, ringB.current, ringC.current]) if (ring) { ring.rotation.z += reducedMotion ? 0 : delta * .08 * motion.ring; const mat = ring.material as THREE.MeshBasicMaterial; mat.opacity = THREE.MathUtils.damp(mat.opacity, ringEnergy, 5, delta) }
    if (fragments.current && !reducedMotion) fragments.current.rotation.y -= delta * .014 * motion.rotation
    if (membrane.current) membrane.current.opacity = THREE.MathUtils.damp(membrane.current.opacity, .075 + expressiveEnergy * .065, 5, delta)
    if (worldLight.current) worldLight.current.intensity = THREE.MathUtils.damp(worldLight.current.intensity, 1.15 + expressiveEnergy * 1.8 + gather * .5, 6, delta)
  })

  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} name="home-living-memory-orb" position={[ORB_POSITION.x, groundY + ORB_REST_OFFSET, ORB_POSITION.z]}>
    <primitive ref={authoredCore} object={authoredOrb} scale={.72} onClick={activate} />
    <mesh ref={fieldShell} onClick={activate}><sphereGeometry args={[ORB_FIELD_RADIUS, effectBudget.membraneSegments, effectBudget.membraneSegments]} /><meshPhysicalMaterial ref={membrane} color="#8bb8ad" emissive="#6d9b92" emissiveIntensity={.18} roughness={.38} metalness={.02} transparent opacity={.08} depthWrite={false} /></mesh>
    <mesh ref={heart} onClick={activate}><icosahedronGeometry args={[.19, 2]} /><meshPhysicalMaterial ref={heartMaterial} color="#d8e4d8" emissive="#b3c9bc" emissiveIntensity={.38} roughness={.34} metalness={.03} /></mesh>
    <mesh ref={ringA} rotation={[1.1,.1,.4]}><torusGeometry args={[.37,.007,8,64]} /><meshBasicMaterial color="#9cb5aa" transparent opacity={.2} depthWrite={false} /></mesh>
    <mesh ref={ringB} rotation={[.4,1.2,.2]}><torusGeometry args={[.41,.005,8,64]} /><meshBasicMaterial color="#749a91" transparent opacity={.16} depthWrite={false} /></mesh>
    <mesh ref={ringC} rotation={[.2,.4,1.4]}><torusGeometry args={[.45,.004,8,64]} /><meshBasicMaterial color="#d0b985" transparent opacity={.12} depthWrite={false} /></mesh>
    <group ref={fragments}>{ORB_FRAGMENT_LAYOUT.map(([p,r,s],i)=><mesh key={i} position={p as [number,number,number]} rotation={r as [number,number,number]} scale={s}><dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color={i%2?'#80998f':'#bdab83'} roughness={.72} metalness={.03} /></mesh>)}</group>
    <pointLight ref={worldLight} color="#a4c3b7" intensity={1.15} distance={4.5} decay={2} />
  </group>
}

function Scene(props: any) {
  const { yaw,pitch,transition,transitionTarget,reducedMotion,orbState,homeStableState,homeTransition,homeOrigin,cameraSnapshot,movementInput,firstPersonVelocity,firstPersonTarget,onAvatar,onEmbodimentComplete,onHomeRestoreComplete,onOrb,onGround,onLifeMap,onReady,owner,onComplete } = props
  useEffect(()=>{ onReady?.() },[onReady])
  const retiredLocalDestination=()=>undefined
  const physicalWorldClick=(event:ThreeEvent<MouseEvent>)=>{ if(transition==='none'&&homeStableState==='AVATAR_HOME_FIRST_PERSON') firstPersonTarget.current=event.point.clone() }
  const avatarPresentation:HomeAvatarPresentationState = homeTransition==='AVATAR_EMBODIMENT_TRANSITION'?'transitioning-out':homeStableState==='AVATAR_HOME_FIRST_PERSON'?'hidden': 'visible'
  return <>
    <Cadence reducedMotion={reducedMotion} />
    <color attach="background" args={['#10272a']} /><fogExp2 attach="fog" args={['#294946',.0145]} />
    <HomeAtmosphericSky reducedMotion={reducedMotion} active={transition==='life-map'} onLifeMap={onLifeMap} />
    <ambientLight intensity={.30} color="#c2cec7" /><hemisphereLight args={['#c3d7cf','#1c302b',.52]} />
    <directionalLight position={[-8,11,6]} intensity={2.45} color="#f1d6b1" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-.00018} />
    <directionalLight position={[9,6,-11]} intensity={.62} color="#79a99f" />
    <HomeV225PolishV3 orbState={orbState} reducedMotion={reducedMotion} onOrb={retiredLocalDestination} onGround={retiredLocalDestination} onLifeMap={retiredLocalDestination} onWalk={physicalWorldClick} />
    <HomeCurrentArtRepair orbState={orbState} reducedMotion={reducedMotion} onOrb={retiredLocalDestination} onGround={retiredLocalDestination} onLifeMap={retiredLocalDestination} />
    <HomeAAAVisualRepair /><RetireLegacyHomeHotspots />
    <HomeEmbodiedAvatar position={[AVATAR_POSITION.x,height(AVATAR_POSITION.x,AVATAR_POSITION.z),AVATAR_POSITION.z]} rotationY={Math.PI} scale={.72} state={avatarPresentation} reducedMotion={reducedMotion} onActivate={onAvatar} />
    <OrbCompanion state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} />
    <CameraRig yaw={yaw} pitch={pitch} transition={transition} target={transitionTarget} reducedMotion={reducedMotion} owner={owner} homeStableState={homeStableState} homeTransition={homeTransition} homeOrigin={homeOrigin} cameraSnapshot={cameraSnapshot} movementInput={movementInput} firstPersonVelocity={firstPersonVelocity} firstPersonTarget={firstPersonTarget} onEmbodimentComplete={onEmbodimentComplete} onHomeRestoreComplete={onHomeRestoreComplete} onComplete={onComplete} />
  </>
}

export function HomeWorldProductionV223({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const router=useRouter(); const [canvasReady,setCanvasReady]=useState(false); const [sceneReady,setSceneReady]=useState(false); const [dragging,setDragging]=useState(false); const [reducedMotion,setReducedMotion]=useState(false); const [orbState,setOrbState]=useState<OrbState>('idle'); const [transition,setTransition]=useState<Transition>('none')
  const yaw=useRef(0); const pitch=useRef(.02); const transitionTarget=useRef<TransitionTarget|null>(null); const cameraSnapshot=useRef(new THREE.Vector3(0,1.92,7.85)); const firstPersonVelocity=useRef(new THREE.Vector3()); const firstPersonTarget=useRef<THREE.Vector3|null>(null); const stableModeRef=useRef<'HOME_PRESENTATION'|'AVATAR_HOME_FIRST_PERSON'>('HOME_PRESENTATION'); const orbStateRef=useRef<OrbState>('idle'); const worldRef=useRef<HTMLElement>(null)
  const readRuntimeSnapshot=useCallback(()=>({stableMode:stableModeRef.current,cameraPosition:cameraSnapshot.current.clone(),yaw:yaw.current,pitch:pitch.current,environment:{environmentRevision:'home-v223-embodiment-convergence'},orbState:orbStateRef.current}),[])
  const destinationCommit=useCallback((destination:'GROUND'|'LIFE_MAP')=>{ if(destination==='GROUND'){requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/?from=home-ground',entryPortal:'home-ground',cameraCheckpoint:'ground-first-person-arrival'});return} requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})},[])
  const {state:homeState,api:homeApi}=useHomeExperienceController({reducedMotion,readRuntimeSnapshot,onDestinationCommit:destinationCommit})
  useEffect(()=>{orbStateRef.current=orbState},[orbState])
  useEffect(()=>{if(homeState.stableState==='HOME_PRESENTATION'||homeState.stableState==='AVATAR_HOME_FIRST_PERSON')stableModeRef.current=homeState.stableState},[homeState.stableState])
  useEffect(()=>{if(['HOME_RESTORE','GROUND_UNWIND','LIFE_MAP_UNWIND','EMBODIMENT_UNWIND','ORB_COLLAPSE'].includes(String(homeState.transition))){setTransition('none');transitionTarget.current=null;firstPersonVelocity.current.set(0,0,0);firstPersonTarget.current=null;if(homeState.transition!=='ORB_COLLAPSE')setOrbState('idle')}},[homeState.transition])
  const markReady=useCallback(()=>setSceneReady(true),[])
  const activateAvatar=useCallback(()=>{if(transition!=='none'||homeState.inputLocked||homeState.stableState!=='HOME_PRESENTATION')return;homeApi.activateAvatar()},[homeApi,homeState.inputLocked,homeState.stableState,transition])
  const openOrb=useCallback(()=>{if(transition!=='none'||homeState.inputLocked)return;homeApi.activateOrb();setOrbState('attention');onOrbOpen();window.queueMicrotask(()=>homeApi.completeOrbTransformation())},[homeApi,homeState.inputLocked,onOrbOpen,transition])
  const openGround=useCallback((point:THREE.Vector3)=>{if(transition!=='none'||homeState.inputLocked)return;transitionTarget.current={point};homeApi.activateGround();setOrbState('transition');setTransition('ground')},[homeApi,homeState.inputLocked,transition])
  const openLifeMap=useCallback(()=>{if(transition!=='none'||homeState.inputLocked)return;transitionTarget.current=null;homeApi.activateSky();setOrbState('transition');setTransition('life-map')},[homeApi,homeState.inputLocked,transition])
  const completeTransition=useCallback((next:Exclude<Transition,'none'>)=>homeApi.commitDestination(next==='ground'?'GROUND':'LIFE_MAP'),[homeApi])
  const firstPerson=homeState.stableState==='AVATAR_HOME_FIRST_PERSON'&&!homeState.transition
  const movementInput=useMovementInput({enabled:firstPerson&&transition==='none'&&!homeState.inputLocked})
  const look=useDragLook({yaw,pitch,enabled:transition==='none'&&!homeState.inputLocked&&(homeState.stableState==='HOME_PRESENTATION'||firstPerson),sensitivity:firstPerson?.0018:.0022,minPitch:firstPerson?-1.02:-.28,maxPitch:firstPerson?.92:.25,onDragState:setDragging})
  useEffect(()=>{router.prefetch('/ground/');router.prefetch('/life-map/')},[router])
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)');const apply=()=>setReducedMotion(rm.matches);apply();rm.addEventListener?.('change',apply);return()=>rm.removeEventListener?.('change',apply)},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>transition==='none'&&setOrbState(event.detail.state);window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  const selfSections=useMemo<readonly AvatarSelfViewSection[]>(()=>[
    {id:'appearance',title:'Appearance',fields:[{id:'avatar-model',label:'Avatar',value:'Governed human embodiment',provenance:'Home runtime',visibility:'private'}]},
    {id:'identity',title:'Identity',fields:[{id:'identity-scope',label:'Profile scope',value:'User-approved fields only',provenance:'Privacy boundary',visibility:'user-approved-profile'}]},
    {id:'embodiment',title:'Embodiment',fields:[{id:'camera-mode',label:'View',value:'First-person Home',provenance:'Current Home state',visibility:'system-state'}]},
    {id:'journey',title:'Journey',fields:[{id:'journey-location',label:'Current realm',value:'Home',provenance:'Spatial runtime',visibility:'system-state'}]},
    {id:'accessibility',title:'Accessibility',fields:[{id:'reduced-motion',label:'Reduced motion',value:reducedMotion?'On':'Off',provenance:'Device preference',visibility:'private'}]},
    {id:'privacy',title:'Privacy',fields:[{id:'self-view-boundary',label:'Data boundary',value:'Explicit safe fields only',provenance:'UrAi privacy contract',visibility:'private'}]},
  ],[reducedMotion])
  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady; const phase=homeState.transition??(transition==='ground'?'GROUND_DESCENT':transition==='life-map'?'SKY_ASCENT':homeState.stableState); const avatarVisible=homeState.stableState==='HOME_PRESENTATION'&&homeState.transition!=='AVATAR_EMBODIMENT_TRANSITION'
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="cinematic-lived-world-threshold" data-home-world-character="production-cinematic-real-place-sacred-tech" data-home-physical-base="continuous-lived-physical-world" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self={firstPerson?'camera-only-first-person-home':'visible-cinematic-avatar'} data-home-presence-presentation={avatarVisible?'visible-avatar-third-person':firstPerson?'hidden-exterior-avatar-first-person':'transitioning'} data-home-movement={firstPerson?'walk-look-interact':'camera-look-world-surface-selection'} data-home-pointer-lock="false" data-home-assets-ready={ready?'true':'false'} data-home-ready={ready?'true':'warming'} data-home-input-ready={ready&&!homeState.inputLocked?'true':'false'} data-home-interaction-ready={ready&&!homeState.inputLocked?'true':'false'} data-home-distance-ground="world-surface" data-home-distance-life-map="sky-threshold" data-home-ground-entry="physical-world-surface" data-home-life-map-entry="visible-sky-broad-interaction" data-home-camera-mode={homeState.transition??(firstPerson?'avatar-home-first-person':transition!=='none'?transition:dragging?'cinematic-third-person-look':'cinematic-third-person')} data-home-stable-state={homeState.stableState} data-home-scene-phase={phase} data-home-transition-sequence={homeState.transition??(transition==='none'?'idle':`${transition}:traversal`)} data-home-portal-sequence="idle" data-home-input-locked={homeState.inputLocked||transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-home-orb-runtime-asset={ORB_MODEL} data-home-avatar-runtime-asset={HOME_AVATAR_MODEL} data-home-non-xr-body-policy="camera-only-no-hands-body-rig" data-home-visual-grade="current-literal-pixel-candidate-not-certified" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="visible-avatar-authored-living-memory-orb-physical-world-and-broad-sky-threshold" data-home-authored-regions="home-physical-world urai-home-user-avatar home-living-memory-orb home-life-map-sky-threshold" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#10272a'}} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[0,1.92,7.85],fov:52,near:.1,far:125}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.55;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x10272a,1);setCanvasReady(true)}}>
      <Scene yaw={yaw} pitch={pitch} transition={transition} transitionTarget={transitionTarget} reducedMotion={reducedMotion} orbState={orbState} homeStableState={homeState.stableState} homeTransition={homeState.transition} homeOrigin={homeState.origin} cameraSnapshot={cameraSnapshot} movementInput={movementInput} firstPersonVelocity={firstPersonVelocity} firstPersonTarget={firstPersonTarget} onAvatar={activateAvatar} onEmbodimentComplete={homeApi.completeEmbodiment} onHomeRestoreComplete={homeApi.completeRestore} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} onComplete={completeTransition}/>
    </Canvas>
    {firstPerson?<><MovementHelp realm="Home" summary="Move through your Home in first person without a synthetic body overlay." controls="WASD or arrow keys move · drag to look · Escape returns one semantic layer."/><MobileMovementPad input={movementInput} label="Move through Home"/><button type="button" aria-label="Open Avatar Self View" data-movement-ui="true" onClick={homeApi.openSelfView} style={{position:'absolute',right:'max(16px, env(safe-area-inset-right))',bottom:'max(16px, env(safe-area-inset-bottom))',zIndex:35,minWidth:48,minHeight:48,padding:'0 16px',borderRadius:999,border:'1px solid rgba(235,244,239,.26)',background:'rgba(7,18,20,.56)',color:'#f4faf7',backdropFilter:'blur(12px)',font:'600 12px/1 system-ui',cursor:'pointer'}}>Self</button></>:null}
    <AvatarSelfView open={homeState.selfViewOpen} onClose={homeApi.closeSelfView} sections={selfSections}/>
  </main>
}

useGLTF.preload(ORB_MODEL)
