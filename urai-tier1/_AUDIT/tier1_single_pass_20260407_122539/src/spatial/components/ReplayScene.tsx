'use client'

import React from 'react'
import * as THREE from 'three'

type ReplaySceneProps = {
  active?: boolean
  starId?: string | null
  opacity?: number
  visible?: boolean
}

export default function ReplayScene(props: ReplaySceneProps) {
  const {
    opacity = 0.22,
    visible = true,
  } = props

  if (!visible) return null

  return (
    <group visible={visible}>
      <mesh scale={[18, 18, 18]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={'#0b040d'}
          side={THREE.BackSide}
          transparent
          opacity={0.92}
        />
      </mesh>

      <mesh scale={[10, 10, 10]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={'#15081b'}
          side={THREE.BackSide}
          transparent
          opacity={0.28}
        />
      </mesh>

      <mesh position={[0, 0, -6]} scale={[2.8, 2.8, 0.1]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial
          color={'#3f2a57'}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}
