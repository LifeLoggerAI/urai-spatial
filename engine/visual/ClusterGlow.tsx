"use client"

import { useMemo } from "react"
import * as THREE from "three"

type Props = {
  position: [number, number, number]
}

export default function ClusterGlow({ position }: Props) {

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#7aa6ff",
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  return (
    <mesh position={position} scale={[6, 6, 1]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}