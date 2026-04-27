"use client";

import * as THREE from "three";

export function LifeMapVisualEngine({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, 4.9, -15.2]}>
      {/* TIER4_REFERENCE_LIFEMAP_VISUAL_ENGINE_V1 */}

      <mesh position={[0, 0, -6.2]}>
        <sphereGeometry args={[38, 96, 96]} />
        <meshBasicMaterial color="#020714" transparent opacity={0.28} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.16, 0.18, 0]} position={[0, -0.6, -2.4]}>
        <ringGeometry args={[6.5, 6.68, 260]} />
        <meshBasicMaterial color="#9a81ff" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.35, -0.28, 0.18]} position={[0, -0.2, -3.7]}>
        <ringGeometry args={[10.4, 10.58, 300]} />
        <meshBasicMaterial color="#5a42d0" transparent opacity={0.085} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.58, 0.3, -0.08]} position={[0, 0.35, -5.4]}>
        <ringGeometry args={[14.5, 14.64, 320]} />
        <meshBasicMaterial color="#2c236f" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {Array.from({ length: 420 }).map((_, i) => {
        const a = i * 2.399963;
        const layer = i % 9;
        const radius = 3.2 + layer * 1.22 + (i % 17) * 0.055;
        const y = Math.sin(i * 0.43) * (1.4 + layer * 0.2);
        const z = -0.8 - layer * 1.0 - (i % 23) * 0.04;
        const size = 0.007 + (i % 5) * 0.0035;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius + z]}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial color={layer % 4 === 0 ? "#fff8ff" : layer % 4 === 1 ? "#c5b7ff" : layer % 4 === 2 ? "#806dff" : "#4a38a9"} transparent opacity={0.075 + layer * 0.007} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
