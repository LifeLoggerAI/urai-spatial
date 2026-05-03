'use client'

import React from 'react'

export default function HomeSkyDome(props: {
  visible: boolean
}) {
  if (!props.visible) return null

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[72, 48, 48]} />
      <meshBasicMaterial color="#03060c" side={1} />
    </mesh>
  )
}
