'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Subtle cinematic camera rig.
 * Adds slow breathing motion to the scene root.
 */

export default function CameraRig() {

  const groupRef = useRef<THREE.Group | null>(null)

  useFrame((state) => {

    const group = groupRef.current
    if (!group) return

    const t = state.clock.elapsedTime

    group.position.y = Math.sin(t * 0.2) * 0.05
    group.rotation.y = Math.sin(t * 0.1) * 0.05

  })

  return <group ref={groupRef} />
}