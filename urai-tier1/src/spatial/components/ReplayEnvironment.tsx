'use client'
import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function ReplayEnvironment({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!group.current || !active) return
    group.current.rotation.y += 0.0005
  })

  if (!active) return null

  return (
    <group ref={group}>
      {/* FAR LAYER */}
      <mesh position={[0,0,-80]}>
        <sphereGeometry args={[60, 64, 64]} />
        <meshBasicMaterial color="#05010a" side={THREE.BackSide} />
      </mesh>

      {/* MID LAYER */}
      <mesh position={[0,0,-30]}>
        <sphereGeometry args={[25, 32, 32]} />
        <meshStandardMaterial color="#12051a" roughness={1} />
      </mesh>

      {/* NEAR LAYER */}
      <mesh position={[0,0,-8]}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshStandardMaterial color="#2a0a3a" />
      </mesh>
    </group>
  )
}
