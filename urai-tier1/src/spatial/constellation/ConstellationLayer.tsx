'use client'

import { useMemo } from 'react'
import { useConstellationManifests } from './useConstellationManifests'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function Node({ index }: { index: number }) {
  const ref = useRef<Mesh>(null)

  const position = useMemo(() => {
    const angle = (index / 24) * Math.PI * 2
    const radius = 3.5 + Math.sin(index) * 0.6
    return [Math.cos(angle) * radius, 1.2 + Math.sin(index * 0.5) * 0.6, -Math.sin(angle) * radius]
  }, [index])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.2
  })

  return (
    <mesh ref={ref} position={position as any}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial emissive="#8b5cf6" emissiveIntensity={1.2} color="#1f1b2e" />
    </mesh>
  )
}

export default function ConstellationLayer({ enabled }: { enabled: boolean }) {
  const manifests = useConstellationManifests(enabled)

  if (!enabled) return null

  return (
    <group>
      {manifests.map((_, i) => (
        <Node key={i} index={i} />
      ))}
    </group>
  )
}
