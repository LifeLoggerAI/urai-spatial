'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Star = { id: string; x: number; y: number; z: number }

export default function Starfield3D({
  stars,
  phase,
  onSelect,
}: {
  stars: Star[]
  phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  onSelect?: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null)

  const nodes = useMemo(() => {
    return stars.map((s) => ({
      id: s.id,
      position: new THREE.Vector3(
        (s.x - 50) / 2,
        (s.y - 50) / 2,
        -s.z * 20 - Math.random() * 50
      ),
    }))
  }, [stars])

  useFrame((_, dt) => {
    if (!group.current) return

    let speed = 0
    if (phase === 'ASCENT') speed = 10
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'FOCUS') speed = 0
    else if (phase === 'REPLAY') speed = 2

    group.current.children.forEach((child: THREE.Object3D) => {
      if (!('position' in child)) return

      child.position.z += dt * speed
      if (child.position.z > 5) {
        child.position.z = -80 - Math.random() * 40
      }
    })
  })

  return (
    <group ref={group}>
      {nodes.map((n) => (
        <mesh
          key={n.id}
          position={[n.position.x, n.position.y, n.position.z]}
          onClick={() => onSelect?.(n.id)}
        >
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}
