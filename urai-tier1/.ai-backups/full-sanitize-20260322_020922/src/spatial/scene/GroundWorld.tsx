"use client";

export default function GroundWorld() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#02040a" roughness={1} metalness={0.01} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -0.45]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#03091a" roughness={1} metalness={0} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
