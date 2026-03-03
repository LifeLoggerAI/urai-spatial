import DebugCube from './DebugCube'
'use client'
export default function SceneRouter() {
  return (
    <mesh>
      <boxGeometry args={[2,2,2]} />
      <meshBasicMaterial color="red" />
    </mesh>
  )
}
