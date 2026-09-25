'use client'

import Link from 'next/link'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { demoShadowRealmEvent } from '@/lib/spatial/publicSafeSpatialData'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const CAMERA_HEIGHT = 1.68
const SHADOW_BOUNDS = { minX: -5.4, maxX: 5.4, minZ: -7.4, maxZ: 6.4 }
const SHADOW_OBSTACLES = [
  { x: -2.7, z: -2.6, radius: 0.72 },
  { x: 2.65, z: -3.7, radius: 0.82 },
  { x: 0.25, z: 1.1, radius: 0.62 },
]
type ShadowReviewState = 'entry' | 'exploration' | 'uncertainty' | 'pattern' | 'high-load' | 'recovery' | 'reduced-stimulation'
const SHADOW_REVIEW_STATES = new Set<ShadowReviewState>(['entry','exploration','uncertainty','pattern','high-load','recovery','reduced-stimulation'])
const SHADOW_REVIEW_POSITIONS: Record<ShadowReviewState, [number, number, number]> = {
  entry: [0, 0, 5.4],
  exploration: [-1.7, 0, 2.8],
  uncertainty: [1.7, 0, 0.8],
  pattern: [-2.0, 0, -1.6],
  'high-load': [0, 0, 3.7],
  recovery: [0.6, 0, 4.6],
  'reduced-stimulation': [0, 0, 4.2],
}

function detectShadowWebGL() {
  if (typeof document === 'undefined') return true
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
}

function ShadowCamera({
  input,
  yaw,
  pitch,
  reducedMotion,
  reviewState,
  shellRef,
}: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  reviewState: ShadowReviewState
  shellRef: MutableRefObject<HTMLElement | null>
}) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(...SHADOW_REVIEW_POSITIONS[reviewState]))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const direction = useRef(new THREE.Vector3())

  useEffect(() => {
    position.current.set(...SHADOW_REVIEW_POSITIONS[reviewState])
    velocity.current.set(0, 0, 0)
    target.current = null
    yaw.current = reviewState === 'pattern' ? 0.3 : reviewState === 'uncertainty' ? -0.24 : 0
    pitch.current = -0.035
  }, [pitch, reviewState, yaw])

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.28 : 1.82,
      acceleration: 7.4,
      deceleration: 10.4,
      bounds: SHADOW_BOUNDS,
      obstacles: SHADOW_OBSTACLES,
      arrivalRadius: 0.32,
    })
    camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
    direction.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(direction.current.add(camera.position))
    if (shellRef.current) {
      shellRef.current.dataset.shadowCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.shadowCameraZ = camera.position.z.toFixed(3)
      shellRef.current.dataset.shadowMoving = motion.moving ? 'true' : 'false'
      shellRef.current.dataset.shadowEmbodiedReady = 'true'
    }
  })
  return null
}

function OrientationBeacon({ reducedMotion }: { reducedMotion: boolean }) {
  const light = useRef<THREE.PointLight | null>(null)
  useFrame(({ clock }) => {
    if (!light.current || reducedMotion) return
    light.current.intensity = 2.7 + Math.sin(clock.elapsedTime * 0.52) * 0.13
  })
  return <group position={[0, 0, 5.75]} name="shadow-stable-return-landmark">
    <mesh position={[0, 1.15, 0]} castShadow>
      <cylinderGeometry args={[0.11, 0.17, 2.3, 24]} />
      <meshStandardMaterial color="#675f57" roughness={0.9} metalness={0.03} />
    </mesh>
    <mesh position={[0, 2.38, 0]}>
      <sphereGeometry args={[0.16, 24, 18]} />
      <meshStandardMaterial color="#f0d7ad" emissive="#aa8058" emissiveIntensity={0.38} roughness={0.58} />
    </mesh>
    <pointLight ref={light} position={[0, 2.38, 0]} color="#f0cda2" intensity={2.7} distance={6.8} decay={2} />
  </group>
}

