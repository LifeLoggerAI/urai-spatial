"use client";

export default function GroundWorld() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={"#050505"} />
    </mesh>
  );
}
