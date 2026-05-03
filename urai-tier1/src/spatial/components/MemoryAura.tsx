"use client";

import * as THREE from "three";

type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export default function MemoryAura({
  phase,
  position,
}: {
  phase: Phase;
  position?: [number, number, number] | null;
}) {
  // Only show in Focus + Replay
  if (!position || (phase !== "FOCUS" && phase !== "REPLAY")) return null;

  return (
    <group position={position}>

      {/* Primary subtle ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial
          color="#9b7bff"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Secondary faint ring */}
      <mesh rotation={[Math.PI / 2.2, 0.2, 0.1]}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial
          color="#9b7bff"
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

    </group>
  );
}
