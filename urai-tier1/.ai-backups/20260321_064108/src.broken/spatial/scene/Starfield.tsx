"use client";

import { STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import StarMesh from "./StarMesh";

function depthScale(z: number, size: number) {
  const near = Math.max(0, Math.min(1, (z + 90) / 90));
  return (0.12 + near * 0.4) * size * 2.8;
}

export default function Starfield() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const hoveredStar = useSceneStore((state) => state.hoveredStar);
  const hoverStar = useSceneStore((state) => state.hoverStar);
  const focusStar = useSceneStore((state) => state.focusStar);

  const visible = mode === "lifemap" || mode === "replay" || phase === "to-lifemap" || phase === "to-home";
  if (!visible) return null;

  return (
    <group>
      {STARS.map((star) => {
        const isSelected = selectedStar === star.id;
        const isHovered = hoveredStar === star.id;
        const dimmed = Boolean(selectedStar && !isSelected);

        return (
          <StarMesh
            key={star.id}
            id={star.id}
            position={star.position}
            scale={depthScale(star.position[2], star.size)}
            color={star.color}
            glow={star.glow}
            selected={isSelected}
            hovered={isHovered}
            interactive={mode === "lifemap"}
            dimmed={mode === "replay" ? true : dimmed}
            onHover={hoverStar}
            onClick={focusStar}
          />
        );
      })}
    </group>
  );
}
