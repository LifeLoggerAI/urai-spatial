'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

type MemoryKind = 'home' | 'ride' | 'family' | 'music' | 'tree'

type MemoryVignetteSpec = {
  id: string
  kind: MemoryKind
  position: [number, number, number]
  color: string
  scale: number
}

type HomeSanctuaryWorldProps = {
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
}

const MEMORY_VIGNETTES: MemoryVignetteSpec[] = [
  { id: 'place-loved', kind: 'home', position: [-5.25, 2.55, 3.65], color: '#f6c889', scale: 1.02 },
  { id: 'ride-home', kind: 'ride', position: [4.95, 2.85, 1.65], color: '#7cecf2', scale: 0.92 },
  { id: 'voices-dinner', kind: 'family', position: [-5.4, 2.35, -2.35], color: '#c4b5fd', scale: 0.96 },
  { id: 'song-returned', kind: 'music', position: [5.35, 2.55, -4.15], color: '#f4a8d8', scale: 0.88 },
  { id: 'quiet-growth', kind: 'tree', position: [-3.75, 3.25, -7.15], color: '#9de4b1', scale: 1.08 },
]

const RIDE_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.46, -0.2, 0),
  new THREE.Vector3(-0.08, 0.18, 0),
  new THREE.Vector3(0.22, -0.2, 0),
  new THREE.Vector3(0.46, -0.2, 0),
])

const SANCTUARY_COLUMN_Z = [5.6, 2.1, -1.4, -4.9, -8.2]
const SANCTUARY_PATH_Z = [6.35, 4.95, 3.55, 2.15, 0.75, -0.65, -2.05, -3.45, -4.85, -6.25, -7.65]
const SANCTUARY_TERRACE_Z = [4.7, 1.2, -2.3, -5.8]
const SANCTUARY_SKY_RINGS = [2.8, 5.1, 7.45]

function MemorySymbol({ kind, color }: { kind: MemoryKind; color: string }) {
  const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} roughness={0.38} metalness={0.08} />

  if (kind === 'home') {
    return (
      <group scale={0.62} position={[0, -0.08, 0]}>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[1.05, 0.72, 0.78]} />
          {material}
        </mesh>
        <mesh position={[0, 0.48, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.78, 0.62, 4]} />
          {material}
        </mesh>
        <mesh position={[0, -0.16, 0.405]}>
          <boxGeometry args={[0.22, 0.4, 0.04]} />
          <meshStandardMaterial color="#07121d" emissive={color} emissiveIntensity={0.15} />
        </mesh>
      </group>
    )
  }

  if (kind === 'ride') {
    return (
      <group scale={0.58} position={[0, -0.05, 0]}>
        <mesh position={[-0.46, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.055, 10, 28]} />
          {material}
        </mesh>
        <mesh position={[0.46, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.055, 10, 28]} />
          {material}
        </mesh>
        <mesh rotation={[0, 0, -0.1]}>
          <tubeGeometry args={[RIDE_CURVE, 18, 0.035, 8, false]} />
          {material}
        </mesh>
        <mesh position={[-0.04, 0.23, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.48, 8]} />
          {material}
        </mesh>
      </group>
    )
  }

  if (kind === 'family') {
    return (
      <group position={[0, -0.14, 0]}>
        {[-0.42, 0, 0.42].map((x, index) => (
          <group key={x} position={[x, index === 1 ? 0.08 : 0, index === 1 ? -0.08 : 0]} scale={index === 1 ? 1.05 : 0.88}>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.15, 18, 18]} />
              {material}
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <capsuleGeometry args={[0.16, 0.45, 7, 12]} />
              {material}
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  if (kind === 'music') {
    return (
      <group scale={0.78} position={[0, -0.02, 0]}>
        <mesh position={[-0.24, -0.22, 0]}>
          <sphereGeometry args={[0.22, 22, 22]} />
          {material}
        </mesh>
        <mesh position={[0.28, -0.08, 0]}>
          <sphereGeometry args={[0.19, 22, 22]} />
          {material}
        </mesh>
        <mesh position={[0.03, 0.28, 0]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          {material}
        </mesh>
        <mesh position={[0.3, 0.56, 0]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.62, 0.08, 0.08]} />
          {material}
        </mesh>
      </group>
    )
  }

  return (
    <group position={[0, -0.2, 0]} scale={0.72}>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.09, 0.16, 0.85, 12]} />
        <meshStandardMaterial color="#7a5b45" roughness={0.78} />
      </mesh>
      {[
        [0, 0.34, 0],
        [-0.24, 0.2, 0.02],
        [0.26, 0.19, -0.02],
        [-0.08, 0.5, -0.05],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} scale={index === 0 ? 1.2 : 0.82}>
          <icosahedronGeometry args={[0.32, 1]} />
          {material}
        </mesh>
      ))}
    </group>
  )
}