function ShadowScene({
  input,
  yaw,
  pitch,
  reducedMotion,
  reviewState,
  shellRef,
}: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  reviewState: ShadowReviewState
  shellRef: MutableRefObject<HTMLElement | null>
}) {
  const quality = useAdaptiveSpatialQuality()
  const reducedStimulation = reducedMotion || reviewState === 'reduced-stimulation' || reviewState === 'high-load'
  const fogNear = reducedStimulation ? 8.5 : reviewState === 'uncertainty' ? 6.8 : 8
  const fogFar = reducedStimulation ? 19 : reviewState === 'uncertainty' ? 16 : 22

  return <>
    <color attach="background" args={['#080b10']} />
    <fog attach="fog" args={['#121821', fogNear, fogFar]} />
    <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, 5.4]} fov={44} />
    <ambientLight intensity={reducedStimulation ? 0.27 : 0.34} color="#a9b4c2" />
    <hemisphereLight intensity={reducedStimulation ? 0.32 : 0.44} color="#aab8c9" groundColor="#25272a" />
    <directionalLight position={[-3, 7, 3]} intensity={reducedStimulation ? 0.58 : 0.82} color="#c7d1de" castShadow={quality.shadows && !reducedStimulation} />
    <pointLight position={[-3.7, 1.7, -4.8]} color="#c6a87d" intensity={1.9} distance={6} decay={2} />
    <pointLight position={[3.8, 1.6, -5.7]} color="#8ea6ba" intensity={1.45} distance={5.5} decay={2} />
    <ShadowCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} reviewState={reviewState} shellRef={shellRef} />

    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="shadow-ground">
      <planeGeometry args={[12, 15]} />
      <meshStandardMaterial color="#171a1d" roughness={0.98} metalness={0} />
    </mesh>

    <mesh position={[0, 0.14, -7.25]} receiveShadow castShadow>
      <boxGeometry args={[11.7, 0.28, 0.36]} />
      <meshStandardMaterial color="#2b2d30" roughness={0.96} />
    </mesh>

    {[
      [-4.5, 1.15, -4.7, 0.78, 2.3, 0.72],
      [4.4, 1.35, -5.5, 0.94, 2.7, 0.8],
      [-3.85, 0.8, 0.2, 0.62, 1.6, 0.62],
      [3.9, 0.95, -0.6, 0.7, 1.9, 0.7],
    ].map(([x,y,z,sx,sy,sz], index) => <mesh key={index} position={[x,y,z]} castShadow receiveShadow>
      <boxGeometry args={[sx,sy,sz]} />
      <meshStandardMaterial color={index % 2 ? '#303236' : '#292c30'} roughness={0.94} />
    </mesh>)}

    {SHADOW_OBSTACLES.map((object, index) => <group key={index} position={[object.x, 0, object.z]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[object.radius * 0.64, object.radius * 0.82, 0.44, 18]} />
        <meshStandardMaterial color="#323337" roughness={0.97} />
      </mesh>
      <mesh position={[0, 0.49, 0]} castShadow>
        <dodecahedronGeometry args={[object.radius * 0.48, 0]} />
        <meshStandardMaterial color={index === 1 ? '#4a4844' : '#3a3c40'} roughness={0.93} />
      </mesh>
    </group>)}

    <OrientationBeacon reducedMotion={reducedMotion} />
    {quality.tier === 'low' || reducedStimulation ? null : <ContactShadows position={[0, 0.01, 0]} opacity={0.24} scale={12} blur={3.2} far={7} />}
  </>
}

function ShadowSemanticFallback() {
  return <main data-testid="urai-shadow-semantic-fallback" style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#080b10',color:'#f3f5f7',fontFamily:'Inter,ui-sans-serif,system-ui'}}>
    <section style={{width:'min(720px,100%)',padding:'clamp(28px,7vw,64px)',border:'1px solid rgba(210,220,232,.14)',borderRadius:28,background:'rgba(13,17,23,.9)'}}>
      <p style={{letterSpacing:'.18em',textTransform:'uppercase',fontSize:11,color:'#aeb9c7'}}>Shadow · safe access</p>
      <h1 style={{fontSize:'clamp(34px,7vw,64px)',lineHeight:1,letterSpacing:'-.045em'}}>Uncertainty without threat.</h1>
      <p>{demoShadowRealmEvent.summary}</p>
      <p>Three-dimensional rendering is unavailable here. The reflective context remains private, non-diagnostic, and fully escapable.</p>
      <nav style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}>
        <Link href="/life-map?from=shadow&overview=1">Return to Life Map</Link>
        <Link href="/home">Return Home</Link>
      </nav>
    </section>
  </main>
}

