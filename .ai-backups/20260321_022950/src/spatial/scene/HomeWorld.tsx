"use client";

export default function HomeWorld() {
  return (
    <group>
      <mesh position={[0, -1, 0]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial emissive={"#ffaa33"} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
