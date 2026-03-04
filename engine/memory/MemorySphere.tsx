"use client"

export default function MemorySphere() {
  return (
    <mesh position={[0, 0, -5]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshBasicMaterial color="red" />
    </mesh>
  )
}
