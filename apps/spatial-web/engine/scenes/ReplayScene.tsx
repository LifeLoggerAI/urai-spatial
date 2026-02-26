
export default function ReplayScene() {
  return (
    <mesh>
      <torusGeometry args={[1, 0.3, 16, 100]} />
      <meshStandardMaterial color="#00ffaa" />
    </mesh>
  )
}
