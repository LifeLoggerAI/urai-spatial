'use client'
export default function DebugCube() {
  return (
    <mesh position={[0,0,0]}>
      <boxGeometry args={[2,2,2]} />
      <meshBasicMaterial color="hotpink" />
    </mesh>
  )
}
