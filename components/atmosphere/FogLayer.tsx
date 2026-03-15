'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

type Props = {
  color?: THREE.ColorRepresentation
  near?: number
  far?: number
}

export default function FogLayer({
  color = '#000000',
  near = 20,
  far = 100,
}: Props) {
  const { scene } = useThree()

  useEffect(() => {
    const prevFog = scene.fog
    const fog = new THREE.Fog(color, near, far)
    scene.fog = fog

    return () => {
      if (scene.fog === fog) {
        scene.fog = prevFog
      }
    }
  }, [scene, color, near, far])

  return null
}