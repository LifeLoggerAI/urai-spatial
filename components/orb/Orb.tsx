
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './OrbShader'
import { useEmotionalTimeEngine } from '@/components/time-core/useEmotionalTimeEngine';

export default function Orb() {
  const ref = useRef<any>()
  const { orbState } = useEmotionalTimeEngine([]);

  useFrame((state, delta) => {
    if (!ref.current) return

    ref.current.uTime += delta
    ref.current.uEnergy = orbState.surfaceIntensity;
  })

  return (
    <group>
      {/* Main Orb Surface */}
      <mesh>
        <sphereGeometry args={[1.2, 128, 128]} />
        <consciousOrbMaterial
          ref={ref}
          toneMapped
        />
      </mesh>

      {/* Inner Core Glow */}
      <mesh scale={0.8}>
        <sphereGeometry args={[1.2, 128, 128]} />
        <meshBasicMaterial
          color="#7dd3ff"
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Outer Energy Shell */}
      <mesh scale={1.05}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
        />
      </mesh>
    </group>
  )
}