export function ShadowRealmPortal() {
  const reducedMotion = useReducedMotion()
  const quality = useAdaptiveSpatialQuality()
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)
  const [reviewState, setReviewState] = useState<ShadowReviewState>('entry')
  const shellRef = useRef<HTMLElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.035)
  const input = useMovementInput({ onEscape: () => requestUraiWorldReturn() })
  const dragLook = useDragLook({ yaw, pitch, enabled: true, sensitivity: reducedMotion ? 0.0022 : 0.0034 })

  useEffect(() => {
    setWebglAvailable(detectShadowWebGL())
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('shadowReview') as ShadowReviewState | null
    setReviewState(requested && SHADOW_REVIEW_STATES.has(requested) ? requested : 'entry')
  }, [])

  const returnToLifeMap = () => requestUraiWorldTravel({
    destination: 'life-map',
    href: '/life-map?from=shadow&overview=1',
    entryPortal: 'shadow-return-landmark',
    cameraCheckpoint: 'life-map:shadow-return',
  })

  if (webglAvailable === null) return <main data-testid="urai-shadow-webgl-probe" aria-label="Preparing Shadow" />
  if (!webglAvailable) return <ShadowSemanticFallback />

  return <main
    ref={shellRef}
    data-testid="urai-shadow-embodied-realm"
    data-shadow-authority="urai-ref-shadow-001"
    data-shadow-review-state={reviewState}
    data-shadow-truth="reflective-not-diagnostic"
    data-shadow-horror="false"
    data-shadow-return-landmark="stable"
    data-spatial-quality-tier={quality.tier}
    style={{position:'fixed',inset:0,overflow:'hidden',background:'#080b10',color:'#f3f5f7',fontFamily:'Inter,ui-sans-serif,system-ui'}}
    {...dragLook}
  >
    <div style={{position:'absolute',inset:0}}>
      <Canvas shadows={quality.shadows && reviewState !== 'reduced-stimulation'} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible?'always':'never'} gl={{antialias:quality.antialias,alpha:false,powerPreference:'high-performance'}}>
        <ShadowScene input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} reviewState={reviewState} shellRef={shellRef} />
      </Canvas>
    </div>

    <section style={{position:'absolute',left:'clamp(16px,4vw,48px)',bottom:'clamp(18px,4vw,44px)',zIndex:30,width:'min(490px,calc(100vw - 32px))',padding:'18px 20px 20px',border:'1px solid rgba(210,220,232,.14)',borderRadius:22,background:'rgba(8,11,16,.66)',boxShadow:'0 22px 70px rgba(0,0,0,.3)',backdropFilter:'blur(16px)'}}>
      <p style={{margin:0,color:'#b3becb',fontSize:10,fontWeight:800,letterSpacing:'.2em',textTransform:'uppercase'}}>Shadow · private reflective realm</p>
      <h1 style={{margin:'7px 0 0',fontSize:'clamp(30px,5vw,48px)',lineHeight:1,letterSpacing:'-.045em'}}>Uncertainty without threat.</h1>
      <p style={{margin:'10px 0 0',maxWidth:'46ch',color:'rgba(240,244,248,.74)',fontSize:14,lineHeight:1.55}}>{demoShadowRealmEvent.summary}</p>
      <p style={{margin:'9px 0 0',color:'rgba(224,230,237,.6)',fontSize:12,lineHeight:1.45}}>This space reflects source-backed uncertainty and patterns. It does not diagnose you, grade danger, or force a conclusion.</p>
      <div data-movement-ui="true" style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}>
        <button type="button" onClick={returnToLifeMap} style={{minHeight:48,padding:'0 15px',borderRadius:999,border:0,background:'#e8e1d7',color:'#16191d',fontWeight:800}}>Return to Life Map</button>
        <button type="button" onClick={() => requestUraiWorldReturn()} style={{minHeight:48,padding:'0 15px',borderRadius:999,border:'1px solid rgba(230,236,242,.18)',background:'rgba(20,24,30,.72)',color:'#f5f7f8',fontWeight:750}}>Unwind</button>
      </div>
    </section>

    <MovementHelp realm="Shadow" summary="Walk a bounded reflective space. A warm landmark keeps the exit visible." controls="WASD or arrow keys move. Drag to look. Escape unwinds. Mobile controls appear on touch devices." />
    <MobileMovementPad input={input} label="Move through Shadow" />
  </main>
}
