"use client"

import { useMemo } from "react"
import * as THREE from "three"

interface Props {
  position?: [number, number, number]
  texture?: THREE.Texture
}

export default function MemoryImage({ position, texture }: Props) {

  const pos = useMemo(() => {
    if (!position) return null
    return new THREE.Vector3(position[0], position[1], position[2] - 0.05)
  }, [position])

  if (!pos) return null

  return (

    <mesh position={pos}>

      <planeGeometry args={[1.8, 1.8]} />

      <meshBasicMaterial
        color={texture ? "white" : "#eeeeee"}
        map={texture}
        transparent
      />

    </mesh>

  )

}