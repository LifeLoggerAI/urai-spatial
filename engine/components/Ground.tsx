'use client'

export default function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.6, 0]}  // LOWERED ground
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial
        color="#05060a"
        roughness={1}
      />
    </mesh>
  )
}
