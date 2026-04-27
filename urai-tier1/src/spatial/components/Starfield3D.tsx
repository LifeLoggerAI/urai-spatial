'use client'

import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

type Star = {
  id: string
  x: number
  y: number
  z: number
}

export default function Starfield3D({
  stars,
  phase,
  selectedId,
  ascentProgress = 1,
  onSelect,
  onEnterReplay,
}: {
  stars: Star[]
  phase: Phase
  selectedId?: string | null
  ascentProgress?: number
  onSelect?: (id: string) => void
  onEnterReplay?: () => void
}) {
  const nodes = useMemo(() => {
    return stars.map((s, i) => ({
      id: s.id,
      depth: -16 - s.z * 6 - i * 3.2,
      pos: new THREE.Vector3(
        (s.x - 50) * 0.12,
        (50 - s.y) * 0.1,
        -16 - s.z * 6 - i * 3.2
      ),
    }))
  }, [stars])

  const click = (e: ThreeEvent<MouseEvent>, id: string) => {
    e.stopPropagation()
    if (phase === 'LIFEMAP') onSelect?.(id)
    if (phase === 'FOCUS' && selectedId === id) onEnterReplay?.()
  }

  return (
    <group>
      {nodes.map((n, i) => {
        const sel = selectedId === n.id

        const depthFactor = Math.min(1, Math.abs(n.depth) / 40)

        const opacity =
          phase === 'ASCENT'
            ? 0.2 + ascentProgress * 0.5
            : phase === 'LIFEMAP'
              ? 0.7 * depthFactor
              : phase === 'FOCUS'
                ? sel ? 0.9 : 0.03
                : phase === 'REPLAY'
                  ? sel ? 0.12 : 0.05 * depthFactor
                  : 0

        const scale =
          phase === 'FOCUS'
            ? sel ? 0.55 : 0.28
            : phase === 'REPLAY'
              ? sel ? 0.42 : 0.25
              : 0.38

        return (
          <group key={n.id} position={[n.pos.x, n.pos.y, n.pos.z]} scale={scale}>
            <mesh onClick={(e) => click(e, n.id)}>
              <sphereGeometry args={[0.18 + (i % 3) * 0.02, 20, 20]} />
              <meshBasicMaterial transparent opacity={opacity} color={sel ? '#f6d76b' : '#cfe1ff'} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
