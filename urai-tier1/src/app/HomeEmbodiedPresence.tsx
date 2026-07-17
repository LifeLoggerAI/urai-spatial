'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

type HomeEmbodiedPresenceProps = {
  reducedMotion: boolean
}

type MemorySilhouetteProps = {
  position: [number, number, number]
  scale: number
  phase: number
  reducedMotion: boolean
}

function MemorySilhouette({ position, scale, phase, reducedMotion }: MemorySilhouetteProps) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const time = clock.elapsedTime * 0.34 + phase
    group.current.position.y = Math.sin(time) * 0.045
    group.current.rotation.y = Math.sin(time * 0.7) * 0.035
  })

  return (
    <group ref={group} position={position} scale={scale} data-home-memory-silhouette="true">
      <mesh position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.34, 32, 24]} />
        <meshPhysicalMaterial color="#a8d8d5" emissive="#71d7d1" emissiveIntensity={0.22} transparent opacity={0.22} roughness={0.42} metalness={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.25, 0]} scale={[0.72, 1.35, 0.46]}>
        <sphereGeometry args={[0.72, 36, 28]} />
        <meshPhysicalMaterial color="#7ab8b6" emissive="#4bc0bc" emissiveIntensity={0.16} transparent opacity={0.14} roughness={0.5} metalness={0.08} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.1, 0]} scale={[1.22, 1.72, 0.8]}>
        <sphereGeometry args={[0.86, 36, 28]} />
        <meshBasicMaterial color="#7ce8df" transparent opacity={0.026} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}

function EmotionalAura({ reducedMotion }: { reducedMotion: boolean }) {
  const inner = useRef<THREE.Mesh>(null)
  const outer = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (reducedMotion) return
    if (inner.current) inner.current.rotation.z = clock.elapsedTime * 0.11
    if (outer.current) outer.current.rotation.z = -clock.elapsedTime * 0.075
  })

  return (
    <group data-testid="urai-home-emotional-aura">
      <mesh position={[0, 2.2, -0.06]} scale={[1.35, 2.75, 0.65]}>
        <sphereGeometry args={[1, 64, 40]} />
        <meshBasicMaterial color="#62efe2" transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={inner} position={[0, 2.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.018, 12, 128]} />
        <meshBasicMaterial color="#8ff7ee" transparent opacity={0.32} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={outer} position={[0, 2.12, 0]} rotation={[Math.PI / 2.32, 0.16, 0.08]}>
        <torusGeometry args={[1.65, 0.012, 12, 128]} />
        <meshBasicMaterial color="#b7a8ff" transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function EmbodiedSelf({ reducedMotion }: { reducedMotion: boolean }) {
  const figure = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!figure.current || reducedMotion) return
    const breath = 1 + Math.sin(clock.elapsedTime * 0.72) * 0.006
    figure.current.scale.set(breath, breath, breath)
  })

  return (
    <group ref={figure} position={[0, 0.08, -4.75]} data-testid="urai-home-embodied-self">
      <EmotionalAura reducedMotion={reducedMotion} />
      <mesh position={[0, 3.92, 0]} castShadow>
        <sphereGeometry args={[0.43, 48, 36]} />
        <meshPhysicalMaterial color="#07121a" emissive="#60ddd5" emissiveIntensity={0.14} roughness={0.32} metalness={0.2} clearcoat={0.72} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position={[0, 2.3, 0]} scale={[0.78, 1.5, 0.48]} castShadow>
        <sphereGeometry args={[0.92, 56, 42]} />
        <meshPhysicalMaterial color="#06131b" emissive="#47c7c1" emissiveIntensity={0.11} roughness={0.38} metalness={0.24} clearcoat={0.8} clearcoatRoughness={0.22} />
      </mesh>
      <mesh position={[-0.68, 2.38, 0]} rotation={[0, 0, -0.13]} castShadow>
        <capsuleGeometry args={[0.17, 1.82, 8, 24]} />
        <meshPhysicalMaterial color="#07131b" emissive="#45bdb8" emissiveIntensity={0.08} roughness={0.42} metalness={0.16} />
      </mesh>
      <mesh position={[0.68, 2.38, 0]} rotation={[0, 0, 0.13]} castShadow>
        <capsuleGeometry args={[0.17, 1.82, 8, 24]} />
        <meshPhysicalMaterial color="#07131b" emissive="#45bdb8" emissiveIntensity={0.08} roughness={0.42} metalness={0.16} />
      </mesh>
      <mesh position={[-0.3, 0.88, 0]} castShadow>
        <capsuleGeometry args={[0.2, 1.5, 8, 24]} />
        <meshPhysicalMaterial color="#061119" emissive="#3aa6a3" emissiveIntensity={0.07} roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0.3, 0.88, 0]} castShadow>
        <capsuleGeometry args={[0.2, 1.5, 8, 24]} />
        <meshPhysicalMaterial color="#061119" emissive="#3aa6a3" emissiveIntensity={0.07} roughness={0.48} metalness={0.12} />
      </mesh>
      <pointLight position={[0, 2.5, 0.7]} color="#76f2e9" intensity={2.4} distance={8} decay={2} />
    </group>
  )
}

export default function HomeEmbodiedPresence({ reducedMotion }: HomeEmbodiedPresenceProps) {
  const silhouettes = useMemo<MemorySilhouetteProps[]>(() => [
    { position: [-4.2, 0.02, -7.2], scale: 0.88, phase: 0.2, reducedMotion },
    { position: [-2.55, 0.02, -8.65], scale: 0.72, phase: 1.4, reducedMotion },
    { position: [2.55, 0.02, -8.65], scale: 0.72, phase: 2.7, reducedMotion },
    { position: [4.2, 0.02, -7.2], scale: 0.88, phase: 4.1, reducedMotion },
  ], [reducedMotion])

  return (
    <group data-testid="urai-home-embodied-presence">
      <group data-testid="urai-home-memory-silhouettes">
        {silhouettes.map((silhouette, index) => <MemorySilhouette key={index} {...silhouette} />)}
      </group>
      <EmbodiedSelf reducedMotion={reducedMotion} />
    </group>
  )
}
