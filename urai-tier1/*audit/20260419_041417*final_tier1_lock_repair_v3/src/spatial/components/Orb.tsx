"use client";

export default function Orb() {
  return (
    <group position={[0, 0.68, -0.22]}>
      <mesh scale={[0.92, 0.92, 0.92]}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshBasicMaterial color="#dbe7f4" transparent opacity={0.94} />
      </mesh>

      <mesh scale={[1.18, 1.18, 1.18]}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshBasicMaterial color="#bfcdf6" transparent opacity={0.10} />
      </mesh>

      <mesh
        position={[0, -0.60, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.92, 0.92, 0.92]}
      >
        <circleGeometry args={[0.62, 64]} />
        <meshBasicMaterial color="#dbe7f4" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