function MemoryVignette({ spec, reducedMotion, walkTarget }: {
  spec: MemoryVignetteSpec
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
}) {
  const group = useRef<THREE.Group>(null)
  const phase = useMemo(() => spec.position[0] * 0.31 + spec.position[2] * 0.17, [spec.position])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const elapsed = clock.elapsedTime + phase
    group.current.rotation.y += delta * (reducedMotion ? 0.025 : 0.085)
    group.current.position.y = spec.position[1] + (reducedMotion ? 0 : Math.sin(elapsed * 0.72) * 0.09)
  })

  const approach = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    walkTarget.current = new THREE.Vector3(spec.position[0], 0, spec.position[2] + 1.35)
  }

  return (
    <group ref={group} position={spec.position} scale={spec.scale} name={`home-memory-vignette-${spec.id}`}>
      <mesh onClick={approach}>
        <sphereGeometry args={[0.92, 32, 32]} />
        <meshPhysicalMaterial
          color={spec.color}
          emissive={spec.color}
          emissiveIntensity={0.13}
          transparent
          opacity={0.19}
          roughness={0.08}
          metalness={0.02}
          transmission={0.5}
          thickness={0.32}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.02, 0.018, 8, 80]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.44} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.22, 0.3, 0.62]}>
        <torusGeometry args={[1.08, 0.012, 8, 80]} />
        <meshBasicMaterial color="#eefcff" transparent opacity={0.21} toneMapped={false} depthWrite={false} />
      </mesh>
      <MemorySymbol kind={spec.kind} color={spec.color} />
      <pointLight color={spec.color} intensity={1.05} distance={4.6} decay={2} />
    </group>
  )
}

function SanctuaryDust({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const data = new Float32Array(240 * 3)
    for (let index = 0; index < 240; index += 1) {
      data[index * 3] = (Math.random() - 0.5) * 17
      data[index * 3 + 1] = 0.25 + Math.random() * 5.5
      data[index * 3 + 2] = -10 + Math.random() * 19
    }
    return data
  }, [])

  useFrame((_, delta) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y += delta * 0.008
  })

  return (
    <points ref={points} name="home-sanctuary-memory-dust">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d9fbff" size={0.034} sizeAttenuation transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function SanctuaryArchitecture() {
  return (
    <group name="home-sanctuary-spatial-architecture">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, -1]} receiveShadow>
        <planeGeometry args={[18, 19]} />
        <meshStandardMaterial color="#020912" roughness={0.86} metalness={0.14} />
      </mesh>

      {SANCTUARY_PATH_Z.map((z, index) => (
        <group key={z} position={[0, -0.025, z]}>
          <mesh receiveShadow>
            <boxGeometry args={[3.2, 0.045, 1.04]} />
            <meshStandardMaterial color={index % 2 ? '#06131d' : '#081925'} roughness={0.55} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.026, 0]}>
            <boxGeometry args={[2.35, 0.012, 0.025]} />
            <meshBasicMaterial color={index % 2 ? '#9f91ff' : '#7cecf2'} transparent opacity={0.52} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {SANCTUARY_COLUMN_Z.flatMap((z, row) => [-1, 1].map((side) => (
        <group key={`${z}-${side}`} position={[side * (6.65 - row * 0.08), 1.75, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.34, 3.5, 18]} />
            <meshStandardMaterial color="#0a1a27" emissive={row % 2 ? '#9f91ff' : '#7cecf2'} emissiveIntensity={0.08} roughness={0.35} metalness={0.42} />
          </mesh>
          <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.44, 0.025, 8, 36]} />
            <meshBasicMaterial color={row % 2 ? '#9f91ff' : '#7cecf2'} transparent opacity={0.38} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 1.35, 0]} color={row % 2 ? '#9f91ff' : '#7cecf2'} intensity={0.34} distance={3.2} />
        </group>
      )))}

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.35, 0.22, -1.5]} rotation={[0, side * -0.08, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[3.25, 0.42, 15.2]} />
            <meshStandardMaterial color="#04101a" roughness={0.72} metalness={0.18} />
          </mesh>
          {SANCTUARY_TERRACE_Z.map((z, index) => (
            <mesh key={z} position={[side * -0.5, 0.24 + index * 0.015, z]}>
              <boxGeometry args={[2.05, 0.035, 1.85]} />
              <meshStandardMaterial color="#071923" emissive={index % 2 ? '#765bd4' : '#3aa7b5'} emissiveIntensity={0.045} roughness={0.62} metalness={0.12} />
            </mesh>
          ))}
        </group>
      ))}

      {SANCTUARY_SKY_RINGS.map((radius, index) => (
        <mesh key={radius} position={[0, 5.35 + index * 0.16, -2.2]} rotation={[Math.PI / 2, 0, index * 0.11]}>
          <torusGeometry args={[radius, 0.025, 8, 120]} />
          <meshBasicMaterial color={index % 2 ? '#9f91ff' : '#7cecf2'} transparent opacity={0.15 - index * 0.025} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function HomeSanctuaryWorld({ reducedMotion, walkTarget }: HomeSanctuaryWorldProps) {
  return (
    <group name="home-visible-navigable-sanctuary-world" data-testid="urai-home-visible-world">
      <fog attach="fog" args={['#020710', 8, 34]} />
      <SanctuaryArchitecture />
      <SanctuaryDust reducedMotion={reducedMotion} />
      {MEMORY_VIGNETTES.map((spec) => (
        <MemoryVignette key={spec.id} spec={spec} reducedMotion={reducedMotion} walkTarget={walkTarget} />
      ))}
    </group>
  )
}
