"use client";

import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

export default function ReplaySphere() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  if (mode !== "replay") return null;

  const star = resolveStarById(selectedStarId);
  if (!star) return null;

  return (
    <group position={star.position}>
      <mesh>
        <sphereGeometry args={[0.58, 30, 30]} />
        <meshPhysicalMaterial
          color="#f5f9ff"
          emissive={star.color}
          emissiveIntensity={2.4}
          roughness={0.1}
          metalness={0.08}
          transparent
          opacity={0.82}
          transmission={0.18}
          thickness={0.42}
        />
      </mesh>
      <mesh scale={2.2}>
        <sphereGeometry args={[0.58, 18, 18]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
