import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function AtmosphereLayer() {
  const { scene } = useThree()

  useEffect(() => {
    const fogColor = new THREE.Color('#05070d') // deep space tone
    scene.fog = new THREE.Fog(fogColor, 8, 35)

    return () => {
      scene.fog = null
    }
  }, [scene])

  return null
}
