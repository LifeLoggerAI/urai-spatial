"use client"

import * as THREE from "three"

type Props = {
  position: [number, number, number]
}

export default function ClusterGlow({ position }: Props) {
  return (
    <mesh position={position} scale={[8, 8, 1]}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}