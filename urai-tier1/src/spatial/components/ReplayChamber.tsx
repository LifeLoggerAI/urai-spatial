'use client'

import React from 'react'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'

export default function ReplayChamber(props: { star: LifeMapStar | null; visible: boolean }) {
  if (!props.visible) return null

  const p = props.star?.position ?? [0, 0, 0]
  const intensity = props.star?.intensity ?? 0.5

  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={[p[0], p[1], p[2] + 1.4]} intensity={1.4} color="#f1ccff" />
      <mesh position={[p[0], p[1], p[2] - 1.2]}>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshStandardMaterial color="#1a1022" emissive="#14081b" emissiveIntensity={0.35} transparent opacity={0.92} side={2} />
      </mesh>
      {props.star ? (
        <mesh position={p} scale={[1.6, 1.6, 1.6]}>
          <sphereGeometry args={[0.18 + intensity * 0.18, 28, 28]} />
          <meshStandardMaterial color="#fff0ff" emissive="#d08dff" emissiveIntensity={2.1} />
        </mesh>
      ) : null}
    </>
  )
}
