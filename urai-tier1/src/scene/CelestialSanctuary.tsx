'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

function NebulaVeil({ position, rotation, color, opacity, speed, reducedMotion }: { position: [number, number, number]; rotation: [number, number, number]; color: string; opacity: number; speed: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.z = rotation[2] + Math.sin(t * speed) * 0.035
      ref.current.position.x = position[0] + Math.sin(t * speed * 0.7) * 0.12
    }
    if (materialRef.current) materialRef.current.opacity = opacity + Math.sin(t * speed + position[0]) * 0.018
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <planeGeometry args={[18, 4.4, 1, 1]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function CelestialSanctuary({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const moonMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f3e8ff', transparent: true, opacity: 0.86, depthWrite: false }), [])

  return (
    <group>
      <mesh position={[-4.8, 5.2, -28]}>
        <sphereGeometry args={[1.05, 48, 48]} />
        <primitive object={moonMaterial} attach="material" />
      </mesh>
      <mesh position={[-4.35, 5.38, -27.85]}>
        <sphereGeometry args={[1.02, 48, 48]} />
        <meshBasicMaterial color="#071126" transparent opacity={0.9} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.1, -25]} rotation={[-0.04, 0, 0]}>
        <planeGeometry args={[42, 6.5]} />
        <meshBasicMaterial color="#ffb86b" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 2.1, -27]} rotation={[0.02, 0, 0]}>
        <planeGeometry args={[44, 11]} />
        <meshBasicMaterial color="#7966ff" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <NebulaVeil position={[-7.4, 3.2, -22]} rotation={[0.04, 0.2, -0.12]} color="#a78bfa" opacity={0.13} speed={0.11} reducedMotion={reducedMotion} />
      <NebulaVeil position={[6.2, 2.4, -21]} rotation={[0.02, -0.24, 0.16]} color="#67e8f9" opacity={0.1} speed={0.085} reducedMotion={reducedMotion} />
      <NebulaVeil position={[0.4, 4.8, -26]} rotation={[0, 0, 0.04]} color="#f0abfc" opacity={0.09} speed={0.065} reducedMotion={reducedMotion} />

      <mesh position={[0, -0.8, -16]} rotation={[-0.09, 0, 0]}>
        <planeGeometry args={[52, 2.4]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
