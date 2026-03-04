'use client'

export default function Avatar() {
  return (
    <group position={[2.4, -3.0, -1.2]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 2.0, 0]}>
        <capsuleGeometry args={[0.75, 3.6, 8, 16]} />
        <meshStandardMaterial color="#05060a" roughness={1} />
      </mesh>

      <mesh position={[0, 4.0, 0]}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.9} />
      </mesh>
    </group>
  )
}
