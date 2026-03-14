'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

/**
 * Deterministic atmospheric fog layer.
 * Tier-1 safe: single scene mutation, cleaned on unmount.
 */

export default function FogLayer() {

  const { scene } = useThree()

  useEffect(() => {

    const fog = new THREE.Fog('#000000', 20, 100)
    scene.fog = fog

    return () => {
      if (scene.fog === fog) {
        scene.fog = null
      }
    }

  }, [scene])

  return null
}