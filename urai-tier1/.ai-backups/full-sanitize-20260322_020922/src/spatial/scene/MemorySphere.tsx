"use client";

import { useSceneStore } from "@/spatial/state/sceneStore";

export default function MemorySphere() {
  const mode = useSceneStore((s) => s.mode);
  const scale = mode === "lifemap" ? 0.55 : 1;
  const opacity = mode === "lifemap" ? 0.1 : 0.2;

  return (
    <mesh position={[0, 0, 0]} scale={scale}>
      <sphereGeometry args={[18, 40, 40]} />
      <meshStandardMaterial
        color="#8ec5ff"
        transparent
        opacity={opacity}
        emissive="#1e3a5f"
        emissiveIntensity={0.45}
        roughness={0.35}
        metalness={0.05}
      />
    </mesh>
  );
}
