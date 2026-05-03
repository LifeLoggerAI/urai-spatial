'use client'

import React from 'react'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'

export default function ReplayAtmosphere(props: {
  star: LifeMapStar | null
  visible: boolean
}) {
  if (!props.visible) return null

  const p = props.star?.position ?? [0, 0, 0]

  return (
    <>
      <mesh position={[p[0], p[1], p[2] - 0.7]}>
        <sphereGeometry args={[5.2, 48, 48]} />
        <meshBasicMaterial
          color="#150a18"
          transparent
          opacity={0.2}
          side={2}
        />
      </mesh>

      <mesh position={[p[0] + 0.22, p[1] + 0.08, p[2] - 0.18]}>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshBasicMaterial
          color="#efc8ff"
          transparent
          opacity={0.22}
        />
      </mesh>

      <mesh position={[p[0] - 0.38, p[1] - 0.14, p[2] - 0.46]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshBasicMaterial
          color="#b48ad1"
          transparent
          opacity={0.16}
        />
      </mesh>
    </>
  )
}
