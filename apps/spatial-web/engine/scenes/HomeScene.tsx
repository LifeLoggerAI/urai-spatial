'use client'

import { MeshDistortMaterial, Sphere } from '@react-three/drei'
import OrbAura from '@/components/scene/OrbAura'

export default function HomeScene() {
  return (
    <>
      <Sphere args={[1.5, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#f05a7f"
          distort={0.3}
          speed={1.5}
        />
      </Sphere>
      <OrbAura />
    </>
  )
}
