"use client";

import { useMemo, useState } from "react";
import { generateStars } from "@/spatial/data/stars";
import { useSceneStore } from "@/spatial/state/sceneStore";

export default function Starfield() {
  const stars = useMemo(() => generateStars(), []);
  const mode = useSceneStore((s) => s.mode);
  const setMode = useSceneStore((s) => s.setMode);
  const setSelectedStar = useSceneStore((s) => s.setSelectedStar);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <group>
      {stars.map((star) => {
        const isHovered = hovered === star.id;
        const isSelected = selectedStar?.id === star.id;
        const visibleScale = mode === "lifemap" ? 1.2 : 1;
        const selectedScale = isSelected ? 1.9 : isHovered ? 1.45 : visibleScale;
        const hitRadius = Math.max(star.size * (mode === "lifemap" ? 8 : 5), 3.2);

        return (
          <group key={star.id} position={star.position}>
            <mesh scale={selectedScale}>
              <sphereGeometry args={[star.size, 10, 10]} />
              <meshBasicMaterial color={star.color} />
            </mesh>

            <mesh
              onPointerEnter={(e) => {
                e.stopPropagation();
                setHovered(star.id);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                setHovered((prev) => (prev === star.id ? null : prev));
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedStar({
                  id: star.id,
                  position: star.position,
                  color: star.color,
                  size: star.size,
                });
                setMode("focus");
              }}
            >
              <sphereGeometry args={[hitRadius, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
