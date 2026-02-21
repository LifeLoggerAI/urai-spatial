'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Stars } from '@react-three/drei'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { demoStars } from '../../lib/demoData'

function Star({ id, position, size }: any) {
  const router = useRouter()
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)

  // random phase so all stars don't pulse together
  const phase = Math.random() * Math.PI * 2

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // slow pulse
    const intensity =
      1.5 + Math.sin(t * 0.8 + phase) * 0.5

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = intensity
    }
  })

  return (
    <Sphere
      args={[size, 32, 32]}
      position={position}
      onClick={() => router.push(`/lifemap/${id}`)}
    >
      <meshStandardMaterial
        ref={materialRef}
        color="white"
        emissive="cyan"
        emissiveIntensity={1.5}
      />
    </Sphere>
  )
}

export default function LifeMapCanvas() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        fade
      />

      {demoStars.map((star) => (
        <Star key={star.id} {...star} />
      ))}
    </>
  )
}
