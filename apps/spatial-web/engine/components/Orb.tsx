'use client'
import * as THREE from 'three'

export default function Orb() {
  return (
    <>
      <mesh position={[0, 0.6, -6]}>
        <sphereGeometry args={[3.2, 64, 64]} />
        <meshStandardMaterial
          color="#d9f0ff"
          emissive="#7ecbff"
          emissiveIntensity={3}
        />
      </mesh>

      <mesh position={[0, 0.6, -6]}>
        <sphereGeometry args={[5.2, 64, 64]} />
        <meshBasicMaterial
          color="#7ecbff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}
