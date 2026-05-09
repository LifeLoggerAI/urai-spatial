'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

function tierOpacity(tier: number, base: number, step = 0.035) {
  return Math.min(0.72, base + Math.max(0, tier - 1) * step)
}

function RootVeins({ groundTier, reducedMotion }: { groundTier: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const roots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        const lane = Math.floor(index / 2)
        const x = side * (0.65 + lane * 0.42)
        const z = -1.2 - lane * 0.42
        const rotation = side * (0.22 + lane * 0.035)
        const length = 1.5 + lane * 0.22
        return { x, z, rotation, length, delay: index * 0.31 }
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.elapsedTime
    group.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = tierOpacity(groundTier, 0.13, 0.028) + Math.sin(t * 0.8 + roots[index]?.delay) * 0.025
      }
    })
  })

  return (
    <group ref={group} position={[0, -0.965, -3.1]} rotation={[-Math.PI / 2, 0, 0]}>
      {roots.map((root, index) => (
        <mesh key={index} position={[root.x, root.z, 0.018]} rotation={[0, 0, root.rotation]}>
          <planeGeometry args={[0.032, root.length]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? '#9bf6ff' : '#7c6cff'}
            transparent
            opacity={tierOpacity(groundTier, 0.12, 0.026)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function BloomField({ groundTier, reducedMotion }: { groundTier: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const blooms = useMemo(
    () =>
      Array.from({ length: 46 }, (_, index) => {
        const theta = index * 2.399963
        const radius = 1.8 + (index % 17) * 0.36
        return {
          x: Math.cos(theta) * radius,
          z: -2.6 + Math.sin(theta) * radius * 0.58,
          size: 0.018 + ((index * 7) % 5) * 0.006,
          phase: index * 0.44,
        }
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.elapsedTime
    group.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh
      mesh.position.y = -0.72 + Math.sin(t * 0.7 + blooms[index]?.phase) * 0.018
      const material = mesh.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = tierOpacity(groundTier, 0.16, 0.035) + Math.sin(t * 1.2 + blooms[index]?.phase) * 0.045
      }
    })
  })

  return (
    <group ref={group}>
      {blooms.map((bloom, index) => (
        <mesh key={index} position={[bloom.x, -0.72, bloom.z]}>
          <sphereGeometry args={[bloom.size, 12, 12]} />
          <meshBasicMaterial
            color={index % 4 === 0 ? '#c4b5fd' : index % 3 === 0 ? '#86efac' : '#67e8f9'}
            transparent
            opacity={tierOpacity(groundTier, 0.14, 0.032)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function Ground({ groundTier = 3, reducedMotion = false }: { groundTier?: number; reducedMotion?: boolean }) {
  return (
    <group data-testid="urai-ground-world">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, -4.8]} receiveShadow>
        <planeGeometry args={[96, 96, 1, 1]} />
        <meshStandardMaterial color="#101423" roughness={0.62} metalness={0.12} emissive="#0d1833" emissiveIntensity={0.18} />
      </mesh>

      <mesh rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -0.82, -9.8]} receiveShadow>
        <planeGeometry args={[92, 19, 1, 1]} />
        <meshStandardMaterial
          color="#17233d"
          roughness={0.78}
          metalness={0.04}
          transparent
          opacity={0.9}
          emissive="#0b1b35"
          emissiveIntensity={0.18}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2.32, 0, 0]} position={[0, -0.62, -16.2]} receiveShadow>
        <planeGeometry args={[96, 12, 1, 1]} />
        <meshStandardMaterial
          color="#22304e"
          roughness={0.84}
          metalness={0.02}
          transparent
          opacity={0.7}
          emissive="#142040"
          emissiveIntensity={0.12}
        />
      </mesh>

      <mesh position={[0, -0.47, -11.2]} rotation={[-0.1, 0, 0]}>
        <planeGeometry args={[78, 5.4]} />
        <meshBasicMaterial color="#9fb4ff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -0.42, -17.5]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[96, 4.8]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -0.9, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 8.8, 180]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={tierOpacity(groundTier, 0.05, 0.018)}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -0.885, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 2.08, 160]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.79, -3.8]}>
        <cylinderGeometry args={[1.25, 1.55, 0.08, 96]} />
        <meshStandardMaterial color="#111a2e" emissive="#1b2c55" emissiveIntensity={0.18} roughness={0.5} metalness={0.12} />
      </mesh>

      <mesh position={[0, -0.56, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 96]} />
        <meshBasicMaterial color="#8edcff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <RootVeins groundTier={groundTier} reducedMotion={reducedMotion} />
      <BloomField groundTier={groundTier} reducedMotion={reducedMotion} />

      <mesh position={[0, -0.78, -18.5]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[96, 5.2]} />
        <meshBasicMaterial color="#ffb86b" transparent opacity={0.065} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
