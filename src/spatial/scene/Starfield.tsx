"use client";

import { SPATIAL_STARS } from "../data/stars";
import StarMesh from "./StarMesh";

export default function Starfield() {
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
