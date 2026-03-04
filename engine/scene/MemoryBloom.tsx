'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  center: THREE.Vector3
  active: boolean
}

export default function MemoryBloom({ center, active }: Props) {
  const groupRef = useRef<THREE.Group>(null!)

  const particles = useMemo(() => {
    const arr: THREE.Vector3[] = []
    const count = 40

    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 1.5
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 1.5

      arr.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        )
      )
    }

    return arr
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return

    const targetScale = active ? 1 : 0.2
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.08
    )

    groupRef.current.position.lerp(center, 0.08)

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial

      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.6 : 0,
        0.08
      )

      if (active) {
        mesh.position.y += Math.sin(state.clock.elapsedTime + i) * 0.002
      }
    })
  })

  return (
    <group ref={groupRef} position={center}>
      {particles.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color="#88ccff"
            emissive="#88ccff"
            emissiveIntensity={1.5}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  )
}
