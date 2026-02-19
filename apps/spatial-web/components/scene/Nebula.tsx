export default function Nebula() {
  return (
    <mesh position={[0, 0, -10]}>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial
        color="#02040f"
      />
    </mesh>
  );
}
