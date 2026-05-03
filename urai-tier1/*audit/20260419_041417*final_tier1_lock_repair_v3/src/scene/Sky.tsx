'use client'

import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function Sky() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#061634')
  }, [scene])

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[100, 32, 32]} />
      <meshBasicMaterial color="#061634" side={THREE.BackSide} />
    </mesh>
  )
}
