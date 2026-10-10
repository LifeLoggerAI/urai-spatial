"use client"

import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, PerspectiveCamera, useAnimations, useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import * as THREE from 'three'
import { COUNCIL_AGENTS } from './councilAgentSchema'
import CouncilConversationPanel from './CouncilConversationPanel'
import { playCouncilBodyIdle, playCouncilListening } from './CouncilAnimationLayers'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const HUMAN_ROOT = '/assets/urai/generated/human-makehuman-v4'
const HUMAN_MODELS = [
  `${HUMAN_ROOT}/council-guide-human-makehuman-v4.glb`,
  `${HUMAN_ROOT}/council-archivist-human-makehuman-v4.glb`,
  `${HUMAN_ROOT}/council-guardian-human-makehuman-v4.glb`,
  `${HUMAN_ROOT}/council-builder-human-makehuman-v4.glb`,
  `${HUMAN_ROOT}/council-mirror-human-makehuman-v4.glb`,
  `${HUMAN_ROOT}/council-trickster-human-makehuman-v4.glb`,
] as const

const POSITIONS: [number, number, number][] = [
  [-2.55, 0, -0.65],
  [-1.45, 0, -2.5],
  [1.45, 0, -2.5],
  [2.55, 0, -0.65],
  [1.35, 0, 0.15],
  [-1.35, 0, 0.15],
]

const ROTATIONS: [number, number, number][] = [
  [0, 0.72, 0],
  [0, 0.34, 0],
  [0, -0.34, 0],
  [0, -0.72, 0],
  [0, -2.65, 0],
  [0, 2.65, 0],
]

const COUNCIL_BOUNDS = { minX: -5.2, maxX: 5.2, minZ: -4.6, maxZ: 6.2 }
const COUNCIL_OBSTACLES = [
  { x: 0, z: -0.9, radius: 1.75 },
  ...POSITIONS.map(([x, , z]) => ({ x, z, radius: 0.42 })),
]

function CouncilCamera({
  input,
  yaw,
  pitch,
  reducedMotion,
  ownerRef,
}: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  ownerRef: MutableRefObject<HTMLDivElement | null>
}) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(0, 0, 5.4))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const direction = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.55 : 2.15,
      acceleration: 8.4,
      deceleration: 10.2,
      bounds: COUNCIL_BOUNDS,
      obstacles: COUNCIL_OBSTACLES,
      arrivalRadius: 0.3,
    })

    camera.position.set(position.current.x, 1.66, position.current.z)
    direction.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(direction.current.add(camera.position))

    if (ownerRef.current) {
      ownerRef.current.dataset.councilCameraX = camera.position.x.toFixed(3)
      ownerRef.current.dataset.councilCameraZ = camera.position.z.toFixed(3)
      ownerRef.current.dataset.councilMoving = motion.moving ? 'true' : 'false'
      ownerRef.current.dataset.councilEmbodiedReady = 'true'
    }
  })

  return null
}

