'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Star = { id: string; x: number; y: number; z: number }

export default function Starfield3D({
  stars,
  phase,
  onSelect,
  cameraY,
  cameraNear,
  cameraFar,
  streakIntensity = 0,
  nebulaReveal = 0,
}: {
  stars: Star[]
  phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  onSelect?: (id: string) => void
  cameraY?: number
  cameraNear?: number
  cameraFar?: number
  streakIntensity?: number
  nebulaReveal?: number
}) {
  const group = useRef<THREE.Group>(null)

  const nodes = useMemo(() => {
    return stars.map((s) => ({
      id: s.id,
      position: new THREE.Vector3((s.x - 50) / 2, (s.y - 50) / 2, -s.z * 20 - Math.random() * 50),
    }))
  }, [stars])

  useFrame(() => {
    // near/far and cameraY are consumed by parent orchestration; clamp locally to prevent out-of-range values.
    const clampedNear = Math.max(0.08, Math.min(0.25, cameraNear ?? 0.1))
    const clampedFar = Math.max(80, Math.min(220, cameraFar ?? 150))
    const minZ = -clampedFar + 6
    const maxZ = -clampedNear - 0.4

    if (!group.current) return

    let speed = 0
    if (phase === 'ASCENT') speed = 6 + streakIntensity * 14
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'FOCUS') speed = 0
    else if (phase === 'REPLAY') speed = 2

    group.current.position.y = Math.max(-1.5, Math.min(1.5, (cameraY ?? 0.8) - 0.8))
    group.current.children.forEach((child: any) => {
      child.position.z += (1 + nebulaReveal * 0.2) * (1 + streakIntensity * 0.15) * (speed / 60)
      if (child.position.z > maxZ) {
        child.position.z = minZ - Math.random() * 20
      }
      if (child.position.z < minZ - 10) {
        child.position.z = minZ
      }
    })
  })

  return (
    <group ref={group}>
      {nodes.map((n) => (
        <mesh key={n.id} position={[n.position.x, n.position.y, n.position.z]} onClick={() => onSelect?.(n.id)}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}
