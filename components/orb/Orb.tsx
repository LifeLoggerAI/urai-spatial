'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './OrbShader'
import { useEmotionalTimeEngine } from '@/components/time-core/useEmotionalTimeEngine'

type ConsciousOrbMaterialInstance = THREE.ShaderMaterial & {
  uTime: number
  uEnergy: number
}

export default function Orb() {
  const materialRef = useRef<ConsciousOrbMaterialInstance | null>(null)

  const events = useMemo(() => [], [])
  const { orbState } = useEmotionalTimeEngine(events)

  useFrame((_, delta) => {
    const mat = materialRef.current
    if (!mat) return

    mat.uTime = (mat.uTime ?? 0) + delta
    mat.uEnergy = orbState.surfaceIntensity
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.2, 128, 128]} />
        <consciousOrbMaterial
          ref={materialRef}
          toneMapped
        />
      </mesh>

      <mesh scale={0.8}>
        <sphereGeometry args={[1.2, 128, 128]} />
        <meshBasicMaterial
          color="#7dd3ff"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.05}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
        />
      </mesh>
    </group>
  )
}