function RiggedCouncilHuman({
  modelUrl,
  index,
  selected,
  reducedMotion,
  onSelect,
  ownerRef,
}: {
  modelUrl: string
  index: number
  selected: boolean
  reducedMotion: boolean
  onSelect: () => void
  ownerRef: MutableRefObject<HTMLDivElement | null>
}) {
  const model = useGLTF(modelUrl)
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(model.animations, root)

  useEffect(() => {
    return playCouncilBodyIdle(actions, reducedMotion)
  }, [actions, reducedMotion])

  useEffect(() => {
    return playCouncilListening(actions, selected, reducedMotion)
  }, [actions, reducedMotion, selected])

  useEffect(() => {
    model.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
  }, [model.scene])

  useEffect(() => {
    // The adopted idle owns hips/chest and listening owns the head. Rest the
    // unanimated arms without replacing those existing animation layers.
    const joints = [['L_shoulder', .48], ['R_shoulder', -.48], ['L_elbow', .12], ['R_elbow', -.12]] as const
    const poses = joints.flatMap(([name, angle]) => {
      const joint = model.scene.getObjectByName(name)
      if (!joint) return []
      const before = joint.quaternion.clone()
      joint.rotateZ(angle)
      return [{ joint, before }]
    })
    return () => { poses.forEach(({ joint, before }) => joint.quaternion.copy(before)) }
  }, [model.scene])

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = ROTATIONS[index]?.[1] ?? 0
    root.current.position.y = reducedMotion ? 0 : Math.sin((clock.elapsedTime + index * 0.77) * 0.8) * 0.004
    if (ownerRef.current) {
      const body = model.scene.getObjectByName('hips')
      const head = model.scene.getObjectByName('head')
      ownerRef.current.dataset[`councilIdleActive${index}`] = actions.idle_breath?.isRunning() ? 'true' : 'false'
      ownerRef.current.dataset[`councilListeningActive${index}`] = actions.listen_acknowledge?.isRunning() ? 'true' : 'false'
      if (body) ownerRef.current.dataset[`councilBodyY${index}`] = body.position.y.toFixed(8)
      if (head) ownerRef.current.dataset[`councilHeadX${index}`] = head.quaternion.x.toFixed(8)
    }
  })

  return (
    <group
      ref={root}
      position={POSITIONS[index] ?? [0, 0, -2]}
      rotation={ROTATIONS[index] ?? [0, 0, 0]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      userData={{ representation: 'skinned-animated-human-v4-preview', modelUrl, lighting: 'physical-scene' }}
    >
      <primitive object={model.scene} />
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.34, 64]} />
        <meshBasicMaterial color={selected ? '#e9d6b7' : '#b8c7cf'} transparent opacity={selected ? 0.28 : 0.05} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CouncilChamber() {
  return <group name="council-inhabitable-chamber">
    <mesh position={[0, 2.3, -5.4]} receiveShadow><boxGeometry args={[12, 4.8, .3]} /><meshStandardMaterial color="#374344" roughness={.94} /></mesh>
    {[-5.7, 5.7].map((x) => <mesh key={x} position={[x, 2.3, .2]} receiveShadow><boxGeometry args={[.3, 4.8, 11.4]} /><meshStandardMaterial color="#293638" roughness={.9} /></mesh>)}
    {[-4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8].map((x) => <group key={x} position={[x, 0, -5.16]}>
      <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[.09, 4.5, .12]} /><meshStandardMaterial color="#957956" roughness={.5} metalness={.18} /></mesh>
      <mesh position={[.22, 2.1, -.02]}><boxGeometry args={[.035, 2.9, .08]} /><meshBasicMaterial color="#e5cba2" toneMapped={false} /></mesh>
    </group>)}
    <mesh position={[0, .05, -.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[4.75, 96]} /><meshStandardMaterial color="#454c46" roughness={.98} /></mesh>
    <mesh position={[0, .3, -1.15]} castShadow><cylinderGeometry args={[.46, .58, .6, 48]} /><meshStandardMaterial color="#302a24" roughness={.78} /></mesh>
    <mesh position={[0, .756, -1.15]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.12, 1.15, 96]} /><meshStandardMaterial color="#b69b70" metalness={.5} roughness={.45} /></mesh>
  </group>
}

