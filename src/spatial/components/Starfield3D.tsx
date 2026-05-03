'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Star = { id: string; x: number; y: number; z: number }

function hash01FromId(id: string): number {
  let hash = 2166136261

  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967295
}

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
    return stars.map((s) => {
      const depthOffset = hash01FromId(s.id)

      return {
        id: s.id,
        position: new THREE.Vector3(
          (s.x - 50) / 2,
          (s.y - 50) / 2,
          -s.z * 20 - depthOffset * 50
        ),
        respawnZ: -80 - depthOffset * 40,
      }
    })
  }, [stars])

  useFrame((_, dt) => {
    if (!group.current) return

    let speed = 0

    if (phase === 'ASCENT') speed = 10
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'FOCUS') speed = 0
    else if (phase === 'REPLAY') speed = 2

    group.current.children.forEach((child: THREE.Object3D, index) => {
      child.position.z += dt * speed

      if (child.position.z > 5) {
        child.position.z = nodes[index]?.respawnZ ?? -80
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