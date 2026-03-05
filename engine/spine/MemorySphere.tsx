"use client"

export default function MemorySphere({ position }) {

  if (!position) return null

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.9, 48, 48]} />
      <meshStandardMaterial
        color="#7fa9c6"
        transparent
        opacity={0.32}
        roughness={0.35}
        metalness={0.05}
      />
    </mesh>
  )
}