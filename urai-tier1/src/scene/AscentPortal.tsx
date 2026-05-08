'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

function seeded(index: number) {
  const x = Math.sin(index * 9142.173) * 10000
  return x - Math.floor(x)
}

function AscentStars() {
  const ref = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const count = 720
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const lane = seeded(i + 2) > 0.5 ? 1 : -1
      const radius = 0.55 + seeded(i + 10) * 6.5
      const angle = seeded(i + 22) * Math.PI * 2
      const depth = -3 - seeded(i + 55) * 34
      const lift = seeded(i + 88) * 6.5

      positions[i * 3] = Math.cos(angle) * radius * lane
      positions[i * 3 + 1] = -1.7 + lift
      positions[i * 3 + 2] = depth + Math.sin(angle) * radius * 0.3

      colors[i * 3] = 0.56 + seeded(i + 100) * 0.32
      colors[i * 3 + 1] = 0.78 + seeded(i + 200) * 0.2
      colors[i * 3 + 2] = 1
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.z = ((t * 4.6) % 6) - 3
    ref.current.rotation.z = Math.sin(t * 0.35) * 0.08
    ref.current.rotation.y = t * 0.04
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.038} vertexColors transparent opacity={0.88} depthWrite={false} />
    </points>
  )
}

function PortalRing({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime + index * 0.35
    const pulse = 1 + Math.sin(t * 1.6) * 0.045
    ref.current.scale.setScalar((1.4 + index * 0.55) * pulse)
    ref.current.rotation.z = t * (index % 2 === 0 ? 0.08 : -0.065)
  })

  return (
    <mesh ref={ref} position={[0, 1.05 + index * 0.08, -5.2 - index * 2.25]}>
      <torusGeometry args={[1, 0.012, 12, 96]} />
      <meshBasicMaterial
        color={index % 2 === 0 ? '#67e8f9' : '#a78bfa'}
        transparent
        opacity={0.34 - index * 0.035}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function AscentPortal() {
  return (
    <group>
      <mesh position={[0, 1.05, -9]}>
        <sphereGeometry args={[2.2, 64, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {Array.from({ length: 7 }).map((_, index) => (
        <PortalRing key={index} index={index} />
      ))}

      <mesh position={[0, 1.1, -8.4]} rotation={[0, 0, 0]}>
        <planeGeometry args={[8.4, 8.4]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <AscentStars />
    </group>
  )
}
