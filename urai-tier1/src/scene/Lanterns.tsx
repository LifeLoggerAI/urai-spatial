'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

type LanternSpec = {
  angle: number
  radius: number
  height: number
  phase: number
  scale: number
}

function Lantern({ spec, reducedMotion }: { spec: LanternSpec; reducedMotion: boolean }) {
  const flameRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const x = Math.cos(spec.angle) * spec.radius
  const z = -1.2 + Math.sin(spec.angle) * spec.radius

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime + spec.phase
    const flicker = 1 + Math.sin(t * 3.1) * 0.12 + Math.sin(t * 7.4) * 0.045
    if (flameRef.current) {
      flameRef.current.scale.setScalar(spec.scale * flicker)
      flameRef.current.position.y = spec.height + 0.12 + Math.sin(t * 2.2) * 0.015
    }
    if (lightRef.current) lightRef.current.intensity = 0.8 * flicker
  })

  return (
    <group position={[x, -0.53, z]} rotation={[0, -spec.angle, 0]}>
      <mesh position={[0, spec.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.024, spec.height, 10]} />
        <meshStandardMaterial color="#2a2434" roughness={0.52} metalness={0.45} />
      </mesh>
      <mesh position={[0, spec.height + 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.16, 18]} />
        <meshStandardMaterial color="#231a25" roughness={0.42} metalness={0.28} emissive="#251016" emissiveIntensity={0.2} />
      </mesh>
      <mesh ref={flameRef} position={[0, spec.height + 0.12, 0]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color="#ffd6a3" transparent opacity={0.88} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight ref={lightRef} position={[0, spec.height + 0.16, 0]} color="#ffbf7a" intensity={0.8} distance={3.7} />
    </group>
  )
}

export default function Lanterns({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const specs = useMemo<LanternSpec[]>(() => [
    { angle: Math.PI * 0.1, radius: 2.95, height: 0.74, phase: 0.2, scale: 1.05 },
    { angle: Math.PI * 0.42, radius: 3.18, height: 0.56, phase: 1.4, scale: 0.92 },
    { angle: Math.PI * 0.82, radius: 2.82, height: 0.66, phase: 2.1, scale: 0.98 },
    { angle: Math.PI * 1.18, radius: 3.08, height: 0.6, phase: 3.0, scale: 0.9 },
    { angle: Math.PI * 1.58, radius: 2.9, height: 0.72, phase: 4.0, scale: 1.0 },
    { angle: Math.PI * 1.9, radius: 3.22, height: 0.54, phase: 5.1, scale: 0.88 },
  ], [])

  return (
    <group>
      {specs.map((spec) => <Lantern key={`${spec.angle}-${spec.radius}`} spec={spec} reducedMotion={reducedMotion} />)}
    </group>
  )
}
