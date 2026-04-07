"use client";

import { stars } from "../data/stars";
import StarMesh from "./StarMesh";

export default function Starfield() {
  return (
    <group>
      {stars.map((s) => (
        <StarMesh key={s.id} star={s} />
      ))}
    </group>
  );
}
