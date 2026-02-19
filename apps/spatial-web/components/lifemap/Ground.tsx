/* eslint-disable react/no-unknown-property */

export default function Ground() {
  return (
    <mesh position={[0, -3.5, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="#001122" transparent opacity={0.6} />
    </mesh>
  )
}
