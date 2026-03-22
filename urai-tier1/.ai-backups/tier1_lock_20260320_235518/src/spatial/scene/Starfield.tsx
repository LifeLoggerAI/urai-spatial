"use client";

import { useMemo } from "react";
import StarMesh from "./StarMesh";
import { STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

function depthFactor(z: number) {
  const clamped = Math.max(-95, Math.min(0, z));
  const normalized = 1 - Math.abs(clamped) / 95;
  return 0.14 + normalized * 0.42;
}

export default function Starfield() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const hovered = useSceneStore((state) => state.hoveredStar);
  const selectStar = useSceneStore((state) => state.selectStar);
  const hoverStar = useSceneStore((state) => state.hoverStar);

  const visibleStars = useMemo(() => {
    if (mode === "home" || mode === "ground" || mode === "object") return [];
    return STARS;
  }, [mode]);

  if (!visibleStars.length) return null;

  return (
    <group>
      {visibleStars.map((star, index) => {
        const scale = depthFactor(star.position[2]) * star.size * 2.4;
        const focused = selectedStar === star.id;
        const isHovered = hovered === star.id;
        const emphasis = focused ? 1.85 : isHovered ? 1.35 : 1;
        return (
          <StarMesh
            key={star.id}
            id={star.id}
            position={star.position}
            baseScale={scale * emphasis}
            color={star.color}
            emissiveIntensity={star.glow + (index % 7 === 0 ? 0.7 : 0)}
            interactive={mode === "lifemap"}
            selected={focused}
            hovered={isHovered}
            mode={mode}
            onSelectStar={selectStar}
            onHoverStar={hoverStar}
          />
        );
      })}
    </group>
  );
}
