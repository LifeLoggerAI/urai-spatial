'use client'

import React from 'react'

export default function GroundPlane(props: {
  visible: boolean
  active: boolean
}) {
  if (!props.visible) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.22, 0]}>
      <circleGeometry args={[13.8, 144]} />
      <meshStandardMaterial
        color={props.active ? '#1a2a38' : '#0f1822'}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}
