'use client'

export default function Orb() {
  return (
    <mesh position={[0, -0.05, 0]} castShadow>
      <sphereGeometry args={[0.42, 48, 48]} />
      <meshStandardMaterial
        color="#f2f2f2"
        emissive="#ffffff"
        emissiveIntensity={0.18}
        metalness={0.08}
        roughness={0.42}
      />
    </mesh>
  )
}
