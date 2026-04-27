"use client";

export default function CinematicGroundAccents() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.58, -0.45]} receiveShadow>
        <ringGeometry args={[1.5, 5.4, 96]} />
        <meshBasicMaterial color="#112a6a" transparent opacity={0.18} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.24, -0.57, -0.08]} receiveShadow>
        <ringGeometry args={[0.8, 2.2, 96]} />
        <meshBasicMaterial color="#112a6a" transparent opacity={0.1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.38, -0.56, 0.16]} receiveShadow>
        <circleGeometry args={[0.96, 64]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
