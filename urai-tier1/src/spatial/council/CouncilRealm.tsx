"use client"

import Link from "next/link"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, Environment, PerspectiveCamera } from "@react-three/drei"
import { Suspense, useRef, useState } from "react"
import * as THREE from "three"
import { DEMO_COUNCIL_AGENTS } from "./councilAgentSchema"

type HumanStyle = {
  skin: string
  hair: string
  shirt: string
  trousers: string
  accent: string
}

const HUMAN_STYLES: HumanStyle[] = [
  { skin: "#c58a6d", hair: "#251914", shirt: "#54616b", trousers: "#292e33", accent: "#d2b87d" },
  { skin: "#8d5e48", hair: "#171312", shirt: "#61696d", trousers: "#2a2e31", accent: "#cbd5db" },
  { skin: "#6f4937", hair: "#24211f", shirt: "#2d4053", trousers: "#22282e", accent: "#7da4c7" },
  { skin: "#d0a081", hair: "#4a4038", shirt: "#655e56", trousers: "#37332f", accent: "#caa26d" },
  { skin: "#b67457", hair: "#39251c", shirt: "#69594d", trousers: "#322e2b", accent: "#d18a57" },
  { skin: "#9d6950", hair: "#171514", shirt: "#4c4850", trousers: "#28272b", accent: "#9a8eb7" },
]

function Limb({
  position,
  rotation = [0, 0, 0],
  radius,
  length,
  color,
  skin = false,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  radius: number
  length: number
  color: string
  skin?: boolean
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <capsuleGeometry args={[radius, length, 6, 12]} />
      <meshStandardMaterial color={color} roughness={skin ? 0.56 : 0.9} metalness={0.01} />
    </mesh>
  )
}

