'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useLifeMapStore } from '../state/useLifeMapStore'

const STAR_COUNT = 800

function seededPosition(i: number) {
  const x = Math.sin(i * 127.1) * 18
  const y = Math.cos(i * 311.7) * 12 + 6
  const z = -20 - (i % 12) * 8
  return new THREE.Vector3(x, y, z)
}

export default function Starfield() {
  const setSelection = useLifeMapStore((s) => s.setSelection)
  const selectedId = useLifeMapStore((s) => s.selectedId)

  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }).map((_, i) => ({
      id: `star-${i}`,
      position: seededPosition(i),
    }))
  }, [])

  return (
    <group position={[0, -4, 0]}>
      {stars.map((star) => {
        const isSelected = selectedId === star.id

        return (
          <mesh
            key={star.id}
            position={star.position}
            onClick={(e) => {
              e.stopPropagation()
              setSelection(star.id, star.position.clone())
            }}
          >
            <sphereGeometry args={[0.25, 24, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#8ab4ff"
              emissiveIntensity={isSelected ? 3 : 0.4}
            />
          </mesh>
        )
      })}
    </group>
  )
}