"use client"

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerspectiveCamera, useAnimations, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { DEMO_COUNCIL_AGENTS } from './councilAgentSchema'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSpatialQualityTier } from '@/spatial/performance/useSpatialQualityTier'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const HUMAN_ROOT = '/assets/urai/generated/human-rig-v3'
const HUMAN_MODELS = [
  `${HUMAN_ROOT}/council-guide-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-archivist-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-guardian-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-builder-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-mirror-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-trickster-human-rigged-v3.glb`,
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
}: {
  modelUrl: string
  index: number
  selected: boolean
  reducedMotion: boolean
  onSelect: () => void
}) {
  const model = useGLTF(modelUrl)
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(model.animations, root)

  useEffect(() => {
    if (reducedMotion) return
    const clip = selected ? (actions.listen_acknowledge ?? actions.idle_breath) : actions.idle_breath
    clip?.reset().fadeIn(0.25).play()
    return () => {
      clip?.fadeOut(0.2)
    }
  }, [actions, reducedMotion, selected])

  useEffect(() => {
    model.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
  }, [model.scene])

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = ROTATIONS[index]?.[1] ?? 0
    root.current.position.y = reducedMotion ? 0 : Math.sin((clock.elapsedTime + index * 0.77) * 0.8) * 0.004
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
      userData={{ representation: 'skinned-animated-human-v3', modelUrl, lighting: 'physical-scene' }}
    >
      <primitive object={model.scene} />
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.34, 64]} />
        <meshBasicMaterial color={selected ? '#e9d6b7' : '#b8c7cf'} transparent opacity={selected ? 0.28 : 0.05} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CouncilStage() {
  const [selected, setSelected] = useState(0)
  const [dragging, setDragging] = useState(false)
  const selectedAgent = DEMO_COUNCIL_AGENTS[selected] ?? DEMO_COUNCIL_AGENTS[0]
  const reducedMotion = useReducedMotion()
  const quality = useSpatialQualityTier()
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
      className="relative min-h-screen overflow-hidden bg-[#10151a] text-white"
      data-council-human-authority="human-rig-v3"
      data-council-lighting-authority="physical-pbr-v1"
      data-council-embodied="true"
      data-spatial-quality-tier={quality.tier}
      data-camera-mode={dragging ? 'look' : 'embodied'}
      {...dragLook}
    >
      <div className="absolute inset-0">
        <Canvas
          shadows={quality.realtimeShadows}
          dpr={quality.dpr}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={['#151b20']} />
            <fog attach="fog" args={['#20272a', 9, 25]} />
            <PerspectiveCamera makeDefault position={[0, 1.66, 5.4]} fov={42} />
            <CouncilCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} ownerRef={shellRef} />

            <ambientLight intensity={0.32} color="#dfe8ea" />
            <hemisphereLight intensity={0.68} color="#dcecf0" groundColor="#50483e" />
            <directionalLight
              position={[-4.5, 7.5, 4.5]}
              intensity={2.8}
              color="#fff5e6"
              castShadow={quality.realtimeShadows}
              shadow-mapSize-width={quality.shadowMapSize}
              shadow-mapSize-height={quality.shadowMapSize}
              shadow-bias={-0.0002}
            />
            <directionalLight position={[4.2, 4.8, -3.8]} intensity={0.9} color="#b8d9f2" />
            <pointLight position={[0, 2.3, -2.4]} intensity={18} distance={8} decay={2} color="#e2b984" />

            <mesh position={[0, -0.04, -0.6]} receiveShadow>
              <cylinderGeometry args={[5.6, 5.9, 0.12, 96]} />
              <meshStandardMaterial color="#2a2926" roughness={0.82} metalness={0.08} />
            </mesh>
            <mesh position={[0, 0.68, -1.15]} castShadow receiveShadow>
              <cylinderGeometry args={[1.35, 1.45, 0.12, 96]} />
              <meshStandardMaterial color="#443a31" roughness={0.6} metalness={0.12} />
            </mesh>

            {DEMO_COUNCIL_AGENTS.map((agent, index) => (
              <RiggedCouncilHuman
                key={agent.id}
                modelUrl={HUMAN_MODELS[index] ?? HUMAN_MODELS[0]}
                index={index}
                selected={selected === index}
                reducedMotion={reducedMotion}
                onSelect={() => setSelected(index)}
              />
            ))}

            {quality.contactShadows ? <ContactShadows position={[0, 0.01, -0.8]} opacity={0.48} scale={10} blur={2.7} far={7} /> : null}
            <Environment preset="apartment" environmentIntensity={quality.environmentIntensity} />
          </Suspense>
        </Canvas>
      </div>

      <section className="pointer-events-none absolute bottom-5 left-5 z-10 w-[min(430px,calc(100vw-40px))] rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">URAI Council</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{selectedAgent.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#e8d8b9]/80">{selectedAgent.role}</p>
        <p className="mt-3 max-w-[38ch] text-sm leading-6 text-white/72">{selectedAgent.focus}</p>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950" type="button" onClick={() => travel('home', '/home?returnFrom=council')}>Return Home</button>
          <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" type="button" onClick={() => travel('mirror', '/mirror?from=council')}>Mirror</button>
          <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" type="button" onClick={() => travel('passport', '/passport?from=council')}>Passport</button>
        </div>
      </section>

      <MovementHelp realm="Council" summary="Walk around the chamber and choose a Council presence." controls="WASD or arrows move. Drag to look. Tap a Council person to select them. Escape returns. Mobile movement controls appear on touch devices." />
      <MobileMovementPad input={input} label="Move through Council" />
    </div>
  )
}

export function CouncilRealm() {
  return <CouncilStage />
}

for (const model of HUMAN_MODELS) useGLTF.preload(model)
