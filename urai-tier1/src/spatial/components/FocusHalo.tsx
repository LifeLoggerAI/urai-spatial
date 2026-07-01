'use client'

import React from 'react'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'

export default function FocusHalo(props: {
  star: LifeMapStar | null
  visible: boolean
}) {
  if (!props.visible || !props.star) return null

  const intensity = props.star.intensity ?? 0.5

  return (
    <mesh
      position={props.star.position}
      scale={[3.6, 3.6, 3.6]}
    >
      <sphereGeometry args={[0.2 + intensity * 0.14, 24, 24]} />
      <meshBasicMaterial
        color="#9cb8ff"
        transparent
        opacity={0.18}
      />
    </mesh>
  )
}
