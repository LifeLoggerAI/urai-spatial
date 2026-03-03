"use client"

export default function Starfield() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="white" />
    </mesh>
  )
}
