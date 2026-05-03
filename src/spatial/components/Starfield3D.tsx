'use client'

import { Html } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SpatialStarNode } from '@/spatial/data/stars'

const TONE_COLOR: Record<SpatialStarNode['tone'], string> = {
  cool: '#9ad8ff',
  warm: '#ffd089',
  neutral: '#dce7ff',
  mystic: '#c8a6ff',
}

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
  selectedStarId,
  onSelect,
}: {
  stars: SpatialStarNode[]
  phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  selectedStarId?: string | null
  onSelect?: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const starGroup = useRef<THREE.Group>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const nodes = useMemo(
    () =>
      stars.map((s) => {
        const depthOffset = hash01FromId(s.id)

        return {
          ...s,
          position: new THREE.Vector3(
            (s.x - 50) / 2,
            (s.y - 50) / 2,
            -s.z * 18 - (s.kind === 'background' ? 25 : 6) - depthOffset * 10
          ),
          respawnZ: -90 - depthOffset * 40,
        }
      }),
    [stars]
  )

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const threads = useMemo(() => {
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = []

    nodes
      .filter((n) => n.kind === 'major')
      .forEach((n) => {
        n.connectedTo.forEach((toId) => {
          const to = nodeMap.get(toId)
          if (!to) return
          if (n.id < to.id) pairs.push([n.position, to.position])
        })
      })

    return pairs
  }, [nodeMap, nodes])

  useFrame((_, dt) => {
    if (!group.current || !starGroup.current) return

    let speed = 0

    if (phase === 'ASCENT') speed = 10
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'FOCUS') speed = 0
    else if (phase === 'REPLAY') speed = 2

    group.current.rotation.z += dt * 0.004

    starGroup.current.children.forEach((child: THREE.Object3D, index) => {
      child.position.z += dt * speed

      if (child.position.z > 5) {
        child.position.z = nodes[index]?.respawnZ ?? -90
      }
    })
  })

  return (
    <group ref={group}>
      {threads.map(([from, to], i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([from, to])
        const depthOpacity = 0.16 + Math.max(0, Math.min(0.2, Math.abs(from.z - to.z) / 120))

        return (
          <line key={`thread-${i}`} geometry={geometry}>
            <lineBasicMaterial color="#8ba7ff" transparent opacity={depthOpacity} />
          </line>
        )
      })}

      <group ref={starGroup}>
        {nodes.map((n) => {
          const isMajor = n.kind === 'major'
          const isActive = hoveredId === n.id || selectedStarId === n.id
          const radius = isMajor ? 0.32 : 0.11
          const opacity = isMajor ? 0.95 : 0.38

          return (
            <mesh
              key={n.id}
              position={[n.position.x, n.position.y, n.position.z]}
              onPointerOver={() => isMajor && setHoveredId(n.id)}
              onPointerOut={() => isMajor && setHoveredId(null)}
              onClick={() => isMajor && onSelect?.(n.id)}
            >
              <sphereGeometry args={[radius, 12, 12]} />
              <meshBasicMaterial color={TONE_COLOR[n.tone]} transparent opacity={opacity} />

              {isMajor && (
                <pointLight
                  color={TONE_COLOR[n.tone]}
                  intensity={isActive ? 4 : 2.1}
                  distance={isActive ? 5 : 3.4}
                />
              )}

              {isMajor && isActive && (
                <Html center distanceFactor={9}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#f6f8ff',
                      textShadow: '0 0 10px rgba(97,126,255,0.65)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.label}
                  </div>
                </Html>
              )}
            </mesh>
          )
        })}
      </group>
    </group>
  )
}