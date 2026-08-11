"use client"

import Link from "next/link"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, Environment, PerspectiveCamera, useAnimations, useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { DEMO_COUNCIL_AGENTS } from "./councilAgentSchema"

const WORLD_MODEL_ROOT = "/assets/urai/generated/real-world-v1"
const HUMAN_MODEL_ROOT = "/assets/urai/generated/smooth-skinned-humans-v1"
const COUNCIL_CHAMBER_MODEL = `${WORLD_MODEL_ROOT}/council-chamber-real-v1.glb`
const HUMAN_MODELS = [
  `${HUMAN_MODEL_ROOT}/council-guide-human-smooth-v1.glb`,
  `${HUMAN_MODEL_ROOT}/council-archivist-human-smooth-v1.glb`,
  `${HUMAN_MODEL_ROOT}/council-guardian-human-smooth-v1.glb`,
] as const

const POSITIONS: [number, number, number][] = [
  [-2.8, 0, -1.0],
  [0, 0, -3.25],
  [2.8, 0, -1.0],
]

const ROTATIONS: [number, number, number][] = [
  [0, 0.72, 0],
  [0, 0, 0],
  [0, -0.72, 0],
]

function prepareModel(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    object.frustumCulled = true
  })
  return clone
}

function ChamberModel() {
  const model = useGLTF(COUNCIL_CHAMBER_MODEL)
  const scene = useMemo(() => prepareModel(model.scene), [model.scene])
  return <primitive object={scene} name="council-forged-human-scale-chamber" />
}

function CouncilHumanModel({
  modelUrl,
  position,
  rotation,
  selected,
  onSelect,
}: {
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  selected: boolean
  onSelect: () => void
}) {
  const model = useGLTF(modelUrl)
  const scene = useMemo(() => prepareModel(model.scene), [model.scene])
  const { actions } = useAnimations(model.animations, scene)
  const ring = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const clipName = selected ? "Listen" : "Idle"
    const action = actions[clipName]
    if (!action) return

    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.22).play()
    return () => {
      action.fadeOut(0.18)
    }
  }, [actions, selected])

  useEffect(() => {
    if (!ring.current) return
    const material = ring.current.material as THREE.MeshBasicMaterial
    material.opacity = selected ? 0.2 : 0.035
  }, [selected])

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      userData={{
        representation: "smooth-skinned-human-glb",
        modelUrl,
        humanFirst: true,
        animationAuthority: "urai-smooth-skinned-humans-v1",
        skinning: "glTF JOINTS_0 + WEIGHTS_0",
        activeBehavior: selected ? "Listen" : "Idle",
        finalFaceMaterialGate: "pending",
      }}
    >
      <primitive object={scene} />
      <mesh ref={ring} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.33, 56]} />
        <meshBasicMaterial
          color="#b8c7cf"
          transparent
          opacity={0.035}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function CouncilWorld() {
  const [selected, setSelected] = useState(0)
  const selectedAgent = DEMO_COUNCIL_AGENTS[selected] ?? DEMO_COUNCIL_AGENTS[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#879398] text-white">
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          data-council-model-authority="urai-smooth-skinned-humans-v1"
        >
          <Suspense fallback={null}>
            <color attach="background" args={["#8c989c"]} />
            <fog attach="fog" args={["#919a99", 13, 31]} />
            <PerspectiveCamera makeDefault position={[0, 1.66, 7.25]} fov={42} />
            <ambientLight intensity={0.48} color="#e6ece9" />
            <hemisphereLight intensity={0.72} color="#dcecf0" groundColor="#6c675e" />
            <directionalLight
              position={[-4.5, 8, 4]}
              intensity={2.6}
              color="#f4f5ef"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <directionalLight position={[4, 4.5, -3]} intensity={0.75} color="#ffd9b0" />

            <ChamberModel />

            {DEMO_COUNCIL_AGENTS.map((agent, index) => (
              <CouncilHumanModel
                key={agent.id}
                modelUrl={HUMAN_MODELS[index] ?? HUMAN_MODELS[0]}
                position={POSITIONS[index] ?? [0, 0, -2]}
                rotation={ROTATIONS[index] ?? [0, 0, 0]}
                selected={selected === index}
                onSelect={() => setSelected(index)}
              />
            ))}

            <ContactShadows position={[0, 0.012, -0.6]} opacity={0.42} scale={12} blur={2.8} far={7} />
            <Environment preset="apartment" environmentIntensity={0.3} />
          </Suspense>
        </Canvas>
      </div>

      <section className="pointer-events-none absolute bottom-5 left-5 z-10 w-[min(430px,calc(100vw-40px))] rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">URAI Council · Human World</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{selectedAgent.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#e8d8b9]/80">{selectedAgent.role}</p>
        <p className="mt-3 max-w-[38ch] text-sm leading-6 text-white/72">{selectedAgent.focus}</p>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950" href="/">
            Return Home
          </Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" href="/passport">
            Passport
          </Link>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden rounded-full bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/55 backdrop-blur md:block">
        Select a person
      </div>
    </div>
  )
}

export function CouncilRealm() {
  return <CouncilWorld />
}

useGLTF.preload(COUNCIL_CHAMBER_MODEL)
for (const model of HUMAN_MODELS) useGLTF.preload(model)
