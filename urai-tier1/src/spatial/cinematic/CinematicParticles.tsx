'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Points, Vector3 } from 'three'

function seeded(index: number) {
  const x = Math.sin(index * 127.13) * 10000
  return x - Math.floor(x)
}

export default function CinematicParticles({ active }: { active: boolean }) {
  const ref = useRef<Points>(null)

  const geometry = useMemo(() => {
    const count = 940
    const positions = new Float32Array(count * 3)
    const seed = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const radius = 1.6 + seeded(i + 7) * 5.6
      const angle = seeded(i + 21) * Math.PI * 2
      const height = -1.0 + seeded(i + 42) * 3.4

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = -3.8 + Math.sin(angle) * radius * 0.52
      seed[i] = seeded(i + 99) * Math.PI * 2
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
    ref.current.rotation.y = t * 0.018
    ref.current.rotation.z = Math.sin(t * 0.14) * 0.02

    const scale = active ? 1 + Math.sin(t * 0.9) * 0.018 : 0.001
    ref.current.scale.lerp(new Vector3(scale, scale, scale), 0.045)
  })

  return (
    <points ref={ref} geometry={geometry} position={[0, 0.3, -0.6]} frustumCulled={false}>
      <pointsMaterial color="#b8ccff" size={0.014} transparent opacity={0.54} depthWrite={false} />
    </points>
  )
}
