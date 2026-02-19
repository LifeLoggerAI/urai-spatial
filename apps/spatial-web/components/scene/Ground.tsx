export default function Ground() {
  return (
    <mesh position={[0, -2.2, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial
        color="#001122"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
