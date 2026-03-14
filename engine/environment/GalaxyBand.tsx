"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function GalaxyBand() {

  const geometry = useMemo(() => {

    const count = 2000
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {

      const angle = Math.random() * Math.PI * 2
      const radius = 60 + Math.random() * 80
      const height = (Math.random() - 0.5) * 10

      const x = Math.cos(angle) * radius
      const y = height
      const z = Math.sin(angle) * radius - 150

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

    }

    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    return g

  }, [])

  return (

    <points geometry={geometry} frustumCulled={false}>

      <pointsMaterial
        size={1.1}
        color="#b8caff"
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
        depthTest={false}
      />

    </points>

  )

}