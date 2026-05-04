"use client";

type GroundWorldProps = {
  recession?: number;
  elevation?: number;
  opacity?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function GroundWorld({ recession = 0, elevation = 0, opacity = 1 }: GroundWorldProps) {
  const recess = clamp01(recession);
  const lift = clamp01(elevation);
  const materialOpacity = clamp01(opacity);

  return (
    <group position={[0, -recess * 0.4 + lift * 0.16, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -recess * 1.6]} receiveShadow>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#02040a" roughness={1} metalness={0.01} transparent opacity={materialOpacity} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015 - recess * 0.1 + lift * 0.05, -0.45 - recess * 0.8]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#03091a" roughness={1} metalness={0} transparent opacity={0.22 * materialOpacity} />
      </mesh>
    </group>
  );
}
