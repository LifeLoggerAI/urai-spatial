'use client'

export default function Orb() {
  return (
    <group position={[0, -3.6, -4]}>
      <mesh>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          color="#cfd9ff"
          emissive="#6e8cff"
          emissiveIntensity={2.4}
          roughness={0.15}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.6, 0]}
      >
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial
          color="#6e8cff"
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  )
}