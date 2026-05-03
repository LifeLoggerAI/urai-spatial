'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type StarTone = 'focus' | 'grief' | 'joy' | 'tense' | 'neutral' | 'recovery' | 'relationship'
type Star = { id: string; x: number; y: number; z: number; size: number; color: string; opacity: number; tone: StarTone; major: boolean }
type Link = { from: string; to: string; strength?: number }

export default function Starfield3D({
  stars,
  links = [],
  phase,
  onSelect,
}: {
  stars: Star[]
  links?: Link[]
  phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  onSelect?: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null)

  const nodes = useMemo(() => {
    return stars.map((s) => ({
      ...s,
      position: new THREE.Vector3((s.x - 50) / 2, (s.y - 50) / 2, -s.z * 20 - Math.random() * 50),
    }))
  }, [stars])

  const linkSegments = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    return links
      .map((link) => {
        const from = byId.get(link.from)
        const to = byId.get(link.to)
        if (!from || !to) return null
        return {
          id: `${link.from}-${link.to}`,
          from: from.position,
          to: to.position,
          strength: link.strength ?? 0.6,
        }
      })
      .filter((v): v is { id: string; from: THREE.Vector3; to: THREE.Vector3; strength: number } => Boolean(v))
  }, [links, nodes])

  useFrame((_, dt) => {
    if (!group.current) return
    let speed = 0
    if (phase === 'ASCENT') speed = 10
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'REPLAY') speed = 2

    group.current.children.forEach((child: any) => {
      child.position.z += dt * speed
      if (child.position.z > 5) child.position.z = -80 - Math.random() * 40
    })
  })

  return (
    <group ref={group}>
      {linkSegments.map((segment) => (
        <line key={segment.id}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[new Float32Array([
              segment.from.x, segment.from.y, segment.from.z,
              segment.to.x, segment.to.y, segment.to.z,
            ]), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#8fb4ff" transparent opacity={0.2 + segment.strength * 0.22} />
        </line>
      ))}
      {nodes.map((n) => (
        <mesh key={n.id} position={[n.position.x, n.position.y, n.position.z]} onClick={() => onSelect?.(n.id)}>
          <sphereGeometry args={[n.size / 30, n.major ? 14 : 8, n.major ? 14 : 8]} />
          <meshBasicMaterial color={n.color} transparent opacity={n.opacity} />
        </mesh>
      ))}
    </group>
  )
}
