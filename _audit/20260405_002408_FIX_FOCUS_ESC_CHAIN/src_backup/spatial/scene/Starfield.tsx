"use client";

import { SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import StarMesh from "./StarMesh";

export default function Starfield() {
  const mode = useSceneStore((s) => s.mode);

  if (mode !== "lifemap" && mode !== "replay") return null;

  return (
    <group>
      {SPATIAL_STARS.map((star) => (
        <StarMesh
          key={star.id}
          id={star.id}
          position={star.position}
          color={star.color}
          scale={star.size}
        />
      ))}
    </group>
  );
}
