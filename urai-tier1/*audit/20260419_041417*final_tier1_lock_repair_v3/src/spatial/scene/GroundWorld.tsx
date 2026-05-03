"use client";

export default function GroundWorld() {
  return (
    <group position={[0, -2.82, -3.8]}>
      <mesh rotation={[-Math.PI / 2 + 0.115, 0, 0]} position={[0, -0.55, -6.8]}>
        <circleGeometry args={[8.4, 96]} />
        <meshBasicMaterial color="#081a62" />
      </mesh>

      <mesh rotation={[-Math.PI / 2 + 0.095, 0, 0]} position={[0, -1.4, -11.8]}>
        <circleGeometry args={[14.5, 96]} />
        <meshBasicMaterial color="#030d35" transparent opacity={0.72} />
      </mesh>
    </group>
  );
}