function CouncilHuman({
  index,
  position,
  rotation,
  selected,
  onSelect,
}: {
  index: number
  position: [number, number, number]
  rotation: [number, number, number]
  selected: boolean
  onSelect: () => void
}) {
  const style = HUMAN_STYLES[index % HUMAN_STYLES.length]
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + index * 0.71
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.25) * 0.0035
      root.current.rotation.y = rotation[1] + Math.sin(t * 0.24) * 0.005
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.2) * 0.02
      head.current.rotation.x = Math.sin(t * 0.15) * 0.006
    }
    if (ring.current) {
      const material = ring.current.material as THREE.MeshBasicMaterial
      material.opacity = selected ? 0.24 : 0.055
    }
  })

  return (
    <group
      ref={root}
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      userData={{ representation: "human-proportioned-council-presence", replaceableByRiggedGlb: true }}
    >
      <mesh position={[-0.09, 0.075, 0.04]} scale={[0.095, 0.055, 0.18]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#17191b" roughness={0.84} />
      </mesh>
      <mesh position={[0.09, 0.075, 0.04]} scale={[0.095, 0.055, 0.18]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#17191b" roughness={0.84} />
      </mesh>

      <Limb position={[-0.085, 0.4, 0]} radius={0.066} length={0.43} color={style.trousers} />
      <Limb position={[0.085, 0.4, 0]} radius={0.066} length={0.43} color={style.trousers} />
      <Limb position={[-0.09, 0.79, 0]} radius={0.078} length={0.39} color={style.trousers} />
      <Limb position={[0.09, 0.79, 0]} radius={0.078} length={0.39} color={style.trousers} />

      <mesh position={[0, 1.0, 0]} scale={[0.22, 0.16, 0.14]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color={style.trousers} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.27, 0]} scale={[0.27, 0.34, 0.155]} castShadow receiveShadow>
        <capsuleGeometry args={[0.58, 0.72, 6, 16]} />
        <meshStandardMaterial color={style.shirt} roughness={0.88} metalness={0.01} />
      </mesh>
      <mesh position={[0, 1.52, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.064, 0.13, 14]} />
        <meshStandardMaterial color={style.skin} roughness={0.56} />
      </mesh>

      <Limb position={[-0.29, 1.28, 0]} rotation={[0, 0, -0.09]} radius={0.055} length={0.28} color={style.shirt} />
      <Limb position={[0.29, 1.28, 0]} rotation={[0, 0, 0.09]} radius={0.055} length={0.28} color={style.shirt} />
      <Limb position={[-0.315, 1.02, 0.015]} radius={0.047} length={0.25} color={style.skin} skin />
      <Limb position={[0.315, 1.02, 0.015]} radius={0.047} length={0.25} color={style.skin} skin />

      <group ref={head}>
        <mesh position={[0, 1.68, 0]} scale={[0.115, 0.145, 0.113]} castShadow receiveShadow>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={style.skin} roughness={0.56} />
        </mesh>
        {[-0.116, 0.116].map((x) => (
          <mesh key={`ear-${x}`} position={[x, 1.68, 0]} scale={[0.018, 0.035, 0.02]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={style.skin} roughness={0.56} />
          </mesh>
        ))}
        <mesh position={[0, 1.675, 0.112]} rotation={[Math.PI / 2, 0, 0]} scale={[0.017, 0.034, 0.017]}>
          <coneGeometry args={[1, 1.6, 12]} />
          <meshStandardMaterial color={style.skin} roughness={0.56} />
        </mesh>
        {[-0.042, 0.042].map((x) => (
          <group key={`eye-${x}`} position={[x, 1.704, 0.102]}>
            <mesh scale={[0.019, 0.011, 0.009]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#eef2ef" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.009]} scale={[0.0065, 0.0065, 0.004]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#303936" roughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.625, 0.105]} scale={[0.035, 0.007, 0.008]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#7d4a42" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.725, -0.045]} scale={[0.108, 0.088, 0.101]} castShadow>
          <sphereGeometry args={[1, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
          <meshStandardMaterial color={style.hair} roughness={0.96} />
        </mesh>
      </group>

      <mesh ref={ring} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.33, 56]} />
        <meshBasicMaterial color={style.accent} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Chamber() {
  const positions: [number, number, number][] = [
    [-2.7, 0, -0.8],
    [-1.55, 0, -2.55],
    [0, 0, -3.15],
    [1.55, 0, -2.55],
    [2.7, 0, -0.8],
    [3.2, 0, 1.0],
  ]
  const rotations: [number, number, number][] = [
    [0, 0.72, 0],
    [0, 0.35, 0],
    [0, 0, 0],
    [0, -0.35, 0],
    [0, -0.72, 0],
    [0, -1.15, 0],
  ]
  const [selected, setSelected] = useState(0)
  const selectedAgent = DEMO_COUNCIL_AGENTS[selected] ?? DEMO_COUNCIL_AGENTS[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#879398] text-white">
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#8c989c"]} />
            <fog attach="fog" args={["#919a99", 13, 31]} />
            <PerspectiveCamera makeDefault position={[0, 1.66, 7.25]} fov={42} />
            <ambientLight intensity={0.48} color="#e6ece9" />
            <hemisphereLight intensity={0.72} color="#dcecf0" groundColor="#6c675e" />
            <directionalLight position={[-4.5, 8, 4]} intensity={2.6} color="#f4f5ef" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <directionalLight position={[4, 4.5, -3]} intensity={0.75} color="#ffd9b0" />

            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <circleGeometry args={[8.2, 96]} />
              <meshStandardMaterial color="#696964" roughness={0.96} metalness={0.01} />
            </mesh>
            <mesh position={[0, 2.7, -4.9]} receiveShadow>
              <boxGeometry args={[10.8, 5.4, 0.3]} />
              <meshStandardMaterial color="#797269" roughness={0.9} />
            </mesh>
            <mesh position={[-5.25, 2.6, -0.7]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
              <boxGeometry args={[8.6, 5.2, 0.28]} />
              <meshStandardMaterial color="#62615d" roughness={0.93} />
            </mesh>
            <mesh position={[5.25, 2.6, -0.7]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
              <boxGeometry args={[8.6, 5.2, 0.28]} />
              <meshStandardMaterial color="#62615d" roughness={0.93} />
            </mesh>
            <mesh position={[0, 3, -4.72]}>
              <boxGeometry args={[3.8, 2.2, 0.08]} />
              <meshPhysicalMaterial color="#aec1c8" transmission={0.72} transparent opacity={0.42} roughness={0.14} thickness={0.08} />
            </mesh>

            <mesh position={[0, 0.74, -0.55]} receiveShadow castShadow>
              <cylinderGeometry args={[1.38, 1.42, 0.09, 72]} />
              <meshStandardMaterial color="#503a2c" roughness={0.84} />
            </mesh>
            <mesh position={[0, 0.39, -0.55]} castShadow>
              <cylinderGeometry args={[0.42, 0.54, 0.68, 48]} />
              <meshStandardMaterial color="#504942" roughness={0.9} />
            </mesh>

            {DEMO_COUNCIL_AGENTS.slice(0, 6).map((agent, index) => (
              <CouncilHuman
                key={agent.id}
                index={index}
                position={positions[index] ?? [0, 0, -2]}
                rotation={rotations[index] ?? [0, 0, 0]}
                selected={selected === index}
                onSelect={() => setSelected(index)}
              />
            ))}

            {[-3.8, 3.8].map((x) => (
              <group key={x} position={[x, 0, -3.85]}>
                <mesh position={[0, 0.72, 0]} castShadow>
                  <cylinderGeometry args={[0.07, 0.09, 1.4, 18]} />
                  <meshStandardMaterial color="#383735" roughness={0.58} metalness={0.38} />
                </mesh>
                <mesh position={[0, 1.48, 0]} castShadow>
                  <cylinderGeometry args={[0.22, 0.3, 0.34, 28]} />
                  <meshStandardMaterial color="#ded4c1" roughness={0.7} />
                </mesh>
                <pointLight position={[0, 1.45, 0.12]} color="#ffd7a2" intensity={12} distance={4.2} decay={2} />
              </group>
            ))}

            <ContactShadows position={[0, 0.012, -0.6]} opacity={0.42} scale={12} blur={2.8} far={7} />
            <Environment preset="apartment" environmentIntensity={0.3} />
          </Suspense>
        </Canvas>
      </div>

      <section className="absolute bottom-5 left-5 z-10 w-[min(430px,calc(100vw-2.5rem))] rounded-3xl border border-white/15 bg-black/45 p-5 backdrop-blur-xl md:bottom-10 md:left-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">URAI Council</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{selectedAgent?.name ?? "Council"}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-100/75">{selectedAgent?.role}</p>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">{selectedAgent?.focus}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-100" href="/">Return Home</Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10" href="/passport">Passport</Link>
        </div>
      </section>

      <div className="absolute bottom-6 right-6 z-10 hidden rounded-full bg-black/35 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/65 backdrop-blur md:block">
        Select a person
      </div>
    </div>
  )
}

export function CouncilRealm() {
  return <Chamber />
}