function CouncilFallback({ reason = 'WebGL is unavailable on this device.' }: { reason?: string }) {
  const travel = (destination: 'home' | 'mirror' | 'passport', href: string) => requestUraiWorldTravel({
    destination,
    href,
    entryPortal: `council-${destination}`,
    cameraCheckpoint: `${destination}-arrival`,
  })

  return (
    <section
      data-testid="urai-council-semantic-fallback"
      data-council-renderer="unavailable"
      className="grid min-h-screen place-content-center gap-4 bg-[#10151a] p-6 text-center text-white"
      aria-label="Council accessible fallback"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">URAI Council</p>
      <h1 className="text-4xl font-medium">Council remains reachable.</h1>
      <p role="status" className="mx-auto max-w-[52ch] text-sm leading-6 text-white/75">{reason} The spatial chamber is not being represented as active; semantic navigation remains available.</p>
      <nav className="mx-auto flex flex-wrap justify-center gap-2" aria-label="Council fallback destinations">
        <button className="min-h-12 rounded-full bg-white px-5 text-sm font-semibold text-slate-950" type="button" onClick={() => travel('home', '/home?returnFrom=council')}>Return Home</button>
        <button className="min-h-12 rounded-full border border-white/25 px-5 text-sm" type="button" onClick={() => travel('mirror', '/mirror?from=council')}>Mirror</button>
        <button className="min-h-12 rounded-full border border-white/25 px-5 text-sm" type="button" onClick={() => travel('passport', '/passport?from=council')}>Passport</button>
        <AdamLauncherSlot name="council-fallback" />
      </nav>
    </section>
  )
}

function useCouncilWebGLCapability() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setAvailable(Boolean(context))
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      setAvailable(false)
    }
  }, [])
  return available
}

class CouncilRenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <CouncilFallback reason="The spatial renderer could not start." /> : this.props.children }
}

