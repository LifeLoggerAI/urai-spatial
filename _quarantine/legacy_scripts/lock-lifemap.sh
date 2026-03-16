#!/usr/bin/env bash
set -e
BASE="apps/spatial-web/engine"

mkdir -p $BASE/state
cat > $BASE/state/useLifeMapStore.ts << 'INNER'
'use client'
import { create } from 'zustand'
import * as THREE from 'three'

type LifeMapState = {
  selectedId: string | null
  selectedPosition: THREE.Vector3 | null
  setSelection: (id: string, position: THREE.Vector3) => void
  clearSelection: () => void
}

export const useLifeMapStore = create<LifeMapState>((set) => ({
  selectedId: null,
  selectedPosition: null,
  setSelection: (id, position) =>
    set({ selectedId: id, selectedPosition: position }),
  clearSelection: () =>
    set({ selectedId: null, selectedPosition: null }),
}))
INNER

cat > $BASE/Starfield.tsx << 'INNER'
'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useLifeMapStore } from './state/useLifeMapStore'

const STAR_COUNT = 120

export default function Starfield() {
  const setSelection = useLifeMapStore((s) => s.setSelection)
  const selectedId = useLifeMapStore((s) => s.selectedId)

  const stars = useMemo(() => {
    const list = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = (Math.sin(i * 999) * 50) % 20
      const y = (Math.cos(i * 777) * 50) % 20
      const z = -10 - (i % 10) * 5
      list.push({
        id: `star-${i}`,
        position: new THREE.Vector3(x, y, z),
      })
    }
    return list
  }, [])

  return (
    <>
      {stars.map((star) => (
        <mesh
          key={star.id}
          position={star.position}
          onClick={(e) => {
            e.stopPropagation()
            setSelection(star.id, star.position.clone())
          }}
        >
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#8ab4ff"
            emissiveIntensity={selectedId === star.id ? 3 : 0.4}
          />
        </mesh>
      ))}
    </>
  )
}
INNER

cat > $BASE/CameraRig.tsx << 'INNER'
'use client'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useLifeMapStore } from './state/useLifeMapStore'

export default function CameraRig() {
  const { camera } = useThree()
  const selectedPosition = useLifeMapStore((s) => s.selectedPosition)

  useFrame(() => {
    if (!selectedPosition) return
    const target = selectedPosition.clone().add(new THREE.Vector3(0, 0, 3))
    camera.position.lerp(target, 0.05)
    camera.lookAt(selectedPosition)
  })

  return null
}
INNER
