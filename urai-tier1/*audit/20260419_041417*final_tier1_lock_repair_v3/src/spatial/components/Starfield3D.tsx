'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Star = { id: string; x: number; y: number; z: number }

export default function Starfield3D({
  stars,
  phase,
  selectedId,
  ascentProgress = 0,
  onSelect,
}: {
  stars: Star[]
  phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  selectedId?: string | null
  ascentProgress?: number
  onSelect?: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const velocity = useRef(0)

  const nodes = useMemo(() => {
    return stars.map((s) => ({
      id: s.id,
      position: new THREE.Vector3(
        (s.x - 50) / 2,
        (s.y - 50) / 2,
        -18 - s.z * 18 - Math.random() * 46
      ),
    }))
  }, [stars])

  useEffect(() => {
    if (!group.current) return
    group.current.children.forEach((child: any) => {
      const id = child.userData.id as string
      const isSelected = selectedId === id
      const mesh = child.children[0]
      const halo = child.children[1]

      if (!mesh || !mesh.material) return

      let opacity = 1
      let scale = 1
      let haloOpacity = 0

      if (phase === 'HOME') {
        opacity = 0
      } else if (phase === 'ASCENT') {
        opacity = Math.max(0, Math.min(1, ascentProgress * 1.15 - 0.18))
      } else if (phase === 'LIFEMAP') {
        opacity = 1
      } else if (phase === 'FOCUS') {
        opacity = isSelected ? 1 : 0.05
        scale = isSelected ? 1.8 : 0.7
        haloOpacity = isSelected ? 0.18 : 0
      } else if (phase === 'REPLAY') {
        opacity = 0.08
        scale = isSelected ? 1.25 : 0.65
        haloOpacity = isSelected ? 0.10 : 0
      }

      mesh.material.opacity = opacity
      child.scale.setScalar(scale)

      if (halo && halo.material) {
        halo.material.opacity = haloOpacity
      }
    })
  }, [phase, selectedId, ascentProgress])

  useFrame((_, dt) => {
    if (!group.current) return

    let targetSpeed = 0
    if (phase === 'ASCENT') {
      targetSpeed = 4 + ascentProgress * 20
    } else if (phase === 'LIFEMAP') {
      targetSpeed = 0.01
    } else if (phase === 'FOCUS') {
      targetSpeed = 0
    } else if (phase === 'REPLAY') {
      targetSpeed = 6
    }

    velocity.current += (targetSpeed - velocity.current) * 0.12

    group.current.children.forEach((child: any) => {
      child.position.z += dt * velocity.current
      if (child.position.z > 5) {
        child.position.z = -80 - Math.random() * 40
      }
    })
  })

  return (
    <group ref={group}>
      {nodes.map((n) => {
        const isSelected = selectedId === n.id
        return (
          <group
            key={n.id}
            userData={{ id: n.id }}
            position={[n.position.x, n.position.y, n.position.z]}
          >
            <mesh onClick={() => onSelect?.(n.id)}>
              <sphereGeometry args={[isSelected ? 0.28 : 0.24, 12, 12]} />
              <meshBasicMaterial
                color={isSelected ? '#f6d76b' : '#ffffff'}
                transparent
                opacity={0}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.72, 18, 18]} />
              <meshBasicMaterial
                color="#f6d76b"
                transparent
                opacity={0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
