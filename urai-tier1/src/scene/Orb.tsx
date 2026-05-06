'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { subscribeNarratorSpeaking } from '../spatial/narrator/narratorStore'

export type OrbState = 'idle' | 'listening' | 'memoryBloom' | 'ritual' | 'recovery'

const orbPalette: Record<
  OrbState,
  { aura: string; halo: string; light: string; emissive: string; intensity: number }
> = {
  idle: {
    aura: '#9b7cff',
    halo: '#8edcff',
    light: '#cbb6ff',
    emissive: '#d7c5ff',
    intensity: 1.8,
  },
  listening: {
    aura: '#6ee7ff',
    halo: '#d9f7ff',
    light: '#8be9ff',
    emissive: '#bff7ff',
    intensity: 2.35,
  },
  memoryBloom: {
    aura: '#f0abfc',
    halo: '#fef3c7',
    light: '#f5d0fe',
    emissive: '#f0abfc',
    intensity: 2.55,
  },
  ritual: {
    aura: '#fbbf24',
    halo: '#fed7aa',
    light: '#fde68a',
    emissive: '#facc15',
    intensity: 2.75,
  },
  recovery: {
    aura: '#86efac',
    halo: '#bbf7d0',
    light: '#a7f3d0',
    emissive: '#bbf7d0',
    intensity: 2.45,
  },
}

export default function Orb({ state = 'idle' }: { state?: OrbState }) {
  const orbRef = useRef<THREE.Mesh>(null)
  const auraRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const [narratorSpeaking, setNarratorSpeakingState] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeNarratorSpeaking(setNarratorSpeakingState)

    return () => {
      unsubscribe()
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const activeState = narratorSpeaking && state === 'idle' ? 'listening' : state
    const palette = orbPalette[activeState]

    const stateBoost =
      activeState === 'ritual'
        ? 0.09
        : activeState === 'memoryBloom'
          ? 0.075
          : activeState === 'listening'
            ? 0.06
            : 0.035

    const breath = 1 + Math.sin(t * 1.12) * stateBoost
    const pulse = 1 + Math.sin(t * 0.72 + 0.6) * (stateBoost * 2.2)
    const speechPulse = narratorSpeaking ? 1 + Math.sin(t * 8.5) * 0.045 : 1

    if (orbRef.current) {
      orbRef.current.position.y = -0.2 + Math.sin(t * 0.86) * 0.045
      orbRef.current.scale.setScalar(breath * speechPulse)
      orbRef.current.rotation.y = t * 0.16

      const material = orbRef.current.material
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(palette.emissive)
        material.emissiveIntensity +=
          (0.72 * speechPulse - material.emissiveIntensity) * 0.08
      }
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar(1.55 * pulse * speechPulse)
      auraRef.current.rotation.z = t * 0.08

      const material = auraRef.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(palette.aura)
        material.opacity += ((narratorSpeaking ? 0.26 : 0.18) - material.opacity) * 0.06
      }
    }

    if (haloRef.current) {
      haloRef.current.scale.set(
        2.3 + Math.sin(t * 0.64) * 0.1,
        2.3 + Math.cos(t * 0.52) * 0.08,
        1,
      )
      haloRef.current.rotation.z = Math.sin(t * 0.24) * 0.12

      const material = haloRef.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(palette.halo)
        material.opacity += ((narratorSpeaking ? 0.14 : 0.08) - material.opacity) * 0.06
      }
    }

    if (lightRef.current) {
      lightRef.current.color.set(palette.light)
      lightRef.current.intensity +=
        (palette.intensity * speechPulse - lightRef.current.intensity) * 0.08
    }
  })

  return (
    <group position={[0, -0.18, -1.2]}>
      <pointLight
        ref={lightRef}
        position={[0, 0.15, 0.1]}
        intensity={orbPalette[state].intensity}
        color={orbPalette[state].light}
        distance={5.8}
      />

      <mesh ref={haloRef} rotation={[0, 0, 0]} position={[0, 0, -0.08]}>
        <circleGeometry args={[0.72, 64]} />
        <meshBasicMaterial
          color={orbPalette[state].halo}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={auraRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.54, 64, 64]} />
        <meshBasicMaterial
          color={orbPalette[state].aura}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={orbRef} castShadow>
        <sphereGeometry args={[0.38, 64, 64]} />
        <meshStandardMaterial
          color="#f4f6ff"
          emissive={orbPalette[state].emissive}
          emissiveIntensity={0.72}
          metalness={0.08}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[-0.12, 0.14, 0.28]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.72} />
      </mesh>
    </group>
  )
}