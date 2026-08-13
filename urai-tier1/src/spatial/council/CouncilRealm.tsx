"use client"

import Link from 'next/link'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, PerspectiveCamera, useAnimations, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DEMO_COUNCIL_AGENTS } from './councilAgentSchema'

const HUMAN_ROOT = '/assets/urai/generated/human-rig-v3'
const HUMAN_MODELS = [
  `${HUMAN_ROOT}/council-guide-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-archivist-human-rigged-v3.glb`,
  `${HUMAN_ROOT}/council-guardian-human-rigged-v3.glb`,
] as const

const POSITIONS: [number, number, number][] = [
  [-2.45, 0, -1.3],
  [0, 0, -2.65],
  [2.45, 0, -1.3],
]

const ROTATIONS: [number, number, number][] = [
  [0, 0.52, 0],
  [0, 0, 0],
  [0, -0.52, 0],
]

function RiggedCouncilHuman({ modelUrl, index, selected, onSelect }: { modelUrl: string; index: number; selected: boolean; onSelect: () => void }) {
  const model = useGLTF(modelUrl)
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(model.animations, root)

  useEffect(() => {
    const clip = selected ? (actions.listen_acknowledge ?? actions.idle_breath) : actions.idle_breath
    clip?.reset().fadeIn(0.25).play()
    return () => {
      clip?.fadeOut(0.2)
    }
  }, [actions, selected])

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
    const t = clock.elapsedTime + index * 0.77
    root.current.rotation.y = ROTATIONS[index]?.[1] ?? 0
    root.current.position.y = Math.sin(t * 0.8) * 0.004
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
  const selectedAgent = DEMO_COUNCIL_AGENTS[selected] ?? DEMO_COUNCIL_AGENTS[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#10151a] text-white" data-council-human-authority="human-rig-v3" data-council-lighting-authority="physical-pbr-v1">
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 1.6]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <Suspense fallback={null}>
            <color attach="background" args={['#151b20']} />
            <fog attach="fog" args={['#20272a', 9, 25]} />
            <PerspectiveCamera makeDefault position={[0, 1.7, 5.4]} fov={42} />

            <ambientLight intensity={0.32} color="#dfe8ea" />
            <hemisphereLight intensity={0.68} color="#dcecf0" groundColor="#50483e" />
            <directionalLight position={[-4.5, 7.5, 4.5]} intensity={2.8} color="#fff5e6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0002} />
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
              <RiggedCouncilHuman key={agent.id} modelUrl={HUMAN_MODELS[index] ?? HUMAN_MODELS[0]} index={index} selected={selected === index} onSelect={() => setSelected(index)} />
            ))}

            <ContactShadows position={[0, 0.01, -0.8]} opacity={0.48} scale={10} blur={2.7} far={7} />
            <Environment preset="apartment" environmentIntensity={0.55} />
          </Suspense>
        </Canvas>
      </div>

      <section className="pointer-events-none absolute bottom-5 left-5 z-10 w-[min(430px,calc(100vw-40px))] rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">URAI Council</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{selectedAgent.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#e8d8b9]/80">{selectedAgent.role}</p>
        <p className="mt-3 max-w-[38ch] text-sm leading-6 text-white/72">{selectedAgent.focus}</p>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950" href="/">Return Home</Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" href="/passport">Passport</Link>
        </div>
      </section>
    </div>
  )
}

export function CouncilRealm() {
  return <CouncilStage />
}

for (const model of HUMAN_MODELS) useGLTF.preload(model)
