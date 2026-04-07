'use client'

import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function Atmosphere() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog('#061634', 6, 24)
    return () => {
      scene.fog = null
    }
  }, [scene])

  return null
}
