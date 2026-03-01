'use client'

export default function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1, 0]}
      receiveShadow
    >
      <planeGeometry args={[8000, 8000]} />
      <meshStandardMaterial
        color="#070b14"
        roughness={1}
      />
    </mesh>
  )
}