function CouncilStage() {
  const [selected, setSelected] = useState(0)
  const [dragging, setDragging] = useState(false)
  const selectedAgent = COUNCIL_AGENTS[selected] ?? COUNCIL_AGENTS[0]
  const reducedMotion = useReducedMotion()
  const quality = useAdaptiveSpatialQuality()
  const shadowMapSize = quality.tier === 'high' ? 2048 : 1024
  const environmentIntensity = quality.tier === 'high' ? 0.55 : quality.tier === 'medium' ? 0.42 : 0.28
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.025)
  const input = useMovementInput({ onEscape: () => requestUraiWorldReturn() })
  const dragLook = useDragLook({
    yaw,
    pitch,
    sensitivity: reducedMotion ? 0.0022 : 0.0036,
    onDragState: setDragging,
  })

  const travel = (destination: 'home' | 'mirror' | 'passport', href: string) => {
    requestUraiWorldTravel({
      destination,
      href,
      entryPortal: `council-${destination}`,
      cameraCheckpoint: `${destination}-arrival`,
    })
  }

  return (
    <div
      ref={shellRef}
      className="urai-spatial-realm-experience relative min-h-screen overflow-hidden bg-[#10151a] text-white"
      data-spatial-realm="council"
      data-council-human-authority="human-makehuman-v4-preview"
      data-council-lighting-authority="physical-pbr-v1"
      data-council-embodied="true"
      data-spatial-quality-tier={quality.tier}
      data-camera-mode={dragging ? 'look' : 'embodied'}
      {...dragLook}
    >
      <div className="absolute inset-0">
        <Canvas
          shadows={quality.shadows}
          dpr={[1, quality.pixelRatioMax]}
          frameloop={quality.documentVisible ? 'always' : 'never'}
          gl={{ antialias: quality.antialias, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={['#253337']} />
            <fog attach="fog" args={['#253337', 12, 30]} />
            <PerspectiveCamera makeDefault position={[0, 1.66, 5.4]} fov={42} />
            <CouncilCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} ownerRef={shellRef} />

            <ambientLight intensity={0.48} color="#dfe8ea" />
            <hemisphereLight intensity={0.85} color="#dcecf0" groundColor="#50483e" />
            <directionalLight
              position={[-4.5, 7.5, 4.5]}
              intensity={1.9}
              color="#fff5e6"
              castShadow={quality.shadows}
              shadow-mapSize-width={shadowMapSize}
              shadow-mapSize-height={shadowMapSize}
              shadow-bias={-0.0002}
            />
            <directionalLight position={[4.2, 4.8, -3.8]} intensity={0.9} color="#b8d9f2" />
            <pointLight position={[0, 2.3, -2.4]} intensity={18} distance={8} decay={2} color="#e2b984" />
            <CouncilChamber />

            <mesh position={[0, -0.04, -0.6]} receiveShadow>
              <cylinderGeometry args={[5.6, 5.9, 0.12, 96]} />
              <meshStandardMaterial color="#2a2926" roughness={0.82} metalness={0.08} />
            </mesh>
            <mesh position={[0, 0.68, -1.15]} castShadow receiveShadow>
              <cylinderGeometry args={[1.35, 1.45, 0.12, 96]} />
              <meshStandardMaterial color="#443a31" roughness={0.6} metalness={0.12} />
            </mesh>

            {COUNCIL_AGENTS.map((agent, index) => (
              <RiggedCouncilHuman
                key={agent.id}
                modelUrl={HUMAN_MODELS[index] ?? HUMAN_MODELS[0]}
                index={index}
                selected={selected === index}
                reducedMotion={reducedMotion}
                onSelect={() => setSelected(index)}
                ownerRef={shellRef}
              />
            ))}

            {quality.tier === 'low' ? null : <ContactShadows position={[0, 0.01, -0.8]} opacity={0.48} scale={10} blur={2.7} far={7} />}
            <Environment resolution={128} environmentIntensity={environmentIntensity}>
              <Lightformer position={[-4, 5, 2]} rotation={[0, Math.PI / 4, 0]} scale={[4, 5, 1]} color="#ffe4bd" intensity={2} />
              <Lightformer position={[4, 3, -3]} rotation={[0, -Math.PI / 4, 0]} scale={[3, 4, 1]} color="#b8d9f2" intensity={1} />
            </Environment>
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute left-4 top-4 z-30"><AdamLauncherSlot name="council-world" /></div>
      <section className="council-conversation pointer-events-none absolute bottom-5 left-5 z-10 w-[min(430px,calc(100vw-40px))] rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">URAI Council</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{selectedAgent.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#e8d8b9]/80">{selectedAgent.role}</p>
        <p className="mt-3 max-w-[38ch] text-sm leading-6 text-white/72">{selectedAgent.focus}</p>
        <CouncilConversationPanel agent={selectedAgent} />
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950" type="button" onClick={() => travel('home', '/home?returnFrom=council')}>Return Home</button>
          <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" type="button" onClick={() => travel('mirror', '/mirror?from=council')}>Mirror</button>
          <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" type="button" onClick={() => travel('passport', '/passport?from=council')}>Passport</button>
        </div>
      </section>

      <MovementHelp realm="Council" summary="Walk around the chamber and choose a Council presence." controls="WASD or arrows move. Drag to look. Tap a Council person to select them. Escape returns. Mobile movement controls appear on touch devices." />
      <MobileMovementPad input={input} label="Move through Council" />
      <style jsx global>{`
        html.urai-v5-assets-ready [data-council-embodied="true"]{background-image:none}
        html.urai-v5-assets-ready [data-council-embodied="true"]::after{display:none}
        [data-council-embodied="true"] .urai-mobile-movement { left: auto; right: max(12px,env(safe-area-inset-right)); bottom: max(12px,env(safe-area-inset-bottom)); }
        @media(max-width:900px),(pointer:coarse) {
          [data-council-embodied="true"] .council-conversation { bottom: calc(130px + env(safe-area-inset-bottom)); max-height: calc(100svh - 210px); overflow-y: auto; pointer-events: auto; }
        }
        @media(max-width:700px) {
          [data-council-embodied="true"] .council-conversation { width: calc(100vw - 120px); }
        }
      `}</style>
    </div>
  )
}

export function CouncilRealm() {
  const webglAvailable = useCouncilWebGLCapability()
  if (webglAvailable === null) return <CouncilFallback reason="Checking spatial renderer capability." />
  if (!webglAvailable) return <CouncilFallback />
  return <CouncilRenderBoundary><CouncilStage /></CouncilRenderBoundary>
}

for (const model of HUMAN_MODELS) useGLTF.preload(model)
