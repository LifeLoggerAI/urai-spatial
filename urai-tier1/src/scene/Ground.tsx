'use client'

import * as THREE from 'three'

export default function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, -4.8]} receiveShadow>
        <planeGeometry args={[96, 96, 1, 1]} />
        <meshStandardMaterial color="#11101b" roughness={0.52} metalness={0.18} emissive="#0c1024" emissiveIntensity={0.12} />
      </mesh>

      <mesh rotation={[-Math.PI / 2.18, 0, 0]} position={[0, -0.72, -13.5]} receiveShadow>
        <planeGeometry args={[88, 18, 1, 1]} />
        <meshStandardMaterial
          color="#202945"
          roughness={0.72}
          metalness={0.06}
          transparent
          opacity={0.82}
          emissive="#111a35"
          emissiveIntensity={0.12}
        />
      </mesh>

      <mesh position={[0, -0.54, -10.8]} rotation={[-0.1, 0, 0]}>
        <planeGeometry args={[70, 4.8]} />
        <meshBasicMaterial
          color="#8da1ff"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, -0.83, -6.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 12.5, 160]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.028}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -0.78, -18.5]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[96, 5.2]} />
        <meshBasicMaterial
          color="#ffb86b"
          transparent
          opacity={0.055}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
