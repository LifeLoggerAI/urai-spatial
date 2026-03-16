"use client"

import * as THREE from "three"
import { useMemo, useEffect } from "react"

type Props = {
  position?: [number, number, number]
  scale?: number
  opacity?: number
}

export default function DiffractionStars({
  position = [0, 0, 0],
  scale = 1,
  opacity = 0.25,
}: Props) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const size = 12

    const positions = new Float32Array([
      -size, 0, 0,
       size, 0, 0,

       0, -size, 0,
       0,  size, 0,

      -size * 0.7, -size * 0.7, 0,
       size * 0.7,  size * 0.7, 0,

      -size * 0.7,  size * 0.7, 0,
       size * 0.7, -size * 0.7, 0,
    ])

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.LineBasicMaterial({
      color: "#e6ecff",
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
    })

    return { geometry: geo, material: mat }
  }, [opacity])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <lineSegments
      position={position}
      scale={scale}
      geometry={geometry}
      material={material}
    />
  )
}