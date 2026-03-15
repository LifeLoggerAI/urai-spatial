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
      const height = (Math.random() - 0.5) * 12

      const x = Math.cos(angle) * radius
      const y = height
      const z = Math.sin(angle) * radius - 150

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    g.computeBoundingSphere()

    return g

  }, [])

  const material = useMemo(() => {

    return new THREE.PointsMaterial({
      color: new THREE.Color("#b8caff"),
      size: 1.4,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    })

  }, [])

  return (

    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-5}
    />

  )

}