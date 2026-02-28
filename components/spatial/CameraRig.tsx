'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export default function CameraRig() {
  const group = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.2) * 0.05
      group.current.rotation.y = Math.sin(t * 0.1) * 0.05
    }
  })

  return <group ref={group} />
}
