"use client";

export default function Horizon() {
  return (
    <group>
      {/* Main distant ground (very far, very low) */}
      <mesh position={[0, -55, -220]}>
        <sphereGeometry args={[14, 64, 64]} />
      </mesh>

      {/* Subtle atmospheric layer */}
      <mesh position={[0, -28, -180]}>
        <sphereGeometry args={[10, 48, 48]} />
        <meshBasicMaterial color="#3a5bdc" transparent opacity={0.01} />
      </mesh>
    </group>
  );
}
