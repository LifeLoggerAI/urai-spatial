"use client";
import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";

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
        const isDimmed = !!selectedStar && !isSelected;
        const drawScale = isSelected ? star.size * 1.55 : star.size;
        const baseScale = mode === "lifemap" ? 1.15 : 1;
        const scale = isSelected ? 1.7 : isHovered ? 1.35 : baseScale;
        const hitRadius = Math.max(star.size * (mode === "lifemap" ? 8 : 5), 3.2);

        return (
          <group key={star.id} position={star.position}>
            {isSelected ? (
              <mesh scale={2.7}>
                <sphereGeometry args={[star.size, 24, 24]} />
                <meshBasicMaterial color={star.color} transparent opacity={0.12} />
              </mesh>
            ) : null}

            <mesh scale={scale}>
              <sphereGeometry args={[star.size, isSelected ? 24 : 12, isSelected ? 24 : 12]} />
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
                  title: star.title,
                  label: star.label,
                  signature: star.signature,
                  chapter: star.chapter,
                  timeband: star.timeband,
                  dateLabel: star.dateLabel,
                  description: star.description,
                  summary: star.summary,
                  detail: star.detail,
                  tags: star.tags,
                  transcript: star.transcript,
                });
                setMode("focus");
              }}
            >
              <sphereGeometry args={[hitRadius, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
        {/* URAI_FX_TIER_HALO */}
        {isSelected ? (
          <mesh scale={[drawScale * 2.35, drawScale * 2.35, drawScale * 2.35]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshBasicMaterial color={star.color} transparent opacity={0.10} depthWrite={false} />
          </mesh>
        ) : null}
          </group>
        );
      })}
    </group>
  );
}
