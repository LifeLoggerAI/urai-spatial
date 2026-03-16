'use client'
export default function DebugCube() {
  return (
    <mesh>
      <boxGeometry args={[2,2,2]} />
      <meshBasicMaterial color="hotpink" />
    </mesh>
  )
}
