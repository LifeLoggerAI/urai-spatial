'use client'

import * as THREE from 'three'

// Creates a soft, glowing band around the horizon to simulate atmospheric diffusion.
export default function AtmosphereBand() {
  // Using a Torus (donut) shape and rotating it to sit flat along the horizon line.
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
      <torusGeometry args={[200, 40, 8, 64]} />
      <meshStandardMaterial
        color="#0ea5e9" // A cool blue tint to match the scene's palette
        transparent
        opacity={0.07} // Very faint opacity for a subtle effect
        blending={THREE.AdditiveBlending} // Additive blending creates a glow effect
        side={THREE.DoubleSide}
        emissive="#0ea5e9" // Emissive property makes the material glow
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}
