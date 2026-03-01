'use client'

export default function Avatar() {
  return (
    <mesh position={[4, 1.2, 0]} castShadow>
      <capsuleGeometry args={[0.6, 2.2, 16, 32]} />
      <meshStandardMaterial color="#1a1e25" />
    </mesh>
  )
}
