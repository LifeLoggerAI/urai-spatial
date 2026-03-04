'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Points, PointMaterial } from '@react-three/drei'

export default function EnvironmentUpgrades() {
  const stars = useMemo(() => {
    const arr = new Float32Array(1500 * 3)
    for (let i = 0; i < 1500; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 200
      arr[i * 3 + 1] = Math.random() * 120
      arr[i * 3 + 2] = (Math.random() - 0.5) * 200
    }
    return arr
  }, [])

  return (
    <>

      {/* Off-axis cinematic key light */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
        color={'#ffffff'}
      />

      <ambientLight intensity={0.35} />

      {/* Deep background starfield */}
      <Points positions={stars} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </>
  )
}
