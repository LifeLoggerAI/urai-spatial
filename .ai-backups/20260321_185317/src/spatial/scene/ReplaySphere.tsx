"use client";

import { useSceneStore } from "../state/sceneStore";

export default function ReplaySphere() {
  const star = useSceneStore((s) => s.selectedStar);

  if (!star) return null;

  return (
    <mesh>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshStandardMaterial
        emissive={star.color}
        emissiveIntensity={3}
        color={"black"}
      />
    </mesh>
  );
}
