"use client";

import * as THREE from "three";

export function AscentVisualEngine({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, 4.4, -11.8]}>
      {/* TIER4_REFERENCE_ASCENT_VISUAL_ENGINE_V1 */}

      <mesh position={[0, 0, -4.2]}>
        <sphereGeometry args={[24, 96, 96]} />
        <meshBasicMaterial color="#050818" transparent opacity={0.19} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.08, 0, 0]} position={[0, -1.25, -1.4]}>
        <ringGeometry args={[4.8, 5.15, 220]} />
        <meshBasicMaterial color="#9b7cff" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.24, 0.22, 0.08]} position={[0, -0.55, -2.8]}>
        <ringGeometry args={[8.2, 8.45, 260]} />
        <meshBasicMaterial color="#5c3ee0" transparent opacity={0.085} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.4, -0.24, -0.05]} position={[0, 0.15, -4.2]}>
        <ringGeometry args={[12.0, 12.16, 280]} />
        <meshBasicMaterial color="#2f236f" transparent opacity={0.065} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {Array.from({ length: 190 }).map((_, i) => {
        const a = i * 2.399963;
        const layer = i % 7;
        const radius = 2.2 + layer * 1.22 + (i % 13) * 0.055;
        const y = Math.sin(i * 0.41) * (0.75 + layer * 0.18);
        const z = -0.55 - layer * 0.78 - (i % 19) * 0.035;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius + z]}>
            <sphereGeometry args={[0.008 + (i % 4) * 0.004, 8, 8]} />
            <meshBasicMaterial color={layer % 3 === 0 ? "#efeaff" : layer % 3 === 1 ? "#b7a4ff" : "#735cff"} transparent opacity={0.06 + layer * 0.012} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
