'use client'

import * as THREE from 'three'

export default function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, -4.8]} receiveShadow>
        <planeGeometry args={[96, 96, 1, 1]} />
        <meshStandardMaterial color="#121421" roughness={0.96} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2.18, 0, 0]} position={[0, -0.72, -13.5]} receiveShadow>
        <planeGeometry args={[88, 18, 1, 1]} />
        <meshStandardMaterial
          color="#1d2436"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.74}
        />
      </mesh>

      <mesh position={[0, -0.54, -10.8]} rotation={[-0.1, 0, 0]}>
        <planeGeometry args={[70, 4.8]} />
        <meshBasicMaterial
          color="#7d92ff"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
