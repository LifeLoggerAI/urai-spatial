'use client'

import React from 'react'

export default function StarfieldDust(props: {
  visible: boolean
}) {
  if (!props.visible) return null

  return (
    <>
      <mesh position={[-7, 2.2, -16]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color="#7487ad" transparent opacity={0.22} />
      </mesh>
      <mesh position={[5.5, -1.4, -21]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#7487ad" transparent opacity={0.14} />
      </mesh>
      <mesh position={[0.6, 2.9, -27]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color="#a6b4d0" transparent opacity={0.11} />
      </mesh>
      <mesh position={[-3.5, 0.4, -24]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color="#697ca5" transparent opacity={0.1} />
      </mesh>
    </>
  )
}
