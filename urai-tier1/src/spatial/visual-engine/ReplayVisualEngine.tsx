"use client";

import * as THREE from "three";

export function ReplayVisualEngine({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, 4.8, -14.2]}>
      {/* TIER4_REFERENCE_REPLAY_VISUAL_ENGINE_V1 */}

      <mesh>
        <sphereGeometry args={[12.8, 120, 120]} />
        <meshBasicMaterial color="#030108" transparent opacity={0.28} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -1.9]}>
        <sphereGeometry args={[8.7, 120, 120]} />
        <meshBasicMaterial color="#16042e" transparent opacity={0.19} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -2.8]}>
        <sphereGeometry args={[5.3, 96, 96]} />
        <meshBasicMaterial color="#5f35c9" transparent opacity={0.095} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, -1.1]}>
        <ringGeometry args={[2.2, 7.2, 220]} />
        <meshBasicMaterial color="#a88cff" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.25, 0.18, 0]} position={[0, -0.8, -2.4]}>
        <ringGeometry args={[7.4, 7.62, 260]} />
        <meshBasicMaterial color="#5736d5" transparent opacity={0.085} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {Array.from({ length: 260 }).map((_, i) => {
        const a = i * 2.399963;
        const shell = i % 8;
        const radius = 0.9 + shell * 0.74 + (i % 17) * 0.035;
        const z = -0.55 - shell * 0.46 - (i % 19) * 0.035;
        const y = Math.sin(i * 0.73) * (1.05 + shell * 0.22);
        return (
          <mesh key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius + z]}>
            <sphereGeometry args={[0.01 + (i % 4) * 0.004, 8, 8]} />
            <meshBasicMaterial color={shell % 3 === 0 ? "#f3edff" : shell % 3 === 1 ? "#c6b8ff" : "#806bff"} transparent opacity={0.09 + shell * 0.011} depthWrite={false} />
          </mesh>
        );
      })}

      <mesh position={[0, 0, -2.2]}>
        <sphereGeometry args={[0.18, 48, 48]} />
        <meshStandardMaterial color="#f5f0ff" emissive="#aa82ff" emissiveIntensity={1.65} roughness={0.16} />
      </mesh>
    </group>
  );
}
