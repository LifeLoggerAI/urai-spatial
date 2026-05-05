'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Points, Vector3 } from 'three'

export default function CinematicParticles({ active }: { active: boolean }) {
  const ref = useRef<Points>(null)

  const geometry = useMemo(() => {
    const count = 420
    const positions = new Float32Array(count * 3)
    const seed = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const radius = 0.7 + Math.random() * 2.2
      const angle = Math.random() * Math.PI * 2
      const height = -0.85 + Math.random() * 2.95

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = -2 + Math.sin(angle) * radius * 0.42
      seed[i] = Math.random() * Math.PI * 2
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('seed', new BufferAttribute(seed, 1))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.visible = active
    ref.current.rotation.y = t * 0.035
    ref.current.rotation.z = Math.sin(t * 0.18) * 0.025

    const scale = active ? 1 + Math.sin(t * 1.7) * 0.025 : 0.001
    ref.current.scale.lerp(new Vector3(scale, scale, scale), 0.06)
  })

  return (
    <points ref={ref} geometry={geometry} position={[0, 1.35, 0]}>
      <pointsMaterial color="#a78bfa" size={0.018} transparent opacity={0.68} depthWrite={false} />
    </points>
  )
}
