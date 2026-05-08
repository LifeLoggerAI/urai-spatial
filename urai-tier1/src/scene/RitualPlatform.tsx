'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

function RuneRing({ radius, color, opacity, speed, reducedMotion }: { radius: number; color: string; opacity: number; speed: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    if (ref.current) ref.current.rotation.z = t * speed
    if (materialRef.current) materialRef.current.opacity = opacity + Math.sin(t * 1.35 + radius) * 0.035
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.565, -1.2]}>
      <torusGeometry args={[radius, 0.012, 8, 160]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

export default function RitualPlatform({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const platformRef = useRef<THREE.Group>(null)
  const stoneColor = useMemo(() => new THREE.Color('#171522'), [])

  useFrame(({ clock }) => {
    if (!platformRef.current || reducedMotion) return
    platformRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.16) * 0.012
  })

  return (
    <group ref={platformRef} position={[0, 0, 0]}>
      <mesh position={[0, -0.66, -1.2]} receiveShadow castShadow>
        <cylinderGeometry args={[2.42, 2.58, 0.2, 144]} />
        <meshStandardMaterial color={stoneColor} roughness={0.38} metalness={0.18} emissive="#170f2c" emissiveIntensity={0.16} />
      </mesh>

      <mesh position={[0, -0.53, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.35, 144]} />
        <meshStandardMaterial color="#211d31" roughness={0.32} metalness={0.22} emissive="#171033" emissiveIntensity={0.18} />
      </mesh>

      <mesh position={[0, -0.515, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 144]} />
        <meshBasicMaterial color="#c8b6ff" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <RuneRing radius={0.98} color="#b58cff" opacity={0.22} speed={0.045} reducedMotion={reducedMotion} />
      <RuneRing radius={1.48} color="#67e8f9" opacity={0.16} speed={-0.028} reducedMotion={reducedMotion} />
      <RuneRing radius={2.03} color="#f0abfc" opacity={0.12} speed={0.018} reducedMotion={reducedMotion} />

      {Array.from({ length: 18 }).map((_, index) => {
        const angle = (index / 18) * Math.PI * 2
        const radius = index % 2 === 0 ? 2.12 : 1.78
        const x = Math.cos(angle) * radius
        const z = -1.2 + Math.sin(angle) * radius
        return (
          <mesh key={index} position={[x, -0.475, z]} rotation={[-Math.PI / 2, 0, angle]}>
            <boxGeometry args={[0.22, 0.018, 0.012]} />
            <meshBasicMaterial color={index % 3 === 0 ? '#b58cff' : '#67e8f9'} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}
